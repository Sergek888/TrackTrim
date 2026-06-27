import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type ExtraButton = { icon: ReactNode; label: string; title: string; active?: boolean; controls?: string; onClick: () => void }

type Props = {
  extraButtons?: readonly ExtraButton[]
  controlGroup: HTMLElement | null
}

export default function MapControlBar({ extraButtons, controlGroup }: Props) {
  const extraButtonRefs = useRef<HTMLButtonElement[]>([])
  const [ready, setReady] = useState(false)
  const latest = useRef({ extraButtons })
  latest.current = { extraButtons }

  useEffect(() => {
    if (controlGroup === null) return

    const buttons = (latest.current.extraButtons ?? []).map((cfg) => {
      const item = document.createElement('button')
      item.className = 'maplibregl-ctrl-icon map-extra-toggle'
      item.type = 'button'
      item.setAttribute('aria-label', cfg.label)
      item.setAttribute('title', cfg.title)
      item.setAttribute('aria-pressed', String(cfg.active ?? false))
      item.toggleAttribute('data-active', cfg.active ?? false)
      if (cfg.controls !== undefined) item.setAttribute('aria-controls', cfg.controls)
      item.onclick = cfg.onClick
      controlGroup.append(item)
      return item
    })

    extraButtonRefs.current = buttons
    setReady(true)
  }, [controlGroup])

  useEffect(() => {
    extraButtonRefs.current.forEach((button, index) => {
      const cfg = extraButtons?.[index]
      if (cfg === undefined) return
      button.setAttribute('aria-label', cfg.label)
      button.setAttribute('title', cfg.title)
      button.setAttribute('aria-pressed', String(cfg.active ?? false))
      button.toggleAttribute('data-active', cfg.active ?? false)
      if (cfg.controls !== undefined) button.setAttribute('aria-controls', cfg.controls)
      button.onclick = cfg.onClick
    })
  }, [extraButtons])

  if (!ready) return null
  return extraButtonRefs.current.map((button, index) => {
    const config = extraButtons?.[index]
    return config === undefined ? null : createPortal(config.icon, button)
  })
}
