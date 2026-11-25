import { exigirSessao } from '@/lib/auth/guard'

export const dynamic = 'force-dynamic'

export default async function AreaProtegida({ children }: { children: React.ReactNode }) {
  await exigirSessao()
  return <>{children}</>
}
