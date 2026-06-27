import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { createMapStyleButton } from './mapIcons'

export type ExtraButton = { icon: ReactNode; label: string; title: string; active?: boolean; controls?: string; onClick: () => void }

type Props = {
  extraButtons?: readonly ExtraButton[]
  isMapSettingsOpen: boolean
  onMapSettingsToggle: () => void
  controlGroup: HTMLElement | null
}

export default function MapControlBar({ extraButtons, isMapSettingsOpen, onMapSettingsToggle, controlGroup }: Props) {
  const styleButtonRef = useRef<HTMLButtonElement | null>(null)
  const extraButtonRefs = useRef<HTMLButtonElement[]>([])
  const [ready, setReady] = useState(false)
  const latest = useRef({ extraButtons, isMapSettingsOpen, onMapSettingsToggle })
  latest.current = { extraButtons, isMapSettingsOpen, onMapSettingsToggle }

  useEffect(() => {
    if (controlGroup === null) return

    const handleStyleClick = () => latest.current.onMapSettingsToggle()
    const button = createMapStyleButton(handleStyleClick)
    controlGroup.append(button)
    styleButtonRef.current = button

    extraButtonRefs.current = (latest.current.extraButtons ?? []).map(() => {
      const item = document.createElement('button')
      item.className = 'maplibregl-ctrl-icon map-extra-toggle'
      item.type = 'button'
      controlGroup.append(item)
      return item
    })

    setReady(true)
  }, [controlGroup])

  useEffect(() => {
    styleButtonRef.current?.setAttribute('aria-expanded', String(isMapSettingsOpen))
  }, [isMapSettingsOpen])

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
