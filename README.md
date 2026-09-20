# mini-shop-docs

[mini-shop-server](https://github.com/Allen7D/mini-shop-server) 的在线文档站，基于 [VitePress](https://vitepress.dev) 构建，自动部署到 GitHub Pages。

## 访问

- 文档站：https://allen7d.github.io/mini-shop-docs

## 本地开发

```bash
pnpm install        # 安装依赖
pnpm dev            # 本地开发（默认 http://localhost:5173）
pnpm build          # 构建静态站点（输出到 docs/.vitepress/dist）
pnpm preview        # 本地预览构建产物
```

## 文档结构

```
docs/
├── index.md              # 首页
├── .vitepress/config.ts  # 站点配置（导航/侧边栏/base）
├── guide/                # 入门指南（面向初学者 / 前端开发者）
└── api/                  # API 参考（v1 C端 / cms B端）
```

## 部署

推送到 `main` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）会自动构建并发布到 GitHub Pages。Pages 源需在仓库 Settings → Pages 设为 **GitHub Actions**。

## 维护说明

- 内容全部是 Markdown，直接改 `docs/` 下的 `.md` 文件
- 内部链接用不带 base 前缀的相对路径（如 `/guide/redprint`），构建时自动加 `/mini-shop-docs/`
- `base` 已在 `docs/.vitepress/config.ts` 配置为 `/mini-shop-docs/`，勿改