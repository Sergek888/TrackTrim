import type { MapLayerGroup } from '../model/MapLayerGroup'

export const mapLayerGroups: MapLayerGroup[] = [
  { id: 'base', title: 'Основные карты', order: 100 }, { id: 'topo', title: 'Топографические карты', order: 200 },
  { id: 'satellite', title: 'Спутник', order: 300 }, { id: 'relief', title: 'Рельеф', order: 400 },
  { id: 'routes', title: 'Маршруты и тропы', order: 500 }, { id: 'activity', title: 'Следы активности', order: 600 },
]
