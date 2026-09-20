---
layout: home

hero:
  name: mini-shop-server
  text: 微信小程序商城后端 · 架构与文档
  tagline: 基于 Flask 的完整商城后端 —— 红图分层、AOP 设计、自动生成 Swagger 文档
  actions:
    - theme: brand
      text: 开始学习
      link: /guide/
    - theme: alt
      text: 查看 API 参考
      link: /api/
    - theme: alt
      text: GitHub 仓库
      link: https://github.com/Allen7D/mini-shop-server

features:
  - title: 分层架构
    details: 接口 → 校验 → 业务 → DAO → Model，职责单一、逐层解耦，代码清晰可维护
  - title: 红图 Redprint
    details: 比蓝图更灵活的路由组织方式，自由组合注册、控制文档顺序
  - title: AOP 设计
    details: 认证、异常、日志作为「装饰器壳」从业务中抽出，代码干净可维护
  - title: 自动 API 文档
    details: 基于 flasgger 自动生成 Swagger 风格文档，可带 Token 调试
  - title: 双端接口
    details: C 端（v1，小程序用户）与 B 端（cms，后台管理）分离
  - title: 生产可用
    details: uv 现代化依赖管理，Nginx + Gunicorn 部署配置齐全
---

<div style="margin-top:24px;padding:18px 22px;border-left:4px solid #FF6A00;background:#FFF4E6;border-radius:8px">
  <b style="color:#C94F00">开始之前</b>
  <p style="margin:8px 0 0">面向 <b>初学者</b> 的入门文档，讲解 Flask 后端的整体架构。建议从 <a href="/guide/">入门指南</a> 顺序阅读。</p>
</div>