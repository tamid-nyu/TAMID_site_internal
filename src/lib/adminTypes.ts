export type AdminResourceKey =
  | 'events'
  | 'board-members'
  | 'members'
  | 'semesters'
  | 'contact-requests'
  | 'newsletter-signups'
  | 'site-config'

export interface ApiEnvelope<T> {
  success: boolean
  count?: number
  data: T
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface BoardMember {
  id: string
  position: string
  fullName: string
  bio: string
  major: string
  year: string
  hometown: string
  linkedinUrl: string | null
  email: string
  headshotFile: string | null
  headshotUpdatedAt: string
  orderIndex: number
}

export interface Event {
  id: string
  createdAt: string
  updatedAt: string
  title: string
  company: string | null
  startTime: string
  endTime: string | null
  location: string | null
  flyerFile: string | null
  rsvpLink: string | null
  description: string | null
  isVisible: boolean
  semester: string
}

export interface Member {
  id: string
  firstName: string
  lastName: string
  semester: string
  email: string | null
}

export interface Semester {
  id: string
  semesterName: string
}

export interface ContactRequest {
  id: string
  createdAt: string
  firstName: string
  lastName: string
  email: string
  company: string | null
  message: string
}

export interface NewsletterSignup {
  id: string
  createdAt: string
  firstName: string
  lastName: string
  email: string
}

export interface SiteConfigItem {
  key: string
  value: string
  updatedAt: string
}

export interface StorageBucket {
  id: string
  name: string
  public?: boolean
  [key: string]: unknown
}

export interface StorageObject {
  name: string
  path: string
  type: 'file' | 'folder'
  metadata: unknown
  publicUrl?: string
  createdAt?: string
  updatedAt?: string
  lastAccessedAt?: string
}

export interface StorageUploadBody {
  path: string
  contentBase64: string
  contentType?: string
  cacheControl?: string
  upsert?: boolean
}

export interface MediaVariantBody {
  path: string
  contentBase64: string
  contentType: string
}

export interface MediaReplacementBody {
  fullSize: MediaVariantBody
  thumbnail: MediaVariantBody
}

export interface VersionedMediaReplacement {
  fullSizePath: string
  thumbnailPath: string
  fullSizeUrl: string
  thumbnailUrl: string
}

export interface EventFlyerReplacement {
  event: Event
  flyer: VersionedMediaReplacement
}

export interface BoardHeadshotReplacement {
  boardMember: BoardMember
  headshot: VersionedMediaReplacement
}

export interface StorageUpdateBody {
  path: string
  newPath?: string
  contentBase64?: string
  contentType?: string
  cacheControl?: string
  recursive?: boolean
}

export interface StorageDeleteBody {
  path?: string
  paths?: string[]
  recursive?: boolean
}

export type AdminResourceRow =
  BoardMember | Event | Member | Semester | ContactRequest | NewsletterSignup | SiteConfigItem

export type ResourcePayload = Record<string, string | number | boolean | null>
