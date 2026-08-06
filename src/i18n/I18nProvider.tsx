import { useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_LOCALE,
  getMessages,
  I18nContext,
  type Locale,
} from '@/i18n'

interface I18nProviderProps {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)
  const value = useMemo(
    () => ({
      locale,
      t: getMessages(locale),
      setLocale,
    }),
    [locale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
