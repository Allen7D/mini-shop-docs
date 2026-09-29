# VSCode 调试配置

Flask 项目支持通过 VSCode 调试配置。

在本地开发时，调试模式可以直接在编辑器里打断点、逐行跟踪请求处理过程，并可以获取当前断点的执行上下文、调用栈。

![](https://raw.githubusercontent.com/Allen7D/ImageHosting/main/images/20260929091745.png)

## 前置准备
### 环境安装

1. 安装 [VSCode](https://code.visualstudio.com/)。
2. 安装 Python 扩展（Microsoft 官方扩展）。
3. 在项目根目录执行过 `uv sync`，虚拟环境已经可用。

### 调试配置

项目根目录 `.vscode/launch.json` 内容如下：

![image.png](https://raw.githubusercontent.com/Allen7D/ImageHosting/main/images/20260929093835.png)

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Flask: 调试模式",
            "type": "debugpy",
            "request": "launch",
            "module": "flask",
            "args": [
                "run",
                "--host", "127.0.0.1",
                "--port", "5000"
            ],
            "console": "integratedTerminal",
            "env": {
                "FLASK_APP": "server",
                "FLASK_ENV": "development",
                "FLASK_DEBUG": "1"
            }
        }
    ]
}
```

### 字段说明

| 字段 | 值 | 作用 |
| --- | --- | --- |
| `name` | `Flask: 调试模式` | 在 VSCode 调试面板显示的名称 |
| `type` | `debugpy` | 使用 debugpy 作为调试后端 |
| `request` | `launch` | 由调试器拉起新进程 |
| `module` | `flask` | 以 Python 模块方式运行 Flask |
| `args` | `run --host 127.0.0.1 --port 5000` | 传给 Flask 的命令行参数 |
| `console` | `integratedTerminal` | 在集成终端中运行 |
| `env.FLASK_APP` | `server` | 指定应用入口为 `server.py` |
| `env.FLASK_ENV` | `development` | 开启开发环境特性 |
| `env.FLASK_DEBUG` | `1` | 启用 Flask 调试模式（'1': 'on'; '0': 'off'） |


## 启动调试

打开项目后，按 `F5`（或点击左侧插件栏的「Run and Debug」→「Flask: 调试模式」），调试器会拉起 Flask 服务。

![image.png](https://raw.githubusercontent.com/Allen7D/ImageHosting/main/images/20260929092736.png)


默认监听 `127.0.0.1:5000`，启动后可用浏览器或接口工具访问接口。

启动后，终端输出如下:
![image.png](https://raw.githubusercontent.com/Allen7D/ImageHosting/main/images/20260929091621.png)

::: tip 按下 `F5` 发生了什么
按 `F5` 会启动，是因为 VS Code 把它绑定为 Start Debugging（启动调试） 命令。它会读取项目的 `launch.json`，找到当前选中的“Flask: 调试模式”配置，然后按配置启动进程。
:::


## 与命令行启动的区别

| 方式 | 命令 | 说明 |
| --- | --- | --- |
| 命令行启动 | `uv run python server.py run` | 走项目自定义启动逻辑 |
| VSCode 调试 | `flask run` | 走标准 Flask 启动流程，便于挂载调试器 |

两者都能正常启动项目，调试时建议用 `launch.json`。
