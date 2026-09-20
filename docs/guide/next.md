# 下一步怎么学

结构已经掌握，接下来是查漏补缺和横向延伸。按这个顺序，从「能跑」走向「会写」。

## 推荐阅读顺序

| 顺序 | 读什么 | 学到什么 |
|---|---|---|
| 1 | `app/__init__.py` | 全局组装脉络 |
| 2 | `api/v1/product.py` + `user.py` | 一个正常接口 + 一个带认证接口的写法 |
| 3 | `libs/error_code.py` + `core/error.py` | 统一返回格式 |
| 4 | `core/validator.py` + `validators/forms.py` | 参数怎么被拦截 |
| 5 | `models/` + 对应 `dao/` | ORM 怎么查 |
| 6 | `service/order.py` | 最复杂的完整业务 |
| 7 | `core/redprint.py` + `extensions/api_docs/` | 最后啃红图和 swagger 的完整内容 |

## 横向延伸知识点

- **Swagger 参数自动生成**：复习 `api_docs/redprint.py` + `core/swagger_filed.py` 如何把 `args=['g.query.page']` 解析成完整参数。这是项目里最「炫技」的设计。
- **微信登录 / 支付**：看 `service/` 的 `wx_token.py`、`wx_message.py`、`pay.py` —— 真实小程序对接微信的完整闭环。
- **AOP 思想**：认证、日志、异常、文档都是「装饰器壳」，理解「横切关注点」对后端架构观很有价值。
- **分层架构**：controller → service → dao → model 的分层思想，是几乎所有主流后端（如 Java Spring、Node 生态）的通用骨架。

## 如果你想把这个项目变成自己的作品

- 把数据库（`zerd_pg.sql`）导入本地 PostgreSQL，先让项目能正常启动。
- 加一个你自己感兴趣的模块（比如「收藏夹」「我的优惠券」），完整过一遍新增接口流程。
- 试着给某个接口加 `@api.limiter` 限流（`libs/limiter.py`），体会「扩展都在壳上」的设计。

::: tip 学习心态
学这个后端项目，最容易卡在「为什么分层这么多层」。记住——**分层不是为了复杂，而是为了「改一处不影响其它」**。抓住「请求每层做什么」这条主线，它就是一个可驾驭的真实工程。
:::

这是入门指南的最后一节。接下来可以看 [API 参考](/api/)。