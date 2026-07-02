import { LocalFileTrackSource } from '../../application/sources/LocalFileSource'
import { KomootTrackSource } from '../../application/sources/KomootTrackSource'
import { Track } from '../Track'
import { TrackMeta } from '../TrackMeta'
import { TrackPoint } from '../TrackPoint'
import { TrackSegment } from '../TrackSegment'
import { ViewPoint } from '../ViewPoint'
import { ModelSerializer } from './ModelSerializer'

export function registerTrackModels(): void {
  ModelSerializer.register(Track)
  ModelSerializer.register(TrackSegment)
  ModelSerializer.register(TrackPoint)
  ModelSerializer.register(ViewPoint)
  ModelSerializer.register(TrackMeta)
  ModelSerializer.register(KomootTrackSource)
  ModelSerializer.register(LocalFileTrackSource)
}
