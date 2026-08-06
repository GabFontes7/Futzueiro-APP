import { createContext, useContext } from 'react'
import { ptBR, type Messages } from './locales/pt-BR'
import { enUS } from './locales/en-US'

export type Locale = 'pt-BR' | 'en-US'

const catalogs: Record<Locale, Messages> = {
  'pt-BR': ptBR,
  'en-US': enUS,
}

export const DEFAULT_LOCALE: Locale = 'pt-BR'

export function getMessages(locale: Locale = DEFAULT_LOCALE): Messages {
  return catalogs[locale] ?? catalogs[DEFAULT_LOCALE]
}

export const I18nContext = createContext<{
  locale: Locale
  t: Messages
  setLocale: (locale: Locale) => void
}>({
  locale: DEFAULT_LOCALE,
  t: ptBR,
  setLocale: () => undefined,
})

export function useI18n() {
  return useContext(I18nContext)
}

export { ptBR, enUS }
export type { Messages }
