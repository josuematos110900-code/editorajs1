import { describe, expect, it } from 'vitest';
import { canTransition, nextPaymentStatus, orderStatusAfterPayment } from './orderStatus';

describe('estados da encomenda', () => {
  it('segue o fluxo normal', () => {
    expect(canTransition('pendente', 'pagamento_confirmado')).toBe(true);
    expect(canTransition('pagamento_confirmado', 'em_preparacao')).toBe(true);
    expect(canTransition('em_preparacao', 'enviado')).toBe(true);
    expect(canTransition('enviado', 'entregue')).toBe(true);
  });
  it('não permite saltar etapas nem reabrir encomendas fechadas', () => {
    expect(canTransition('pendente', 'enviado')).toBe(false);
    expect(canTransition('cancelado', 'pendente')).toBe(false);
    expect(canTransition('reembolsado', 'entregue')).toBe(false);
  });
});

describe('efeito dos pagamentos', () => {
  it('pagamento aprovado confirma uma encomenda pendente', () => {
    expect(orderStatusAfterPayment('pendente', 'aprovado')).toBe('pagamento_confirmado');
  });
  it('pagamento recusado ou cancelado cancela uma encomenda pendente', () => {
    expect(orderStatusAfterPayment('pendente', 'recusado')).toBe('cancelado');
    expect(orderStatusAfterPayment('pendente', 'cancelado')).toBe('cancelado');
  });
  it('um webhook repetido não faz recuar uma encomenda já enviada', () => {
    expect(orderStatusAfterPayment('enviado', 'aprovado')).toBe('enviado');
  });
  it('reembolso marca a encomenda como reembolsada', () => {
    expect(orderStatusAfterPayment('entregue', 'reembolsado')).toBe('reembolsado');
  });
});

describe('nextPaymentStatus', () => {
  it('ignora eventos atrasados que fariam recuar um pagamento aprovado', () => {
    expect(nextPaymentStatus('aprovado', 'recusado')).toBe('aprovado');
    expect(nextPaymentStatus('aprovado', 'pendente')).toBe('aprovado');
  });
  it('permite reembolsar um pagamento aprovado e trata o reembolso como final', () => {
    expect(nextPaymentStatus('aprovado', 'reembolsado')).toBe('reembolsado');
    expect(nextPaymentStatus('reembolsado', 'aprovado')).toBe('reembolsado');
  });
  it('aceita a aprovação de um pagamento pendente', () => {
    expect(nextPaymentStatus('pendente', 'aprovado')).toBe('aprovado');
  });
});
