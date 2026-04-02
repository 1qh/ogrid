const pxToGridH = (px: number, rowHeight: number, marginY: number) =>
    Math.ceil((px + 1 + marginY) / (rowHeight + marginY)),
  measureNaturalHeight = (el: HTMLDivElement) => {
    const parent = el.parentElement
    if (!parent) return el.scrollHeight
    const prevHeight = parent.style.height
    parent.style.height = 'auto'
    const natural = el.scrollHeight
    parent.style.height = prevHeight
    return natural
  }
export { measureNaturalHeight, pxToGridH }
