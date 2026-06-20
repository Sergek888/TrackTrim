import { useEffect, useRef, useCallback } from 'react'

type UseNativeDialogOptions = {
  onClose: () => void
  initialFocusRef?: React.RefObject<HTMLElement | null>
}

export function useNativeDialog({ onClose, initialFocusRef }: UseNativeDialogOptions) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const closedRef = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement

    if (dialog === null) {
      return
    }

    closedRef.current = false
    dialog.showModal()

    const focusTarget = initialFocusRef?.current ?? closeButtonRef.current
    focusTarget?.focus()

    return () => {
      if (dialog.open) {
        closedRef.current = true
        dialog.close()
      }

      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
  }, [])

  const handleCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault()

      if (!closedRef.current) {
        closedRef.current = true
        onClose()
      }
    },
    [onClose],
  )

  const handleBackdropMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === event.currentTarget && !closedRef.current) {
        closedRef.current = true
        onClose()
      }
    },
    [onClose],
  )

  return {
    dialogRef,
    closeButtonRef,
    handleCancel,
    handleBackdropMouseDown,
  }
}
