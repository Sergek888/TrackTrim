export const TRACK_COLORS = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#be123c',
  '#4f46e5',
]

export function defaultTrackColor(index: number): string {
  return TRACK_COLORS[index % TRACK_COLORS.length]
}
