import { describe, it, expect } from 'vitest';
import { translateRpcError } from './rpcErrors';

describe('translateRpcError', () => {
  it('traduz LIMIT_REACHED para mensagem amigável', () => {
    const msg = translateRpcError(new Error('LIMIT_REACHED'));
    expect(msg).toContain('limite do plano Free');
  });

  it('traduz códigos mesmo quando o Postgres envolve texto adicional', () => {
    const msg = translateRpcError(
      new Error('function create_account(...) line 16: LIMIT_REACHED')
    );
    expect(msg).toContain('limite do plano Free');
  });

  it('traduz SAME_ACCOUNT_TRANSFER', () => {
    const msg = translateRpcError(new Error('SAME_ACCOUNT_TRANSFER'));
    expect(msg).toContain('conta para ela própria');
  });

  it('traduz DUPLICATE_OPERATION', () => {
    const msg = translateRpcError(new Error('DUPLICATE_OPERATION'));
    expect(msg).toContain('já foi registada');
  });

  it('devolve a mensagem original quando não reconhece nenhum código', () => {
    const msg = translateRpcError(new Error('algo completamente inesperado'));
    expect(msg).toBe('algo completamente inesperado');
  });

  it('nunca deixa a mensagem vazia', () => {
    const msg = translateRpcError(new Error(''));
    expect(msg.length).toBeGreaterThan(0);
  });

  it('traduz LIMIT_REACHED com o recurso para a mensagem exata do paywall', () => {
    const msg = translateRpcError(new Error('LIMIT_REACHED'), 'accounts');
    expect(msg).toBe('Limite de 2 contas atingido. Faz upgrade para o Premium para teres acesso ilimitado.');
  });
});
