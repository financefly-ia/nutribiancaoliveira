import type { Fase, ItemModelo, Servico } from './tipos'

/** Serviços e valores do manual "Consultório 2027". */
export const SERVICOS_PADRAO: Servico[] = [
  { id: 'avulsa', nome: 'Consulta Avulsa', valorCentavos: 28000, consultas: 1, prazo: { dias: 30 }, ativo: true },
  { id: 'trimestral', nome: 'Plano Trimestral', valorCentavos: 75000, consultas: 3, prazo: { meses: 3 }, ativo: true },
  { id: 'semestral', nome: 'Plano Semestral', valorCentavos: 138000, consultas: 6, prazo: { meses: 6 }, ativo: true },
]

const TRI_SEM = ['trimestral', 'semestral']
const SEM = ['semestral']
const AVULSA = ['avulsa']

/** Itens do manual (Parte 5 + checklists das etapas 6 e 8). */
export const CHECKLISTS_PADRAO: Record<Fase, ItemModelo[]> = {
  entrada: [
    { id: 'pagamento', texto: 'Pagamento confirmado', auto: 'pagamento' },
    { id: 'grupo', texto: 'Grupo individual criado' },
    { id: 'boas-vindas', texto: 'Material de boas-vindas enviado' },
    { id: 'kit', texto: 'Kit de boas-vindas enviado', servicos: SEM },
    { id: 'contrato', texto: 'Contrato assinado' },
    { id: 'pre-anamnese', texto: 'Pré-anamnese preenchida' },
    { id: 'aplicativo', texto: 'Cadastro no aplicativo concluído' },
    { id: 'data-confirmada', texto: 'Data da consulta confirmada', auto: 'consulta_confirmada' },
  ],
  pre_consulta: [
    { id: 'anamnese-revisada', texto: 'Pré-anamnese revisada' },
    { id: 'exames', texto: 'Exames disponíveis analisados' },
    { id: 'app-conferido', texto: 'Aplicativo conferido' },
    { id: 'prioridades', texto: 'Prioridades e dúvidas organizadas' },
    { id: 'mapa-estrutura', texto: 'Primeira estrutura do Mapa Nutricional + Rota de Ação', servicos: TRI_SEM },
  ],
  primeira_consulta: [
    { id: 'acolhimento', texto: 'Acolhimento e avaliação realizados' },
    { id: 'metas', texto: 'Metas iniciais definidas' },
    { id: 'mapa-discutido', texto: 'Mapa discutido', servicos: TRI_SEM },
    { id: 'proximos-passos', texto: 'Próximos passos explicados' },
  ],
  entrega: [
    { id: 'plano-alimentar', texto: 'Plano alimentar finalizado' },
    { id: 'industrializados', texto: 'Guia de Industrializados e lista de compras' },
    { id: 'mapa', texto: 'Mapa Nutricional + Rota de Ação', servicos: TRI_SEM },
    { id: 'guia-decisoes', texto: 'Guia de Decisões Alimentares', servicos: TRI_SEM },
    { id: 'ebook', texto: 'E-book de receitas', servicos: TRI_SEM },
    { id: 'conferido', texto: 'Materiais conferidos com o que foi discutido' },
    { id: 'enviado', texto: 'Entrega enviada pelo WhatsApp' },
    { id: 'prontuario', texto: 'Registro no prontuário' },
  ],
  retorno_antes: [
    { id: 'prontuario-metas', texto: 'Revisar o prontuário e as metas anteriores' },
    { id: 'checkins', texto: 'Conferir check-ins e feedbacks desde a última consulta' },
    { id: 'diario', texto: 'Revisar diário alimentar e informações do aplicativo' },
    { id: 'evolucao', texto: 'Conferir evolução de peso, medidas e indicadores' },
    { id: 'dificuldades', texto: 'Identificar dificuldades e avanços' },
    { id: 'assuntos', texto: 'Separar os assuntos prioritários' },
  ],
  retorno_depois: [
    { id: 'prontuario', texto: 'Atualizar o prontuário com evolução, dificuldades e condutas' },
    { id: 'novas-metas', texto: 'Registrar as novas metas' },
    { id: 'plano', texto: 'Atualizar o plano alimentar, quando necessário' },
    { id: 'materiais', texto: 'Enviar materiais e orientações combinados' },
    { id: 'proxima', texto: 'Próxima consulta agendada', auto: 'proximo_agendado' },
    { id: 'frequencia', texto: 'Atualizar a frequência dos check-ins' },
  ],
  encerramento: [
    { id: 'revisar-prontuario', texto: 'Revisar o prontuário desde a primeira consulta', servicos: TRI_SEM },
    { id: 'comparar', texto: 'Comparar a avaliação inicial com os dados atuais', servicos: TRI_SEM },
    { id: 'metas-alcancadas', texto: 'Revisar metas alcançadas, dificuldades e estratégias que funcionaram', servicos: TRI_SEM },
    { id: 'indicadores', texto: 'Conferir medidas e indicadores relevantes', servicos: TRI_SEM },
    { id: 'atencao', texto: 'Identificar pontos que ainda precisam de atenção', servicos: TRI_SEM },
    { id: 'preparar', texto: 'Preparar os pontos principais da consulta de encerramento', servicos: TRI_SEM },
    { id: 'consulta-final', texto: 'Consulta de encerramento realizada', servicos: TRI_SEM },
    { id: 'relatorio', texto: 'Relatório de Evolução Nutricional entregue', servicos: SEM },
    { id: 'ultimo-checkin', texto: 'Último check-in enviado e avaliado (dias 23 a 27)', servicos: AVULSA },
    { id: 'continuidade', texto: 'Continuidade conversada' },
    { id: 'renovacao', texto: 'Renovação formalizada ou ciclo encerrado' },
  ],
}
