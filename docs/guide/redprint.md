# 核心·红图 Redprint

这是 mini-shop-server 最有特色的设计，也是初学者的第一道坎。核心一句话：**「红图 = 更小、更灵活的蓝图」**。

## 先理解 Flask 的蓝图（Blueprint）

蓝图是 Flask 官方「按模块组织路由」的机制。但它在注册时就把路径关系定死了，不够灵活。

## 本项目发明了「红图」

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

::: tip 消化测验
如果我要新增一个接口模块 `v1/discount`（优惠券接口），需要在几个地方动手？
答：① 新建 `api/v1/discount.py` 定义红图 ② 在 `ALL_RP_API_LIST` 加一行 `'v1-discount'`。就这两步。在「动手·添加新接口」章节会验证。
:::

下一步：[一次请求的生命周期](/guide/request)