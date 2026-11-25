import { rotuloEtapa, type Etapa } from '@/lib/contatos/types'

export const Badge = ({ etapa }: { etapa: Etapa }) => <span className={`pn-badge pn-b-${etapa}`}>{rotuloEtapa(etapa)}</span>
