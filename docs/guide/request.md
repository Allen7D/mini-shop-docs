# 一次请求的生命周期

用一个最简单的接口 `GET /v1/order?page=1&size=10`（查订单列表），看请求怎么穿过项目的每一层再返回。这是理解整个项目最重要的一张图。

## 六个阶段

### ① 路由匹配
Redprint + Blueprint 命中 `app/api/v1/order.py` 的 `get_order_list`

### ② 认证壳（权限）
`@auth.login_required` → 校验 Token 是否有效，把用户信息放进 `g.user`（Flask 的请求上下文全局变量）

### ③ 参数校验壳（validators）
`PaginateValidator()` → 校验 page/size 是否为正整数；不合法就 `raise ParameterException`

### ④ 业务逻辑（service）
处理返回数据、调用数据层（这里是 `OrderService`）

### ⑤ 查数据库（dao → models）
`OrderDao.get_summary_by_user(uid, page, size)` → SQLAlchemy 查 order 表

### ⑥ 统一返回（Success）
`return Success(paged_orders)` → 固定格式 JSON：`{error_code, msg, data}`

## 每一层在前端对应什么

| 后端层 | 代码位置 | 前端对应物 |
|---|---|---|
| ① 路由 | `api/v1/order.py` | 路由表 |
| ② 认证 | `@auth.login_required` | 路由守卫 / 拦截器 |
| ③ 校验 | `validators/forms.py` | 表单校验库（zod/joi） |
| ④ 业务 | `service/order.py` | 业务 store / use case |
| ⑤ 数据 | `dao/order.py` → `models/order.py` | API 请求层 / Model |
| ⑥ 返回 | `core/error.py` 的 `Success` | 统一 response 拦截器 |

## 「壳」是怎么叠出来的？—— 装饰器

```python
@api.route('', methods=['GET'])                              # 路由壳（最外层）
@api.doc(args=['g.query.page', 'g.query.size'], auth=True)  # Swagger 文档壳
@auth.login_required                                        # 认证壳
def get_order_list(): # 最内：真正的业务函数
    page, size = paginate()
    return Success(OrderDao.get_summary_by_user(...))
```

Python 装饰器一层层「包住」原函数。业务函数本身只关心数据，其它横切关注点（认证、文档、日志）由壳负责——这就是 **AOP（面向切面编程）** 在 Python 里的实现。

::: tip 关键理解
你写的接口函数里，**看不到任何认证代码**。认证被抽到了装饰器 `@auth.login_required`。想给哪个接口加认证就加哪一层壳。这正是脚手架给初学者示范的「横切关注点」组织方式。
:::

下一步：[统一异常与响应格式](/guide/response)