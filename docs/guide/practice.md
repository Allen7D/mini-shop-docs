# 动手 · 添加新接口

把前面学的全用上——亲手给项目加一个「优惠券接口」。这是把整个机制跑通的最小闭环，照着做一遍就彻底懂了。

## 任务

新增一个 C 端接口：`/v1/discount`（优惠券），支持查优惠券列表。

## Step 1 · 建接口模块

新建 `app/api/v1/discount.py`：

```python
from flask import g
from app.extensions.api_docs.redprint import Redprint
from app.core.token_auth import auth
from app.core.utils import paginate
from app.libs.error_code import Success
from app.extensions.api_docs.v1 import discount as api_doc

api = Redprint(name='discount', module='优惠券', api_doc=api_doc)

@api.route('', methods=['GET'])
@api.doc(args=['g.query.page', 'g.query.size'], auth=True)
@auth.login_required
def get_discount_list():
    '''查询我的优惠券'''
    page, size = paginate()
    return Success(DiscountDao.get_by_user(uid=g.user.id, page=page, size=size))
```

## Step 2 · 注册红图

在 `app/config/setting.py` 的 `ALL_RP_API_LIST` 加一行：

```python
ALL_RP_API_LIST = \
    ['v1-token'] + \
    ['cms-admin', ...] + \
    ['v1-user', 'v1-address', 'v1-discount',  # ← 新增这一行
     'v1-banner', ...] + \
    ...
```

## Step 3 · 建（可选）对应的 api_doc 文件

如果不需要完整手写 spec，可省略；`api.doc(args=[...])` 会自动生成文档。

## Step 4 · 跑起来看 Swagger

```bash
# 启动开发服务器（用项目配置）
uv run python server.py --host 127.0.0.1 --port 5000 --debug
# 打开 Swagger 文档
http://127.0.0.1:5000/apidocs
```

在 Swagger 里应该能看到新增的「优惠券」分组和接口。

::: tip 完成标准
① 能请求 `GET /v1/discount` ② Swagger 里出现新分组 ③ 接口能认证。
三步都通，说明你对「红图 + 注册 + 装饰器壳 + 统一返回 + 文档」整条链路掌握得很扎实了。
:::

下一步：[软件工程启示](/guide/engineering)