export function formatFileSize(bytes: number): string {
  const megabytes = bytes / 1024 / 1024

  if (megabytes >= 1) {
    return `${megabytes.toFixed(1)} MB`
  }

  const kilobytes = bytes / 1024

  if (kilobytes >= 1) {
    return `${kilobytes.toFixed(1)} KB`
  }

  return `${bytes} B`
}

export function formatModifiedDate(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

export function formatDateTime(date: Date | null): string {
  if (date === null) {
    return 'Unknown'
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export function formatPointDate(date: Date | null): string {
  if (date === null) {
    return 'not available'
  }

  return formatModifiedDate(date.getTime())
}

export function formatNullableNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return 'not available'
  }

  return String(value)
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return 'Unknown'
  }

  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

export function formatDistance(distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km`
}

export function formatAverageSpeed(speedKmh: number | null): string {
  if (speedKmh === null) {
    return 'Unknown'
  }

  return `${speedKmh.toFixed(1)} km/h`
}
