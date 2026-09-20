// VitePress 默认主题 + 自定义增强
import DefaultTheme from 'vitepress/theme'
import './mermaid-zoom.css'
import { enhanceMermaidZoom } from './mermaid-zoom'

export default {
  ...DefaultTheme,
  enhanceApp: () => {
    // 路由切换后自动重新绑定 mermaid 放大按钮（内部用 MutationObserver 兜底）
    if (typeof window !== 'undefined') {
      enhanceMermaidZoom()
    }
  },
}