import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Timer } from 'lucide-react'
import { useI18n } from '@/i18n'

const DEFAULT_SECONDS = 7 * 60
const PRESETS = [
  { label: '5', seconds: 5 * 60 },
  { label: '7', seconds: 7 * 60 },
  { label: '10', seconds: 10 * 60 },
] as const

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function playEndAlert() {
  try {
    navigator.vibrate?.([220, 120, 220, 120, 320])
  } catch {
    /* ignore */
  }

  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    ;[0, 0.22, 0.44].forEach((offset, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = i === 2 ? 880 : 660
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.2)
    })
    window.setTimeout(() => void ctx.close(), 1200)
  } catch {
    /* ignore */
  }
}

export function CronometroPage() {
  const { t } = useI18n()
  const [duration, setDuration] = useState(DEFAULT_SECONDS)
  const [remaining, setRemaining] = useState(DEFAULT_SECONDS)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [gameCount, setGameCount] = useState(0)
  const endAtRef = useRef<number | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const progress = useMemo(() => {
    if (duration <= 0) return 0
    return Math.min(1, Math.max(0, remaining / duration))
  }, [duration, remaining])

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release()
    } catch {
      /* ignore */
    }
    wakeLockRef.current = null
  }, [])

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch {
      /* ignore — browser may deny */
    }
  }, [])

  useEffect(() => {
    if (!running) {
      void releaseWakeLock()
      return
    }
    void requestWakeLock()

    const tick = () => {
      if (endAtRef.current == null) return
      const next = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
      setRemaining(next)
      if (next <= 0) {
        endAtRef.current = null
        setRunning(false)
        setFinished(true)
        setGameCount((n) => n + 1)
        playEndAlert()
      }
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [running, releaseWakeLock, requestWakeLock])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && running) {
        void requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [running, requestWakeLock])

  useEffect(() => () => {
    void releaseWakeLock()
  }, [releaseWakeLock])

  const applyDuration = (seconds: number) => {
    endAtRef.current = null
    setRunning(false)
    setFinished(false)
    setDuration(seconds)
    setRemaining(seconds)
  }

  const toggle = () => {
    if (remaining <= 0) {
      applyDuration(duration)
      endAtRef.current = Date.now() + duration * 1000
      setRunning(true)
      setFinished(false)
      return
    }
    if (running) {
      endAtRef.current = null
      setRunning(false)
      return
    }
    endAtRef.current = Date.now() + remaining * 1000
    setFinished(false)
    setRunning(true)
  }

  const reset = () => {
    endAtRef.current = null
    setRunning(false)
    setFinished(false)
    setRemaining(duration)
  }

  const urgent = remaining <= 30 && remaining > 0

  return (
    <section className="flex flex-col gap-5 pb-8">
      <header>
        <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
          {t.pages.cronometro.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.pages.cronometro.subtitle}
        </p>
      </header>

      <div
        className={[
          'panel-ut relative flex flex-col items-center gap-5 overflow-hidden p-5',
          finished ? 'ring-2 ring-[var(--color-accent)]' : '',
        ].join(' ')}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-black/40"
        >
          <div
            className={[
              'h-full transition-[width] duration-200 ease-linear',
              urgent || finished
                ? 'bg-[var(--color-accent)]'
                : 'bg-[var(--color-accent-soft)]',
            ].join(' ')}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="flex items-center gap-2 text-[var(--color-accent-soft)]">
          <Timer className="size-4" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
            {finished
              ? t.pages.cronometro.finished
              : running
                ? t.pages.cronometro.running
                : t.pages.cronometro.paused}
          </span>
        </div>

        <p
          className={[
            'font-display tabular-nums leading-none tracking-[0.04em]',
            finished || urgent
              ? 'text-6xl text-gradient-gold sm:text-7xl'
              : 'text-6xl text-[var(--color-text)] sm:text-7xl',
          ].join(' ')}
          aria-live="polite"
        >
          {formatTime(remaining)}
        </p>

        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={toggle}
            className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 py-3.5 text-sm font-bold text-[var(--color-text-inverse)] shadow-[0_0_18px_rgba(245,197,24,0.35)] transition-transform active:scale-[0.98]"
          >
            {running ? (
              <>
                <Pause className="size-4" />
                {t.pages.cronometro.pause}
              </>
            ) : (
              <>
                <Play className="size-4" />
                {remaining <= 0 || remaining === duration
                  ? t.pages.cronometro.start
                  : t.pages.cronometro.resume}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-3.5 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-white/5"
          >
            <RotateCcw className="size-4" />
            {t.pages.cronometro.reset}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
          {t.pages.cronometro.duration}
        </p>
        <div className="flex gap-2">
          {PRESETS.map((preset) => {
            const active = duration === preset.seconds
            return (
              <button
                key={preset.seconds}
                type="button"
                disabled={running}
                onClick={() => applyDuration(preset.seconds)}
                className={[
                  'flex-1 rounded-xl border py-3 font-display text-2xl tracking-wide transition-all disabled:opacity-50',
                  active
                    ? 'border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] text-[var(--color-accent)] shadow-[0_0_14px_rgba(245,197,24,0.2)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/5',
                ].join(' ')}
              >
                {preset.label}
                <span className="ml-0.5 text-sm opacity-70">
                  {t.pages.cronometro.min}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="panel-ut flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
            {t.pages.cronometro.gamesTonight}
          </p>
          <p className="mt-1 font-display text-3xl leading-none text-[var(--color-text)]">
            {gameCount}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setGameCount(0)}
          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-white/5"
        >
          {t.pages.cronometro.clearGames}
        </button>
      </div>
    </section>
  )
}
