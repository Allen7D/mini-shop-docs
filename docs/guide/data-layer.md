# 数据层 Model / DAO

这里用 SQLAlchemy（ORM）操作 PostgreSQL，再把查询封装成 DAO 方法。

## 分层：Model 定义表，DAO 封装查询

| 角色 | 文件 | 职责 |
|---|---|---|
| `models/` | `models/order.py` 等 | 定义每张「表」的结构（列、类型、关系） |
| `dao/` | `dao/order.py` 等 | 封装具体查询方法（按用户查、分页查…） |

## 一个 Model 长什么样

`models/order.py`（示意）：

```python
class Order(db.Model):
    id           = db.Column(db.Integer, primary_key=True)  # 主键
    order_no     = db.Column(db.String(32))                 # 订单号
    total_price  = db.Column(db.Decimal(10, 2))             # 金额
    status       = db.Column(db.SmallInteger)               # 状态
    create_time  = db.Column(db.Integer)                    # 时间戳
    # ... 表关系、隐藏字段等
```

## DAO 长什么样

`dao/order.py`（示意）：把常见查询封装成清晰的语义方法：

```python
class OrderDao:
    @staticmethod
    def get_summary_by_user(uid, page, size):
        # 按用户分页查订单，返回摘要
        return Order.query.filter_by(user_id=uid) \
            .paginate(page=page, per_page=size)
```

## 层级调用链

```
service 层（业务逻辑）—— 不知道 SQL，只调用 DAO 方法
    ↓
dao 层（数据访问）—— 用 SQLAlchemy 查数据，封装成语义方法
    ↓
models 层（ORM 模型）—— 定义表和字段
    ↓
PostgreSQL 数据库 —— 真实存储
```

::: tip 为什么中间要隔一层 DAO？
因为「查哪个表、怎么查」的细节不该让业务层知道。改了数据库结构，只动 models/dao，service 层不用动——这就是分层解耦，也是项目想教给你的工程习惯。
:::

下一步：[实战拆解·下单流程](/guide/case-order)