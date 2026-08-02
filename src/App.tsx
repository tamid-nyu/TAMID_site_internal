import './App.css'

import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Copy,
  Database,
  Edit3,
  Eye,
  ExternalLink,
  FileArchive,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GraduationCap,
  GripVertical,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Mail,
  Menu,
  MoreVertical,
  Move,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from './lib/supabase'
import { ADMIN_IDLE_TIMEOUT_MS, useIdleSignOut } from './lib/useIdleSignOut'
import { AdminApiClient, AdminApiError, createAdminApiClient, fileToBase64 } from './lib/adminApi'
import type { LocalProductionSafetyStatus } from './lib/adminApi'
import {
  createMediaVariants,
  getJsonByteSize,
  getStoragePublicUrl,
  getThumbnailPath,
  makeStoragePath,
  versionUrl,
} from './lib/adminMedia'
import type {
  AdminResourceKey,
  AdminResourceRow,
  Event as AdminEvent,
  MediaReplacementBody,
  ResourcePayload,
  SiteConfigItem,
  StorageBucket,
  StorageObject,
} from './lib/adminTypes'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

type FieldType =
  'text' | 'email' | 'url' | 'textarea' | 'number' | 'datetime' | 'boolean' | 'duration' | 'media'

interface FieldConfig {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  wide?: boolean
}

interface ColumnConfig {
  key: string
  label: string
  kind?: 'date' | 'boolean' | 'file' | 'long' | 'order'
  width?: string
}

interface ResourceConfig {
  key: AdminResourceKey
  idKey?: string
  title: string
  description: string
  icon: typeof CalendarDays
  singular: string
  columns: ColumnConfig[]
  fields: FieldConfig[]
  searchKeys: string[]
  allowCreate?: boolean
  media?: {
    bucketId: string
    fieldKey: string
    label: string
  }
}

type ActiveSection = AdminResourceKey | 'overview' | 'storage'

const RESOURCE_CONFIGS: ResourceConfig[] = [
  {
    key: 'events',
    title: 'Events',
    singular: 'Event',
    description: 'Manage and publish SJBA events that appear on the website.',
    icon: CalendarDays,
    searchKeys: ['title', 'company', 'semester', 'location', 'description'],
    columns: [
      { key: 'title', label: 'Title', width: '34%' },
      { key: 'company', label: 'Company', width: '14%' },
      { key: 'startTime', label: 'Start Date & Time', kind: 'date', width: '18%' },
      { key: 'semester', label: 'Semester', width: '7%' },
      { key: 'isVisible', label: 'Visibility', kind: 'boolean', width: '9%' },
      { key: 'flyerFile', label: 'Media', kind: 'file', width: '12%' },
    ],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'startTime', label: 'Start Date & Time', type: 'datetime', required: true },
      { key: 'eventDuration', label: 'Event Length', type: 'duration', required: true },
      { key: 'location', label: 'Location', type: 'text', required: true },
      { key: 'semester', label: 'Semester', type: 'text', required: true },
      { key: 'isVisible', label: 'Visible on website', type: 'boolean' },
      { key: 'rsvpLink', label: 'RSVP Link', type: 'url' },
      {
        key: 'flyerFile',
        label: 'Uploaded Image',
        type: 'media',
        wide: true,
      },
      { key: 'description', label: 'Description', type: 'textarea', wide: true },
    ],
    media: {
      bucketId: 'event-flyers',
      fieldKey: 'flyerFile',
      label: 'Flyer',
    },
  },
  {
    key: 'board-members',
    title: 'Board',
    singular: 'Board Member',
    description: 'Edit executive board profiles, order, and headshots.',
    icon: Users,
    searchKeys: ['fullName', 'position', 'email', 'major', 'year'],
    columns: [
      { key: 'orderIndex', label: 'Order', kind: 'order', width: '7%' },
      { key: 'fullName', label: 'Name', width: '24%' },
      { key: 'position', label: 'Position', width: '22%' },
      { key: 'email', label: 'Email', width: '31%' },
      { key: 'headshotFile', label: 'Media', kind: 'file', width: '10%' },
    ],
    fields: [
      { key: 'fullName', label: 'Full Name', type: 'text', required: true },
      { key: 'position', label: 'Position', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'major', label: 'Major', type: 'text' },
      { key: 'year', label: 'Year', type: 'text' },
      { key: 'hometown', label: 'Hometown', type: 'text' },
      { key: 'linkedinUrl', label: 'LinkedIn URL', type: 'url' },
      { key: 'headshotFile', label: 'Uploaded Image', type: 'media', wide: true },
      { key: 'bio', label: 'Bio', type: 'textarea', wide: true },
    ],
    media: {
      bucketId: 'board-headshots',
      fieldKey: 'headshotFile',
      label: 'Headshot',
    },
  },
  {
    key: 'members',
    title: 'Members',
    singular: 'Member',
    description: 'Maintain recognized members by semester.',
    icon: GraduationCap,
    searchKeys: ['firstName', 'lastName', 'email', 'semester'],
    columns: [
      { key: 'lastName', label: 'Last Name' },
      { key: 'firstName', label: 'First Name' },
      { key: 'semester', label: 'Semester' },
      { key: 'email', label: 'Email' },
    ],
    fields: [
      { key: 'firstName', label: 'First Name', type: 'text', required: true },
      { key: 'lastName', label: 'Last Name', type: 'text', required: true },
      { key: 'semester', label: 'Semester', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email' },
    ],
  },
  {
    key: 'semesters',
    title: 'Semesters',
    singular: 'Semester',
    description: 'Create and maintain valid academic semester codes.',
    icon: Archive,
    searchKeys: ['semesterName'],
    columns: [{ key: 'semesterName', label: 'Semester Code' }],
    fields: [
      {
        key: 'semesterName',
        label: 'Semester Code',
        type: 'text',
        required: true,
        placeholder: 'S26',
      },
    ],
  },
  {
    key: 'contact-requests',
    title: 'Contact Requests',
    singular: 'Contact Request',
    description: 'Review, edit, and remove private inbound contact submissions.',
    allowCreate: false,
    icon: Mail,
    searchKeys: ['firstName', 'lastName', 'email', 'company', 'message'],
    columns: [
      { key: 'createdAt', label: 'Submitted', kind: 'date' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'company', label: 'Company' },
      { key: 'message', label: 'Message', kind: 'long' },
    ],
    fields: [
      { key: 'firstName', label: 'First Name', type: 'text', required: true },
      { key: 'lastName', label: 'Last Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'message', label: 'Message', type: 'textarea', required: true },
    ],
  },
  {
    key: 'newsletter-signups',
    title: 'Newsletter Signups',
    singular: 'Newsletter Signup',
    description: 'Review signups and add subscribers through the Mailchimp-backed workflow.',
    icon: FileText,
    searchKeys: ['firstName', 'lastName', 'email'],
    columns: [
      { key: 'createdAt', label: 'Submitted', kind: 'date' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email' },
    ],
    fields: [
      { key: 'firstName', label: 'First Name', type: 'text', required: true },
      { key: 'lastName', label: 'Last Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
    ],
  },
  {
    key: 'site-config',
    idKey: 'key',
    title: 'Site Config',
    singular: 'Site Config Value',
    description: 'Manage dynamic website settings consumed by SJBA_site.',
    icon: Settings,
    searchKeys: ['key', 'value'],
    columns: [
      { key: 'key', label: 'Key' },
      { key: 'value', label: 'Value', kind: 'long' },
      { key: 'updatedAt', label: 'Updated', kind: 'date' },
    ],
    fields: [
      {
        key: 'key',
        label: 'Key',
        type: 'text',
        required: true,
        placeholder: 'mentorship_application_open',
      },
      {
        key: 'value',
        label: 'Value',
        type: 'textarea',
        required: true,
        placeholder: 'true',
        wide: true,
      },
    ],
  },
]

const EVENT_DURATION_OPTIONS = [
  { minutes: 30, label: '30 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 90, label: '1 hour 30 minutes' },
  { minutes: 120, label: '2 hours' },
  { minutes: 180, label: '3 hours' },
] as const

const DEFAULT_EVENT_DURATION_MINUTES = 60
const MAX_MEDIA_REQUEST_BYTES = Math.floor(9.5 * 1024 * 1024)
const PROTECTED_MEDIA_BUCKETS = new Set(['event-flyers', 'board-headshots'])
const SEMESTER_CODE_PATTERN = /^[SF]\d{2}$/

const readRow = (row: AdminResourceRow, key: string): unknown =>
  (row as unknown as Record<string, unknown>)[key]

const displayValue = (value: unknown, kind?: ColumnConfig['kind']) => {
  if (kind === 'boolean') {
    return value ? (
      <Badge className="status-badge status-badge--visible">Visible</Badge>
    ) : (
      <Badge variant="secondary">Hidden</Badge>
    )
  }
  if (kind === 'file') {
    return value ? (
      <span className="inline-status inline-status--ok">
        <CheckCircle2 aria-hidden="true" />
        Uploaded
      </span>
    ) : (
      <span className="inline-status">No file</span>
    )
  }
  if (kind === 'date' && typeof value === 'string' && value) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  }
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  return String(value)
}

const toDateTimeInput = (value: unknown) => {
  if (typeof value !== 'string' || !value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

const getEventDurationMinutes = (row?: AdminResourceRow) => {
  if (!row) return DEFAULT_EVENT_DURATION_MINUTES
  const startTime = readRow(row, 'startTime')
  const endTime = readRow(row, 'endTime')
  if (typeof startTime !== 'string' || typeof endTime !== 'string') {
    return DEFAULT_EVENT_DURATION_MINUTES
  }
  const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
  return EVENT_DURATION_OPTIONS.some((option) => option.minutes === duration)
    ? duration
    : DEFAULT_EVENT_DURATION_MINUTES
}

const makeInitialForm = (config: ResourceConfig, row?: AdminResourceRow): ResourcePayload => {
  const payload: ResourcePayload = {}
  for (const field of config.fields) {
    const value = row ? readRow(row, field.key) : undefined
    if (field.type === 'boolean') {
      payload[field.key] = typeof value === 'boolean' ? value : field.key === 'isVisible'
    } else if (field.type === 'number') {
      payload[field.key] = typeof value === 'number' ? value : 0
    } else if (field.type === 'datetime') {
      payload[field.key] = toDateTimeInput(value)
    } else if (field.type === 'duration') {
      payload[field.key] = getEventDurationMinutes(row)
    } else {
      payload[field.key] =
        field.key === 'rsvpLink' && !row
          ? '#'
          : value === null || value === undefined
            ? ''
            : String(value)
    }
  }
  return payload
}

const preparePayload = (fields: FieldConfig[], form: ResourcePayload) => {
  const payload: ResourcePayload = {}
  for (const field of fields) {
    const raw = form[field.key]
    if (field.type === 'duration') {
      continue
    } else if (field.type === 'boolean') {
      payload[field.key] = Boolean(raw)
    } else if (field.type === 'number') {
      payload[field.key] = Number(raw || 0)
    } else if (field.type === 'datetime') {
      payload[field.key] = raw ? new Date(String(raw)).toISOString() : null
    } else {
      payload[field.key] = raw === '' ? null : raw
    }
  }
  return payload
}

const resourceLabel = (config: ResourceConfig, row: AdminResourceRow) => {
  const keys = ['title', 'fullName', 'key', 'email', 'semesterName', 'lastName']
  for (const key of keys) {
    const value = readRow(row, key)
    if (typeof value === 'string' && value) {
      return value
    }
  }
  return config.singular
}

const resourceId = (config: ResourceConfig, row: AdminResourceRow) =>
  String(readRow(row, config.idKey ?? 'id') ?? '')

type SortDirection = 'asc' | 'desc'

interface SortState {
  key: string
  direction: SortDirection
}

interface MediaStatus {
  original: { exists: boolean; url: string }
  thumbnail: { exists: boolean; url: string }
}

interface SemesterUsage {
  events: number
  members: number
}

const getDefaultSort = (config: ResourceConfig): SortState => ({
  key:
    config.key === 'events'
      ? 'startTime'
      : config.key === 'board-members'
        ? 'orderIndex'
        : (config.columns[0]?.key ?? 'id'),
  direction: 'asc',
})

const compareValues = (left: unknown, right: unknown, kind?: ColumnConfig['kind']) => {
  if (kind === 'date') {
    const leftTime = typeof left === 'string' ? new Date(left).getTime() : Number.NaN
    const rightTime = typeof right === 'string' ? new Date(right).getTime() : Number.NaN
    return (Number.isNaN(leftTime) ? 0 : leftTime) - (Number.isNaN(rightTime) ? 0 : rightTime)
  }
  if (typeof left === 'number' && typeof right === 'number') return left - right
  if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right)
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

const storagePrefix = (path: string) => path.split('/').slice(0, -1).join('/')

interface ResourceScreenProps {
  api: AdminApiClient
  config: ResourceConfig
  onAdminError: (error: unknown) => void
  sort: SortState
  onSortChange: (sort: SortState) => void
  readOnly?: boolean
  onDirtyChange?: (dirty: boolean) => void
}

function ResourceScreen({
  api,
  config,
  onAdminError,
  sort,
  onSortChange,
  readOnly = false,
  onDirtyChange,
}: ResourceScreenProps) {
  const [rows, setRows] = useState<AdminResourceRow[]>([])
  const [query, setQuery] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragTargetId, setDragTargetId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<AdminResourceRow | null>(null)
  const [form, setForm] = useState<ResourcePayload>(() => makeInitialForm(config))
  const [baselineForm, setBaselineForm] = useState<ResourcePayload>(() => makeInitialForm(config))
  const [deleteTarget, setDeleteTarget] = useState<AdminResourceRow | null>(null)
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [mediaStatus, setMediaStatus] = useState<MediaStatus | null>(null)
  const [mediaStatusLoading, setMediaStatusLoading] = useState(false)
  const [pendingMediaFile, setPendingMediaFile] = useState<File | null>(null)
  const [previewAsset, setPreviewAsset] = useState<{ title: string; url: string } | null>(null)
  const nestedDialogCloseGuardUntil = useRef(0)
  const [semesterOptions, setSemesterOptions] = useState<string[]>([])
  const [semesterOptionsLoading, setSemesterOptionsLoading] = useState(false)
  const [semesterUsage, setSemesterUsage] = useState<SemesterUsage | null>(null)
  const [semesterUsageLoading, setSemesterUsageLoading] = useState(false)
  const [semesterUsageError, setSemesterUsageError] = useState(false)
  const [semesterDeleteCheckId, setSemesterDeleteCheckId] = useState<string | null>(null)
  const [semesterDeleteNotice, setSemesterDeleteNotice] = useState('')

  const isDirty = useMemo(
    () =>
      sheetOpen &&
      !readOnly &&
      (pendingMediaFile !== null || JSON.stringify(form) !== JSON.stringify(baselineForm)),
    [baselineForm, form, pendingMediaFile, readOnly, sheetOpen]
  )
  const mediaPath = config.media ? String(form[config.media.fieldKey] ?? '') : ''
  const mediaVersion = editingRow
    ? String(
        readRow(editingRow, config.key === 'board-members' ? 'headshotUpdatedAt' : 'updatedAt') ??
          ''
      )
    : ''

  useEffect(() => {
    onDirtyChange?.(isDirty)
    return () => onDirtyChange?.(false)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (!isDirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])

  const loadRows = useCallback(async () => {
    setIsLoading(true)
    try {
      setRows(await api.listResource<AdminResourceRow>(config.key))
    } catch (error) {
      onAdminError(error)
    } finally {
      setIsLoading(false)
    }
  }, [api, config.key, onAdminError])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const needsSemesterOptions = config.fields.some((field) => field.key === 'semester')

  useEffect(() => {
    if (!needsSemesterOptions) {
      setSemesterOptions([])
      return
    }

    let cancelled = false
    setSemesterOptionsLoading(true)
    void api
      .listResource<AdminResourceRow>('semesters')
      .then((semesters) => {
        if (cancelled) return
        const options = semesters
          .map((semester) => readRow(semester, 'semesterName'))
          .filter(
            (semester): semester is string => typeof semester === 'string' && Boolean(semester)
          )
          .sort((left, right) =>
            left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
          )
        setSemesterOptions(options)
      })
      .catch(onAdminError)
      .finally(() => {
        if (!cancelled) setSemesterOptionsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [api, needsSemesterOptions, onAdminError])

  useEffect(() => {
    if (!sheetOpen || config.key !== 'semesters' || !editingRow) {
      setSemesterUsage(null)
      setSemesterUsageLoading(false)
      setSemesterUsageError(false)
      return
    }

    let cancelled = false
    const semesterCode = String(readRow(editingRow, 'semesterName') ?? '')
    setSemesterUsage(null)
    setSemesterUsageLoading(true)
    setSemesterUsageError(false)

    void api
      .getSemesterUsage(resourceId(config, editingRow), semesterCode)
      .then((usage) => {
        if (cancelled) return
        setSemesterUsage({
          events: usage.events,
          members: usage.members,
        })
      })
      .catch((error) => {
        if (cancelled) return
        setSemesterUsageError(true)
        onAdminError(error)
      })
      .finally(() => {
        if (!cancelled) setSemesterUsageLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [api, config, editingRow, onAdminError, sheetOpen])

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const column = config.columns.find((candidate) => candidate.key === sort.key)
    const matchingRows = rows.filter((row) => {
      if (config.key === 'events' && visibilityFilter !== 'all') {
        const visible = Boolean(readRow(row, 'isVisible'))
        if (visibilityFilter === 'visible' && !visible) return false
        if (visibilityFilter === 'hidden' && visible) return false
      }
      if (!normalizedQuery) return true
      return config.searchKeys.some((key) =>
        String(readRow(row, key) ?? '')
          .toLowerCase()
          .includes(normalizedQuery)
      )
    })

    return [...matchingRows].sort((left, right) => {
      const comparison = compareValues(
        readRow(left, sort.key),
        readRow(right, sort.key),
        column?.kind
      )
      return sort.direction === 'asc' ? comparison : -comparison
    })
  }, [config.columns, config.key, config.searchKeys, query, rows, sort, visibilityFilter])

  const refreshMediaStatus = useCallback(
    async (path: string, version: string) => {
      if (!config.media || !path) {
        setMediaStatus(null)
        return
      }

      setMediaStatusLoading(true)
      const thumbnailPath = getThumbnailPath(path)
      try {
        const [originalObjects, thumbnailObjects] = await Promise.all([
          api.listStorageObjects(config.media.bucketId, {
            prefix: storagePrefix(path),
            limit: 1000,
          }),
          api.listStorageObjects(config.media.bucketId, {
            prefix: storagePrefix(thumbnailPath),
            limit: 1000,
          }),
        ])
        const original = originalObjects.find((object) => object.path === path)
        const thumbnail = thumbnailObjects.find((object) => object.path === thumbnailPath)
        setMediaStatus({
          original: {
            exists: Boolean(original),
            url: versionUrl(
              original?.publicUrl ?? getStoragePublicUrl(config.media.bucketId, path),
              version
            ),
          },
          thumbnail: {
            exists: Boolean(thumbnail),
            url: versionUrl(
              thumbnail?.publicUrl ?? getStoragePublicUrl(config.media.bucketId, thumbnailPath),
              version
            ),
          },
        })
      } catch (error) {
        setMediaStatus({
          original: {
            exists: false,
            url: versionUrl(getStoragePublicUrl(config.media.bucketId, path), version),
          },
          thumbnail: {
            exists: false,
            url: versionUrl(getStoragePublicUrl(config.media.bucketId, thumbnailPath), version),
          },
        })
        onAdminError(error)
      } finally {
        setMediaStatusLoading(false)
      }
    },
    [api, config.media, onAdminError]
  )

  useEffect(() => {
    if (!sheetOpen || !config.media) return
    if (!mediaPath) {
      setMediaStatus(null)
      return
    }
    void refreshMediaStatus(mediaPath, mediaVersion)
  }, [config.media, mediaPath, mediaVersion, refreshMediaStatus, sheetOpen])

  const setEditorForm = (nextForm: ResourcePayload, row: AdminResourceRow | null) => {
    setEditingRow(row)
    setForm(nextForm)
    setBaselineForm(nextForm)
    setMediaStatus(null)
    setPendingMediaFile(null)
    setFormError('')
    setSheetOpen(true)
  }

  const openCreate = () => {
    if (readOnly || config.allowCreate === false) return
    setEditorForm(makeInitialForm(config), null)
  }

  const openEdit = (row: AdminResourceRow) => {
    setEditorForm(makeInitialForm(config, row), row)
  }

  const updateForm = (key: string, value: string | number | boolean | null) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const replaceLocalRow = (row: AdminResourceRow) => {
    const nextId = resourceId(config, row)
    setRows((current) => {
      const exists = current.some((candidate) => resourceId(config, candidate) === nextId)
      return exists
        ? current.map((candidate) => (resourceId(config, candidate) === nextId ? row : candidate))
        : [...current, row]
    })
  }

  const closeEditor = () => {
    setSheetOpen(false)
    setDiscardPromptOpen(false)
    setEditingRow(null)
    setMediaStatus(null)
    setPendingMediaFile(null)
    setFormError('')
  }

  const requestCloseEditor = () => {
    if (isDirty) {
      setDiscardPromptOpen(true)
      return
    }
    closeEditor()
  }

  const closePreview = () => {
    // Radix restores focus after the portaled dialog closes. During that sequence the parent
    // sheet can receive a second dismiss request, so keep the editor protected through it.
    nestedDialogCloseGuardUntil.current = Date.now() + 500
    setPreviewAsset(null)
  }

  const handleDiscardPromptOpenChange = (open: boolean) => {
    if (!open) {
      // Focus restoration from this portaled dialog can look like another outside interaction on
      // the parent sheet. Ignore that follow-up dismiss request so the prompt stays closed.
      nestedDialogCloseGuardUntil.current = Date.now() + 500
    }
    setDiscardPromptOpen(open)
  }

  const handleUpload = (file: File) => {
    if (readOnly) {
      toast.error('Local admin is read-only while connected to production data.')
      return
    }
    if (!config.media) return
    if (!file.type.startsWith('image/')) {
      setFormError('Select an image file. The admin generates a JPEG thumbnail automatically.')
      return
    }
    setFormError('')
    setPendingMediaFile(file)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (readOnly) {
      setFormError('Local admin is read-only while connected to production data.')
      return
    }
    setIsSaving(true)
    setFormError('')
    let persistedRow = editingRow
    try {
      const semesterCode = String(form.semesterName ?? '')
        .trim()
        .toUpperCase()
      if (config.key === 'semesters' && !SEMESTER_CODE_PATTERN.test(semesterCode)) {
        setFormError(
          'Semester code must be S or F followed by the last two digits of the year, such as S26 or F27.'
        )
        return
      }
      if (needsSemesterOptions && !semesterOptions.includes(String(form.semester ?? ''))) {
        setFormError('Choose one of the semesters created in the Semesters section.')
        return
      }
      const payload = preparePayload(config.fields, form)
      if (config.key === 'semesters') payload.semesterName = semesterCode
      if (config.key === 'events') {
        const startTime = payload.startTime
        const durationMinutes = Number(form.eventDuration)
        payload.endTime =
          typeof startTime === 'string' && startTime
            ? new Date(new Date(startTime).getTime() + durationMinutes * 60000).toISOString()
            : null
      }
      if (!editingRow && config.key === 'board-members') payload.orderIndex = rows.length
      if (config.media) delete payload[config.media.fieldKey]

      if (editingRow) {
        const updatedRow = await api.updateResource<AdminResourceRow>(
          config.key,
          resourceId(config, editingRow),
          payload
        )
        persistedRow = { ...editingRow, ...updatedRow } as AdminResourceRow
      } else if (config.key === 'newsletter-signups') {
        await api.createNewsletterSignup(payload)
        toast.success('Newsletter subscriber added through Mailchimp')
      } else {
        persistedRow = await api.createResource<AdminResourceRow>(config.key, payload)
      }

      if (persistedRow) {
        setEditingRow(persistedRow)
        setBaselineForm(form)
      }

      if (pendingMediaFile && config.media) {
        if (!persistedRow || !['events', 'board-members'].includes(config.key)) {
          throw new Error(`Save the ${config.singular.toLowerCase()} before uploading media.`)
        }

        const id = resourceId(config, persistedRow)
        if (!id) throw new Error(`The saved ${config.singular.toLowerCase()} did not return an ID.`)

        const { fullSize, thumbnail } = await createMediaVariants(pendingMediaFile)
        const [fullSizeBase64, thumbnailBase64] = await Promise.all([
          fileToBase64(fullSize),
          fileToBase64(thumbnail),
        ])
        const fullSizePath = makeStoragePath(id, fullSize)
        const body: MediaReplacementBody = {
          fullSize: {
            path: fullSizePath,
            contentBase64: fullSizeBase64,
            contentType: fullSize.type,
          },
          thumbnail: {
            path: getThumbnailPath(fullSizePath),
            contentBase64: thumbnailBase64,
            contentType: thumbnail.type,
          },
        }

        if (getJsonByteSize(body) >= MAX_MEDIA_REQUEST_BYTES) {
          throw new Error(
            'The encoded full-size image and thumbnail exceed the 9.5 MB client upload limit. Choose a smaller image.'
          )
        }

        if (config.key === 'events') {
          const result = await api.replaceEventFlyer(id, body)
          persistedRow = result.event
          replaceLocalRow(result.event)
          updateForm(config.media.fieldKey, result.event.flyerFile)
          setMediaStatus({
            original: { exists: true, url: result.flyer.fullSizeUrl },
            thumbnail: { exists: true, url: result.flyer.thumbnailUrl },
          })
        } else {
          const result = await api.replaceBoardHeadshot(id, body)
          persistedRow = result.boardMember
          replaceLocalRow(result.boardMember)
          updateForm(config.media.fieldKey, result.boardMember.headshotFile)
          setMediaStatus({
            original: { exists: true, url: result.headshot.fullSizeUrl },
            thumbnail: { exists: true, url: result.headshot.thumbnailUrl },
          })
        }
        setEditingRow(persistedRow)
        setPendingMediaFile(null)
      }

      if (config.key !== 'newsletter-signups') {
        toast.success(`${config.singular} ${editingRow ? 'updated' : 'created'}`)
      }
      closeEditor()
      await loadRows()
    } catch (error) {
      if (error instanceof AdminApiError && [400, 409].includes(error.status)) {
        setFormError(error.message)
      } else if (error instanceof Error && !(error instanceof AdminApiError)) {
        setFormError(error.message)
      } else {
        onAdminError(error)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    if (readOnly) {
      toast.error('Local admin is read-only while connected to production data.')
      setDeleteTarget(null)
      return
    }
    try {
      await api.deleteResource(config.key, resourceId(config, deleteTarget))
      toast.success(`${config.singular} deleted`)
      setDeleteTarget(null)
      if (editingRow && resourceId(config, editingRow) === resourceId(config, deleteTarget)) {
        closeEditor()
      }
      await loadRows()
    } catch (error) {
      if (config.key === 'semesters') {
        const message =
          error instanceof AdminApiError && error.code === 'SEMESTER_IN_USE'
            ? error.message
            : 'The semester could not be deleted. It may still be referenced by an event or member.'
        const deletingFromEditor =
          sheetOpen &&
          editingRow &&
          resourceId(config, editingRow) === resourceId(config, deleteTarget)
        setDeleteTarget(null)
        if (deletingFromEditor) {
          setSemesterUsageError(true)
          setFormError(`${message} Delete is now disabled; close and reopen to refresh usage.`)
        } else {
          setSemesterDeleteNotice(message)
        }
        return
      }
      onAdminError(error)
    }
  }

  const requestDelete = async (row: AdminResourceRow) => {
    if (readOnly) return
    if (config.key !== 'semesters') {
      setDeleteTarget(row)
      return
    }

    const semesterId = resourceId(config, row)
    const semesterCode = String(readRow(row, 'semesterName') ?? '')
    const deletingFromEditor =
      sheetOpen && editingRow && resourceId(config, editingRow) === semesterId
    setSemesterDeleteCheckId(semesterId)
    setSemesterDeleteNotice('')
    try {
      const usage = await api.getSemesterUsage(semesterId, semesterCode)
      const total = usage.events + usage.members
      if (total > 0) {
        const message = `${semesterCode} can’t be deleted because it is assigned to ${usage.events} ${usage.events === 1 ? 'event' : 'events'} and ${usage.members} ${usage.members === 1 ? 'member' : 'members'}. Reassign or remove those records first.`
        if (deletingFromEditor) {
          setSemesterUsage({ events: usage.events, members: usage.members })
        } else {
          setSemesterDeleteNotice(message)
        }
        return
      }
      setDeleteTarget(row)
    } catch (error) {
      const message = 'Unable to verify semester usage. Nothing was deleted; try again.'
      if (deletingFromEditor) {
        setSemesterUsageError(true)
        setFormError(message)
      } else {
        setSemesterDeleteNotice(message)
      }
      onAdminError(error)
    } finally {
      setSemesterDeleteCheckId(null)
    }
  }

  const changeSort = (column: ColumnConfig) => {
    onSortChange(
      sort.key === column.key
        ? { key: column.key, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
        : { key: column.key, direction: 'asc' }
    )
  }

  const canReorder =
    config.key === 'board-members' &&
    reorderMode &&
    !readOnly &&
    !isReordering &&
    !query.trim() &&
    sort.key === 'orderIndex' &&
    sort.direction === 'asc'

  const enterReorderMode = () => {
    setQuery('')
    onSortChange({ key: 'orderIndex', direction: 'asc' })
    setReorderMode(true)
  }

  const exitReorderMode = () => {
    setReorderMode(false)
    setDraggingId(null)
    setDragTargetId(null)
  }

  const reorderBoard = async (targetId: string) => {
    if (!canReorder || !draggingId || draggingId === targetId) return
    const previousRows = rows
    const orderedRows = [...rows].sort(
      (left, right) => Number(readRow(left, 'orderIndex')) - Number(readRow(right, 'orderIndex'))
    )
    const sourceIndex = orderedRows.findIndex((row) => resourceId(config, row) === draggingId)
    const targetIndex = orderedRows.findIndex((row) => resourceId(config, row) === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return

    const [moved] = orderedRows.splice(sourceIndex, 1)
    orderedRows.splice(targetIndex, 0, moved)
    const nextRows = orderedRows.map(
      (row, orderIndex) => ({ ...row, orderIndex }) as AdminResourceRow
    )
    const previousOrder = new Map(
      previousRows.map((row) => [resourceId(config, row), Number(readRow(row, 'orderIndex'))])
    )
    const changedRows = nextRows.filter(
      (row) => previousOrder.get(resourceId(config, row)) !== Number(readRow(row, 'orderIndex'))
    )

    const updateRows = () => setRows(nextRows)
    const transitionDocument = document as Document & {
      startViewTransition?: (update: () => void) => unknown
    }
    if (typeof transitionDocument.startViewTransition === 'function') {
      transitionDocument.startViewTransition(updateRows)
    } else {
      updateRows()
    }
    setDraggingId(null)
    setDragTargetId(null)
    setIsReordering(true)
    try {
      await Promise.all(
        changedRows.map((row) =>
          api.updateResource('board-members', resourceId(config, row), {
            orderIndex: Number(readRow(row, 'orderIndex')),
          })
        )
      )
      toast.success('Board order updated')
    } catch (error) {
      onAdminError(error)
      await loadRows()
    } finally {
      setIsReordering(false)
    }
  }

  const hasRsvpLink = String(form.rsvpLink ?? '') !== '#' && Boolean(form.rsvpLink)
  const semesterUsageTotal = (semesterUsage?.events ?? 0) + (semesterUsage?.members ?? 0)
  const semesterDeleteBlocked =
    config.key === 'semesters' &&
    (semesterUsageLoading || semesterUsageError || !semesterUsage || semesterUsageTotal > 0)

  return (
    <section className="admin-section">
      <div className="section-heading">
        <div>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        {config.allowCreate === false ? null : (
          <Button type="button" onClick={openCreate} disabled={readOnly}>
            <Plus data-icon="inline-start" />
            {config.key === 'newsletter-signups'
              ? 'Subscribe through Mailchimp'
              : `Create ${config.singular}`}
          </Button>
        )}
      </div>

      <div className="toolbar">
        <div className="search-shell">
          <Search aria-hidden="true" />
          <Input
            aria-label={`Search ${config.title}`}
            placeholder={`Search ${config.title.toLowerCase()}...`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={reorderMode}
          />
        </div>
        {config.key === 'events' ? (
          <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
            <SelectTrigger aria-label="Visibility filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Visibility</SelectItem>
                <SelectItem value="visible">Visible</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : null}
        {config.key === 'board-members' && !readOnly ? (
          <Button
            type="button"
            variant={reorderMode ? 'default' : 'outline'}
            onClick={reorderMode ? exitReorderMode : enterReorderMode}
            disabled={isReordering}
          >
            <GripVertical data-icon="inline-start" />
            {isReordering ? 'Saving order…' : reorderMode ? 'Done reordering' : 'Reorder board'}
          </Button>
        ) : null}
      </div>

      {config.key === 'board-members' && reorderMode ? (
        <Alert className="reorder-mode-alert">
          <GripVertical aria-hidden="true" />
          <AlertTitle>Reordering public board order</AlertTitle>
          <AlertDescription>
            This is the exact order shown on the website. Drag rows into position; each change saves
            automatically.
          </AlertDescription>
        </Alert>
      ) : null}

      {config.key === 'semesters' && semesterDeleteNotice ? (
        <Alert variant="destructive">
          <ShieldAlert aria-hidden="true" />
          <AlertTitle>Semester wasn’t deleted</AlertTitle>
          <AlertDescription>{semesterDeleteNotice}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="resource-card">
        <CardContent className="p-0">
          <Table className="resource-table">
            <TableHeader>
              <TableRow>
                {config.columns.map((column) => {
                  const isActive = sort.key === column.key
                  const SortIcon = !isActive
                    ? ArrowUpDown
                    : sort.direction === 'asc'
                      ? ArrowUp
                      : ArrowDown
                  return (
                    <TableHead
                      key={column.key}
                      style={{ width: column.width }}
                      aria-sort={
                        isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                      }
                    >
                      <button
                        type="button"
                        className="sort-button"
                        onClick={() => changeSort(column)}
                        disabled={reorderMode}
                      >
                        {column.label}
                        <SortIcon aria-hidden="true" />
                      </button>
                    </TableHead>
                  )
                })}
                <TableHead className="actions-column">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={config.columns.length + 1}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredRows.length ? (
                filteredRows.map((row) => {
                  const rowId = resourceId(config, row)
                  return (
                    <TableRow
                      key={rowId}
                      draggable={canReorder}
                      data-dragging={draggingId === rowId ? 'true' : undefined}
                      data-drag-target={dragTargetId === rowId ? 'true' : undefined}
                      style={
                        config.key === 'board-members'
                          ? {
                              viewTransitionName: `board-row-${rowId.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
                            }
                          : undefined
                      }
                      onDragStart={() => {
                        setDraggingId(rowId)
                        setDragTargetId(null)
                      }}
                      onDragEnd={() => {
                        setDraggingId(null)
                        setDragTargetId(null)
                      }}
                      onDragEnter={() => {
                        if (canReorder && draggingId && draggingId !== rowId) {
                          setDragTargetId(rowId)
                        }
                      }}
                      onDragOver={(event) => canReorder && event.preventDefault()}
                      onDrop={() => void reorderBoard(rowId)}
                    >
                      {config.columns.map((column) => (
                        <TableCell
                          key={column.key}
                          className={column.kind === 'long' ? 'long-cell' : ''}
                        >
                          {column.kind === 'order' && reorderMode ? (
                            <span className="drag-handle" title="Drag to reorder">
                              <GripVertical aria-hidden="true" />
                              <span>{Number(readRow(row, column.key)) + 1}</span>
                              <span className="sr-only">Drag {resourceLabel(config, row)}</span>
                            </span>
                          ) : (
                            <span className="cell-value">
                              {column.kind === 'order'
                                ? Number(readRow(row, column.key)) + 1
                                : displayValue(readRow(row, column.key), column.kind)}
                            </span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="actions-column">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(row)}
                        >
                          <Edit3
                            aria-label={`${readOnly ? 'View' : 'Edit'} ${resourceLabel(config, row)}`}
                          />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm">
                              <MoreVertical aria-label="More actions" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => openEdit(row)}>
                                {readOnly ? 'View' : 'Edit'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={readOnly || semesterDeleteCheckId === rowId}
                                onSelect={() => void requestDelete(row)}
                              >
                                {semesterDeleteCheckId === rowId ? 'Checking usage…' : 'Delete'}
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={config.columns.length + 1}>
                    <div className="empty-state">
                      No {config.title.toLowerCase()} match the current view.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="table-footer">
        <span>
          Showing {filteredRows.length} of {rows.length} {config.title.toLowerCase()}
        </span>
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (open) {
            setSheetOpen(true)
          } else if (!previewAsset && Date.now() >= nestedDialogCloseGuardUntil.current) {
            requestCloseEditor()
          }
        }}
      >
        <SheetContent
          className="edit-sheet"
          onInteractOutside={(event) => {
            // The preview dialog is portaled outside this sheet. Its controls therefore look like
            // outside interactions to Radix's sheet, even though the editor should remain open.
            if (previewAsset) event.preventDefault()
          }}
        >
          <SheetHeader>
            <SheetTitle>
              {editingRow
                ? `${readOnly ? 'View' : 'Edit'} ${config.singular}`
                : config.key === 'newsletter-signups'
                  ? 'Subscribe to newsletter'
                  : `Create ${config.singular}`}
            </SheetTitle>
            <SheetDescription>
              {readOnly
                ? 'Local admin is read-only while connected to production data.'
                : config.key === 'newsletter-signups' && !editingRow
                  ? 'Saving subscribes this person in Mailchimp and adds the signup to the admin database.'
                  : 'Changes are saved via the admin API.'}
            </SheetDescription>
          </SheetHeader>
          <form className="edit-form" onSubmit={(event) => void handleSubmit(event)}>
            {formError ? (
              <Alert variant="destructive" className="editor-alert">
                <ShieldAlert aria-hidden="true" />
                <AlertTitle>Unable to save</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            {config.key === 'semesters' && editingRow ? (
              semesterUsageLoading ? (
                <Alert>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  <AlertTitle>Checking semester usage</AlertTitle>
                  <AlertDescription>
                    Delete remains unavailable until this check finishes.
                  </AlertDescription>
                </Alert>
              ) : semesterUsageError || !semesterUsage ? (
                <Alert variant="destructive">
                  <ShieldAlert aria-hidden="true" />
                  <AlertTitle>Unable to verify semester usage</AlertTitle>
                  <AlertDescription>
                    Delete is disabled for safety. Try closing and reopening this semester.
                  </AlertDescription>
                </Alert>
              ) : semesterUsageTotal > 0 ? (
                <Alert>
                  <ShieldAlert aria-hidden="true" />
                  <AlertTitle>This semester is in use</AlertTitle>
                  <AlertDescription>
                    {String(readRow(editingRow, 'semesterName'))} is assigned to{' '}
                    {semesterUsage.events} {semesterUsage.events === 1 ? 'event' : 'events'} and{' '}
                    {semesterUsage.members} {semesterUsage.members === 1 ? 'member' : 'members'}.
                    Reassign or remove those records before deleting it. Renaming the code safely
                    updates its references.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle2 aria-hidden="true" />
                  <AlertTitle>Safe to delete</AlertTitle>
                  <AlertDescription>
                    This semester is not used by any events or members.
                  </AlertDescription>
                </Alert>
              )
            ) : null}

            <div className="edit-form-grid">
              {config.fields.map((field) => {
                if (config.key === 'events' && field.key === 'rsvpLink') {
                  return (
                    <div className="form-field form-field--wide" key={field.key}>
                      <div className="switch-row">
                        <div>
                          <Label htmlFor="has-rsvp-link">RSVP link</Label>
                          <p className="field-help">Off saves “#” so the public site hides RSVP.</p>
                        </div>
                        <Switch
                          id="has-rsvp-link"
                          checked={hasRsvpLink}
                          disabled={readOnly}
                          onCheckedChange={(checked) =>
                            updateForm(field.key, checked ? 'https://' : '#')
                          }
                        />
                      </div>
                      {hasRsvpLink ? (
                        <Input
                          id={field.key}
                          type="url"
                          aria-label="RSVP URL"
                          value={String(form[field.key] ?? '')}
                          onChange={(event) => updateForm(field.key, event.target.value)}
                          placeholder="https://..."
                          disabled={readOnly}
                          required
                        />
                      ) : null}
                    </div>
                  )
                }

                if (field.type === 'media' && config.media) {
                  const uploadedImageReady = Boolean(
                    mediaStatus?.original.exists && mediaStatus.thumbnail.exists
                  )
                  const uploadedImageUrl = mediaStatus?.original.url ?? ''
                  return (
                    <div className="form-field form-field--wide" key={field.key}>
                      <div className="media-upload">
                        <div className="media-upload-heading">
                          <div>
                            <strong>{field.label}</strong>
                          </div>
                          {mediaStatusLoading ? <Loader2 className="animate-spin" /> : null}
                        </div>

                        {pendingMediaFile ? (
                          <div className="media-status-item">
                            <span className="inline-status inline-status--ok">
                              <CheckCircle2 aria-hidden="true" />
                              {pendingMediaFile.name} selected
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={readOnly || isSaving}
                              onClick={() => setPendingMediaFile(null)}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : mediaPath ? (
                          mediaStatusLoading || !mediaStatus ? (
                            <p>Checking uploaded image…</p>
                          ) : (
                            <div className="media-status-item">
                              <span
                                className={
                                  uploadedImageReady
                                    ? 'inline-status inline-status--ok'
                                    : 'inline-status inline-status--danger'
                                }
                              >
                                {uploadedImageReady ? <CheckCircle2 aria-hidden="true" /> : <X />}
                                {uploadedImageReady ? 'Uploaded image' : 'Image unavailable'}
                              </span>
                              {uploadedImageReady && uploadedImageUrl ? (
                                <div className="media-status-actions">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setPreviewAsset({
                                        title: 'Uploaded image',
                                        url: uploadedImageUrl,
                                      })
                                    }
                                  >
                                    <ImageIcon data-icon="inline-start" />
                                    Preview
                                  </Button>
                                  <Button type="button" variant="ghost" size="icon-sm" asChild>
                                    <a href={uploadedImageUrl} target="_blank" rel="noreferrer">
                                      <ExternalLink aria-label="Open uploaded image" />
                                    </a>
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          )
                        ) : (
                          <p>No image is assigned yet.</p>
                        )}

                        <Input
                          id={`${field.key}-upload`}
                          className="sr-only"
                          type="file"
                          accept="image/*"
                          disabled={readOnly || isSaving}
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) handleUpload(file)
                            event.target.value = ''
                          }}
                        />
                        <Label
                          htmlFor={`${field.key}-upload`}
                          aria-disabled={readOnly || isSaving}
                          className={buttonVariants({
                            variant: 'outline',
                            className: 'media-upload-trigger',
                          })}
                        >
                          <Upload data-icon="inline-start" />
                          {mediaPath
                            ? `Replace ${config.media.label}`
                            : `Upload ${config.media.label}`}
                        </Label>
                        <p>Save uploads the source file and a nested JPEG thumbnail together.</p>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    className={`form-field${field.wide ? ' form-field--wide' : ''}`}
                    key={field.key}
                  >
                    {field.type === 'boolean' ? (
                      <div className="switch-row">
                        <Label htmlFor={field.key}>{field.label}</Label>
                        <Switch
                          id={field.key}
                          checked={Boolean(form[field.key])}
                          disabled={readOnly}
                          onCheckedChange={(checked) => updateForm(field.key, checked)}
                        />
                      </div>
                    ) : (
                      <>
                        <Label htmlFor={field.key}>
                          {field.label}
                          {field.required ? <span aria-hidden="true"> *</span> : null}
                        </Label>
                        {field.key === 'semester' ? (
                          <>
                            <Select
                              value={String(form[field.key] ?? '')}
                              onValueChange={(value) => updateForm(field.key, value)}
                              disabled={
                                readOnly || semesterOptionsLoading || !semesterOptions.length
                              }
                            >
                              <SelectTrigger id={field.key} className="form-select">
                                <SelectValue
                                  placeholder={
                                    semesterOptionsLoading
                                      ? 'Loading semesters…'
                                      : semesterOptions.length
                                        ? 'Select a semester'
                                        : 'No semesters created'
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {semesterOptions.map((semester) => (
                                    <SelectItem key={semester} value={semester}>
                                      {semester}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                            {!semesterOptionsLoading && !semesterOptions.length ? (
                              <p className="field-help">
                                Create a semester in the Semesters section before assigning one.
                              </p>
                            ) : null}
                          </>
                        ) : field.type === 'duration' ? (
                          <Select
                            value={String(form[field.key] ?? DEFAULT_EVENT_DURATION_MINUTES)}
                            onValueChange={(value) => updateForm(field.key, Number(value))}
                            disabled={readOnly}
                          >
                            <SelectTrigger id={field.key} className="form-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {EVENT_DURATION_OPTIONS.map((option) => (
                                  <SelectItem key={option.minutes} value={String(option.minutes)}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        ) : config.key === 'semesters' && field.key === 'semesterName' ? (
                          <>
                            <Input
                              id={field.key}
                              value={String(form[field.key] ?? '')}
                              onChange={(event) =>
                                updateForm(field.key, event.target.value.toUpperCase())
                              }
                              required
                              maxLength={3}
                              placeholder="S26"
                              autoCapitalize="characters"
                              autoComplete="off"
                              disabled={readOnly}
                            />
                            <p className="field-help">
                              Use SYY for spring or FYY for fall, where YY is the year’s last two
                              digits—for example, S26 or F27.
                            </p>
                          </>
                        ) : field.type === 'textarea' ? (
                          <Textarea
                            id={field.key}
                            value={String(form[field.key] ?? '')}
                            onChange={(event) => updateForm(field.key, event.target.value)}
                            required={field.required}
                            placeholder={field.placeholder}
                            disabled={readOnly}
                          />
                        ) : (
                          <Input
                            id={field.key}
                            type={field.type === 'datetime' ? 'datetime-local' : field.type}
                            value={String(form[field.key] ?? '')}
                            onChange={(event) => updateForm(field.key, event.target.value)}
                            required={field.required}
                            placeholder={field.placeholder}
                            disabled={readOnly}
                          />
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            <SheetFooter>
              {editingRow ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void requestDelete(editingRow)}
                  disabled={
                    isSaving ||
                    readOnly ||
                    semesterDeleteBlocked ||
                    semesterDeleteCheckId === resourceId(config, editingRow)
                  }
                >
                  <Trash2 data-icon="inline-start" />
                  {semesterDeleteCheckId === resourceId(config, editingRow)
                    ? 'Checking usage…'
                    : 'Delete'}
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={requestCloseEditor}>
                {readOnly ? 'Close' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={isSaving || readOnly || !isDirty}>
                {isSaving ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
                {config.key === 'newsletter-signups' && !editingRow
                  ? 'Subscribe through Mailchimp'
                  : 'Save Changes'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(previewAsset)} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="media-preview-dialog">
          <DialogHeader>
            <DialogTitle>{previewAsset?.title}</DialogTitle>
            <DialogDescription>Current asset stored in Supabase Storage.</DialogDescription>
          </DialogHeader>
          {previewAsset ? <img src={previewAsset.url} alt={previewAsset.title} /> : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardPromptOpen} onOpenChange={handleDiscardPromptOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You changed this {config.singular.toLowerCase()} but have not saved it. Continue
              editing or discard the changes before closing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue editing</AlertDialogCancel>
            <AlertDialogAction onClick={closeEditor}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {config.singular}?</AlertDialogTitle>
            <AlertDialogDescription>
              {config.key === 'newsletter-signups' ? (
                <>
                  This deletes {deleteTarget ? resourceLabel(config, deleteTarget) : 'this signup'}{' '}
                  from the admin database only. It does not unsubscribe or remove the person from
                  Mailchimp. This action cannot be undone.
                </>
              ) : (
                <>
                  This removes {deleteTarget ? resourceLabel(config, deleteTarget) : 'this record'}{' '}
                  through the backend admin API. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              {config.key === 'newsletter-signups' ? 'Delete database row only' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function StorageScreen({
  api,
  onAdminError,
  readOnly = false,
}: {
  api: AdminApiClient
  onAdminError: (error: unknown) => void
  readOnly?: boolean
}) {
  const [buckets, setBuckets] = useState<StorageBucket[]>([])
  const [bucketId, setBucketId] = useState('')
  const [objects, setObjects] = useState<StorageObject[]>([])
  const [prefix, setPrefix] = useState('')
  const [search, setSearch] = useState('')
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set())
  const [inspectedObject, setInspectedObject] = useState<StorageObject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [folderOpen, setFolderOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [moveTarget, setMoveTarget] = useState<StorageObject | null>(null)
  const [movePath, setMovePath] = useState('')
  const [deleteTargets, setDeleteTargets] = useState<StorageObject[]>([])
  const [isMutating, setIsMutating] = useState(false)

  const loadBuckets = useCallback(async () => {
    try {
      const nextBuckets = await api.listStorageBuckets()
      setBuckets(nextBuckets)
    } catch (error) {
      onAdminError(error)
    } finally {
      setIsLoading(false)
    }
  }, [api, onAdminError])

  const loadObjects = useCallback(async () => {
    if (!bucketId) return
    setIsLoading(true)
    try {
      const nextObjects = await api.listStorageObjects(bucketId, { prefix, search })
      setObjects(nextObjects.filter((object) => !object.path.endsWith('/.keep')))
      setSelectedPaths(new Set())
      setInspectedObject(null)
    } catch (error) {
      onAdminError(error)
    } finally {
      setIsLoading(false)
    }
  }, [api, bucketId, onAdminError, prefix, search])

  useEffect(() => {
    void loadBuckets()
  }, [loadBuckets])

  useEffect(() => {
    void loadObjects()
  }, [loadObjects])

  const selectedList = Array.from(selectedPaths)
  const selectedObjects = objects.filter((object) => selectedPaths.has(object.path))
  const selectedBucket = buckets.find((bucket) => bucket.id === bucketId)
  const mediaBucketManaged = PROTECTED_MEDIA_BUCKETS.has(bucketId)
  const storageMutationsDisabled = readOnly || mediaBucketManaged
  const breadcrumbSegments = prefix.split('/').filter(Boolean)

  const joinStoragePath = (...parts: string[]) =>
    parts
      .flatMap((part) => part.split('/'))
      .map((part) => part.trim())
      .filter(Boolean)
      .join('/')

  const openBucket = (nextBucketId: string) => {
    setBucketId(nextBucketId)
    setPrefix('')
    setSearch('')
    setSelectedPaths(new Set())
    setInspectedObject(null)
  }

  const openFolder = (objectPath: string) => {
    setPrefix(objectPath.replace(/\/$/, ''))
    setSearch('')
  }

  const openBreadcrumb = (index: number) => {
    setPrefix(breadcrumbSegments.slice(0, index + 1).join('/'))
    setSearch('')
  }

  const togglePath = (objectPath: string) => {
    setSelectedPaths((current) => {
      const next = new Set(current)
      if (next.has(objectPath)) next.delete(objectPath)
      else next.add(objectPath)
      return next
    })
  }

  const uploadSelectedFiles = async () => {
    if (storageMutationsDisabled) {
      toast.error(
        mediaBucketManaged
          ? 'Manage event flyers and board headshots from their resource editors.'
          : 'Local admin is read-only while connected to production data.'
      )
      return
    }
    if (!bucketId || uploadFiles.length === 0) return
    if (uploadFiles.some((file) => file.size > 10 * 1024 * 1024)) {
      toast.error('Storage JSON uploads are limited to 10 MB.')
      return
    }

    setIsMutating(true)
    try {
      await Promise.all(
        uploadFiles.map(async (file) =>
          api.uploadStorageObject(bucketId, {
            path: joinStoragePath(prefix, file.name),
            contentBase64: await fileToBase64(file),
            contentType: file.type || 'application/octet-stream',
            upsert: true,
          })
        )
      )
      toast.success(`${uploadFiles.length} ${uploadFiles.length === 1 ? 'file' : 'files'} uploaded`)
      setUploadFiles([])
      setUploadOpen(false)
      await loadObjects()
    } catch (error) {
      onAdminError(error)
    } finally {
      setIsMutating(false)
    }
  }

  const createFolder = async () => {
    if (storageMutationsDisabled) {
      toast.error(
        mediaBucketManaged
          ? 'This media bucket is managed by its paired resource endpoint.'
          : 'Local admin is read-only while connected to production data.'
      )
      return
    }
    const cleanName = folderName.trim()
    if (!bucketId || !cleanName) return
    if (cleanName.includes('/') || cleanName === '.' || cleanName === '..') {
      toast.error('Folder names cannot contain slashes or path traversal.')
      return
    }

    setIsMutating(true)
    try {
      await api.uploadStorageObject(bucketId, {
        path: joinStoragePath(prefix, cleanName, '.keep'),
        contentBase64: '',
        contentType: 'application/octet-stream',
        upsert: false,
      })
      toast.success('Folder created')
      setFolderName('')
      setFolderOpen(false)
      await loadObjects()
    } catch (error) {
      onAdminError(error)
    } finally {
      setIsMutating(false)
    }
  }

  const moveObject = async () => {
    if (storageMutationsDisabled) {
      toast.error(
        mediaBucketManaged
          ? 'This media bucket is managed by its paired resource endpoint.'
          : 'Local admin is read-only while connected to production data.'
      )
      return
    }
    if (!bucketId || !moveTarget || !movePath.trim()) return
    setIsMutating(true)
    try {
      await api.updateStorageObject(bucketId, {
        path: moveTarget.path,
        newPath: movePath.trim().replace(/^\/+|\/+$/g, ''),
        recursive: moveTarget.type === 'folder',
      })
      toast.success(`${moveTarget.type === 'folder' ? 'Folder' : 'File'} moved`)
      setMovePath('')
      setMoveTarget(null)
      await loadObjects()
    } catch (error) {
      onAdminError(error)
    } finally {
      setIsMutating(false)
    }
  }

  const deleteObjects = async () => {
    if (storageMutationsDisabled) {
      toast.error(
        mediaBucketManaged
          ? 'This media bucket is managed by its paired resource endpoint.'
          : 'Local admin is read-only while connected to production data.'
      )
      return
    }
    if (!bucketId || deleteTargets.length === 0) return
    setIsMutating(true)
    try {
      await api.deleteStorageObjects(bucketId, {
        paths: deleteTargets.map((object) => object.path),
        recursive: deleteTargets.some((object) => object.type === 'folder'),
      })
      toast.success(
        `${deleteTargets.length} ${deleteTargets.length === 1 ? 'object' : 'objects'} deleted`
      )
      setDeleteTargets([])
      await loadObjects()
    } catch (error) {
      onAdminError(error)
    } finally {
      setIsMutating(false)
    }
  }

  const beginMove = (object: StorageObject) => {
    setMoveTarget(object)
    setMovePath(object.path)
  }

  const objectMetadata = (object: StorageObject) =>
    object.metadata && typeof object.metadata === 'object'
      ? (object.metadata as Record<string, unknown>)
      : {}

  const formatBytes = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
    if (value < 1024) return `${value} B`
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
    return `${(value / (1024 * 1024)).toFixed(1)} MB`
  }

  const isImageObject = (object: StorageObject) => {
    const metadata = objectMetadata(object)
    return (
      String(metadata.mimetype ?? metadata.contentType ?? '').startsWith('image/') ||
      /\.(avif|gif|jpe?g|png|webp)$/i.test(object.name)
    )
  }

  const copyPublicUrl = async (object: StorageObject) => {
    if (!object.publicUrl) return
    await navigator.clipboard.writeText(object.publicUrl)
    toast.success('Public URL copied')
  }

  return (
    <section className="admin-section storage-section">
      <div className="section-heading">
        <div>
          <h1>Storage</h1>
          <p>Browse and manage files stored in Supabase through the backend.</p>
        </div>
      </div>

      <div className="storage-browser">
        <aside className="storage-buckets" aria-label="Storage buckets">
          <div className="storage-panel-heading">
            <span>Buckets</span>
            <Badge variant="secondary">{buckets.length}</Badge>
          </div>
          {isLoading && buckets.length === 0 ? (
            <div className="storage-bucket-loading">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : buckets.length ? (
            <div className="storage-bucket-list">
              {buckets.map((bucket) => (
                <button
                  key={bucket.id}
                  type="button"
                  className="storage-bucket-button"
                  data-active={bucket.id === bucketId}
                  onClick={() => openBucket(bucket.id)}
                >
                  <HardDrive aria-hidden="true" />
                  <span>{bucket.name}</span>
                  {bucket.public ? <Badge variant="outline">Public</Badge> : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="storage-muted">No storage buckets found.</p>
          )}
        </aside>

        <div className="storage-files">
          {selectedBucket ? (
            <>
              <div className="storage-pathbar">
                <nav className="storage-breadcrumbs" aria-label="Storage path">
                  <button type="button" onClick={() => setBucketId('')}>
                    Storage
                  </button>
                  <ChevronRight aria-hidden="true" />
                  <button type="button" onClick={() => openBucket(selectedBucket.id)}>
                    {selectedBucket.name}
                  </button>
                  {breadcrumbSegments.map((segment, index) => (
                    <span key={`${segment}-${index}`}>
                      <ChevronRight aria-hidden="true" />
                      <button type="button" onClick={() => openBreadcrumb(index)}>
                        {segment}
                      </button>
                    </span>
                  ))}
                </nav>
                {selectedBucket.public ? <Badge variant="outline">Public</Badge> : null}
              </div>

              <div className="storage-toolbar">
                <div className="search-shell storage-search">
                  <Search aria-hidden="true" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Search in ${breadcrumbSegments.at(-1) ?? selectedBucket.name}...`}
                    aria-label="Search storage objects"
                  />
                </div>
                {!storageMutationsDisabled ? (
                  <div className="storage-toolbar-actions">
                    <Button type="button" variant="outline" onClick={() => setFolderOpen(true)}>
                      <FolderPlus data-icon="inline-start" />
                      Create folder
                    </Button>
                    <Button type="button" onClick={() => setUploadOpen(true)}>
                      <Upload data-icon="inline-start" />
                      Upload files
                    </Button>
                  </div>
                ) : null}
              </div>

              {storageMutationsDisabled ? (
                <div className="storage-readonly-note">
                  {mediaBucketManaged
                    ? 'These files are read-only here. Replace them from the Events or Board editor so the owning row and cache version update together. Full-size files belong at the bucket root and JPEG thumbnails belong in thumbnails/. Nested media folders are legacy and should be migrated before deletion.'
                    : 'Production files are available to inspect. Storage changes are disabled in local read-only mode.'}
                </div>
              ) : null}

              {selectedList.length ? (
                <div className="storage-selection-bar">
                  <strong>{selectedList.length} selected</strong>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedObjects.length !== 1 || storageMutationsDisabled}
                    onClick={() => selectedObjects[0] && beginMove(selectedObjects[0])}
                  >
                    <Move data-icon="inline-start" />
                    Move
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={storageMutationsDisabled}
                    onClick={() => setDeleteTargets(selectedObjects)}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPaths(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              ) : null}

              <div className="storage-content" data-inspector-open={Boolean(inspectedObject)}>
                <div className="storage-table-wrap">
                  <Table className="storage-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="storage-check-column">
                          <input
                            type="checkbox"
                            className="storage-checkbox"
                            aria-label="Select all storage objects"
                            checked={objects.length > 0 && selectedPaths.size === objects.length}
                            onChange={(event) =>
                              setSelectedPaths(
                                event.target.checked
                                  ? new Set(objects.map((object) => object.path))
                                  : new Set()
                              )
                            }
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Last modified</TableHead>
                        <TableHead className="actions-column" aria-label="Actions" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 6 }, (_, index) => (
                          <TableRow key={index}>
                            <TableCell colSpan={5}>
                              <Skeleton className="h-7 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : objects.length ? (
                        objects.map((object) => {
                          const metadata = objectMetadata(object)
                          const ObjectIcon =
                            object.type === 'folder'
                              ? Folder
                              : isImageObject(object)
                                ? FileImage
                                : FileText
                          return (
                            <TableRow
                              key={object.path}
                              data-selected={selectedPaths.has(object.path)}
                              data-inspected={inspectedObject?.path === object.path}
                            >
                              <TableCell className="storage-check-column">
                                <input
                                  type="checkbox"
                                  className="storage-checkbox"
                                  aria-label={`Select ${object.name}`}
                                  checked={selectedPaths.has(object.path)}
                                  onChange={() => togglePath(object.path)}
                                />
                              </TableCell>
                              <TableCell>
                                <button
                                  type="button"
                                  className="storage-object-button"
                                  onClick={() =>
                                    object.type === 'folder'
                                      ? openFolder(object.path)
                                      : setInspectedObject(object)
                                  }
                                >
                                  <ObjectIcon aria-hidden="true" />
                                  <span>{object.name}</span>
                                </button>
                              </TableCell>
                              <TableCell>
                                {object.type === 'folder' ? '—' : formatBytes(metadata.size)}
                              </TableCell>
                              <TableCell>{displayValue(object.updatedAt, 'date')}</TableCell>
                              <TableCell className="actions-column">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={`Actions for ${object.name}`}
                                    >
                                      <MoreVertical />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuGroup>
                                      {object.type === 'folder' ? (
                                        <DropdownMenuItem onSelect={() => openFolder(object.path)}>
                                          <FolderOpen /> Open folder
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onSelect={() => setInspectedObject(object)}
                                        >
                                          <Eye /> View details
                                        </DropdownMenuItem>
                                      )}
                                      {object.publicUrl ? (
                                        <DropdownMenuItem
                                          onSelect={() => void copyPublicUrl(object)}
                                        >
                                          <Copy /> Copy public URL
                                        </DropdownMenuItem>
                                      ) : null}
                                      <DropdownMenuItem
                                        disabled={storageMutationsDisabled}
                                        onSelect={() => beginMove(object)}
                                      >
                                        <Move /> Rename or move
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        variant="destructive"
                                        disabled={storageMutationsDisabled}
                                        onSelect={() => setDeleteTargets([object])}
                                      >
                                        <Trash2 /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <div className="storage-empty">
                              <FolderOpen aria-hidden="true" />
                              <strong>
                                {search ? 'No matching files' : 'This folder is empty'}
                              </strong>
                              <span>
                                {search
                                  ? 'Try another search.'
                                  : readOnly
                                    ? 'There are no files at this path.'
                                    : 'Upload a file or create a folder to get started.'}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {inspectedObject ? (
                  <aside className="storage-inspector" aria-label="File details">
                    <div className="storage-inspector-heading">
                      <strong>File details</strong>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Close file details"
                        onClick={() => setInspectedObject(null)}
                      >
                        <X />
                      </Button>
                    </div>
                    {isImageObject(inspectedObject) && inspectedObject.publicUrl ? (
                      <div className="storage-preview">
                        <img src={inspectedObject.publicUrl} alt={inspectedObject.name} />
                      </div>
                    ) : (
                      <div className="storage-file-icon">
                        <FileText aria-hidden="true" />
                      </div>
                    )}
                    <div className="storage-inspector-copy">
                      <strong>{inspectedObject.name}</strong>
                      <span>{inspectedObject.path}</span>
                    </div>
                    <dl className="storage-metadata">
                      <div>
                        <dt>Size</dt>
                        <dd>{formatBytes(objectMetadata(inspectedObject).size)}</dd>
                      </div>
                      <div>
                        <dt>Type</dt>
                        <dd>
                          {String(
                            objectMetadata(inspectedObject).mimetype ??
                              objectMetadata(inspectedObject).contentType ??
                              'File'
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>{displayValue(inspectedObject.updatedAt, 'date')}</dd>
                      </div>
                    </dl>
                    {inspectedObject.publicUrl ? (
                      <div className="storage-inspector-actions">
                        <Button type="button" variant="outline" asChild>
                          <a href={inspectedObject.publicUrl} target="_blank" rel="noreferrer">
                            <ExternalLink data-icon="inline-start" /> Open
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void copyPublicUrl(inspectedObject)}
                        >
                          <Copy data-icon="inline-start" /> Copy URL
                        </Button>
                      </div>
                    ) : null}
                  </aside>
                ) : null}
              </div>
            </>
          ) : (
            <div className="storage-welcome">
              <FileArchive aria-hidden="true" />
              <h2>Choose a bucket</h2>
              <p>Select a bucket to browse its folders and files.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload files</DialogTitle>
            <DialogDescription>
              Files will be uploaded to {prefix || selectedBucket?.name}. Each file must be 10 MB or
              smaller because uploads use JSON bodies.
            </DialogDescription>
          </DialogHeader>
          <div className="storage-dialog-field">
            <Label htmlFor="storage-files">Files</Label>
            <Input
              id="storage-files"
              type="file"
              multiple
              disabled={isMutating}
              onChange={(event) => setUploadFiles(Array.from(event.target.files ?? []))}
            />
            {uploadFiles.length ? <span>{uploadFiles.length} selected</span> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isMutating || uploadFiles.length === 0}
              onClick={() => void uploadSelectedFiles()}
            >
              {isMutating ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
            <DialogDescription>
              Create a virtual folder inside {prefix || selectedBucket?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="storage-dialog-field">
            <Label htmlFor="storage-folder-name">Folder name</Label>
            <Input
              id="storage-folder-name"
              value={folderName}
              disabled={isMutating}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="New folder"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isMutating || !folderName.trim()}
              onClick={() => void createFolder()}
            >
              {isMutating ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
              Create folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(moveTarget)}
        onOpenChange={(open) => {
          if (!open) setMoveTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename or move</DialogTitle>
            <DialogDescription>
              Enter the complete destination path for {moveTarget?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="storage-dialog-field">
            <Label htmlFor="storage-move-path">Destination path</Label>
            <Input
              id="storage-move-path"
              value={movePath}
              disabled={isMutating}
              onChange={(event) => setMovePath(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isMutating || !movePath.trim() || movePath.trim() === moveTarget?.path}
              onClick={() => void moveObject()}
            >
              {isMutating ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTargets.length > 0}
        onOpenChange={(open) => {
          if (!open) setDeleteTargets([])
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTargets.length === 1 ? deleteTargets[0]?.name : 'selected objects'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTargets.some((object) => object.type === 'folder')
                ? 'Folders and everything inside them will be deleted recursively. '
                : ''}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isMutating} onClick={() => void deleteObjects()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setIsSubmitting(false)
    if (signInError) setError(signInError.message)
  }

  return (
    <main className="login-layout">
      <section className="login-panel" aria-label="Login form">
        <div className="login-brand">
          <span>SJBA</span>
          <strong>Admin</strong>
        </div>
        <h1>Sign in</h1>
        <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="form-field">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <ShieldAlert aria-hidden="true" />
              <AlertTitle>Unable to sign in</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
            Sign in
          </Button>
        </form>
      </section>
    </main>
  )
}

interface OverviewScreenProps {
  api: AdminApiClient
  resources: ResourceConfig[]
  readOnly: boolean
  onAdminError: (error: unknown) => void
  onNavigate: (section: ActiveSection) => void
}

function OverviewScreen({
  api,
  resources,
  readOnly,
  onAdminError,
  onNavigate,
}: OverviewScreenProps) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [siteConfig, setSiteConfig] = useState<SiteConfigItem[]>([])
  const [mentorshipUrl, setMentorshipUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const loadOverview = useCallback(async () => {
    setIsLoading(true)
    const results = await Promise.allSettled(
      resources.map(async (resource) => ({
        resource,
        rows: await api.listResource<AdminResourceRow>(resource.key),
      }))
    )

    const nextCounts: Record<string, number> = {}
    let firstError: unknown
    for (const result of results) {
      if (result.status === 'rejected') {
        firstError ??= result.reason
        continue
      }
      const { resource, rows } = result.value
      nextCounts[resource.key] = rows.length
      if (resource.key === 'events') setEvents(rows as AdminEvent[])
      if (resource.key === 'site-config') {
        const configRows = rows as SiteConfigItem[]
        setSiteConfig(configRows)
        setMentorshipUrl(
          configRows.find((item) => item.key === 'mentorship_application_url')?.value ?? ''
        )
      }
    }
    setCounts(nextCounts)
    setIsLoading(false)
    if (firstError) onAdminError(firstError)
  }, [api, onAdminError, resources])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const now = Date.now()
  const datedEvents = events.filter((event) => !Number.isNaN(new Date(event.startTime).getTime()))
  const nextEvent = [...datedEvents]
    .filter((event) => new Date(event.startTime).getTime() >= now)
    .sort((left, right) => +new Date(left.startTime) - +new Date(right.startTime))[0]
  const previousEvent = [...datedEvents]
    .filter((event) => new Date(event.startTime).getTime() < now)
    .sort((left, right) => +new Date(right.startTime) - +new Date(left.startTime))[0]
  const mentorshipOpen =
    siteConfig.find((item) => item.key === 'mentorship_application_open')?.value === 'true'

  const saveConfig = async (key: string, value: string) => {
    if (readOnly) return
    setSavingKey(key)
    try {
      const existing = siteConfig.find((item) => item.key === key)
      const saved = existing
        ? await api.updateResource<SiteConfigItem>('site-config', key, { value })
        : await api.createResource<SiteConfigItem>('site-config', { key, value })
      setSiteConfig((current) => [...current.filter((item) => item.key !== key), saved])
      toast.success('Site setting updated')
    } catch (error) {
      onAdminError(error)
    } finally {
      setSavingKey(null)
    }
  }

  const eventSummary = (event: AdminEvent | undefined, emptyMessage: string) => {
    if (!event) return <p className="overview-empty-copy">{emptyMessage}</p>
    return (
      <>
        <strong>{event.title}</strong>
        <span>{displayValue(event.startTime, 'date')}</span>
        <span>{event.company || event.location || 'No company or location provided'}</span>
      </>
    )
  }

  return (
    <section className="admin-section">
      <div className="section-heading">
        <div>
          <h1>Overview</h1>
          <p>Admin operations run through the backend with Supabase access-token verification.</p>
        </div>
      </div>
      <div className="overview-grid">
        {resources.map((resource) => {
          const Icon = resource.icon
          return (
            <button
              type="button"
              className="overview-card-button"
              key={resource.key}
              onClick={() => onNavigate(resource.key)}
            >
              <Card>
                <CardHeader>
                  <div className="overview-card-heading">
                    <Icon aria-hidden="true" className="overview-icon" />
                    {isLoading ? (
                      <Skeleton className="h-7 w-12" />
                    ) : (
                      <strong className="overview-count">{counts[resource.key] ?? 0}</strong>
                    )}
                  </div>
                  <CardTitle>{resource.title}</CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
              </Card>
            </button>
          )
        })}
      </div>

      <div className="overview-detail-grid">
        <Card>
          <CardHeader>
            <CardTitle>Events at a glance</CardTitle>
            <CardDescription>The closest events on either side of today.</CardDescription>
          </CardHeader>
          <CardContent className="event-glance-grid">
            <button type="button" onClick={() => onNavigate('events')}>
              <span className="glance-label">Previous event</span>
              {isLoading
                ? eventSummary(undefined, 'Loading events…')
                : eventSummary(previousEvent, 'No previous event is available.')}
            </button>
            <button type="button" onClick={() => onNavigate('events')}>
              <span className="glance-label">Next upcoming event</span>
              {isLoading
                ? eventSummary(undefined, 'Loading events…')
                : eventSummary(nextEvent, 'No upcoming event is scheduled.')}
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mentorship settings</CardTitle>
            <CardDescription>Common site configuration without leaving Overview.</CardDescription>
          </CardHeader>
          <CardContent className="quick-config">
            <div className="switch-row">
              <div>
                <Label htmlFor="mentorship-open">Applications open</Label>
                <p>Controls whether the public application action is shown.</p>
              </div>
              <Switch
                id="mentorship-open"
                checked={mentorshipOpen}
                disabled={readOnly || savingKey === 'mentorship_application_open'}
                onCheckedChange={(checked) =>
                  void saveConfig('mentorship_application_open', String(checked))
                }
              />
            </div>
            <div className="quick-config-url">
              <Label htmlFor="mentorship-url">Application URL</Label>
              <div>
                <Input
                  id="mentorship-url"
                  type="url"
                  value={mentorshipUrl}
                  disabled={readOnly}
                  onChange={(event) => setMentorshipUrl(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={readOnly || savingKey === 'mentorship_application_url'}
                  onClick={() => void saveConfig('mentorship_application_url', mentorshipUrl)}
                >
                  {savingKey === 'mentorship_application_url' ? (
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                  ) : null}
                  Save URL
                </Button>
              </div>
            </div>
            <Button type="button" variant="ghost" onClick={() => onNavigate('site-config')}>
              Open all site config
              <ExternalLink data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function LocalSafetyNotice({ status }: { status: LocalProductionSafetyStatus | null }) {
  return (
    <section className="safety-banner">
      <Alert variant={status?.readOnly ? 'destructive' : 'default'} className="safety-alert">
        <ShieldAlert aria-hidden="true" />
        <AlertTitle>
          {status?.readOnly
            ? 'Local admin is read-only for production data'
            : 'Checking backend safety'}
        </AlertTitle>
        <AlertDescription>
          {status?.readOnly
            ? 'Production data is visible for inspection, but create, edit, delete, upload, move, and storage delete actions are disabled in this local dev session.'
            : 'Before loading admin data, this local dev build is verifying that the backend is not production and is not connected to production Supabase.'}
        </AlertDescription>
      </Alert>

      {status?.readOnly ? (
        <div className="safety-banner-details">
          <span>{status.backendUrl}</span>
          <span>{status.backendEnvironment ?? 'unknown backend env'}</span>
          {status.reasons.map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [resourceSorts, setResourceSorts] = useState<Record<string, SortState>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<ActiveSection | 'signout' | null>(null)
  const [safetyStatus, setSafetyStatus] = useState<LocalProductionSafetyStatus | null>(null)
  const [authNotice, setAuthNotice] = useState<{
    title: string
    message: string
    kind: 'warning' | 'error'
  } | null>(null)

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession()
      setSession(activeSession)
      setIsCheckingSession(false)
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession)
      setAuthNotice(null)
      setIsCheckingSession(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const api = useMemo(
    () => createAdminApiClient(() => session?.access_token),
    [session?.access_token]
  )

  useEffect(() => {
    let cancelled = false

    if (!session || !import.meta.env.DEV) {
      return () => {
        cancelled = true
      }
    }

    const checkSafety = async () => {
      if (!cancelled) {
        setSafetyStatus(null)
        api.setWritesLocked(true)
      }
      const nextStatus = await api.getLocalProductionSafetyStatus()
      if (!cancelled) {
        setSafetyStatus(nextStatus)
        api.setWritesLocked(nextStatus.readOnly)
      }
    }

    void checkSafety()

    return () => {
      cancelled = true
    }
  }, [api, session])

  const handleAdminError = useCallback((error: unknown) => {
    if (error instanceof AdminApiError) {
      if (error.kind === 'unauthenticated') {
        setAuthNotice({
          title: '401 Login expired',
          message: error.message,
          kind: 'warning',
        })
        return
      }
      if (error.kind === 'forbidden') {
        setAuthNotice({
          title: '403 Access denied',
          message: 'You are signed in, but this account does not have admin privileges.',
          kind: 'error',
        })
        return
      }
      toast.error(error.message)
      return
    }
    toast.error(error instanceof Error ? error.message : 'Unknown admin request error')
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: 'local' })
  }

  const requestNavigation = (section: ActiveSection) => {
    if (section === activeSection) return
    if (hasUnsavedChanges) {
      setPendingNavigation(section)
      return
    }
    setActiveSection(section)
  }

  const requestSignOut = () => {
    if (hasUnsavedChanges) {
      setPendingNavigation('signout')
      return
    }
    void handleSignOut()
  }

  const requestMobileNavigation = (section: ActiveSection) => {
    setMobileMenuOpen(false)
    requestNavigation(section)
  }

  const discardAndContinue = () => {
    const destination = pendingNavigation
    setHasUnsavedChanges(false)
    setPendingNavigation(null)
    if (destination === 'signout') {
      void handleSignOut()
    } else if (destination) {
      setActiveSection(destination)
    }
  }

  const { showWarning, staySignedIn } = useIdleSignOut({
    enabled: Boolean(session),
    onTimeout: handleSignOut,
  })

  if (isCheckingSession) {
    return (
      <main className="loading-layout">
        <Loader2 aria-hidden="true" className="animate-spin" />
        <span>Checking session</span>
      </main>
    )
  }

  if (!session) {
    return (
      <TooltipProvider>
        <LoginScreen />
        <Toaster />
      </TooltipProvider>
    )
  }

  const activeConfig = RESOURCE_CONFIGS.find((resource) => resource.key === activeSection)
  const isLocalDev = import.meta.env.DEV
  const isSafetyChecking = isLocalDev && !safetyStatus
  const isReadOnly = isLocalDev && Boolean(safetyStatus?.readOnly)
  const canLoadAdminScreens = !isSafetyChecking

  return (
    <TooltipProvider>
      <AlertDialog open={showWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Your admin session is about to expire</AlertDialogTitle>
            <AlertDialogDescription>
              For security, you’ll be signed out after {ADMIN_IDLE_TIMEOUT_MS / 60_000} minutes of
              inactivity. Choose “Stay signed in” to continue working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => void handleSignOut()}>Sign out now</AlertDialogCancel>
            <AlertDialogAction onClick={staySignedIn}>Stay signed in</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(pendingNavigation)}
        onOpenChange={(open) => !open && setPendingNavigation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave with unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Return to the editor to save, or discard the current changes before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Return to editor</AlertDialogCancel>
            <AlertDialogAction onClick={discardAndContinue}>Discard and continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <main className="dashboard-shell">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="brand-lockup">
              <span>SJBA</span>
              <strong>Admin</strong>
            </div>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mobile-menu-trigger"
                  aria-label="Open admin menu"
                >
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="mobile-menu-sheet">
                <SheetHeader>
                  <SheetTitle>Admin menu</SheetTitle>
                  <SheetDescription>Choose an object or admin tool.</SheetDescription>
                </SheetHeader>
                <nav className="mobile-menu-nav" aria-label="Mobile admin sections">
                  <Button
                    type="button"
                    variant={activeSection === 'overview' ? 'default' : 'ghost'}
                    onClick={() => requestMobileNavigation('overview')}
                  >
                    <Database data-icon="inline-start" />
                    Overview
                  </Button>
                  {RESOURCE_CONFIGS.map((resource) => {
                    const Icon = resource.icon
                    return (
                      <Button
                        type="button"
                        key={resource.key}
                        variant={activeSection === resource.key ? 'default' : 'ghost'}
                        onClick={() => requestMobileNavigation(resource.key)}
                      >
                        <Icon data-icon="inline-start" />
                        {resource.title}
                      </Button>
                    )
                  })}
                  <Button
                    type="button"
                    variant={activeSection === 'storage' ? 'default' : 'ghost'}
                    onClick={() => requestMobileNavigation('storage')}
                  >
                    <Folder data-icon="inline-start" />
                    Storage
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          <nav className="sidebar-nav" aria-label="Admin sections">
            <Button
              type="button"
              variant={activeSection === 'overview' ? 'default' : 'ghost'}
              onClick={() => requestNavigation('overview')}
            >
              <Database data-icon="inline-start" />
              Overview
            </Button>
            {RESOURCE_CONFIGS.map((resource) => {
              const Icon = resource.icon
              return (
                <Button
                  type="button"
                  key={resource.key}
                  variant={activeSection === resource.key ? 'default' : 'ghost'}
                  onClick={() => requestNavigation(resource.key)}
                >
                  <Icon data-icon="inline-start" />
                  {resource.title}
                </Button>
              )
            })}
            <Button
              type="button"
              variant={activeSection === 'storage' ? 'default' : 'ghost'}
              onClick={() => requestNavigation('storage')}
            >
              <Folder data-icon="inline-start" />
              Storage
            </Button>
          </nav>

          <div className="sidebar-notices">
            {authNotice ? (
              <Alert variant={authNotice.kind === 'error' ? 'destructive' : 'default'}>
                <ShieldAlert aria-hidden="true" />
                <AlertTitle>{authNotice.title}</AlertTitle>
                <AlertDescription>{authNotice.message}</AlertDescription>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setAuthNotice(null)}
                >
                  <X aria-label="Dismiss notice" />
                </Button>
              </Alert>
            ) : null}
          </div>
        </aside>

        <section className="workspace">
          <header className="topbar">
            <div className="topbar-status">
              <span>Environment</span>
              <Badge variant="secondary">
                {isLocalDev ? 'Local dev' : 'Production deployment'}
              </Badge>
              <Separator orientation="vertical" />
              <span
                className={
                  isReadOnly
                    ? 'inline-status inline-status--danger'
                    : 'inline-status inline-status--ok'
                }
              >
                API Safety
              </span>
              <span>
                {isSafetyChecking ? 'Checking backend' : isReadOnly ? 'Read-only' : 'Full access'}
              </span>
            </div>
            <div className="account-cluster">
              <span>{session.user.email ?? 'unknown admin'}</span>
              <div className="account-actions">
                <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCw data-icon="inline-start" />
                  Refresh
                </Button>
                <Button type="button" variant="outline" onClick={requestSignOut}>
                  <LogOut data-icon="inline-start" />
                  Sign out
                </Button>
              </div>
            </div>
          </header>

          {isLocalDev && (isSafetyChecking || isReadOnly) ? (
            <LocalSafetyNotice status={safetyStatus} />
          ) : null}
          {canLoadAdminScreens && activeSection === 'overview' ? (
            <OverviewScreen
              api={api}
              resources={RESOURCE_CONFIGS}
              readOnly={isReadOnly}
              onAdminError={handleAdminError}
              onNavigate={requestNavigation}
            />
          ) : null}
          {canLoadAdminScreens && activeConfig ? (
            <ResourceScreen
              key={activeConfig.key}
              api={api}
              config={activeConfig}
              onAdminError={handleAdminError}
              sort={resourceSorts[activeConfig.key] ?? getDefaultSort(activeConfig)}
              onSortChange={(sort) =>
                setResourceSorts((current) => ({ ...current, [activeConfig.key]: sort }))
              }
              readOnly={isReadOnly}
              onDirtyChange={setHasUnsavedChanges}
            />
          ) : null}
          {canLoadAdminScreens && activeSection === 'storage' ? (
            <StorageScreen api={api} onAdminError={handleAdminError} readOnly={isReadOnly} />
          ) : null}
        </section>
      </main>
      <Toaster />
    </TooltipProvider>
  )
}

export default App
