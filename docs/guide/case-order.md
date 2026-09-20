# 实战拆解 · 下单流程

把前面学的所有层串起来，看整个项目最复杂的业务——**下单**。能看懂下单，就全通了。

## 入口：api/v1/order.py 的 place_order

看它怎么从接口层一路打到数据库：

```python
# 下单接口 + 完整装饰器壳（apps/api/v1/order.py）
@api.route('', methods=['POST'])
@api.doc(auth=True)                              # 自动生成文档
@auth.login_required                            # 认证：没登录不能下单
def place_order():
    '''提交订单'''
    # ① 校验请求体里的商品列表（product_id + count）
    products = OrderPlaceValidator().validate_for_api().products.data
    # ② 交给业务层处理（核心下单逻辑）
    status = OrderService().palce(uid=g.user.id, o_products=products)
    return Success(status)                        # ③ 统一返回
```

## 业务层进入：service/order.py 的 OrderService

这是全项目最有含金量的地方，负责完整下单流程（示意）：

```python
class OrderService:
    def palce(self, uid, o_products):
        # 1. 遍历用户勾选的商品
        for p in o_products:
            # 2. 查商品 & 检查库存（dao → models）
            product = ProductDao.get_one(p['id'])
            if product.stock < p['count']: raise ProductStockException()
            # 3. 计算小计、扣减库存...
        # 4. 生成订单号、算总价、写数据库
        order = Order(...)
        db.session.add(order); db.session.commit()
        return order
```

## 完整调用链回顾（下单版）

```
① POST /v1/order —— 携带商品列表 + Token
    ↓
② 认证 + 校验壳 —— @auth.login_required → OrderPlaceValidator 校验商品列表格式
    ↓
③ OrderService.palce() —— 业务核心：检查库存 → 扣库存 → 计算金额
    ↓
④ ProductDao / Order 写入 —— 读商品表、写订单表（db.session.commit）
    ↓
⑤ return Success(order) —— 统一格式返回订单数据
```

::: tip 本节考点
你能看出下单流程里，`service`（业务）、`dao`（查库）、`models`（表结构）三个层各干了什么事吗？能分清，就算真把分层学通了。
:::

下一步：[动手·添加新接口](/guide/practice)