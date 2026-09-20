// Mermaid 图放大：右上角悬浮按钮 → 点击在 Modal 居中放大
// 用事件委托 + MutationObserver，不修改插件渲染逻辑，对全部 mermaid 生效

const BUTTON_TEXT = '⛶'      // 全屏放大图标

let dialogEl: HTMLElement | null = null

// 创建共享的全屏 Modal(dialog 元素)
function ensureDialog(): HTMLElement {
  if (dialogEl) return dialogEl
  dialogEl = document.createElement('div')
  dialogEl.className = 'mermaid-zoom-dialog'
  dialogEl.setAttribute('role', 'dialog')
  dialogEl.innerHTML = `
    <div class="mermaid-zoom-backdrop"></div>
    <div class="mermaid-zoom-panel">
      <button class="mermaid-zoom-close" aria-label="关闭">&times;</button>
      <div class="mermaid-zoom-body"></div>
    </div>
  `
  document.body.appendChild(dialogEl)
  // 关闭按钮
  dialogEl.querySelector('.mermaid-zoom-close')!.addEventListener('click', close)
  // 点击遮罩关闭
  dialogEl.querySelector('.mermaid-zoom-backdrop')!.addEventListener('click', close)
  // Esc 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
  })
  return dialogEl
}

function close() {
  if (dialogEl) {
    dialogEl.classList.remove('open')
    document.body.style.overflow = ''
  }
}

function openModal(svg: SVGElement) {
  const dlg = ensureDialog()
  const body = dlg.querySelector('.mermaid-zoom-body')!
  // 克隆 SVG 放大展示（不影响原图）
  body.innerHTML = ''
  const clone = svg.cloneNode(true) as SVGElement
  clone.removeAttribute('style')
  clone.style.width = '100%'
  clone.style.height = '100%'
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  body.appendChild(clone)
  dlg.classList.add('open')
  document.body.style.overflow = 'hidden'  // 禁止背景滚动
}

// 给一个 mermaid 容器加放大按钮(若尚未加)
function decorate(container: Element) {
  if (container.querySelector('.mermaid-zoom-btn')) return   // 已加过
  container.classList.add('mermaid-zoom-has-btn')            // 供 CSS 定 relative
  const btn = document.createElement('button')
  btn.className = 'mermaid-zoom-btn'
  btn.innerHTML = BUTTON_TEXT
  btn.setAttribute('aria-label', '放大图表')
  btn.setAttribute('title', '放大')
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    const svg = container.querySelector('svg')
    if (svg) openModal(svg as SVGElement)
  })
  container.appendChild(btn)
}

export function enhanceMermaidZoom() {
  if (typeof window === 'undefined') return

  const scan = () => {
    document.querySelectorAll('.mermaid').forEach(decorate)
  }

  // 首扫
  scan()

  // 监听 DOM 变化：新增的 mermaid 块自动加按钮
  // (VitePress SPA 路由切换时 content 被替换，靠这个兜底)
  const observer = new MutationObserver(() => scan())
  observer.observe(document.body, { childList: true, subtree: true })
}