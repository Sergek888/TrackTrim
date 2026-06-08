const KOMOOT_API_BASE = 'https://www.komoot.com/api/v007'
const KOMOOT_WEB_BASE = 'https://www.komoot.com'

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
}

function authHeader(email, password) {
  return `Basic ${Buffer.from(`${email}:${password}`, 'utf8').toString('base64')}`
}

async function readBody(request) {
  if (isRecord(request.body)) {
    return request.body
  }

  if (typeof request.body === 'string') {
    return request.body === '' ? {} : JSON.parse(request.body)
  }

  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  const text = Buffer.concat(chunks).toString('utf8')

  return text === '' ? {} : JSON.parse(text)
}

async function fetchKomootJson(url, email, password) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/hal+json',
      authorization: authHeader(email, password),
    },
  })

  if (response.status === 401 || response.status === 403) {
    throw new Error('Komoot authorization failed.')
  }

  if (!response.ok) {
    throw new Error(`Komoot request failed with ${response.status}.`)
  }

  return response.json()
}

function parseCoordinate(value) {
  if (!isRecord(value)) {
    return null
  }

  const lat = value.lat
  const lon = value.lng ?? value.lon

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null
  }

  const ele = value.alt ?? value.ele

  return {
    lat,
    lon,
    ele: typeof ele === 'number' ? ele : null,
    time: typeof value.t === 'string' || typeof value.t === 'number' ? value.t : null,
  }
}

function coordinateItems(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (!isRecord(response)) {
    return []
  }

  return Array.isArray(response.items) ? response.items : []
}

function tourIdFromItem(item) {
  if (!isRecord(item)) {
    return null
  }

  const id = item.id

  return typeof id === 'string' || typeof id === 'number' ? String(id) : null
}

function coordinatesUrlFromTour(tour, tourId) {
  const links = isRecord(tour._links) ? tour._links : null
  const coordinates = links !== null && isRecord(links.coordinates) ? links.coordinates : null
  const href = coordinates?.href

  if (typeof href === 'string' && href.trim() !== '') {
    return new URL(href, KOMOOT_WEB_BASE).toString()
  }

  return `${KOMOOT_API_BASE}/tours/${tourId}/coordinates`
}

async function fetchTourTrack(tourId, email, password) {
  const tour = await fetchKomootJson(`${KOMOOT_API_BASE}/tours/${tourId}`, email, password)
  const coordinatesResponse = await fetchKomootJson(
    coordinatesUrlFromTour(tour, tourId),
    email,
    password,
  )
  const points = coordinateItems(coordinatesResponse)
    .map((point) => parseCoordinate(point))
    .filter((point) => point !== null)

  if (points.length === 0) {
    return null
  }

  return {
    id: tourId,
    name: typeof tour.name === 'string' && tour.name.trim() !== '' ? tour.name : null,
    date: typeof tour.date === 'string' || typeof tour.date === 'number' ? tour.date : null,
    distance:
      typeof tour.distance_m === 'number'
        ? tour.distance_m
        : typeof tour.distance === 'number'
          ? tour.distance
          : null,
    points,
  }
}

async function fetchUserTourIds(userId, listType, email, password) {
  const tourType = listType === 'recorded' ? 'tour_recorded' : 'tour_planned'
  const ids = []
  let page = 0

  while (true) {
    const payload = await fetchKomootJson(
      `${KOMOOT_API_BASE}/users/${userId}/tours/?type=${tourType}&page=${page}&limit=50`,
      email,
      password,
    )
    const embedded = isRecord(payload._embedded) ? payload._embedded : null
    const tours = embedded !== null && Array.isArray(embedded.tours) ? embedded.tours : []

    ids.push(...tours.map((tour) => tourIdFromItem(tour)).filter((id) => id !== null))

    const pageInfo = isRecord(payload.page) ? payload.page : null
    const totalPages =
      pageInfo !== null && typeof pageInfo.totalPages === 'number'
        ? pageInfo.totalPages
        : page + 1

    page += 1

    if (page >= totalPages || tours.length === 0) {
      break
    }
  }

  return Array.from(new Set(ids))
}

async function fetchTracksInBatches(tourIds, email, password) {
  const tracks = []
  const batchSize = 4

  for (let index = 0; index < tourIds.length; index += batchSize) {
    const batch = tourIds.slice(index, index + batchSize)
    const batchTracks = await Promise.all(
      batch.map((tourId) => fetchTourTrack(tourId, email, password)),
    )

    tracks.push(...batchTracks.filter((track) => track !== null))
  }

  return tracks
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed.' })
    return
  }

  try {
    const body = await readBody(request)
    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const listType = body.listType === 'recorded' ? 'recorded' : 'planned'

    if (userId === '' || email === '' || password === '') {
      sendJson(response, 400, { error: 'Komoot user id, email, and password are required.' })
      return
    }

    const tourIds = await fetchUserTourIds(userId, listType, email, password)
    const tracks = await fetchTracksInBatches(tourIds, email, password)

    sendJson(response, 200, { tracks })
  } catch (error) {
    sendJson(response, 502, {
      error: error instanceof Error ? error.message : 'Komoot user tours could not be loaded.',
    })
  }
}
