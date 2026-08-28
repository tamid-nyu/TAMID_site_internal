import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import type { AdminApiClient } from '@/lib/adminApi'
import type { AssistantTurn } from '@/lib/adminTypes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/**
 * TAssistant — a question box over live chapter data.
 *
 * Global rather than section-scoped: the useful questions cross the website and
 * Instagram ("did the event post bring anyone to the site?"), so tying it to one
 * section would be the wrong shape.
 *
 * Read-only. The backend withholds every writing tool, so this can answer about
 * the chapter but never change it.
 */

type Props = { api: AdminApiClient }

const SUGGESTIONS = [
  'How did Instagram do this month?',
  'Which post performed best and why?',
  'How many members are recognised this semester?',
  'Where are our followers?',
]

export function TAssistant({ api }: Props) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<AssistantTurn[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lastTools, setLastTools] = useState<string[]>([])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, busy])

  const send = async (text: string) => {
    const asked = text.trim()
    if (!asked) return

    setQuestion('')
    setError('')
    setBusy(true)
    // Show the question immediately; the answer lands when it lands.
    const priorHistory = history
    setHistory([...priorHistory, { role: 'user', content: asked }])

    try {
      const result = await api.askAssistant(asked, priorHistory)
      setHistory((h) => [...h, { role: 'assistant', content: result.answer }])
      setLastTools(result.toolsUsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TAssistant could not answer.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <Button className="tassistant-launcher" onClick={() => setOpen(true)}>
        <MessageCircle data-icon="inline-start" />
        Ask TAssistant
      </Button>
    )
  }

  return (
    <div className="tassistant-panel">
      <div className="tassistant-header">
        <div>
          <p className="font-medium">TAssistant</p>
          <p className="text-muted-foreground text-xs">Answers from live chapter data</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Close">
          <X />
        </Button>
      </div>

      <div className="tassistant-body">
        {history.length === 0 ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Ask about the website, members, events, analytics or Instagram.
            </p>
            {SUGGESTIONS.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => void send(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        ) : null}

        {history.map((turn, i) => (
          <div
            key={`${turn.role}-${i}`}
            className={turn.role === 'user' ? 'tassistant-turn-user' : 'tassistant-turn-assistant'}
          >
            <p className="text-sm whitespace-pre-wrap">{turn.content}</p>
          </div>
        ))}

        {busy ? <p className="text-muted-foreground text-sm">Looking it up…</p> : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not answer</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!busy && lastTools.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-muted-foreground text-xs">Checked:</span>
            {[...new Set(lastTools)].map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}

        <div ref={endRef} />
      </div>

      <form
        className="tassistant-input"
        onSubmit={(e) => {
          e.preventDefault()
          void send(question)
        }}
      >
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question…"
          disabled={busy}
        />
        <Button type="submit" size="sm" disabled={busy || !question.trim()}>
          Ask
        </Button>
      </form>
    </div>
  )
}
