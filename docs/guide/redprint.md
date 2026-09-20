# 红图 Redprint

这是 mini-shop-server 最有特色的设计。核心一句话：**「红图 = 更小、更灵活的蓝图」**。

## 先理解 Flask 的蓝图（Blueprint）

蓝图是 Flask 官方「按模块组织路由」的机制。但它在注册时就把路径关系定死了，不够灵活。

## 引入「红图」的概念

红图把「**收集路由**」和「**注册路由**」两件事拆开：写代码时只收集、不注册；真正挂到 Flask 是最后统一做。

```python
# app/core/redprint.py（简化）
class Redprint:
    def route(self, rule, **options):   # ① 只「收集」路由
        def decorator(f):
            self.mound.append((f, rule, options))  # 攒在列表里
            return f
        return decorator

    def register(self, bp, url_prefix=None): # ② 最后一次性注册
        for f, rule, options in self.mound:
            bp.add_url_rule(url_prefix + rule, endpoint, f, **options)
```

红图先在各自地方写好路由，再决定挂到哪个蓝图、给谁用。

## 接口文件怎么用红图

```python
# app/api/v1/order.py
from app.extensions.api_docs.redprint import Redprint

api = Redprint(name='order', module='订单', api_doc=api_doc)

@api.route('', methods=['POST'])
@api.doc(auth=True)
@auth.login_required
def place_order():
    '''提交订单'''
    return Success(status)
```

注意：路由没有直接注册到 Flask，而是攒在 `api.mound` 列表里。

## 谁负责挂载？—— RedprintAssigner 红图分派者

在 `app/__init__.py` 里，一个「分派者」把配置里列出的红图，逐个 import 并注册到对应的蓝图。

```
app/config/setting.py 里的 ALL_RP_API_LIST（列出哪些红图、按什么顺序）
    → RedprintAssigner 逐个 import 接口模块拿到红图
    → 每个红图 .register() 到对应蓝图（/v1、/cms）
    → 蓝图注册到 Flask app → 路由生效
```

看 `setting.py` 里的清单（它同时控制了 Swagger 文档的显示顺序）：

```python
ALL_RP_API_LIST = \
    ['v1-token'] + \
    ['cms-admin', 'cms-group', 'cms-auth', ...] + \
    ['v1-user', 'v1-address', 'v1-banner', ...] + \
    ['cms-user', 'cms-order', ...]
```

## 红图的真正好处

- **自由组合注册**：同一批接口可以按需求挂到不同版本/前缀下。
- **控制文档顺序**：清单顺序即 Swagger 文档分组顺序。
- **解耦**：接口代码不知道自己最终挂在哪，可复用、可测试。这是「组合优于继承 + 依赖倒置」的思想。

## 为什么用红图：为版本迭代与新旧兼容而设计

除了上面的即时收益，红图更重要的动机是**多版本并存**。

考虑实际场景：小程序 C 端已发布，依赖 `/v1/order`、`/v1/user`，这些客户端不会随 v2 一起升级。所以 v2、v3 上线时，v1 的旧接口必须继续可用——新旧版本要长期共存，而不是出了新版换掉旧版。

红图从三个层面支撑这一点：

- **版本是独立的一层**。`v1/`、`cms/` 各自是独立目录、独立蓝图、独立 URL 前缀，将来加 `v2/` 只是新增一个目录，v1 的路由原样保留。`ALL_RP_API_LIST` 里 `v1-order`、`cms-order` 这种命名，把版本和接口模块拆成了两个自由组合的维度。
- **同一红图可以挂到多个版本**。路由定义和注册是分开的，order 红图可以同时挂到 `/v1` 和 `/v2`：v1 原封不动，v2 只覆盖有变化的接口。既不用从零重写 v2，也不会因为改接口破坏线上的 v1。
- **组合关系写在配置里**。让 order 同时出现在两个版本，只是给 `ALL_RP_API_LIST` 加一行 `'v2-order'`，接口代码不动。

代价也要清楚：多版本并存期间，同一个 bug 可能要在 v1、v2 各修一次，直到旧版下线。所以需要配套的版本治理——v1 发布后冻结（只修重大 bug），新功能进 v2，并给每个版本定下线时间。红图解决的是「好加版本」，治理纪律解决的是「版本不失控」，两者缺一不可。

::: tip 消化测验
如果我要新增一个接口模块 `v1/discount`（优惠券接口），需要在几个地方动手？
答：① 新建 `api/v1/discount.py` 定义红图 ② 在 `ALL_RP_API_LIST` 加一行 `'v1-discount'`。就这两步。在「动手·添加新接口」章节会验证。
:::

::: tip 能带走的思想
红图把「定义路由」和「注册路由」拆开，让同一批路由可以自由组合挂载到不同位置。这就是**定义与装配分离**：先写清楚"有什么"，再在别处决定"放哪里、给谁用"。任何想做成可复用、可组合的模块（插件系统、路由注册、依赖配置）都能用这个思路。
:::

下一步：[一次请求的生命周期](/guide/request)