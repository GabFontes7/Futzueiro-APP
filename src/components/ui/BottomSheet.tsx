import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative z-10 flex max-h-[88dvh] w-full max-w-[480px] flex-col rounded-t-3xl border border-[var(--color-border)] border-b-0 bg-[var(--color-surface)] shadow-[0_-12px_40px_rgba(0,0,0,0.55)]"
            style={{ paddingBottom: 'var(--safe-bottom)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="relative flex items-center justify-between border-b border-[var(--color-border)] px-4 pt-5 pb-3">
              <div
                aria-hidden
                className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20"
              />
              <h3 className="font-display text-2xl tracking-[0.08em] text-gradient-gold">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[var(--color-text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-text)]"
                aria-label="Fechar formulário"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
