# 统一异常与响应格式

全项目最优雅的设计之一：**所有返回都是统一格式，所有错误都长一个样**。先记住这一个约定，再也不用到处 try/catch。

## 固定响应格式

```json
{
    "error_code": 0,       // 业务状态码（0 = 成功）
    "msg": "成功",          // 提示信息
    "data": { ... }        // 实际数据（成功时才有）
}
```

## 错误码表

定义在 `app/core/error.py` 和 `app/libs/error_code.py`：

| 异常类 | HTTP 码 | error_code | 语义 |
|---|---|---|---|
| `Success` | 200 | 0 | 成功 |
| `AuthFailed` | 401 | 10000 | 授权失败 |
| `Forbidden` | 403 | 10010 | 无权限 |
| `NotFound` | 404 | 10100 | 未查到数据 |
| `RepeatException` | 400 | 10110 | 重复数据 |
| `ParameterException` | 400 | 10120 | 参数错误 |
| `TokenException` | 401 | 10200 | Token 过期 / 无效 |

## AOP 是如何实现的 —— 全局 errorhandler

在 `app/__init__.py` 里挂了一个「兜底处理器」，任何异常都会汇聚到这里，再转成统一格式：

```python
# app/__init__.py → handle_error
@app.errorhandler(Exception)
def framework_error(e):
    if isinstance(e, APIException):   # 业务异常 → 原样返回
        return e
    elif isinstance(e, HTTPException): # Flask 自带异常 → 转统一格式
        return APIException(code=e.code, error_code=1007, msg=...)
    else:                             # 未知异常 → 兜底为服务器错误
        return ServerError() if not app.config['DEBUG'] else raise e
```

在业务代码里只要 `raise ParameterException(msg='xxx')` 或直接 `return Success(data)`，剩下的交顶层统一处理。这就是**面向切面**：把「异常处理」这个横切关注点从业务里抽走。

::: tip 前端类比
这就像给 axios 写了一个全局 response 拦截器——所有接口的返回体先走统一逻辑，`error_code === 0` 就是成功，否则按错误码提示用户。
:::

## Success 的小花活

```python
class Success(APIException):
    code = 200; error_code = 0; msg = '成功'

    def __init__(self, data=None, code=None, error_code=None, msg=None):
        if error_code == 1:  # 创建/更新成功 → 用 201
            code = code or 201; msg = msg or '创建 | 更新成功'
        if error_code == 2:  # 删除成功 → 用 202
            code = code or 202; msg = msg or '删除成功'
```

同一个 `Success` 类，通过 `error_code` 参数自动切换 HTTP 状态码（200/201/202），代码优雅又简洁。

下一步：[参数校验层](/guide/validator)