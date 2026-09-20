# 权限认证 Token

很多接口需要「你是谁」才能访问。这套系统用 **Token + 装饰器** 做认证，权限级别可配。

## 认证的三要素

| 概念 | 文件 | 作用 |
|---|---|---|
| `@auth.login_required` | `core/token_auth.py` | 装饰器：校验请求带的有效 Token，通过则放行 |
| `g.user` | Flask 内置 | 当前请求的用户信息（认证通过后注入） |
| `TokenException` | `core/error.py` | Token 无效/过期时抛出的异常（统一 401） |

## Token 从哪来

用户登录成功后，后端签发一个 Token 给前端。前端之后每次请求带上它，后端验证「这个 Token 是不是我签的、有没有过期」。这块逻辑在 `service/open_token.py` 和 `service/account_token.py`。

## 接口里怎么加认证

```python
@api.route('', methods=['GET'])
@api.doc(args=['g.query.page', 'g.query.size'], auth=True)
@auth.login_required                        # ← 这一行就是认证壳
def get_order_list():
    uid = g.user.id                         # 认证通过后，从 g.user 拿当前用户
    return Success(OrderDao.get_summary_by_user(uid=uid, ...))
```

## 权限粒度：route_meta 记录每个接口的权限

`core/redprint.py` 里还有一个 `@route_meta(auth, module)` 装饰器，用来登记「这个接口需要什么权限、属于哪个模块」。配合后台的权限组管理（`app/api/cms/group.py`），就能实现「接口级」的权限控制——即给不同管理员角色分配哪些接口可调。

「Token 认证」解决的是「你是不是登录用户」，还没解决「你有没有权限调这个接口」。这套系统把权限分成三层：

| 层级 | 装饰器 | 校验回调 | 服务对象 | 依据 |
|---|---|---|---|---|
| ① 用户认证 | `@auth.login_required` | `verify_password` | 所有登录用户 | Token 有效即可 |
| ② 管理员认证 | `@auth.admin_required` | `verify_admin` | 超级管理员 | `user.is_admin` |
| ③ 接口级授权 | `@auth.group_required` | `verify_group` | 权限组成员 | `Auth` 表「组 × 接口」 |

## 三种校验装饰器

三个装饰器分别对应三种角色的接口访问控制，都在 `core/token_auth.py` 里定义：

```python
auth = HTTPBasicAuth()

# 普通用户：只要 Token 有效
@auth.verify_password
def verify_password(token, password):
    user_info = verify_auth_token(token)      # 解析 token（含时效校验）
    if not user_info:
        return False
    g.user = User.get_or_404(id=user_info.uid)  # 注入 g.user
    return True

# 超级管理员：额外要求 is_admin
@auth.verify_admin
def verify_admin(token, password):
    (uid, ac_type, scope) = decrypt_token(token)
    current_user = User.get_or_404(id=uid)
    if not current_user.is_admin:
        raise AuthFailed(msg='该接口为超级管理员权限操作')
    g.user = current_user

# 权限组成员：按「所属组 × 接口」查表
@auth.verify_group
def verify_group(token, password):
    (uid, ac_type, scope) = decrypt_token(token)
    current_user = User.get_or_404(id=uid)
    if not current_user.is_admin:             # 超管直接放行
        if current_user.group_id is None:
            raise AuthFailed(msg='您还不属于任何权限组')
        allowed = is_in_auth_scope(current_user.group_id, request.endpoint)
        if not allowed:
            raise AuthFailed(msg='权限不够')
    g.user = current_user
```

三个装饰器的区别：
- **`login_required`** — 只验「是不是登录用户」，任何有效 Token 都放行（C 端用户接口）
- **`admin_required`** — 在登录基础上，额外要求 `user.is_admin = True`（超管专属接口，如系统配置）
- **`group_required`** — 在登录基础上，查该用户的权限组是否被授予了当前接口（后台管理接口按组授权）

注意 `verify_group` 里先判断 `is_admin`：超管直接放行、不再查权限组。这样超管拥有所有后台权限，普通管理员才按组授权。

## RBAC：接口级授权是怎么查表的

第三层实现的是**接口级（endpoint 级）的权限控制**。核心落在 `core/auth.py` 的 `is_in_auth_scope`：

```python
def is_in_auth_scope(group_id, endpoint):
    meta = current_app.config['EP_META'].get(endpoint)  # 1. 用 endpoint 反查接口元数据
    if meta:
        allowed = Auth.get(group_id=group_id, name=meta.name, module=meta.module)  # 2. 查「权限组 × 接口名」记录
    return True if allowed else False
```

要理解它，得先明白「接口的权限信息是怎么登记进 `EP_META` 的」。分两步：

**第一步：写接口时用 `route_meta` 登记。「接口 A 属于『商品』模块，权限名『新增商品』」**

```python
@api.route('', methods=['POST'])
@api.doc(...)
@route_meta(auth='新增商品', module='商品')   # ← 登记接口的权限名 + 归属模块
@auth.login_required
def create_product(): ...
```

`route_meta` 把 `(接口函数, '新增商品', '商品')` 存进红图的全局表 `route_meta_infos`。

**第二步：启动时反射挂载到每个接口的 endpoint 上**

红图注册后，框架扫描所有视图函数，把 `route_meta_infos` 里的信息按函数挂到对应 endpoint：

```python
def mount_route_meta_to_endpoint(app):
    for endpoint, func in app.view_functions.items():
        info = route_meta_infos.get(func.__name__ + str(func.__hash__()))
        if info:
            app.config['EP_META'].setdefault(endpoint, info)  # EP_META[endpoint] = Meta('新增商品', '商品')
```

这样请求进来时，`request.endpoint`（唯一标识落到了函数）就能反查回它的权限名和模块。

**第三步：后台把接口授权给权限组**

`app/api/cms/auth.py` 提供增删接口授权的接口，往 `Auth` 表写记录：`(group_id, '新增商品', '商品')`——即「这个权限组可以使用『新增商品』接口」。

```python
class Auth(Base):
    id       = Column(Integer, primary_key=True)
    group_id = Column(Integer, nullable=False)  # 所属权限组
    name     = Column(String(60))               # 权限名
    module   = Column(String(50))               # 权限模块
```

**第四步：请求进来时，`group_required` 校验「我这个组有没有这个接口」**

`verify_group` 拿着 `group_id` + `request.endpoint`，调 `is_in_auth_scope` 反查接口 meta → 查 `Auth` 表有没有 `(group_id, name, module)` 这条 → 有则放行。

这样「一个组能用哪些接口」由后台在 `Auth` 表里配置。要放开运营组的「新增商品」、收回「删除商品」，直接改 `Auth` 表的记录即可，接口代码不用动。

## 权限元数据从哪来、怎么变成可配置

`route_meta_infos` 是全局字典，运行期要转成后台可管理的结构，`core/auth.py` 提供两个函数：

```python
def load_endpint_infos(app):
    infos = {}; index = 0
    for ep, meta in app.config['EP_META'].items():
        index += 1
        endpoint_info = {'id': index, 'name': meta.name, 'module': meta.module}
        module = infos.get(meta.module, None)
        if module: module.append(endpoint_info)
        else: infos[meta.module] = [endpoint_info]
    app.config['EP_INFO_LIST'].append(endpoint_info)
    app.config['EP_INFOS'] = infos
    return infos
```

`EP_INFOS` 按模块聚合：`{'商品': [{'id':1,'name':'新增商品'}, ...], '订单': [...]}`。这正是后台「权限管理」界面按模块分组、可勾选接口权限的数据来源。

总结这张权限图的分工：

```
写接口 → route_meta 登记权限名/模块          （开发时）
  ↓
启动 → mount_route_meta 挂到 endpoint       （运行前）
  ↓
后台 → group 接口把接口授权给权限组→写 Auth 表  （运维时）
  ↓
请求 → group_required → is_in_auth_scope
       endpoint → EP_META → 查 Auth 表 → 放行/拒绝 （运行时）
```

::: warning 进阶内容
初学者先理解「Token 认证」即可。三层权限中的第①层（`login_required` + `verify_password`）是日常最常用的。管理员认证和接口级授权（②③层）用了反射/元数据登记（`route_meta_infos`、`EP_META`、`is_in_auth_scope`）和一张 `Auth` 关联表，等你把请求生命周期跑通后再回头啃。
:::

::: tip 能带走的思想
授权(authorization)下沉到装饰器壳，业务代码零侵入。

**横切关注点(cross-cutting concern)**——认证、缓存、日志、限流——都适合这种处理：一个装饰器/中间件解决所有接口的共性问题，而不是每个接口重复写。加上 route_meta 的「接口级权限元数据登记」，本质是 RBAC 的落地。
:::

下一步：[数据层 Model / DAO](/guide/data-layer)