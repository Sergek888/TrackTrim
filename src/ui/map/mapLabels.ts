import type { ExpressionSpecification } from 'maplibre-gl'
import type { MapLabelMode } from './mapStyleSettings'

export function mapLabelTextField(labelMode: MapLabelMode): ExpressionSpecification {
  const localName: ExpressionSpecification = ['coalesce', ['get', 'name'], '']
  const russianName: ExpressionSpecification = [
    'coalesce',
    ['get', 'name:ru'],
    ['get', 'name_ru'],
    localName,
  ]
  const englishName: ExpressionSpecification = [
    'coalesce',
    ['get', 'name:en'],
    ['get', 'name_en'],
    ['get', 'name:latin'],
    localName,
  ]

  if (labelMode === 'ru') {
    return russianName
  }

  if (labelMode === 'en') {
    return englishName
  }

  if (labelMode === 'dual') {
    return [
      'case',
      ['==', localName, englishName],
      localName,
      ['concat', localName, '\n', englishName],
    ]
  }

  return localName
}
