const allowedPaths = [
  /^\/users\/\d+\/?$/,
  /^\/users\/\d+\/tours\/?$/,
  /^\/tours\/\d+\/?$/,
  /^\/discover_tours\/\d+\/?$/,
  /^\/tours\/\d+\/coordinates\/?$/,
  /^\/tours\/\d+\/timeline\/?$/,
  /^\/tours\/\d+\/images\/?$/,
  /^\/tours\/\d+\.gpx$/,
  /^\/tours\/\d+\/download\/?$/,
  /^\/collections\/?$/,
  /^\/collections\/added\/?$/,
  /^\/collections\/\d+\/?$/,
  /^\/collections\/\d+\/summary\/?$/,
  /^\/collections\/\d+\/compilation\/?$/,
  /^\/collections\/\d+\/compilation_lines\/?$/,
  /^\/collections\/\d+\/compilation_lines_extended\/?$/,
]

export function isAllowedKomootProxyRequest(method: string, path: string): boolean {
  if (method !== 'GET' || !path.startsWith('/') || path.includes('://')) {
    return false
  }
  const pathname = path.split('?')[0] ?? path
  return allowedPaths.some((pattern) => pattern.test(pathname))
}
