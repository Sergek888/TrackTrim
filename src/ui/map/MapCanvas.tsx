import { forwardRef } from 'react'

const MapCanvas = forwardRef<HTMLDivElement>(function MapCanvas(_, ref) {
  return <div className="track-map" ref={ref} aria-label="Track map" />
})

export default MapCanvas
