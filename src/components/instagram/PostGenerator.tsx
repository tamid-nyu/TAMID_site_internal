import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { AdminApiClient } from '@/lib/adminApi'
import { AdminApiError } from '@/lib/adminApi'
import type { PostGenerationResult } from '@/lib/adminTypes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

/**
 * Draft a post from a plain-language brief.
 *
 * Produces a draft and hands it to the composer; it never stages or publishes.
 * A generated post goes through exactly the same review and confirmation as one
 * written by hand, which matters more here than for hand-written copy — nobody
 * has read a generated caption before it appears.
 */

type Props = {
  api: AdminApiClient
  onUse: (draft: { caption: string; imageUrl: string }) => void
}

const EXAMPLES = [
  'Spring recruitment opens Feb 3. Applications close Feb 17.',
  'Recap our speaker event with a partner from an Israeli VC.',
  'Explain the Quant program to someone who has never heard of it.',
]

export function PostGenerator({ api, onUse }: Props) {
  const [brief, setBrief] = useState('')
  const [result, setResult] = useState<PostGenerationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      setResult(await api.generatePost(brief))
    } catch (err) {
      setError(
        err instanceof AdminApiError && err.code === 'generation_not_configured'
          ? 'Post generation is not configured on the backend yet.'
          : err instanceof Error
            ? err.message
            : 'Generation failed.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Generate a draft
        </CardTitle>
        <CardDescription>
          Describe the post in plain language. The result is a draft — you review and publish it
          yourself.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ai-brief">Brief</Label>
          <Textarea
            id="ai-brief"
            rows={3}
            placeholder="What should this post say?"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <Button
                key={example}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setBrief(example)}
                disabled={busy}
              >
                {example.slice(0, 38)}…
              </Button>
            ))}
          </div>
        </div>

        <Button onClick={() => void generate()} disabled={!brief.trim() || busy}>
          {busy ? 'Generating…' : 'Generate'}
        </Button>

        {busy ? (
          <p className="text-muted-foreground text-xs">
            Looking up what has performed, checking real event data, and rendering an image. This
            takes a little while.
          </p>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not generate</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {result ? (
          <div className="space-y-4 rounded-md border p-4">
            {result.post.imageUrl ? (
              <img
                src={result.post.imageUrl}
                alt={result.post.altText}
                className="max-h-72 rounded-md border object-contain"
              />
            ) : null}

            <p className="text-sm whitespace-pre-wrap">{result.post.caption}</p>

            {result.captionCheck.blocking.map((issue) => (
              <Alert key={issue} variant="destructive">
                <AlertTitle>Blocked</AlertTitle>
                <AlertDescription>{issue}</AlertDescription>
              </Alert>
            ))}
            {result.captionCheck.warnings.map((issue) => (
              <Alert key={issue}>
                <AlertTitle>Check</AlertTitle>
                <AlertDescription>{issue}</AlertDescription>
              </Alert>
            ))}

            <div>
              <p className="text-muted-foreground text-xs font-medium">
                Why it was written this way
              </p>
              <p className="text-muted-foreground text-xs">{result.post.rationale}</p>
            </div>

            {result.toolsUsed.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-muted-foreground text-xs">Checked:</span>
                {[...new Set(result.toolsUsed)].map((toolName) => (
                  <Badge key={toolName} variant="secondary" className="text-xs">
                    {toolName}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                No tools were used — this draft is not grounded in real chapter data, so check every
                fact before publishing.
              </p>
            )}

            <Button
              onClick={() =>
                onUse({
                  caption: result.post.caption,
                  imageUrl: result.post.imageUrl ?? '',
                })
              }
              disabled={!result.captionCheck.ok}
            >
              Use this draft
            </Button>
            {!result.captionCheck.ok ? (
              <p className="text-destructive text-xs">
                Fix the blocking issues by regenerating with a clearer brief before using this.
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
