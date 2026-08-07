import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { PlayersProvider } from '@/context/PlayersContext'
import { RachaProvider } from '@/context/RachaContext'
import { I18nProvider } from '@/i18n/I18nProvider'
import { BolaDeOuroPage } from '@/pages/BolaDeOuroPage'
import { CronometroPage } from '@/pages/CronometroPage'
import { HistoricoPage } from '@/pages/HistoricoPage'
import { JogadoresPage } from '@/pages/JogadoresPage'
import { MaisPage } from '@/pages/MaisPage'
import { NovoRachaPage } from '@/pages/NovoRachaPage'
import { VotacaoPage } from '@/pages/VotacaoPage'
import { PresencaStep } from '@/pages/racha/PresencaStep'
import { ResumoStep } from '@/pages/racha/ResumoStep'
import { SorteioStep } from '@/pages/racha/SorteioStep'

export default function App() {
  return (
    <I18nProvider>
      <PlayersProvider>
        <RachaProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/jogadores" replace />} />
                <Route path="jogadores" element={<JogadoresPage />} />
                <Route path="novo-racha" element={<NovoRachaPage />}>
                  <Route index element={<Navigate to="presenca" replace />} />
                  <Route path="presenca" element={<PresencaStep />} />
                  <Route
                    path="modalidade"
                    element={<Navigate to="../presenca" replace />}
                  />
                  <Route path="sorteio" element={<SorteioStep />} />
                  <Route path="resumo" element={<ResumoStep />} />
                </Route>
                <Route path="cronometro" element={<CronometroPage />} />
                <Route path="mais" element={<MaisPage />} />
                <Route path="votacao" element={<VotacaoPage />} />
                <Route path="bola-de-ouro" element={<BolaDeOuroPage />} />
                <Route path="historico" element={<HistoricoPage />} />
                <Route path="*" element={<Navigate to="/jogadores" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </RachaProvider>
      </PlayersProvider>
    </I18nProvider>
  )
}
