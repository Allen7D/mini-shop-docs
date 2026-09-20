# 部署篇

本项目部署在 Linux 服务器上，技术栈为 **Nginx + Gunicorn + uv**，其中 Gunicorn 取代了 uWsgi。

> 早期教程常用 uWsgi 部署 Flask，但 uWsgi 与 Flask 结合会出现一些难以排查的 bug，所以这里改用更轻量的 Gunicorn。

## 技术选型

| 组件 | 作用 |
|---|---|
| **Gunicorn** | Python WSGI 服务器，承载 Flask 应用（多 worker 并发） |
| **Nginx** | 反向代理 + 静态资源服务 + HTTPS（SSL 终止） |
| **uv** | Python 依赖和虚拟环境管理 |
| **supervisor** | 守护 Gunicorn 进程，崩溃自动重启 |

部署链路：

```
浏览器 → Nginx(443, HTTPS) → Gunicorn(127.0.0.1:8080) → Flask app
                        └─ /static/ → 服务器磁盘静态文件
```

## 服务器安装 uv

安装 uv 包管理工具：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## 部署步骤

```bash
# 1. 克隆项目
git clone https://github.com/Allen7D/mini-shop-server.git
cd mini-shop-server

# 2. 使用 uv 安装依赖
uv sync

# 3. 运行服务（Gunicorn，4 个 worker，绑定 127.0.0.1:8080）
uv run gunicorn -w 4 -b 127.0.0.1:8080 server:app
```

> `server:app` 表示从 `server.py` 导入 `app`（Flask 应用实例）。Gunicorn 没有绑定到公网 IP，而是 `127.0.0.1`，由 Nginx 在更靠前的位置接收外部请求并转发过来。

**关闭占用 8080 端口的服务：**

```bash
fuser -k 8080/tcp
```

::: tip 两种运行方式
- **直接运行** `gunicorn`：适合测试，进程随终端退出而结束
- **supervisor 守护**：生产环境推荐，进程崩溃自动重启，随系统自启
:::

## supervisor 守护进程（生产推荐）

用 supervisor 管理 Gunicorn，保证服务常驻。

### 配置文件

路径 `/etc/supervisor/conf.d/server.conf`：

```ini
[program:server]
# 注释/说明：使用虚拟环境中的 gunicorn
environment=PATH='/root/.local/share/virtualenvs/server-4o3oDD8t/bin/python'
command = /root/.local/share/virtualenvs/server-4o3oDD8t/bin/gunicorn -w 4 -b unix:/home/workspace/morning-star/server/server.sock server:app
directory = /home/workspace/morning-star/server
user = root
# 日志输出
stderr_logfile=/tmp/blog_stderr.log
stdout_logfile=/tmp/blog_stdout.log
```

> 生产环境通常用 **Unix socket**（`server.sock`）方式启动 Gunicorn，Nginx 通过 socket 与 Gunicorn 通信，比 TCP 端口更高效、更安全。外网请求先进 Nginx，由 Nginx 反代到 socket。

### 启动 / 重启

```bash
supervisorctl restart server
```

## Nginx 反向代理

Nginx 接收外部请求，一是把 HTTPS 请求反代到 Gunicorn，二是直接服务 `/static/` 静态资源（图片、文件）。

### Nginx 配置

建立 `sites-available` 与 `sites-enabled` 的软链接同步：

```bash
# 文件A(源) → 文件B(目标) 快捷方式
ln -s /etc/nginx/sites-available/server /etc/nginx/sites-enabled/server
```

`/etc/nginx/sites-available/server` 配置内容：

```nginx
server {
    listen 443 default;
    server_name www.ivinetrue.com ivinetrue.com;
    ssl on;
    root html;
    index index.html index.htm;
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    ssl_certificate cert/ivinetrue.pem;
    ssl_certificate_key cert/ivinetrue.key;
    ssl_session_timeout 10m;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE:ECDH:AES:HIGH:!NULL:!aNULL:!MD5:!ADH:!RC4;
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
    ssl_prefer_server_ciphers on;
    location / {
        include proxy_params;
        proxy_pass http://unix:/home/workspace/mini-shop-server/server.sock;
        # proxy_pass http://127.0.0.1:8080; # 弃用
        proxy_redirect off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_headers_hash_max_size 51200;
        proxy_headers_hash_bucket_size 6400;
    }
    location /static/ {
        alias /home/workspace/mini-shop-server/app/static/; # 静态资源文件路径
    }
}

server {
    listen 80;
    server_name www.ivinetrue.com ivinetrue.com;
    rewrite ^(.*)$  https://$host$1 permanent; # http 强制跳转 https
}
```

### 关键点说明

- **HTTPS 终结在 Nginx**：`listen 443` + SSL 证书配置在 Nginx 层，外部走 HTTPS，内部 Nginx→Gunicorn 走 unix socket
- **`proxy_pass` 指向 socket**：`http://unix:/home/workspace/mini-shop-server/server.sock` 与 supervisor 里 Gunicorn 启动的 socket 路径一致（若用 TCP 则填 `http://127.0.0.1:8080`）
- **`/static/` 单独处理**：静态资源（图片、文件）由 Nginx 直接读磁盘，不经过 Python，性能更高
- **HTTP 强制跳 HTTPS**：第二个 `server` 块把所有 `80` 端口请求 `rewrite` 到 `https`

### Nginx 其他配置

Nginx 的公共配置（例如 gzip、全局参数）在 `/etc/nginx/nginx.conf` 修改。

### 常用运维命令

```bash
nginx -s stop    # 停止 nginx
nginx -s reload  # 重启 nginx（平滑重载配置，不中断服务）
```

## 部署链路总结

```
外部请求
  → Nginx(443, HTTPS / SSL终止)
      ├─ 反向代理到 Gunicorn(socket 或 127.0.0.1:8080)
      │     → Flask app(处理业务)
      └─ /static/ → 磁盘静态文件
```

三件套的分工：

- **Nginx**：对外入口——HTTPS、静态资源、把动态请求转给 Gunicorn
- **Gunicorn**：Python 应用服务器——多 worker 并发承载 Flask
- **supervisor**：守护进程——保证 Gunicorn 常驻、崩溃自动拉起

## 部署自查清单

- [ ] uv 已安装，`uv sync` 依赖安装成功
- [ ] Gunicorn 能直接启动（`uv run gunicorn -w 4 -b 127.0.0.1:8080 server:app`）
- [ ] supervisor 配置生效，`supervisorctl status` 显示服务运行
- [ ] Nginx 软链接已建立，`nginx -t` 语法检查通过
- [ ] `nginx -s reload` 后，浏览器访问域名能看到 Swagger 文档
- [ ] 静态资源 `/static/...` 能正常访问
- [ ] HTTP 请求能自动跳转 HTTPS