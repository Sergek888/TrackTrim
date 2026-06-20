const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const TRACK_MARKER_SIZE = 20

export function createLayersIcon(): SVGSVGElement {
  const icon = document.createElementNS(SVG_NAMESPACE, 'svg')

  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('fill', 'none')
  icon.setAttribute('stroke', 'currentColor')
  icon.setAttribute('stroke-linecap', 'round')
  icon.setAttribute('stroke-linejoin', 'round')
  icon.setAttribute('viewBox', '0 0 24 24')

  for (const pathData of [
    'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z',
    'm22 12.5-9.17 4.17a2 2 0 0 1-1.66 0L2 12.5',
    'm22 17.5-9.17 4.17a2 2 0 0 1-1.66 0L2 17.5',
  ]) {
    const path = document.createElementNS(SVG_NAMESPACE, 'path')
    path.setAttribute('d', pathData)
    icon.append(path)
  }

  return icon
}

export function createMapStyleButton(onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button')

  button.className = 'maplibregl-ctrl-icon map-style-toggle'
  button.type = 'button'
  button.title = 'Стили карты'
  button.setAttribute('aria-label', 'Стили карты')
  button.setAttribute('aria-controls', 'map-style-panel')
  button.setAttribute('aria-expanded', 'false')
  button.append(createLayersIcon())
  button.addEventListener('click', onClick)

  return button
}

export function createTrackMarkerImage(kind: 'start' | 'finish'): ImageData {
  const canvas = document.createElement('canvas')
  const scale = 2
  const size = TRACK_MARKER_SIZE * scale
  const center = size / 2
  const radius = center - scale
  const context = canvas.getContext('2d')

  canvas.width = size
  canvas.height = size

  if (context === null) {
    return new ImageData(size, size)
  }

  context.save()
  context.beginPath()
  context.arc(center, center, radius, 0, Math.PI * 2)
  context.clip()

  if (kind === 'start') {
    context.fillStyle = '#16a34a'
    context.fillRect(0, 0, size, size)
  } else {
    const squareSize = 5 * scale

    for (let row = 0; row < size / squareSize; row += 1) {
      for (let column = 0; column < size / squareSize; column += 1) {
        context.fillStyle = (row + column) % 2 === 0 ? '#111827' : '#ffffff'
        context.fillRect(column * squareSize, row * squareSize, squareSize, squareSize)
      }
    }
  }

  context.restore()
  context.beginPath()
  context.arc(center, center, radius, 0, Math.PI * 2)
  context.strokeStyle = '#ffffff'
  context.lineWidth = 2 * scale
  context.stroke()

  return context.getImageData(0, 0, size, size)
}
