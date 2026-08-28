import { useCallback, useEffect, useState } from 'react'
import type { AdminApiClient } from '@/lib/adminApi'
import type { InstagramQuota, InstagramStatus } from '@/lib/adminTypes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { INSTAGRAM_SCREEN_META, type InstagramScreen } from './screens'
import { InstagramComposer } from './InstagramComposer'
import { InstagramAudiencePanel, InstagramOverview, InstagramPosts } from './InstagramInsights'

/**
 * The Instagram half of the admin console.
 *
 * Owns the connection check and the sub-navigation; each screen below it worries
 * only about its own data. The connection state is resolved once here so four
 * separate panels do not each render their own "not connected" message.
 */

type Props = {
  api: AdminApiClient
  screen: InstagramScreen
}

export function InstagramSection({ api, screen }: Props) {
  const [status, setStatus] = useState<InstagramStatus | null>(null)
  const [quota, setQuota] = useState<InstagramQuota | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const next = await api.getInstagramStatus()
      setStatus(next)
      if (next.connected) {
        const quotas = await api.getInstagramQuota().catch(() => [] as InstagramQuota[])
        setQuota(quotas[0] ?? null)
      }
    } catch (err) {
      setStatus({
        connected: false,
        error: err instanceof Error ? err.message : 'Could not reach the backend.',
      })
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (loading) return <Skeleton className="h-40" />

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

  const remaining =
    quota?.config?.quota_total !== undefined
      ? quota.config.quota_total - (quota.quota_usage ?? 0)
      : undefined

  const heading = INSTAGRAM_SCREEN_META[screen]

  return (
    <section className="admin-section space-y-6">
      {/* Same markup as the website sections, so padding and type scale match
          rather than the content starting flush against the header rule. */}
      <div className="section-heading">
        <div>
          <h1>{heading.title}</h1>
          <p>{heading.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">@{status.account?.username}</span>
        <Badge variant="secondary">Connected</Badge>
        <span className="text-muted-foreground text-sm">
          {status.account?.followers_count?.toLocaleString()} followers ·{' '}
          {status.account?.media_count?.toLocaleString()} posts
          {remaining !== undefined
            ? ` · ${remaining} of ${quota?.config?.quota_total} posts left today`
            : ''}
        </span>
      </div>

      {screen === 'overview' ? <InstagramOverview api={api} /> : null}
      {screen === 'composer' ? <InstagramComposer api={api} onPublished={refresh} /> : null}
      {screen === 'posts' ? <InstagramPosts api={api} /> : null}
      {screen === 'audience' ? <InstagramAudiencePanel api={api} /> : null}
    </section>
  )
}
