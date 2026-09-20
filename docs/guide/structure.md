# 目录结构全解

记住一句口诀：**「接口去 api，逻辑去 service，查库去 dao，数据去 models，校验去 validators，工具去 libs」**。

## 核心目录一览

| 目录 | 职责 | 通俗解释 |
|---|---|---|
| `app/api/v1` | C 端接口（小程序用户） | 用户端的路由：查商品、下单、支付 |
| `app/api/cms` | B 端接口（后台管理） | 管理端的路由：管用户、管商品、管权限 |
| `app/validators` | 参数校验 | 进来的参数先「体检」，不对就拦下 |
| `app/service` | 业务逻辑 | 下单、支付、登录这些「真业务」 |
| `app/dao` | 数据访问封装 | 把常见查询封装成方法，service 调用 |
| `app/models` | ORM 模型 | 定义了每张数据库表长什么样 |
| `app/core` | 框架核心 | 红图、错误、db、token、swagger 都在这里 |
| `app/libs` | 错误码 / 枚举 | 错误码表、通用小工具 |
| `app/extensions` | 扩展封装 | swagger、flask-admin 等 |
| `app/config` | 配置 | 密钥、列表配置等 |

## 为什么分 v1 和 cms 两套？

同一个后端，**两个前端**在调用：

- `v1` → 给小程序用户（C 端）：查商品、下单、支付
- `cms` → 给后台管理员（B 端）：管理商品、用户、权限

它们的实际 URL 前缀不同：`/v1/...` 和 `/cms/...`。这套「一后端、多接口版本」的拆分在真实项目里很常见。

## 总入口：app/__init__.py

先读这个文件，它是全项目的组装起点：

```python
# 组装整个 Flask app
def create_app():
    app = Flask(__name__)
    load_config(app)        # 载入 .env 和 config（密钥、列表等）
    register_blueprint(app) # 注册蓝图（由红图 RedprintAssigner 完成）
    register_plugin(app)    # 挂载扩展：JSON编码、跨域、db、异常处理、Swagger
    return app
```

::: tip 区分方法
现在的确容易在 `app/libs` 和 `app/core` 之间犯晕。`libs` 是「与框架无关的工具」（错误码、枚举、http 工具），`core` 是「和 Flask 强绑定的核心」（db 连接、认证、红图、异常）。
:::

下一步：[核心·红图 Redprint](/guide/redprint)