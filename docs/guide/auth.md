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

::: warning 进阶内容
初学者先理解「Token 认证」即可。权限组的「接口级授权」用了反射/元数据登记（`route_meta_infos` 全局表），等你把请求生命周期跑通后再回头啃。
:::

下一步：[数据层 Model / DAO](/guide/data-layer)