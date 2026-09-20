# 文件上传与静态资源

本项目提供一套完整的文件管理能力：上传（支持多文件）、下载（静态资源托管）、以及目录（文件夹）组织、移动、复制、重命名、删除。这些能力属于 **CMS（B 端）**，位于 `app/api/cms/file.py`。

## 一、核心思路：Uploader 抽象 + 存储后端可替换

文件上传的核心是一个抽象的 `Uploader` 基类（`app/core/file.py`），它把「校验」与「存储」拆开，存储后端可插拔：

```
Uploader(基类：校验 + 路径 + md5 等通用逻辑)
├── LocalUploader   # 存本地磁盘（默认）
└── QiniuUploader   # 存七牛云（可切换）
```

- **`Uploader`**：负责所有上传前的通用校验（类型、体积、数量）、路径生成、md5 计算，但不落地到具体存储。
- **`LocalUploader`** / **`QiniuUploader`**：继承 `Uploader`，只实现 `upload()` —— 把文件写到本地磁盘或传到七牛云。

接口层只需一行切换（`app/api/cms/file.py`）：

```python
uploader = LocalUploader(files)  # 或者导入，使用 QiniuUploader
```

换一个存储后端，接口代码不用改。这正是「抽象基类 + 策略」的典型应用。

## 二、上传链路（POST /cms/file/id）

核心上传走 `upload_file` 视图函数（`/upload` 那个接口已标注废弃）。

```
POST /cms/file/<parent_id>
    │  request.files 拿到上传文件
    ▼
LocalUploader(files)
    │  __init__ 触发 Uploader.__verify()（三关校验）
    ├─ ① 文件类型：扩展名必须在 FILE.INCLUDE 白名单（且不在 EXCLUDE 黑名单）
    ├─ ② 单文件大小：≤ 100MB（SINGLE_LIMIT）
    └─ ③ 数量 / 总量：最多 10 个（NUMS），总大小 ≤ 500MB（TOTAL_LIMIT）
    ▼
uploader.locate(parent_id)        # 指定目标文件夹
uploader.upload()
    ├─ mkdir_if_not_exists()      # 按 年/月/日 建目录
    ├─ 逐文件：
    │    ├─ 算 md5
    │    ├─ md5 去重：已存在则复用（或在目标目录复制一份）
    │    └─ 不存在则：uuid 重命名 → 存到磁盘 → File.create 写数据库
    ▼
Success([File,...])               # 返回文件对象列表
```

### 上传的三个关键点

**1. 类型白名单**（`app/extensions/file/config.py`）

```python
FILE = {
    "SINGLE_LIMIT": 1024 * 1024 * 100,  # 单文件 100MB
    "TOTAL_LIMIT": 1024 * 1024 * 500,   # 总量 500MB
    "NUMS": 10,                          # 最多 10 个
    "INCLUDE": set(['jpg','jpeg','png','gif','doc','docx','xls',
                    'xlsx','ppt','pptx','pdf','md','mp3','mp4','wmv','zip']),
    "EXCLUDE": set([]),
}
```

扩展名校验在 `Uploader.__allowed_file()`：只在 `INCLUDE` 白名单里合法；`EXCLUDE` 是反向黑名单（两套可配）。

**2. md5 去重**（`LocalUploader.upload()`）

每个文件先算 md5，在 `File` 表里查重：

- **已存在且在同一文件夹** → 直接复用，不重新存盘
- **已存在但在别的文件夹** → 在目标文件夹复制一条记录（数据不重复落盘，只复制关系）
- **不存在** → 真正存盘 + 建记录

这套设计避免同一文件被反复上传占满磁盘。

**3. uuid 重命名 + 日期分层路径**（`Uploader._get_store_path`）

- 磁盘文件名用 `uuid + 扩展名`，避免中文/特殊字符、避免重名覆盖
- 存盘路径按 `年/月/日` 分层（如 `2020/08/08/<uuid>.png`），便于按时间归档

## 三、File 数据模型

`app/models/file.py` 的表结构：

| 字段 | 说明 |
|---|---|
| `parent_id` | 父级目录 id（支持文件夹组织） |
| `uuid_name` | 磁盘上的唯一文件名（uuid） |
| `name` | 原始文件名 |
| `path` | 相对路径（`2020/08/08/<uuid>.png`） |
| `extension` | 扩展名 |
| `_from` | 来源：1 本地，2 公网（七牛云） |
| `size` | 大小（字节） |
| `md5` | 文件 md5，用于去重 |

注意 `keys()` 通过序列化器 `hide` 掉了 `_from`/`path`/`md5`，**对外暴露的是拼接好的 `url`**（见下一节），不泄露内部存储结构。

## 四、下载：URL 如何生成

对外接口拿到的不是文件路径，而是拼接好的可访问 URL——由 `File.url` 属性生成：

```python
@property
def url(self):
    if UrlFromEnum(self._from) == UrlFromEnum.LOCAL:
        return local_asset_url('files', self.path)  # 本地
    return self.path                                # 七牛云（公网 URL）
```

`local_asset_url('files', path)` 拼成这样的完整地址：

```
http://<host>/static/files/2020/08/08/<uuid>.png
```

- `static` 是 Flask 的静态资源目录（`app/static_url_path`）
- `files` 是子目录（对应存盘时的 `app/static/files`）
- 静态文件由 **Nginx 的 `location /static/`** 直接服务，不经过 Python（部署篇讲过）

下载示例（README 遗留的旧写法也能访问）：

```
http://localhost:8080/static/images/1@theme.png        # 图片
http://0.0.0.0:8080/static/files/Python面向对象编程指南.epub  # 文件
```

## 五、文件管理接口一览

`app/api/cms/file.py` 提供的全部能力：

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/cms/file/{id}` | 上传文件（到指定目录） |
| GET | `/cms/file/list` | 分页查询文件列表（按目录） |
| GET | `/cms/file/{id}` | 文件详情 |
| GET | `/cms/file/name/{name}` | 按文件名查 |
| POST | `/cms/file/new` | 新建文件夹 |
| PUT | `/cms/file/move` | 批量移动文件 |
| POST | `/cms/file/copy` | 复制文件 |
| PUT | `/cms/file/rename` | 重命名 |
| DELETE | `/cms/file` | 批量删除 |
| GET | `/cms/file/folder` | 获取目录树 |
| GET | `/cms/file/types` | 支持的文件类型 |

## 设计价值

- **存储与接口解耦**：Uploader 抽象抽离了「校验/路径/md5」，存储后端（本地/云）可切换，接口零改动
- **数据去重**：md5 防重复上传，省磁盘
- **安全**：uuid 重命名 + 扩展名白名单，避免路径穿越、恶意脚本上传
- **URL 不暴露内部结构**：API 返回拼接好的 url，调用方不关心文件实际存在哪、怎么组织

::: tip 参考
部署篇的 [Nginx 反向代理](/deploy/) 里 `location /static/` 正是服务这些文件的关键配置，可对照阅读。
:::