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

## 为什么用红图：为版本迭代与新旧兼容而设计

上面的好处是「今天」的收益，但红图真正的价值，是为了一个更长期的目标：**多版本 API 长期共存、新旧接口兼容**。

### 场景：线上 v1 已上线，v2 上线时旧接口必须继续跑

商城类业务很现实：小程序 C 端已发布，依赖 `/v1/order`、`/v1/user`；第三方接入方可能还依赖 `cms` 的接口。这些**不会**随 v2 一起升级。所以 v1、cms、未来的 v2、v3 必须**长期共存、各自稳定演进**——这是「新增版本」和「版本并存」的根本区别。

红图正是为这个「并存」而生的。

### 版本是一层独立维度，互不叠压

`v1/` 和 `cms/` 是两个独立目录、独立蓝图、独立 URL 前缀，天然隔离。未来加 `v2/`，只是**新增一格**，不挤占 v1 的任何路由——v1 的接口地址、响应格式、行为**原封不动**。版本(v1/cms/…)和红图(order/user/…)是解耦的两维，`ALL_RP_API_LIST` 里的 `v1-order` / `cms-order` 这种「版本-红图」命名，本身就是未来加 `v2-order`、`v3-user` 的伏笔。

### 同一红图可复用到新版本，只覆盖变化点

这是红图区别于原生蓝图的关键：**不同版本复用同一批「收集好的路由」，只覆盖变化的接口**。

```python
# 同一 order 红图，挂到两个版本
v1/order.py 定义 order 红图
    → register 挂到 /v1（给线上已发布的旧客户端，原封不动）
    → 同时 register 挂到 /v2（给新接口，只覆盖/新增变化的部分）
```

旧接口 v1 完全不动（兼容），新接口 v2 复用大部分相同路由、只覆盖变化——比「v2 从零重写」省力，也比「直接改 v1」安全（不破坏线上下单）。

### 版本 × 红图的组合是配置，不是代码

分派者让「同一红图挂多版本」变成改配置而非写代码。将来要让 order 同时出现在 v1 和 v2：

```python
ALL_RP_API_LIST = ['v1-token', 'v1-order', 'v2-order', ...]  # 同一 order 挂两档
```

红图模块 `order` 只写一次，「版本 × 红图」的组合通过这个列表**声明式**表达——这正是「版本化基础设施」的样子。

### 诚实的代价：多版本需要治理纪律

多版本 `v2` 好加只是故事的一半，另一半是配套的**版本治理**，否则版本会从资产变成负债：

- **两套接口并存期维护成本**：v1(线上)和 v2(新)都存在时，同一个 bug 可能要修两处，直到 v1 完全下线。
- **新旧接口兼容由 v1「冻结」保证**：v1 发布即冻结、只修重大 bug，新功能一律进 v2，靠「旧版快照不变」守住兼容。
- **要有废弃(deprecation)与下线节奏**：给每个版本定退役时间，避免版本无限堆叠（业界常见：N 个版本后的下线窗口）。

所以「红图让 v2/v3 好加」需要配套的版本治理，否则多版本会成为长期维护的负担。这也是和「统一异常 / 统一序列化」这类纯收益设计不同的地方：它解决一个真实的长期问题，但附带治理成本。

::: tip 消化测验
如果我要新增一个接口模块 `v1/discount`（优惠券接口），需要在几个地方动手？
答：① 新建 `api/v1/discount.py` 定义红图 ② 在 `ALL_RP_API_LIST` 加一行 `'v1-discount'`。就这两步。在「动手·添加新接口」章节会验证。
:::

下一步：[一次请求的生命周期](/guide/request)