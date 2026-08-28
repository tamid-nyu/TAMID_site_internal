import type {
  AdminResourceKey,
  ApiEnvelope,
  BulkMemberInput,
  BulkMemberSummary,
  BoardHeadshotReplacement,
  EventFlyerReplacement,
  MediaReplacementBody,
  ResourcePayload,
  StorageBucket,
  StorageDeleteBody,
  StorageObject,
  StorageUpdateBody,
  StorageUploadBody,
  InstagramStatus,
  InstagramMedia,
  InstagramStaged,
  InstagramPublished,
  InstagramQuota,
  CaptionCheck,
  InstagramAccountInsights,
  InstagramPostInsights,
  InstagramAudience,
  AiStatus,
  PostGenerationResult,
  AssistantResult,
  AssistantTurn,
} from './adminTypes'

type AdminErrorKind = 'unauthenticated' | 'forbidden' | 'request'

const PRODUCTION_BACKEND_HOSTS = new Set(['api.nyu-tamid.org'])
const PRODUCTION_SUPABASE_PROJECT_REF = '<your-project>'
const PRODUCTION_SUPABASE_URL = `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`

interface BackendErrorBody {
  error?: string | { message?: string; code?: string; details?: unknown }
  message?: string
  code?: string
}

export interface BackendRuntimeInfo {
  status?: string
  environment?: string
  supabase?: {
    environment?: string
    projectRef?: string
    url?: string
    isProduction?: boolean
  }
  database?: {
    environment?: string
    projectRef?: string
    supabaseProjectRef?: string
    supabaseUrl?: string
    isProduction?: boolean
  }
  [key: string]: unknown
}

export interface LocalProductionSafetyStatus {
  checked: boolean
  readOnly: boolean
  reasons: string[]
  backendUrl: string
  backendHealthUrl: string
  backendEnvironment?: string
  backendRuntime?: BackendRuntimeInfo
}

export class AdminApiError extends Error {
  status: number
  code?: string
  kind: AdminErrorKind
  details?: unknown

  constructor(
    message: string,
    status: number,
    kind: AdminErrorKind,
    code?: string,
    details?: unknown
  ) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
    this.kind = kind
    this.code = code
    this.details = details
  }
}

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '')

const normalizeEndpoint = (endpoint: string) => endpoint.replace(/^\/+/, '')

const parseUrl = (url: string) => {
  try {
    return new URL(url, window.location.origin)
  } catch {
    return null
  }
}

const getBackendHealthUrl = (baseUrl: string) => {
  const url = parseUrl(baseUrl)
  if (!url) return '/health'

  const pathname = url.pathname.replace(/\/+$/, '')
  if (pathname.endsWith('/v1')) {
    url.pathname = pathname.slice(0, -3) || '/'
  } else {
    url.pathname = '/'
  }
  url.search = ''
  url.hash = ''
  return new URL('health', url).toString()
}

const isProductionText = (value: unknown) =>
  typeof value === 'string' && ['production', 'prod'].includes(value.trim().toLowerCase())

const includesProductionSupabaseRef = (value: unknown) =>
  typeof value === 'string' &&
  (value.includes(PRODUCTION_SUPABASE_PROJECT_REF) || value.includes(PRODUCTION_SUPABASE_URL))

const hasBackendSupabaseTargetInfo = (runtime?: BackendRuntimeInfo) => {
  if (!runtime) return false

  const supabase = runtime.supabase
  const database = runtime.database

  return Boolean(
    supabase?.environment ||
    supabase?.projectRef ||
    supabase?.url ||
    typeof supabase?.isProduction === 'boolean' ||
    database?.environment ||
    database?.projectRef ||
    database?.supabaseProjectRef ||
    database?.supabaseUrl ||
    typeof database?.isProduction === 'boolean'
  )
}

const getBackendSupabaseReasons = (runtime?: BackendRuntimeInfo) => {
  if (!runtime) return []

  const supabase = runtime.supabase
  const database = runtime.database
  const reasons: string[] = []

  if (supabase?.isProduction || database?.isProduction) {
    reasons.push('Backend reports a production Supabase/database connection.')
  }
  if (isProductionText(supabase?.environment) || isProductionText(database?.environment)) {
    reasons.push('Backend reports its Supabase/database environment as production.')
  }
  if (
    includesProductionSupabaseRef(supabase?.projectRef) ||
    includesProductionSupabaseRef(supabase?.url) ||
    includesProductionSupabaseRef(database?.projectRef) ||
    includesProductionSupabaseRef(database?.supabaseProjectRef) ||
    includesProductionSupabaseRef(database?.supabaseUrl)
  ) {
    reasons.push('Backend reports the production Supabase project.')
  }

  return reasons
}

const getErrorPayload = async (response: Response) => {
  const text = await response.text()
  if (!text) {
    return { message: response.statusText || `HTTP ${response.status}` }
  }

  try {
    const parsed = JSON.parse(text) as BackendErrorBody
    const rawError = parsed.error
    if (typeof rawError === 'string') {
      return { message: rawError, code: parsed.code }
    }
    if (!rawError) {
      return { message: parsed.message ?? response.statusText, code: parsed.code }
    }
    return {
      message: rawError.message ?? parsed.message ?? response.statusText,
      code: rawError.code ?? parsed.code,
      details: rawError.details,
    }
  } catch {
    return { message: text }
  }
}

const toQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const normalizeSiteConfigRows = (data: unknown) => {
  const sourceRows = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? Object.entries(data).map(([key, value]) => ({ key, value }))
      : []

  return sourceRows.flatMap((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return []

    const record = row as Record<string, unknown>
    const key = record.key ?? record.configKey ?? record.config_key
    const value = record.value ?? record.configValue ?? record.config_value
    if (typeof key !== 'string' || !key.trim() || value === undefined || value === null) return []

    const updatedAt = record.updatedAt ?? record.updated_at
    return [
      {
        key: key.trim(),
        value: typeof value === 'string' ? value : String(value),
        updatedAt: typeof updatedAt === 'string' ? updatedAt : '',
      },
    ]
  })
}

export class AdminApiClient {
  private readonly baseUrl: string
  private readonly getAccessToken: () => string | null | undefined
  private writesLocked = false

  constructor(baseUrl: string, getAccessToken: () => string | null | undefined) {
    if (!baseUrl) {
      throw new Error('VITE_BACKEND_URL environment variable is required')
    }

    this.baseUrl = normalizeBaseUrl(baseUrl)
    this.getAccessToken = getAccessToken
  }

  setWritesLocked(locked: boolean) {
    this.writesLocked = locked
  }

  getConfiguredBaseUrl() {
    return this.baseUrl
  }

  getBackendHealthUrl() {
    return getBackendHealthUrl(this.baseUrl)
  }

  async getBackendRuntimeInfo(): Promise<BackendRuntimeInfo> {
    const response = await fetch(this.getBackendHealthUrl(), {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      const errorPayload = await getErrorPayload(response)
      throw new AdminApiError(errorPayload.message, response.status, 'request', errorPayload.code)
    }

    return (await response.json()) as BackendRuntimeInfo
  }

  async getLocalProductionSafetyStatus(): Promise<LocalProductionSafetyStatus> {
    const healthUrl = this.getBackendHealthUrl()
    const reasons: string[] = []
    const backendUrl = this.baseUrl

    const backend = parseUrl(backendUrl)
    if (backend && PRODUCTION_BACKEND_HOSTS.has(backend.hostname)) {
      reasons.push(`Local admin is configured to call production backend host ${backend.hostname}.`)
    }

    if (includesProductionSupabaseRef(import.meta.env.VITE_SUPABASE_URL)) {
      reasons.push('Local admin is configured with the production Supabase URL.')
    }

    let runtime: BackendRuntimeInfo | undefined
    try {
      runtime = await this.getBackendRuntimeInfo()
      if (isProductionText(runtime.environment)) {
        reasons.push('Backend /health reports environment=production.')
      }
      if (!hasBackendSupabaseTargetInfo(runtime)) {
        reasons.push('Backend /health does not report Supabase target metadata.')
      }
      reasons.push(...getBackendSupabaseReasons(runtime))
    } catch (error) {
      reasons.push(
        error instanceof Error
          ? `Could not verify backend runtime safety: ${error.message}`
          : 'Could not verify backend runtime safety.'
      )
    }

    return {
      checked: true,
      readOnly: reasons.length > 0,
      reasons,
      backendUrl,
      backendHealthUrl: healthUrl,
      backendEnvironment: runtime?.environment,
      backendRuntime: runtime,
    }
  }

  async listResource<T>(resource: AdminResourceKey): Promise<T[]> {
    const response = await this.request<ApiEnvelope<unknown>>(resource)
    if (resource === 'site-config') {
      return normalizeSiteConfigRows(response.data) as T[]
    }
    if (!Array.isArray(response.data)) {
      throw new AdminApiError(
        `Invalid ${resource} list response from backend.`,
        502,
        'request',
        'INVALID_API_RESPONSE'
      )
    }
    return response.data as T[]
  }

  async getSemesterUsage(semesterId: string, semesterCode: string) {
    const [eventsResponse, members] = await Promise.all([
      this.request<ApiEnvelope<unknown[]>>(
        `events?semester=${encodeURIComponent(semesterCode)}&limit=1`
      ),
      this.listResource<Record<string, unknown>>('members'),
    ])

    return {
      semesterId,
      events:
        eventsResponse.pagination?.total ?? eventsResponse.count ?? eventsResponse.data.length,
      members: members.filter((member) => member.semester === semesterCode).length,
    }
  }

  async createResource<T>(resource: AdminResourceKey, payload: ResourcePayload): Promise<T> {
    this.assertWritesAllowed()
    const response = await this.request<ApiEnvelope<T>>(resource, {
      method: 'POST',
      body: payload,
    })
    return response.data
  }

  async bulkCreateMembers(members: BulkMemberInput[]): Promise<BulkMemberSummary> {
    this.assertWritesAllowed()
    const response = await this.request<ApiEnvelope<BulkMemberSummary>>('members/bulk', {
      method: 'POST',
      body: { members },
    })
    return response.data
  }

  async createNewsletterSignup<T>(payload: ResourcePayload): Promise<T> {
    this.assertWritesAllowed()
    const response = await this.request<ApiEnvelope<T>>('newsletter-sign-ups', {
      method: 'POST',
      body: {
        email: payload.email,
        first_name: payload.firstName,
        last_name: payload.lastName,
      },
    })
    return response.data
  }

  async updateResource<T>(
    resource: AdminResourceKey,
    id: string,
    payload: ResourcePayload
  ): Promise<T> {
    this.assertWritesAllowed()
    const response = await this.request<ApiEnvelope<T>>(`${resource}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
    })
    return response.data
  }

  async deleteResource<T>(resource: AdminResourceKey, id: string): Promise<T> {
    this.assertWritesAllowed()
    const response = await this.request<ApiEnvelope<T>>(`${resource}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    return response.data
  }

  async replaceEventFlyer(id: string, body: MediaReplacementBody) {
    this.assertWritesAllowed()
    const response = await this.request<ApiEnvelope<EventFlyerReplacement>>(
      `events/${encodeURIComponent(id)}/flyer`,
      { method: 'PUT', body }
    )
    return response.data
  }

  async replaceBoardHeadshot(id: string, body: MediaReplacementBody) {
    this.assertWritesAllowed()
    const response = await this.request<ApiEnvelope<BoardHeadshotReplacement>>(
      `board-members/${encodeURIComponent(id)}/headshot`,
      { method: 'PUT', body }
    )
    return response.data
  }

  async listStorageBuckets(): Promise<StorageBucket[]> {
    const response = await this.request<ApiEnvelope<StorageBucket[]>>('storage/buckets')
    return response.data
  }

  async listStorageObjects(
    bucketId: string,
    params: {
      prefix?: string
      limit?: number
      offset?: number
      sortBy?: 'name' | 'updated_at'
      order?: 'asc' | 'desc'
      search?: string
    } = {}
  ): Promise<StorageObject[]> {
    const query = toQueryString({ limit: 100, order: 'asc', sortBy: 'name', ...params })
    const response = await this.request<ApiEnvelope<StorageObject[]>>(
      `storage/buckets/${encodeURIComponent(bucketId)}/objects${query}`
    )
    return response.data
  }

  async uploadStorageObject(bucketId: string, body: StorageUploadBody) {
    this.assertWritesAllowed()
    const response = await this.request<ApiEnvelope<{ path: string; publicUrl: string }>>(
      `storage/buckets/${encodeURIComponent(bucketId)}/objects`,
      { method: 'POST', body }
    )
    return response.data
  }

  async updateStorageObject(bucketId: string, body: StorageUpdateBody) {
    this.assertWritesAllowed()
    const response = await this.request<ApiEnvelope<{ path: string; publicUrl?: string }>>(
      `storage/buckets/${encodeURIComponent(bucketId)}/objects`,
      { method: 'PUT', body }
    )
    return response.data
  }

  async deleteStorageObjects(bucketId: string, body: StorageDeleteBody) {
    this.assertWritesAllowed()
    const response = await this.request<ApiEnvelope<{ paths: string[] }>>(
      `storage/buckets/${encodeURIComponent(bucketId)}/objects`,
      { method: 'DELETE', body }
    )
    return response.data
  }

  async getInstagramStatus(): Promise<InstagramStatus> {
    const response = await this.request<ApiEnvelope<InstagramStatus>>('instagram/status')
    return response.data
  }

  async listInstagramPosts(limit = 12): Promise<InstagramMedia[]> {
    const response = await this.request<ApiEnvelope<InstagramMedia[]>>(
      `instagram/recent${toQueryString({ limit })}`
    )
    return response.data
  }

  async checkInstagramCaption(caption: string): Promise<CaptionCheck> {
    const response = await this.request<ApiEnvelope<CaptionCheck>>('instagram/check-caption', {
      method: 'POST',
      body: { caption },
    })
    return response.data
  }

  async getInstagramQuota(): Promise<InstagramQuota[]> {
    const response = await this.request<ApiEnvelope<InstagramQuota[]>>('instagram/limit')
    return response.data
  }

  /** Builds the post without publishing it. Nothing is visible on the account yet. */
  async stageInstagramPost(body: { imageUrl: string; caption: string }): Promise<InstagramStaged> {
    this.assertWritesAllowed()
    const response = await this.request<ApiEnvelope<InstagramStaged>>('instagram/stage', {
      method: 'POST',
      body,
    })
    return response.data
  }

  /**
   * Publishes a staged post to the live account. Public and irreversible —
   * `confirm` is required by the backend and reflects a deliberate human action.
   */
  async publishInstagramPost(creationId: string): Promise<InstagramPublished> {
    this.assertWritesAllowed()
    const response = await this.request<ApiEnvelope<InstagramPublished>>('instagram/publish', {
      method: 'POST',
      body: { creationId, confirm: true },
    })
    return response.data
  }

  async getInstagramAccountInsights(days = 28): Promise<InstagramAccountInsights> {
    const response = await this.request<ApiEnvelope<InstagramAccountInsights>>(
      `instagram/insights/account${toQueryString({ days })}`
    )
    return response.data
  }

  async getInstagramPostInsights(limit = 10): Promise<InstagramPostInsights> {
    const response = await this.request<ApiEnvelope<InstagramPostInsights>>(
      `instagram/insights/posts${toQueryString({ limit })}`
    )
    return response.data
  }

  async getInstagramAudience(breakdown = 'city'): Promise<InstagramAudience> {
    const response = await this.request<ApiEnvelope<InstagramAudience>>(
      `instagram/insights/audience${toQueryString({ breakdown })}`
    )
    return response.data
  }

  async getAiStatus(): Promise<AiStatus> {
    const response = await this.request<ApiEnvelope<AiStatus>>('assistant/status')
    return response.data
  }

  /** Generates a draft post. Nothing is staged or published by this call. */
  async generatePost(brief: string): Promise<PostGenerationResult> {
    const response = await this.request<ApiEnvelope<PostGenerationResult>>(
      'assistant/generate-post',
      { method: 'POST', body: { brief } }
    )
    return response.data
  }

  async askAssistant(question: string, history: AssistantTurn[] = []): Promise<AssistantResult> {
    const response = await this.request<ApiEnvelope<AssistantResult>>('assistant/ask', {
      method: 'POST',
      body: { question, history },
    })
    return response.data
  }

  private assertWritesAllowed() {
    if (this.writesLocked) {
      throw new AdminApiError(
        'Local admin is read-only while connected to production data.',
        423,
        'request',
        'LOCAL_ADMIN_READ_ONLY'
      )
    }
  }

  private async request<T>(
    endpoint: string,
    options: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    const accessToken = this.getAccessToken()
    if (!accessToken) {
      throw new AdminApiError(
        'No active Supabase session found. Sign in again.',
        401,
        'unauthenticated'
      )
    }

    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(`${this.baseUrl}/${normalizeEndpoint(endpoint)}`, {
      method: options.method ?? 'GET',
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    })

    if (!response.ok) {
      const errorPayload = await getErrorPayload(response)
      const kind =
        response.status === 401
          ? 'unauthenticated'
          : response.status === 403
            ? 'forbidden'
            : 'request'
      throw new AdminApiError(
        errorPayload.message,
        response.status,
        kind,
        errorPayload.code,
        errorPayload.details
      )
    }

    return (await response.json()) as T
  }
}

export const createAdminApiClient = (
  accessTokenProvider: () => string | null | undefined,
  baseUrl = import.meta.env.VITE_BACKEND_URL
) => new AdminApiClient(baseUrl, accessTokenProvider)

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
