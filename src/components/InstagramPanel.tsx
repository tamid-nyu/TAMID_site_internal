import { useCallback, useEffect, useState } from 'react'
import type { AdminApiClient } from '@/lib/adminApi'
import { AdminApiError } from '@/lib/adminApi'
import type {
  CaptionCheck,
  InstagramMedia,
  InstagramQuota,
  InstagramStatus,
} from '@/lib/adminTypes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
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
 * Instagram publishing controls.
 *
 * Deliberately a two-step flow: staging builds the post but leaves the account
 * untouched, and publishing is a separate confirmed action. Instagram has no
 * edit-after-publish, and this is the chapter's public account, so the UI never
 * offers a one-click path from typing to live.
 */

const HOOK_LIMIT = 125

type Props = { api: AdminApiClient }

const errorMessage = (error: unknown) =>
  error instanceof AdminApiError || error instanceof Error ? error.message : 'Something went wrong.'

export function InstagramPanel({ api }: Props) {
  const [status, setStatus] = useState<InstagramStatus | null>(null)
  const [quota, setQuota] = useState<InstagramQuota | null>(null)
  const [recent, setRecent] = useState<InstagramMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [imageUrl, setImageUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [check, setCheck] = useState<CaptionCheck | null>(null)
  const [creationId, setCreationId] = useState('')
  const [busy, setBusy] = useState<'' | 'checking' | 'staging' | 'publishing'>('')
  const [publishedUrl, setPublishedUrl] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const next = await api.getInstagramStatus()
      setStatus(next)
      if (next.connected) {
        const [posts, quotas] = await Promise.all([
          api.listInstagramPosts(6).catch(() => [] as InstagramMedia[]),
          api.getInstagramQuota().catch(() => [] as InstagramQuota[]),
        ])
        setRecent(posts)
        setQuota(quotas[0] ?? null)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Any edit invalidates a previous staging: the container on Instagram's side
  // still holds the old caption, so publishing it would post something the
  // editor is no longer looking at.
  const invalidateStaging = () => {
    setCreationId('')
    setPublishedUrl('')
  }

  const runCheck = async () => {
    setBusy('checking')
    setError('')
    try {
      setCheck(await api.checkInstagramCaption(caption))
    } catch (err) {
      setError(errorMessage(err))
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
      setCheck(staged.captionCheck)
    } catch (err) {
      setError(errorMessage(err))
      if (err instanceof AdminApiError && err.code === 'caption_blocked') {
        setCheck((err.details as { blocking?: string[] } as CaptionCheck) ?? null)
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
      setImageUrl('')
      setCaption('')
      setCheck(null)
      void refresh()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy('')
    }
  }

  const firstLine = caption.split('\n')[0] ?? ''
  const remaining =
    quota?.config?.quota_total !== undefined
      ? quota.config.quota_total - (quota.quota_usage ?? 0)
      : undefined

  if (loading) {
    return <p className="text-muted-foreground text-sm">Checking Instagram connection…</p>
  }

  if (!status?.connected) {
    return (
      <Alert>
        <AlertTitle>Instagram is not connected</AlertTitle>
        <AlertDescription>
          {status?.error
            ? `The backend has credentials but Instagram rejected them: ${status.error}`
            : 'Set IG_ACCESS_TOKEN and IG_USER_ID on the backend to enable publishing.'}
          <div className="mt-3">
            <Button size="sm" variant="secondary" onClick={() => void refresh()}>
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            @{status.account?.username}
            <Badge variant="secondary">Connected</Badge>
          </CardTitle>
          <CardDescription>
            {status.account?.followers_count?.toLocaleString()} followers ·{' '}
            {status.account?.media_count?.toLocaleString()} posts
            {remaining !== undefined ? ` · ${remaining} of 25 posts left today` : ''}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New post</CardTitle>
          <CardDescription>
            Staging builds the post without touching the account. Publishing is a separate,
            confirmed step and cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ig-image">Image URL</Label>
            <Input
              id="ig-image"
              placeholder="https://…/post.jpg"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value)
                invalidateStaging()
              }}
            />
            <p className="text-muted-foreground text-xs">
              Must be a publicly reachable HTTPS JPEG — Instagram fetches it directly. PNG is not
              accepted for feed images.
            </p>
          </div>

          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Post preview"
              className="max-h-72 rounded-md border object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="ig-caption">Caption</Label>
            <Textarea
              id="ig-caption"
              rows={8}
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value)
                setCheck(null)
                invalidateStaging()
              }}
            />
            <p className="text-muted-foreground text-xs">
              {caption.trim() ? caption.trim().split(/\s+/).length : 0} words · first line{' '}
              {firstLine.length}/{HOOK_LIMIT} characters
              {firstLine.length > HOOK_LIMIT ? ' — Instagram will truncate it' : ''}
            </p>
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
                <p className="text-sm text-muted-foreground">Caption passes all checks.</p>
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
            <Button
              onClick={() => void stage()}
              disabled={!imageUrl.trim() || !caption.trim() || busy !== ''}
            >
              {busy === 'staging' ? 'Staging…' : 'Stage post'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={!creationId || busy !== ''}
            >
              {busy === 'publishing' ? 'Publishing…' : 'Publish to Instagram'}
            </Button>
          </div>

          {creationId ? (
            <p className="text-muted-foreground text-xs">
              Staged and ready. Nothing is live yet — review the image and caption above, then
              publish.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent posts</CardTitle>
          <CardDescription>Check what has already gone out before posting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent posts loaded.</p>
          ) : (
            recent.map((post, index) => (
              <div key={post.id}>
                {index > 0 ? <Separator className="mb-3" /> : null}
                <p className="text-sm">
                  {post.caption ? post.caption.slice(0, 160) : <em>No caption</em>}
                  {post.caption && post.caption.length > 160 ? '…' : ''}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {post.timestamp ? new Date(post.timestamp).toLocaleDateString() : ''}
                  {post.like_count !== undefined ? ` · ${post.like_count} likes` : ''}
                  {post.permalink ? (
                    <>
                      {' · '}
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        open
                      </a>
                    </>
                  ) : null}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish to @{status.account?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              This posts to the chapter's public Instagram immediately. Instagram has no
              edit-after-publish — correcting a mistake means deleting the post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void publish()}>Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
