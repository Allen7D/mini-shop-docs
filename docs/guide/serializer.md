# 统一的 JSON 序列化器

全项目数据层的基石之一：**数据库对象可以直接 `return`，由序列化器自动转成 JSON**，同时在序列化前支持精确的「隐藏 / 追加」字段控制。

核心代码分布在两个文件：

- `app/core/json_encoder.py` —— 自定义 Flask 的 `JSONEncoder`
- `app/core/db.py` —— `JSONSerializerMixin`（给 Model 注入 `hide/append/keys` 能力）

## 解决的问题

大多数后端要返回数据时，得做两件麻烦事：

1. **手动 `.to_dict()`**：每个 Model 写一个转换方法，字段一变就要同步维护，容易漏。
2. **处理敏感字段**：比如订单表的 `prepay_id`（微信支付预支付 ID）不该给前端，通常要在返回前 `del` 掉，散落在接口层各处。

这套设计用「**Mixin + 自定义编码器**」一次性解决两者。

## 一、Model 自带「隐藏 / 追加」能力（JSONSerializerMixin）

`app/core/db.py` 里的 `JSONSerializerMixin`，给所有 Model 混入了两个方法：

```python
# 用法：在接口里对查到的对象操作
order = Order.query.get_or_404(id).hide('prepay_id')   # 隐藏敏感字段
group = Group.get_or_404(id).append('auth_list')        # 追加临时字段

# 分页查询也能整批操作
paged = Order.query.paginate(...).hide('prepay_id')     # 每一条都隐藏
paged = Order.query.paginate(...).append('extra')       # 每一条都追加
```

### 关键：`keys()` / `__getitem__()` 让对象可被 `dict()` 处理

```python
def keys(self):
    '''返回序列化时包含哪些字段'''
    return self.fields

def __getitem__(self, item):
    attr = getattr(self, item)
    # 字符串字段若本身是 JSON，自动解析成对象
    if isinstance(attr, str):
        try:
            attr = json.loads(attr)
        except ValueError:
            pass
    # 时间字段自动从时间戳转成可读格式
    if item in ['create_time', 'update_time', 'delete_time']:
        attr = strftime('%Y-%m-%d %H:%M:%S', localtime(attr))
    return attr
```

实现了 `keys()` 和 `__getitem__`，Model 实例就**可以被 `dict(obj)` 转换**（Python 的 dict 协议）——这是后续序列化器能直接返回对象的前提。

### 初始化时按表裁剪字段

```python
@orm.reconstructor
def init_on_load(self):
    self._locked = False
    self._locked_fileds = []
    self._exclude = []
    self._set_fields()          # 由子类设置 exclude
    self.__prune_fields()       # 实际字段 = 表全部列 - exclude

def __prune_fields(self):
    all_columns = inspect(self.__class__).columns.keys()
    self.fields = list(set(all_columns) - set(self._exclude))
```

- `EntityModel` 默认把 `create_time/update_time/delete_time` 放进 `_exclude`（不随 `dict` 输出，逻辑里再按需 `append`）。
- 每个 Model 可通过重写 `_set_fields` 自定义默认排除字段——**表字段天然不直接暴露**，暴露是显式行为。

### 字段锁：`lock_fileds` 防止序列化阶段再改字段集合

```python
def hide(self, *keys):
    for key in keys:
        if hasattr(self, key):
            if not self._locked:
                self._locked_fileds.append(key)
                self.fields.remove(key)  # 业务期隐藏
            if self._locked and key not in self._locked_fileds:
                self.fields.remove(key)  # 序列化期也能隐藏「未被锁住的」字段
```

`lock_fileds()` 在业务逻辑结束后（序列化前）调用，之后不能对**业务期已操作过**的字段再 hide/append——防止序列化阶段意外改动字段集合、或在多层装饰器间被误改。

## 二、自定义 JSON Encoder：直接返回对象

`app/core/json_encoder.py`：

```python
class JSONEncoder(_JSONEncoder):
    def default(self, obj):
        # 若是数据库实例（具备 keys 协议）
        if hasattr(obj, 'keys') and hasattr(obj, '__getitem__'):
            obj.lock_fileds()          # 序列化前锁定字段
            return dict(obj)
        # datetime / date 自动格式化
        if isinstance(obj, datetime):
            return obj.strftime('%Y-%m-%dT%H:%M:%SZ')
        if isinstance(obj, date):
            return obj.strftime('%Y-%m-%d')
        raise ServerError()
```

在 `app/__init__.py` 里 `app.json_encoder = JSONEncoder` 注册后，**任何接口直接 `return Success(order_obj)` 或 `return dict(order_obj)` 都能正确序列化**，订单对象自动走 `hide/append` 后的字段集合。

## 三、完整链路

```
接口层 order.hide('prepay_id')          # 业务期：隐藏敏感字段
        group.append('auth_list')       # 业务期：注入临时字段
            ↓
return Success(obj)                     # 业务结束，交给响应
            ↓
JSONEncoder.default(obj)                # 序列化前调 lock_fileds() 锁定
            ↓
dict(obj) → keys() → 序列化字段集合      # 按 fields 输出
            ↓
返回 { error_code, msg, data }           # 统一格式 JSON
```

## 真实用例

`app/api/v1/order.py` —— 隐藏支付预支付号：

```python
@api.route('/<int:id>', methods=['GET'])
@auth.login_required
def get_order(id):
    order = Order.query.get_or_404(id).hide('prepay_id')
    return Success(order)
```

`app/api/cms/group.py` —— 给权限组临时追加其权限列表：

```python
@api.route('/<int:id>', methods=['GET'])
def get_group(id):
    group = Group.get_or_404(id)
    group.append('auth_list')   # 序列化时自动带上 auth_list
    return Success(group)
```

## 设计价值

- **契约即代码**：返回给前端哪些字段，在业务代码里通过 `hide/append` 显式声明，而不是散落在 `.to_dict()`。
- **安全默认**：表字段不主动暴露；时间、JSON 字符串字段自动规整，接口层无需重复处理。
- **链式可读**：`query.hide(...).paginate().hide(...)` 一步到位，也支持分页批量操作。
- **防误改**：`lock_fileds` 锁住业务期字段集合，序列化阶段不会再被意外改动。

::: tip 建议
这套「hide/append + 自定义 Encoder」是比手写 `to_dict()` 更可维护的方案。想深入理解，可以在 `app/core/db.py` 的 `JSONSerializerMixin` 里打断点，观察一次请求中 `fields` 从「初始化 → hide/append → lock → 序列化」的变化。
:::

下一步：[参数校验层](/guide/validator)