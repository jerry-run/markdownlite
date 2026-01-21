import mermaid from 'mermaid'

// Mermaid 全局配置：保持与原实现一致
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  fontSize: 12,
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
    nodeSpacing: 50,
    rankSpacing: 50,
    padding: 15,
    wrap: true,
    paddingX: 20,
    paddingY: 15,
  },
  themeVariables: {
    fontSize: '12px',
    fontFamily: 'inherit',
    primaryTextColor: '#d4d4d4',
    primaryBorderColor: '#3c3c3c',
    lineColor: '#858585',
    secondaryColor: '#007acc',
    tertiaryColor: '#1e1e1e',
    nodeBkg: '#1e1e1e',
    nodeBorder: '#3c3c3c',
    clusterBkg: '#1e1e1e',
    clusterBorder: '#3c3c3c',
    defaultLinkColor: '#858585',
    titleColor: '#d4d4d4',
    edgeLabelBackground: '#1e1e1e',
    actorBorder: '#3c3c3c',
    actorBkg: '#1e1e1e',
    actorTextColor: '#d4d4d4',
    actorLineColor: '#858585',
    signalColor: '#d4d4d4',
    signalTextColor: '#d4d4d4',
    labelBoxBkgColor: '#1e1e1e',
    labelBoxBorderColor: '#3c3c3c',
    labelTextColor: '#d4d4d4',
    loopTextColor: '#d4d4d4',
    noteBorderColor: '#3c3c3c',
    noteBkgColor: '#1e1e1e',
    noteTextColor: '#d4d4d4',
    activationBorderColor: '#3c3c3c',
    activationBkgColor: '#1e1e1e',
    sequenceNumberColor: '#d4d4d4',
    sectionBkgColor: '#1e1e1e',
    altBkgColor: '#1e1e1e',
    altBorderColor: '#3c3c3c',
  },
})

function findMermaidElementByCode(container, targetCode) {
  if (!container || !targetCode) return null
  const allMermaid = container.querySelectorAll('.mermaid')
  for (const el of allMermaid) {
    const codeAttr = el.getAttribute('data-mermaid-code')
    if (codeAttr === targetCode) return el
  }
  return null
}

export async function renderMermaidInContainer(container, { renderId, isStale } = {}) {
  if (!container) return
  if (typeof mermaid?.render !== 'function') return

  const placeholders = Array.from(container.querySelectorAll('.mermaid:not([data-processed])'))

  for (let i = 0; i < placeholders.length; i++) {
    if (typeof isStale === 'function' && isStale()) return

    const codeAttrRaw = placeholders[i].getAttribute('data-mermaid-code')
    if (!codeAttrRaw) continue

    let code = codeAttrRaw
    try {
      code = decodeURIComponent(codeAttrRaw)
    } catch {
      // ignore
    }

    code = code
      .trim()
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')

    const id = `mermaid-${Date.now()}-${i}-${renderId ?? 0}`
    const renderResult = await mermaid.render(id, code)
    const svgContent = renderResult?.svg || renderResult

    if (typeof isStale === 'function' && isStale()) return

    const target = findMermaidElementByCode(container, codeAttrRaw)
    if (!target) continue

    target.id = id
    target.className = 'mermaid'
    target.innerHTML = svgContent
    target.setAttribute('data-processed', 'true')
  }
}

