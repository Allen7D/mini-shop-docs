import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// 部署在 GitHub Pages 的子路径 /mini-shop-docs/ 下
const base = '/mini-shop-docs/'

export default withMermaid({
  lang: 'zh-CN',
  title: 'mini-shop-server 文档',
  description: '基于 Flask 的微信小程序商城后端 · 架构与开发文档',
  base,

  // 忽略指向 localhost 的本地服务链接（如 Swagger 文档地址）
  ignoreDeadLinks: [/^https?:\/\/localhost/],

  // 修复 dev 模式白屏：mermaid 的间接依赖(dayjs/sanitize-url/cytoscape等)以 CJS/UMD 的 main 导出，
  // Vite dev 下浏览器原生 import 拿不到 default 导致 SyntaxError。
  // 官方解法：alias 指到 ESM 入口 + 纳入预构建
  vite: {
    optimizeDeps: {
      include: ['@braintree/sanitize-url'],
    },
    resolve: {
      alias: {
        dayjs: 'dayjs/',
      },
    },
  },

  // 侧边栏 / 导航结构
  themeConfig: {
    // 顶部导航
    nav: [
      { text: '入门指南', link: '/guide/' },
      { text: '软件工程启示', link: '/guide/engineering' },
      { text: 'API 参考', link: '/api/' },
      { text: '部署篇', link: '/deploy/' },
      { text: 'GitHub', link: 'https://github.com/Allen7D/mini-shop-server' },
    ],

    // 侧边栏按目录分组
    sidebar: {
      '/guide/': [
        {
          text: '理解',
          items: [
            { text: '这是什么项目', link: '/guide/' },
            { text: '快速启动', link: '/guide/quickstart' },
            { text: '目录结构', link: '/guide/structure' },
            { text: '架构总览', link: '/guide/architecture' },
          ],
        },
        {
          text: '拆解',
          items: [
            { text: '红图 Redprint', link: '/guide/redprint' },
            { text: '一次请求的生命周期', link: '/guide/request' },
            { text: '统一异常与响应格式', link: '/guide/response' },
            { text: '统一的 JSON 序列化器', link: '/guide/serializer' },
            { text: '参数校验层', link: '/guide/validator' },
            { text: '权限认证 Token', link: '/guide/auth' },
            { text: '数据层 Model / DAO', link: '/guide/data-layer' },
          ],
        },
        {
          text: '动手',
          items: [
            { text: '实战拆解·下单流程', link: '/guide/case-order' },
            { text: '动手·添加新接口', link: '/guide/practice' },
          ],
        },
        {
          text: '回顾',
          items: [
            { text: '软件工程启示', link: '/guide/engineering' },
            { text: '下一步怎么学', link: '/guide/next' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '总览', link: '/api/' },
            { text: 'C 端接口 (v1)', link: '/api/v1' },
            { text: 'B 端接口 (cms)', link: '/api/cms' },
          ],
        },
      ],
      '/deploy/': [
        {
          text: '部署篇',
          items: [
            { text: '服务器部署（Nginx + Gunicorn）', link: '/deploy/' },
          ],
        },
      ],
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Allen7D/mini-shop-docs' },
    ],

    // 页脚
    footer: {
      message: 'MIT License',
      copyright: 'Copyright © Allen7D',
    },

    // 右侧大纲
    outline: {
      level: [2, 3],
      label: '本页目录',
    },

    // 文档标题
    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },
  },

  // 内置搜索
  head: [
    ['meta', { name: 'theme-color', content: '#FF6A00' }],
  ],
})