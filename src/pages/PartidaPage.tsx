import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CircleDot,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Undo2,
  Users,
} from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { usePlayersContext } from '@/context/PlayersContext'
import { useRachaContext } from '@/context/RachaContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import {
  addGoal,
  closeMatchDay,
  deleteGoal,
  ensureCurrentPitchGame,
  ensureOpenMatchDay,
  fetchGoalsForGame,
  reopenOrCreateToday,
  updatePitchGame,
  type GoalEvent,
  type GoalSide,
  type MatchDay,
  type PitchGame,
} from '@/lib/db/partida'
import { useI18n } from '@/i18n'
import type { Player } from '@/types'

const DEFAULT_SECONDS = 7 * 60
const PRESETS = [
  { label: '5', seconds: 5 * 60 },
  { label: '7', seconds: 7 * 60 },
  { label: '10', seconds: 10 * 60 },
] as const

function formatClock(totalSeconds: number): string {
  const safe = Math.abs(totalSeconds)
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

export function PartidaPage() {
  const { t } = useI18n()
  const { players, loading: playersLoading } = usePlayersContext()
  const { presentIds } = useRachaContext()

  const [day, setDay] = useState<MatchDay | null>(null)
  const [game, setGame] = useState<PitchGame | null>(null)
  const [goals, setGoals] = useState<GoalEvent[]>([])
  const [bootLoading, setBootLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [duration, setDuration] = useState(DEFAULT_SECONDS)
  const [remaining, setRemaining] = useState(DEFAULT_SECONDS)
  const [running, setRunning] = useState(false)
  const [overtime, setOvertime] = useState(false)
  const [alerted, setAlerted] = useState(false)
  const endAtRef = useRef<number | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const [goalSide, setGoalSide] = useState<GoalSide | null>(null)

  const dayClosed = day?.status === 'closed'
  const gameEnded = game?.status === 'ended' || dayClosed

  const presentPlayers = useMemo(() => {
    const set = new Set(presentIds)
    const list = players.filter((p) => set.has(p.id))
    return list.sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
    )
  }, [players, presentIds])

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
      /* ignore */
    }
  }, [])

  const boot = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setBootLoading(false)
      setError(t.pages.partida.needsConfig)
      return
    }
    setBootLoading(true)
    setError(null)
    const openDay = await ensureOpenMatchDay()
    if (!openDay) {
      setError(t.pages.partida.loadError)
      setBootLoading(false)
      return
    }
    setDay(openDay)
    if (openDay.status === 'closed') {
      setGame(null)
      setGoals([])
      setBootLoading(false)
      return
    }
    const current = await ensureCurrentPitchGame(openDay, DEFAULT_SECONDS)
    if (!current) {
      setError(t.pages.partida.loadError)
      setBootLoading(false)
      return
    }
    setGame(current)
    setDuration(current.durationSeconds)
    setRemaining(current.durationSeconds)
    setRunning(false)
    setOvertime(false)
    setAlerted(false)
    endAtRef.current = null
    const list = await fetchGoalsForGame(current.id)
    setGoals(list)
    setBootLoading(false)
  }, [t.pages.partida.loadError, t.pages.partida.needsConfig])

  useEffect(() => {
    void boot()
  }, [boot])

  useEffect(() => {
    if (!running || gameEnded) {
      void releaseWakeLock()
      return
    }
    void requestWakeLock()

    const tick = () => {
      if (endAtRef.current == null) return
      const diff = Math.ceil((endAtRef.current - Date.now()) / 1000)
      if (diff > 0) {
        setRemaining(diff)
        setOvertime(false)
        return
      }
      setRemaining(diff)
      setOvertime(true)
      if (!alerted && diff <= 0) {
        setAlerted(true)
        playEndAlert()
      }
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [running, gameEnded, releaseWakeLock, requestWakeLock, alerted])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && running) {
        void requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [running, requestWakeLock])

  useEffect(
    () => () => {
      void releaseWakeLock()
    },
    [releaseWakeLock],
  )

  const applyDuration = async (seconds: number) => {
    if (gameEnded || running) return
    setDuration(seconds)
    setRemaining(seconds)
    setOvertime(false)
    setAlerted(false)
    if (game) {
      const updated = await updatePitchGame(game.id, { durationSeconds: seconds })
      if (updated) setGame(updated)
    }
  }

  const toggleTimer = async () => {
    if (!game || gameEnded || dayClosed) return
    if (running) {
      endAtRef.current = null
      setRunning(false)
      return
    }
    endAtRef.current = Date.now() + remaining * 1000
    setRunning(true)
    if (game.status === 'ready') {
      const updated = await updatePitchGame(game.id, { status: 'live' })
      if (updated) setGame(updated)
    }
  }

  const resetTimer = () => {
    if (gameEnded || running) return
    endAtRef.current = null
    setRemaining(duration)
    setOvertime(false)
    setAlerted(false)
  }

  const openGoalPicker = (side: GoalSide) => {
    if (!game || gameEnded || dayClosed) return
    setGoalSide(side)
  }

  const registerGoal = async (player: Player) => {
    if (!game || !day || !goalSide || gameEnded) return
    setBusy(true)
    setError(null)
    const created = await addGoal({
      dayId: day.id,
      gameId: game.id,
      playerId: player.id,
      playerName: player.name,
      side: goalSide,
    })
    if (!created) {
      setError(t.pages.partida.goalError)
      setBusy(false)
      return
    }
    const nextHome = game.homeScore + (goalSide === 'home' ? 1 : 0)
    const nextAway = game.awayScore + (goalSide === 'away' ? 1 : 0)
    const updated = await updatePitchGame(game.id, {
      homeScore: nextHome,
      awayScore: nextAway,
      status: game.status === 'ready' ? 'live' : game.status,
    })
    if (updated) setGame(updated)
    setGoals((prev) => [created, ...prev])
    setGoalSide(null)
    setBusy(false)
  }

  const undoGoal = async (goal: GoalEvent) => {
    if (!game || gameEnded || dayClosed) return
    setBusy(true)
    const ok = await deleteGoal(goal.id)
    if (!ok) {
      setError(t.pages.partida.goalError)
      setBusy(false)
      return
    }
    const nextHome = Math.max(
      0,
      game.homeScore - (goal.side === 'home' ? 1 : 0),
    )
    const nextAway = Math.max(
      0,
      game.awayScore - (goal.side === 'away' ? 1 : 0),
    )
    const updated = await updatePitchGame(game.id, {
      homeScore: nextHome,
      awayScore: nextAway,
    })
    if (updated) setGame(updated)
    setGoals((prev) => prev.filter((g) => g.id !== goal.id))
    setBusy(false)
  }

  const endMatch = async () => {
    if (!game || gameEnded) return
    const confirmed = window.confirm(t.pages.partida.endMatchConfirm)
    if (!confirmed) return
    setBusy(true)
    endAtRef.current = null
    setRunning(false)
    setOvertime(false)
    setRemaining(duration)
    setAlerted(false)
    const updated = await updatePitchGame(game.id, {
      status: 'ended',
      endedAt: new Date().toISOString(),
    })
    if (updated) setGame(updated)
    setBusy(false)
  }

  const newMatch = async () => {
    if (!day || day.status === 'closed') return
    setBusy(true)
    setError(null)
    // ensure previous ended
    if (game && game.status !== 'ended') {
      await updatePitchGame(game.id, {
        status: 'ended',
        endedAt: new Date().toISOString(),
      })
    }
    const next = await ensureCurrentPitchGame(day, duration)
    if (!next) {
      setError(t.pages.partida.loadError)
      setBusy(false)
      return
    }
    setGame(next)
    setGoals([])
    setRemaining(duration)
    setRunning(false)
    setOvertime(false)
    setAlerted(false)
    endAtRef.current = null
    setBusy(false)
  }

  const endDay = async () => {
    if (!day || dayClosed) return
    const confirmed = window.confirm(t.pages.partida.endDayConfirm)
    if (!confirmed) return
    setBusy(true)
    if (game && game.status !== 'ended') {
      await updatePitchGame(game.id, {
        status: 'ended',
        endedAt: new Date().toISOString(),
      })
    }
    endAtRef.current = null
    setRunning(false)
    const closed = await closeMatchDay(day.id)
    if (closed) {
      setDay(closed)
      if (game) setGame({ ...game, status: 'ended' })
    }
    setBusy(false)
  }

  const startDayAgain = async () => {
    setBusy(true)
    setError(null)
    const result = await reopenOrCreateToday()
    if (!result) {
      setError(t.pages.partida.loadError)
      setBusy(false)
      return
    }
    setDay(result.day)
    setGame(result.game)
    setDuration(result.game.durationSeconds)
    setRemaining(result.game.durationSeconds)
    setGoals([])
    setRunning(false)
    setOvertime(false)
    setAlerted(false)
    endAtRef.current = null
    const list = await fetchGoalsForGame(result.game.id)
    setGoals(list)
    setBusy(false)
  }

  const clockLabel = overtime
    ? `+${formatClock(remaining)}`
    : formatClock(Math.max(remaining, 0))

  if (!isSupabaseConfigured()) {
    return (
      <section className="flex flex-col gap-4">
        <header>
          <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
            {t.pages.partida.title}
          </h2>
        </header>
        <p className="text-sm text-[var(--color-text-muted)]">
          {t.pages.partida.needsConfig}
        </p>
      </section>
    )
  }

  if (bootLoading || playersLoading) {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center text-[var(--color-text-muted)]">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-4 pb-8">
      <header>
        <h2 className="font-display text-3xl tracking-[0.06em] text-gradient-gold">
          {t.pages.partida.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.pages.partida.subtitle}
        </p>
      </header>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {dayClosed ? (
        <div className="panel-ut flex flex-col gap-3 p-4">
          <p className="font-display text-2xl text-gradient-gold">
            {t.pages.partida.dayClosed}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t.pages.partida.dayClosedHint}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void startDayAgain()}
            className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[var(--color-text-inverse)]"
          >
            {t.pages.partida.startDay}
          </button>
        </div>
      ) : (
        <>
          {/* Timer */}
          <div
            className={[
              'panel-ut relative flex flex-col items-center gap-4 overflow-hidden p-4',
              overtime ? 'ring-2 ring-red-500/60' : '',
            ].join(' ')}
          >
            <p
              className={[
                'text-[10px] font-semibold uppercase tracking-[0.2em]',
                overtime
                  ? 'text-red-400'
                  : 'text-[var(--color-accent-soft)]',
              ].join(' ')}
            >
              {gameEnded
                ? t.pages.partida.matchEnded
                : overtime
                  ? t.pages.partida.injuryTime
                  : running
                    ? t.pages.partida.running
                    : t.pages.partida.ready}
            </p>

            <p
              className={[
                'font-display tabular-nums text-6xl leading-none tracking-[0.04em]',
                overtime ? 'text-red-400' : 'text-[var(--color-text)]',
              ].join(' ')}
              aria-live="polite"
            >
              {clockLabel}
            </p>

            {!gameEnded && (
              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={() => void toggleTimer()}
                  className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[var(--color-text-inverse)] shadow-[0_0_18px_rgba(245,197,24,0.35)]"
                >
                  {running ? (
                    <>
                      <Pause className="size-4" />
                      {t.pages.partida.pause}
                    </>
                  ) : (
                    <>
                      <Play className="size-4" />
                      {t.pages.partida.start}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetTimer}
                  disabled={running}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text-muted)] disabled:opacity-40"
                >
                  <RotateCcw className="size-4" />
                  {t.pages.partida.reset}
                </button>
              </div>
            )}

            {!gameEnded && !running && (
              <div className="flex w-full gap-2">
                {PRESETS.map((preset) => {
                  const active = duration === preset.seconds
                  return (
                    <button
                      key={preset.seconds}
                      type="button"
                      onClick={() => void applyDuration(preset.seconds)}
                      className={[
                        'flex-1 rounded-lg border py-2 font-display text-xl',
                        active
                          ? 'border-[var(--color-border-strong)] text-[var(--color-accent)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)]',
                      ].join(' ')}
                    >
                      {preset.label}
                      <span className="ml-0.5 text-xs opacity-70">min</span>
                    </button>
                  )
                })}
              </div>
            )}

            {game && (
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                {t.pages.partida.gameNumber.replace(
                  '{n}',
                  String(game.sequence),
                )}
              </p>
            )}
          </div>

          {/* Score */}
          <div className="panel-ut p-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
                  {t.pages.partida.home}
                </p>
                <p className="font-display text-5xl leading-none text-[var(--color-text)]">
                  {game?.homeScore ?? 0}
                </p>
              </div>
              <p className="font-display text-3xl text-[var(--color-text-muted)]">
                ×
              </p>
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
                  {t.pages.partida.away}
                </p>
                <p className="font-display text-5xl leading-none text-[var(--color-text)]">
                  {game?.awayScore ?? 0}
                </p>
              </div>
            </div>

            {!gameEnded && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openGoalPicker('home')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-3 py-3.5 text-sm font-bold text-[var(--color-accent)]"
                >
                  <CircleDot className="size-4" />
                  {t.pages.partida.goalHome}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openGoalPicker('away')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-3 py-3.5 text-sm font-bold text-[var(--color-accent)]"
                >
                  <CircleDot className="size-4" />
                  {t.pages.partida.goalAway}
                </button>
              </div>
            )}
          </div>

          {/* Goal list */}
          <div className="panel-ut p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
              {t.pages.partida.goalsTitle}
            </p>
            {goals.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {t.pages.partida.goalsEmpty}
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {goals.map((goal) => (
                  <li
                    key={goal.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-black/25 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                        {goal.playerName}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                        {goal.side === 'home'
                          ? t.pages.partida.home
                          : t.pages.partida.away}
                      </p>
                    </div>
                    {!gameEnded && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void undoGoal(goal)}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]"
                      >
                        <Undo2 className="size-3" />
                        {t.pages.partida.undo}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Match / day actions */}
          <div className="flex flex-col gap-2">
            {gameEnded ? (
              <button
                type="button"
                disabled={busy || dayClosed}
                onClick={() => void newMatch()}
                className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 py-3.5 text-sm font-bold text-[var(--color-text-inverse)] shadow-[0_0_18px_rgba(245,197,24,0.35)]"
              >
                {t.pages.partida.newMatch}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void endMatch()}
                className="rounded-xl border border-[var(--color-border)] px-4 py-3.5 text-sm font-semibold text-[var(--color-text)] hover:bg-white/5"
              >
                {t.pages.partida.endMatch}
              </button>
            )}

            <button
              type="button"
              disabled={busy || dayClosed}
              onClick={() => void endDay()}
              className="rounded-xl border border-red-500/40 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/10"
            >
              {t.pages.partida.endDay}
            </button>
          </div>

          {presentPlayers.length === 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-black/20 px-3 py-3 text-xs text-[var(--color-text-muted)]">
              <Users className="mt-0.5 size-4 shrink-0 text-[var(--color-accent)]" />
              <p>
                {t.pages.partida.noPresent}{' '}
                <Link
                  to="/novo-racha/presenca"
                  className="font-semibold text-[var(--color-accent)] underline"
                >
                  {t.pages.partida.goPresence}
                </Link>
              </p>
            </div>
          )}
        </>
      )}

      <BottomSheet
        open={goalSide !== null}
        title={
          goalSide === 'home'
            ? t.pages.partida.pickHome
            : t.pages.partida.pickAway
        }
        onClose={() => setGoalSide(null)}
      >
        {presentPlayers.length === 0 ? (
          <p className="px-1 py-4 text-sm text-[var(--color-text-muted)]">
            {t.pages.partida.noPresent}
          </p>
        ) : (
          <ul className="flex max-h-[50dvh] flex-col gap-1 overflow-y-auto pb-2">
            {presentPlayers.map((player) => (
              <li key={player.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void registerGoal(player)}
                  className="flex w-full items-center rounded-xl border border-[var(--color-border)] bg-black/25 px-4 py-3.5 text-left text-base font-semibold text-[var(--color-text)] transition-colors hover:bg-white/5 active:scale-[0.99]"
                >
                  {player.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>
    </section>
  )
}
