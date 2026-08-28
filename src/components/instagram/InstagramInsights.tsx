import { useCallback, useEffect, useState } from 'react'
import type { AdminApiClient } from '@/lib/adminApi'
import type {
  InstagramAccountInsights,
  InstagramAudience,
  InstagramPostInsights,
} from '@/lib/adminTypes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

type Props = { api: AdminApiClient }

const num = (v: number | undefined) => (typeof v === 'number' ? v.toLocaleString() : '—')

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
    </div>
  )
}

/** Account-level analytics over a selectable window. */
export function InstagramOverview({ api }: Props) {
  const [days, setDays] = useState(28)
  const [data, setData] = useState<InstagramAccountInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(
    async (window: number) => {
      setLoading(true)
      setError('')
      try {
        setData(await api.getInstagramAccountInsights(window))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load insights.')
      } finally {
        setLoading(false)
      }
    },
    [api]
  )

  useEffect(() => {
    void load(days)
  }, [load, days])

  const followerSeries = Array.isArray(data?.daily.follower_count) ? data.daily.follower_count : []
  const followerChange =
    followerSeries.length > 1 ? followerSeries.reduce((sum, p) => sum + p.value, 0) : undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 28].map((w) => (
          <Button
            key={w}
            size="sm"
            variant={days === w ? 'default' : 'outline'}
            onClick={() => setDays(w)}
          >
            Last {w} days
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => void load(days)} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load analytics</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Views" value={num(data.totals.views)} hint="Times posts were seen" />
            <Stat label="Profile views" value={num(data.totals.profile_views)} />
            <Stat
              label="Website clicks"
              value={num(data.totals.website_clicks)}
              hint="Taps on the bio link"
            />
            <Stat label="Accounts engaged" value={num(data.totals.accounts_engaged)} />
            <Stat label="Interactions" value={num(data.totals.total_interactions)} />
            <Stat
              label="Followers gained"
              value={followerChange !== undefined ? num(followerChange) : '—'}
              hint={`Net over ${data.windowDays} days`}
            />
          </div>

          {data.totals.website_clicks === 0 ? (
            <Alert>
              <AlertTitle>No bio link clicks in this window</AlertTitle>
              <AlertDescription>
                The profile was viewed {num(data.totals.profile_views)} times but the bio link was
                never tapped. Worth checking the link works and that posts point people to it.
              </AlertDescription>
            </Alert>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/** Per-post analytics, sorted by reach. */
export function InstagramPosts({ api }: Props) {
  const [data, setData] = useState<InstagramPostInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await api.getInstagramPostInsights(12))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load post insights.')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <Skeleton className="h-64" />
  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load posts</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  if (!data) return null

  const sorted = [...data.posts].sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Posts measured" value={String(data.summary.postsMeasured)} />
        <Stat label="Median reach" value={num(data.summary.medianReach)} />
        <Stat label="Median views" value={num(data.summary.medianViews)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent posts by reach</CardTitle>
          <CardDescription>Highest reach first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sorted.map((post, i) => (
            <div key={post.id}>
              {i > 0 ? <Separator className="mb-4" /> : null}
              <div className="flex gap-4">
                {post.thumbnail ? (
                  <a
                    href={post.permalink ?? post.thumbnail}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0"
                  >
                    <img
                      src={post.thumbnail}
                      alt=""
                      loading="lazy"
                      className="bg-muted h-24 w-24 rounded-md border object-cover"
                    />
                  </a>
                ) : (
                  <div className="bg-muted text-muted-foreground flex h-24 w-24 shrink-0 items-center justify-center rounded-md border text-xs">
                    no image
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="max-w-xl text-sm">
                      {post.caption ? post.caption.slice(0, 120) : <em>No caption</em>}
                      {post.caption.length > 120 ? '…' : ''}
                    </p>
                    {post.permalink ? (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline"
                      >
                        open
                      </a>
                    ) : null}
                  </div>

                  {post.insightsError ? (
                    <p className="text-muted-foreground mt-2 text-xs">
                      No insights available for this post.
                    </p>
                  ) : (
                    <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span>{num(post.views)} views</span>
                      <span>{num(post.reach)} reach</span>
                      <span>{num(post.likes)} likes</span>
                      <span>{num(post.comments)} comments</span>
                      <span>{num(post.saved)} saves</span>
                      <span>{num(post.shares)} shares</span>
                      {post.engagementRate !== null && post.engagementRate !== undefined ? (
                        <span className="font-medium">{post.engagementRate}% engagement</span>
                      ) : null}
                    </div>
                  )}

                  <p className="text-muted-foreground mt-1 text-xs">
                    {post.posted ? new Date(post.posted).toLocaleDateString() : ''} · {post.type}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/** Follower demographics. */
export function InstagramAudiencePanel({ api }: Props) {
  const [breakdown, setBreakdown] = useState('city')
  const [data, setData] = useState<InstagramAudience | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(
    async (dim: string) => {
      setLoading(true)
      setError('')
      try {
        setData(await api.getInstagramAudience(dim))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load audience data.')
      } finally {
        setLoading(false)
      }
    },
    [api]
  )

  useEffect(() => {
    void load(breakdown)
  }, [load, breakdown])

  const max = data?.rows[0]?.followers ?? 1

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {['city', 'country', 'age', 'gender'].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={breakdown === d ? 'default' : 'outline'}
            onClick={() => setBreakdown(d)}
            className="capitalize"
          >
            {d}
          </Button>
        ))}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load audience</AlertTitle>
          <AlertDescription>
            {error} Instagram only reports demographics once an account has enough followers.
          </AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Skeleton className="h-64" />
      ) : data && data.rows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">Followers by {data.breakdown}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.rows.slice(0, 20).map((row) => (
              <div key={row.value} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{row.value}</span>
                  <span className="text-muted-foreground">{num(row.followers)}</span>
                </div>
                {/* A plain proportional bar avoids pulling in a chart library. */}
                <div className="bg-muted h-2 overflow-hidden rounded">
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${Math.max(2, (row.followers / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground text-sm">No demographic data returned.</p>
      )}
    </div>
  )
}
