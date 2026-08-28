import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdminApiClient } from '@/lib/adminApi'
import { AdminApiError, fileToBase64 } from '@/lib/adminApi'
import type { CaptionCheck } from '@/lib/adminTypes'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

/**
 * Compose, stage and publish an Instagram post.
 *
 * Publishing stays two-step: staging builds the post without touching the
 * account, and publishing is a separate confirmed action. Instagram has no
 * edit-after-publish and this is the chapter's public account, so there is no
 * one-click path from typing to live.
 */

const HOOK_LIMIT = 125 // Instagram truncates roughly here in the feed.
const CAPTION_LIMIT = 2200 // Instagram's hard maximum.
const HASHTAG_LIMIT = 30 // Instagram rejects posts above this.
const DRAFT_KEY = 'tamid-admin:instagram-draft'

// Uploads reuse the existing public flyers bucket rather than adding new
// infrastructure; the instagram/ prefix keeps them separate from real flyers.
const STORAGE_BUCKET = 'event-flyers'

type Props = { api: AdminApiClient; onPublished?: () => void }

const errorMessage = (error: unknown) =>
  error instanceof AdminApiError || error instanceof Error ? error.message : 'Something went wrong.'

/**
 * Turns a raw Graph API error into something a non-technical editor can act on.
 * The upstream messages are written for developers and name internals the
 * person reading them has no way to reason about.
 */
const humanise = (message: string): string => {
  const m = message.toLowerCase()
  if (m.includes('media id') || m.includes('not available'))
    return 'Instagram could not use that staged post. Stage it again and retry.'
  if (m.includes('aspect ratio'))
    return 'The image aspect ratio is outside what Instagram accepts. Use between 4:5 and 1.91:1 — 1080×1350 is safest.'
  if (m.includes('unsupported') || m.includes('format') || m.includes('media type'))
    return 'That image format is not supported. Instagram feed posts must be JPEG.'
  if (m.includes('download') || m.includes('fetch') || m.includes('unable to retrieve'))
    return 'Instagram could not download the image. The URL must be public — no login, no private bucket.'
  if (m.includes('rate') || m.includes('limit'))
    return 'Instagram is rate limiting this account. Wait a few minutes and try again.'
  if (m.includes('oauth') || m.includes('token') || m.includes('expired'))
    return 'The Instagram connection has expired. The access token needs renewing on the backend.'
  return message
}

interface Draft {
  imageUrl: string
  caption: string
}

const loadDraft = (): Draft => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return { imageUrl: '', caption: '' }
    const parsed = JSON.parse(raw) as Partial<Draft>
    return { imageUrl: parsed.imageUrl ?? '', caption: parsed.caption ?? '' }
  } catch {
    // A corrupt or unavailable store must not stop the composer rendering.
    return { imageUrl: '', caption: '' }
  }
}

export function InstagramComposer({ api, onPublished }: Props) {
  const initial = useRef(loadDraft())
  const [imageUrl, setImageUrl] = useState(initial.current.imageUrl)
  const [caption, setCaption] = useState(initial.current.caption)
  const [check, setCheck] = useState<CaptionCheck | null>(null)
  const [creationId, setCreationId] = useState('')
  const [stagedSnapshot, setStagedSnapshot] = useState<Draft | null>(null)
  const [busy, setBusy] = useState<'' | 'uploading' | 'checking' | 'staging' | 'publishing'>('')
  const [error, setError] = useState('')
  const [publishedUrl, setPublishedUrl] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [imageOk, setImageOk] = useState<boolean | null>(null)

  // Persist the draft so a refresh or a wander to another section does not throw
  // away half-written copy.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ imageUrl, caption }))
    } catch {
      // Storage being unavailable is not worth interrupting the editor over.
    }
  }, [imageUrl, caption])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  // A staged container holds the caption as it was at staging time. If the
  // editor changes anything afterwards, publishing that container would post
  // something other than what is on screen — so the staging is discarded.
  const staleStaging =
    creationId !== '' &&
    stagedSnapshot !== null &&
    (stagedSnapshot.caption !== caption || stagedSnapshot.imageUrl !== imageUrl)

  useEffect(() => {
    if (staleStaging) {
      setCreationId('')
      setStagedSnapshot(null)
    }
  }, [staleStaging])

  const fileInput = useRef<HTMLInputElement>(null)

  /**
   * Uploads a chosen file to Supabase storage and uses the resulting public URL.
   *
   * Instagram fetches the image itself, so it needs a public URL rather than a
   * local file — the same reason board headshots and event flyers go through
   * storage. Posts land under an `instagram/` prefix in the event-flyers bucket
   * so they stay distinguishable from real flyers.
   */
  const upload = async (file: File) => {
    if (file.type !== 'image/jpeg') {
      setError('Instagram feed posts must be JPEG. Convert the image and try again.')
      return
    }
    setBusy('uploading')
    setError('')
    try {
      const contentBase64 = await fileToBase64(file)
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      const path = `instagram/${Date.now()}-${safeName}`
      const result = await api.uploadStorageObject(STORAGE_BUCKET, {
        path,
        contentBase64,
        contentType: file.type,
        upsert: true,
      })
      setImageUrl(result.publicUrl)
      setImageOk(null)
      setPublishedUrl('')
    } catch (err) {
      setError(humanise(errorMessage(err)))
    } finally {
      setBusy('')
    }
  }

  const firstLine = caption.split('\n')[0] ?? ''
  const words = caption.trim() ? caption.trim().split(/\s+/).length : 0
  const hashtags = (caption.match(/#[\w]+/g) ?? []).length
  const overCaptionLimit = caption.length > CAPTION_LIMIT
  const overHashtagLimit = hashtags > HASHTAG_LIMIT

  const runCheck = async () => {
    setBusy('checking')
    setError('')
    try {
      setCheck(await api.checkInstagramCaption(caption))
    } catch (err) {
      setError(humanise(errorMessage(err)))
    } finally {
      setBusy('')
    }
  }

  const stage = async () => {
    setBusy('staging')
    setError('')
    setPublishedUrl('')
    try {
      const staged = await api.stageInstagramPost({ imageUrl, caption })
      setCreationId(staged.creationId)
      setStagedSnapshot({ imageUrl, caption })
      setCheck(staged.captionCheck)
    } catch (err) {
      if (err instanceof AdminApiError && err.code === 'caption_blocked') {
        setCheck(err.details as CaptionCheck)
        setError('The caption was blocked. See the issues below.')
      } else {
        setError(humanise(errorMessage(err)))
      }
    } finally {
      setBusy('')
    }
  }

  const publish = async () => {
    setConfirmOpen(false)
    setBusy('publishing')
    setError('')
    try {
      const result = await api.publishInstagramPost(creationId)
      setPublishedUrl(result.permalink ?? '')
      setCreationId('')
      setStagedSnapshot(null)
      setImageUrl('')
      setCaption('')
      setCheck(null)
      clearDraft()
      onPublished?.()
    } catch (err) {
      setError(humanise(errorMessage(err)))
    } finally {
      setBusy('')
    }
  }

  const canStage =
    imageUrl.trim() !== '' &&
    caption.trim() !== '' &&
    !overCaptionLimit &&
    !overHashtagLimit &&
    busy === ''

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New post</CardTitle>
          <CardDescription>
            Staging builds the post without touching the account. Publishing is separate, confirmed,
            and cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ig-upload">Image</Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInput}
                id="ig-upload"
                type="file"
                accept="image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void upload(file)
                  e.target.value = ''
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInput.current?.click()}
                disabled={busy !== ''}
              >
                <Upload data-icon="inline-start" />
                {busy === 'uploading' ? 'Uploading…' : 'Upload image'}
              </Button>
              <span className="text-muted-foreground text-xs">or paste a public URL</span>
            </div>
            <Input
              id="ig-image"
              placeholder="https://…/post.jpg"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value)
                setImageOk(null)
                setPublishedUrl('')
              }}
            />
            <p className="text-muted-foreground text-xs">
              Uploads go to Supabase storage and get a public URL automatically. Instagram downloads
              the image itself, so a pasted URL must be public, and must be JPEG — PNG is rejected
              for feed posts.
            </p>
            {imageOk === false ? (
              <p className="text-destructive text-xs">
                That URL did not load in the browser. Instagram will not be able to fetch it either.
              </p>
            ) : null}
          </div>

          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Post preview"
              className="max-h-80 rounded-md border object-contain"
              onLoad={() => setImageOk(true)}
              onError={() => setImageOk(false)}
            />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="ig-caption">Caption</Label>
            <Textarea
              id="ig-caption"
              rows={10}
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value)
                setCheck(null)
                setPublishedUrl('')
              }}
            />
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className={overCaptionLimit ? 'text-destructive font-medium' : ''}>
                {caption.length}/{CAPTION_LIMIT} characters
              </span>
              <span>{words} words</span>
              <span className={overHashtagLimit ? 'text-destructive font-medium' : ''}>
                {hashtags}/{HASHTAG_LIMIT} hashtags
              </span>
              <span className={firstLine.length > HOOK_LIMIT ? 'text-destructive font-medium' : ''}>
                hook {firstLine.length}/{HOOK_LIMIT}
                {firstLine.length > HOOK_LIMIT ? ' — will be truncated in feed' : ''}
              </span>
            </div>
          </div>

          {check ? (
            <div className="space-y-2">
              {check.blocking.map((issue) => (
                <Alert key={issue} variant="destructive">
                  <AlertTitle>Blocked</AlertTitle>
                  <AlertDescription>{issue}</AlertDescription>
                </Alert>
              ))}
              {check.warnings.map((issue) => (
                <Alert key={issue}>
                  <AlertTitle>Check</AlertTitle>
                  <AlertDescription>{issue}</AlertDescription>
                </Alert>
              ))}
              {check.ok && check.warnings.length === 0 ? (
                <p className="text-muted-foreground text-sm">Caption passes all checks.</p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {publishedUrl ? (
            <Alert>
              <AlertTitle>Published</AlertTitle>
              <AlertDescription>
                <a href={publishedUrl} target="_blank" rel="noreferrer" className="underline">
                  View on Instagram
                </a>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => void runCheck()}
              disabled={!caption.trim() || busy !== ''}
            >
              {busy === 'checking' ? 'Checking…' : 'Check caption'}
            </Button>
            <Button onClick={() => void stage()} disabled={!canStage}>
              {busy === 'staging' ? 'Staging…' : creationId ? 'Re-stage' : 'Stage post'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={!creationId || busy !== ''}
            >
              {busy === 'publishing' ? 'Publishing…' : 'Publish to Instagram'}
            </Button>
            {caption || imageUrl ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setImageUrl('')
                  setCaption('')
                  setCheck(null)
                  setCreationId('')
                  setStagedSnapshot(null)
                  setError('')
                  clearDraft()
                }}
                disabled={busy !== ''}
              >
                Discard draft
              </Button>
            ) : null}
          </div>

          {creationId ? (
            <p className="text-muted-foreground text-xs">
              Staged and ready — nothing is live yet. Review the image and caption above, then
              publish.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This posts to the chapter's public Instagram immediately. Instagram has no
              edit-after-publish — fixing a mistake means deleting the post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Show exactly what is about to go out, so the confirmation is not blind. */}
          <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="max-h-32 rounded object-contain" />
            ) : null}
            <p className="text-sm whitespace-pre-wrap">{caption}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void publish()}>Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
