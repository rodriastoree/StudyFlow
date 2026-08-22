const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

type ApiRequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown
  headers?: HeadersInit
  token?: string
}

function buildUrl(path: string) {
  if (!configuredBaseUrl) {
    throw new Error('VITE_API_BASE_URL no está configurada.')
  }

  const baseUrl = configuredBaseUrl.endsWith('/') ? configuredBaseUrl : `${configuredBaseUrl}/`
  return new URL(path.replace(/^\//, ''), baseUrl)
}

function getErrorMessage(status: number, payload: unknown) {
  if (typeof payload === 'string' && payload.trim()) return payload

  if (payload && typeof payload === 'object') {
    const error = payload as Record<string, unknown>
    if (typeof error.message === 'string' && error.message.trim()) return error.message
    if (typeof error.title === 'string' && error.title.trim()) return error.title
  }

  return `La API respondió con el estado HTTP ${status}.`
}

async function readResponse(response: Response) {
  if (response.status === 204) return undefined

  const content = await response.text()
  if (!content) return undefined

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    try {
      return JSON.parse(content) as unknown
    } catch {
      throw new ApiError('La API devolvió una respuesta JSON inválida.', response.status, content)
    }
  }

  return content
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, headers: customHeaders, token, ...requestOptions } = options
  const headers = new Headers(customHeaders)
  headers.set('Accept', 'application/json')

  if (body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(buildUrl(path), {
    ...requestOptions,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await readResponse(response)

  if (!response.ok) {
    throw new ApiError(getErrorMessage(response.status, payload), response.status, payload)
  }

  return payload as T
}
