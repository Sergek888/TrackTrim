type Padding = number | { top: number; right: number; bottom: number; left: number }

export function getInitialFitPadding(isRightPanelOpen: boolean): Padding {
  return isRightPanelOpen ? { top: 64, right: 424, bottom: 64, left: 64 } : 64
}

export function getFocusFitPadding(isRightPanelOpen: boolean): Padding {
  return isRightPanelOpen ? { top: 80, right: 440, bottom: 80, left: 80 } : 80
}
