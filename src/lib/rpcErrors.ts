import { PLAN_LIMITS, getResourceLabel, type PlanResource } from './planLimits';

/**
 * As RPCs do Supabase (ver supabase/schema.sql) lançam códigos de erro
 * curtos e sem acentos (ex: "LIMIT_REACHED") para nunca expor detalhes
 * internos do Postgres ao utilizador. Esta função traduz esses códigos
 * para mensagens amigáveis em português.
 */
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'A tua sessão expirou. Volta a entrar para continuares.',
  INVALID_AMOUNT: 'O valor introduzido não é válido.',
  LIMIT_REACHED: 'Atingiste o limite do plano Free. Faz upgrade para o Premium para continuares.',
  GOAL_NOT_FOUND: 'Não foi possível encontrar essa meta.',
  DEBT_NOT_FOUND: 'Não foi possível encontrar essa dívida.',
  ACCOUNT_NOT_FOUND: 'Não foi possível encontrar essa conta. Verifica se ainda existe.',
  CATEGORY_NOT_FOUND: 'Não foi possível encontrar essa categoria. Verifica se ainda existe.',
  RECURRING_NOT_FOUND: 'Não foi possível encontrar esse pagamento recorrente.',
  SAME_ACCOUNT_TRANSFER: 'Não podes transferir dinheiro de uma conta para ela própria.',
  DUPLICATE_OPERATION: 'Esta operação já foi registada — evita clicar duas vezes seguidas.',
};

/**
 * Igual a translateRpcError, mas quando o erro é LIMIT_REACHED e sabemos
 * a que recurso pertence (Fase 8/12), devolve a mensagem exata pedida:
 * "Limite de 2 contas atingido." em vez do texto genérico.
 */
export function translateRpcError(error: unknown, resource?: PlanResource): string {
  const message = error instanceof Error ? error.message : String(error);
  // O Postgres normalmente devolve o código dentro da mensagem de erro,
  // por vezes rodeado de texto adicional — procuramos o código conhecido
  // lá dentro em vez de exigir uma correspondência exata.
  const matchedCode = Object.keys(ERROR_MESSAGES).find((code) => message.includes(code));
  if (matchedCode === 'LIMIT_REACHED' && resource) {
    const limit = PLAN_LIMITS.free[resource];
    return `Limite de ${limit} ${getResourceLabel(resource)} atingido. Faz upgrade para o Premium para teres acesso ilimitado.`;
  }
  if (matchedCode) return ERROR_MESSAGES[matchedCode];
  return message || 'Ocorreu um erro inesperado. Tenta novamente.';
}
