import { LocalFileTrackSource } from '../../application/sources/LocalFileSource'
import { KomootTrackSource } from '../../application/sources/KomootTrackSource'
import { Track } from '../Track'
import { TrackMeta } from '../TrackMeta'
import { TrackPoint } from '../TrackPoint'
import { TrackSegment } from '../TrackSegment'
import { ViewPoint } from '../ViewPoint'
import { registerModel } from './BaseModel'

let registered = false

export function registerModels(): void {
  if (registered) {
    return
  }

  registerModel(Track)
  registerModel(TrackSegment)
  registerModel(TrackPoint)
  registerModel(ViewPoint)
  registerModel(TrackMeta)
  registerModel(KomootTrackSource)
  registerModel(LocalFileTrackSource)

  registered = true
}
