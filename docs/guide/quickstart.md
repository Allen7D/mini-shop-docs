# 快速启动

两种启动方式：**Docker 一键启动（推荐）** 和 **本地手动启动**。二选一即可。

## Docker 一键启动（推荐）

无需手动安装 Python/PostgreSQL，只需安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)，即可一条命令拉起「应用 + 数据库」两个容器。

> `Dockerfile` + `.dockerignore` + `docker-compose.yml` 已内置；`db` 容器首次初始化会自动执行 `zerd_pg.sql` 建表并灌入种子数据。

### 快速启动

```bash
# 1. 下载代码并进入项目目录
$ git clone https://github.com/Allen7D/mini-shop-server.git
$ cd mini-shop-server

# 2. 构建并一键启动（首次会拉取镜像+构建，稍慢）
$ docker compose up -d --build
```

启动后执行 `docker compose ps`，看到 `app` 与 `db` 两个容器均为 `Up` 即启动成功。

::: tip 成功标志
浏览器打开 [http://localhost:8080/apidocs/](http://localhost:8080/apidocs/)（Swagger 文档页），能看到接口文档即表示一切正常。
:::

### 后台管理员账号

> 说明：种子数据（`zerd_pg.sql`）主要提供业务数据，其中的旧账号密码哈希已失效，无法直接登录。如需可登录的测试账号，请用 `fake.py` 一键生成。

```bash
docker compose exec app uv run python fake.py
```

生成账号（用户名 / 密码）：

| 用户名 | 密码   | 角色       |
| ------ | ------ | ---------- |
| super  | 123456 | 超级管理员 |
| admin  | 123456 | 普通管理员 |
| user   | 123456 | 普通用户   |

> 注意：用户名、邮箱、微信 openid 均有唯一约束，`fake.py` 重复运行会报「唯一约束」错误，生成一次即可。

### 常用命令

```bash
$ docker compose logs -f app   # 实时查看应用日志
$ docker compose down          # 停止
$ docker compose down -v       # 停止并删除数据库数据卷（重置数据）
```

### 连接数据库（TablePlus / Navicat 等可视化工具）

`app` 容器访问数据库走的是 **Docker 内部网络**——连接串 `postgresql+pg8000://postgres:postgres123@db:5432/zerd` 里的 `db` 是**服务名**（由 Compose 网络内置 DNS 解析成容器内网 IP），因此**不需要**对外暴露端口，应用也能正常连库。

但数据库可视化工具（TablePlus、Navicat 等）跑在**宿主机**上，默认连不到容器内的数据库——因为 `db` 的 `5432` 端口没有映射到宿主机。两者的区别：

```
app 容器 ── db:5432 ──▶ db 容器（容器内部网络，天然互通）
宿主机(可视化工具) ──✗──▶ db 容器（宿主端口未映射，连不上）
```

要让可视化工具连接，需在 `docker-compose.yml` 中为 `db` 服务取消端口映射注释：

```yaml
  db:
    # ...
    ports:
      - "5432:5432"        # 左侧「宿主端口」:右侧「容器端口」
```

然后重启生效：

```bash
$ docker compose up -d
```

之后用以下信息连接：

| 参数     | 值                              |
| -------- | ------------------------------- |
| Host     | `localhost`（或 `127.0.0.1`）    |
| Port     | `5432`                          |
| User     | `postgres`                      |
| Password | `postgres123`                   |
| Database | `zerd`                          |

> 注意：默认注释掉端口映射，正是为了规避「宿主机 `5432` 已被其它 PostgreSQL 占用」的冲突。若你的宿主机 `5432` 已被占用，把左侧端口改成其它值即可，例如 `"15432:5432"`，可视化工具里 Port 填 `15432`。

> 不想暴露端口时，也可直接在容器内查询，无需映射端口：`docker compose exec db psql -U postgres -d zerd`

静态资源示例：<code>http://localhost:8080/static/images/1@theme.png</code>

微信小程序相关配置（`APP_ID/APP_SECRET` 等）可在 `docker-compose.yml` 中取消注释并填写。

## 本地手动启动

适合想要本地开发调试的环境，依赖 uv 管理 Python 环境。

### 安装依赖

项目使用 [uv](https://github.com/astral-sh/uv) 管理 Python 依赖（替代 pipenv）。

```bash
$ uv sync                         # 安装依赖
$ uv add flask                    # 添加依赖
$ uv add flask==2.0.3             # 添加指定版本依赖
$ uv remove flask                 # 删除依赖
$ uv run python server.py         # 在虚拟环境中运行命令
$ source .venv/bin/activate       # 激活虚拟环境
$ source .venv/Scripts/activate   # windows 上激活虚拟环境
```

### 本地启动

```bash
$ git clone https://github.com/Allen7D/mini-shop-server.git
$ git clone --depth=1 -b master --single-branch git@github.com:Allen7D/mini-shop-server.git  # 浅克隆(只克隆指定分支，且只下载最近的提交历史)
$ cd mini-shop-server
$ uv venv --python 3.12           # 创建指定 Python 3.12 版本的虚拟环境
$ uv sync                         # 创建虚拟环境并安装所有依赖
$ uv run python server.py run     # 启动方式1:默认5000端口
$ uv run python server.py run -p 8080                 # 启动方式2:改为8080端口
$ uv run python server.py run -h 0.0.0.0 -p 8080     # 启动方式3:以本地IP地址访问

# 或者激活虚拟环境后运行
$ source .venv/bin/activate       # 激活虚拟环境
$ source .venv/Scripts/activate   # windows 上激活虚拟环境
$ python server.py run            # 在虚拟环境中直接运行
```

### 开发环境生成临时管理员信息

```bash
$ uv run python fake.py
```

::: tip 下一步
项目已能正常启动，接下来看 [目录结构](/guide/structure) 了解代码怎么组织的。
:::