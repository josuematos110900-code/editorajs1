import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { AuthForm } from '../components/AuthForm';
import { BookCover } from '../components/book/BookCover';
import { LinePricing, lineTotal } from '../components/checkout/LinePricing';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState, Notice, Spinner } from '../components/ui/Feedback';
import { Checkbox, SelectField, TextField } from '../components/ui/Form';
import { deliveryMethods, paymentMethods, site } from '../config/site';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { api } from '../data';
import { cn } from '../lib/cn';
import { formatMoney } from '../lib/format';
import { computeTotals } from '../lib/pricing';
import { useSeo } from '../lib/seo';
import { useCartItems } from '../lib/useCartItems';
import { checkoutSchema, fieldErrors, type CheckoutInput } from '../lib/validation';

type Step = 'dados' | 'revisao';

export default function Checkout() {
  const { profile, loading: authLoading } = useAuth();
  const { loading: catalogLoading, reload } = useCatalog();
  const { clear } = useCart();
  const { items } = useCartItems();
  const navigate = useNavigate();
  useSeo({ title: 'Finalizar compra', noindex: true });

  const enabledPayments = paymentMethods.filter((m) => m.enabled);
  const [step, setStep] = useState<Step>('dados');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: 'Angola',
    city: '',
    line1: '',
    line2: '',
    postalCode: '',
    deliveryMethod: 'luanda',
    paymentMethod: enabledPayments[0]?.id ?? '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validated, setValidated] = useState<CheckoutInput | null>(null);

  // Pré-preenche com os dados da conta.
  useEffect(() => {
    if (profile) setForm((f) => ({ ...f, fullName: f.fullName || profile.fullName, email: f.email || profile.email, phone: f.phone || profile.phone }));
  }, [profile]);

  const delivery = deliveryMethods.find((m) => m.id === form.deliveryMethod);
  const totals = useMemo(() => computeTotals(items, delivery), [items, delivery]);

  if (authLoading || catalogLoading) return <Spinner />;

  if (items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState title="Não há nada para finalizar" action={<ButtonLink to="/livros">Explorar o catálogo</ButtonLink>}>
          O carrinho está vazio.
        </EmptyState>
      </div>
    );
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  function buildInput() {
    return {
      customer: { fullName: form.fullName, email: form.email, phone: form.phone },
      deliveryMethod: form.deliveryMethod,
      paymentMethod: form.paymentMethod,
      address: delivery?.requiresAddress
        ? { country: form.country, city: form.city, line1: form.line1, line2: form.line2 || undefined, postalCode: form.postalCode || undefined }
        : {},
      items: items.map((i) => ({ bookId: i.book.id, quantity: i.quantity })),
      acceptTerms: form.acceptTerms,
    };
  }

  function onReview(e: FormEvent) {
    e.preventDefault();
    const parsed = checkoutSchema.safeParse(buildInput());
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      // Leva o foco ao primeiro campo com erro.
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});
    setValidated(parsed.data);
    setStep('revisao');
    window.scrollTo({ top: 0 });
  }

  async function onConfirm() {
    if (!validated) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const { acceptTerms: _accepted, ...input } = validated;
      const order = await api.placeOrder(input);
      clear();
      void reload(); // stock e reservas mudaram
      if (order.payment.method === 'gateway') {
        try {
          const { redirectUrl } = await api.startOnlinePayment(order.id);
          if (/^https?:\/\//.test(redirectUrl)) window.location.assign(redirectUrl);
          else navigate(redirectUrl, { replace: true });
          return;
        } catch {
          navigate(`/encomenda/${order.id}?pagamento=erro`, { replace: true });
          return;
        }
      }
      navigate(`/encomenda/${order.id}`, { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Não foi possível criar a encomenda.');
      setSubmitting(false);
    }
  }

  const summaryItems = (
    <ul className="space-y-4">
      {items.map((i) => (
        <li key={i.book.id} className="flex gap-3">
          <div className="w-12 shrink-0">
            <BookCover book={i.book} size="xs" />
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium leading-snug text-ink-900">{i.book.title}</p>
            <LinePricing quantity={i.quantity} unitPrice={i.unitPrice} listPrice={i.listPrice} />
          </div>
          <p className="text-sm font-medium">{formatMoney(lineTotal(i))}</p>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="container-page py-10 sm:py-14">
      <Link to="/carrinho" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-950">
        <ArrowLeft size={15} aria-hidden="true" /> Voltar ao carrinho
      </Link>
      <h1 className="mt-4 text-4xl font-medium">Finalizar compra</h1>
      <ol className="mt-6 flex gap-6 text-sm" aria-label="Passos do checkout">
        {[
          ['dados', '1. Dados e entrega'],
          ['revisao', '2. Rever e pagar'],
        ].map(([key, label]) => (
          <li key={key} aria-current={step === key ? 'step' : undefined} className={cn('border-b-2 pb-2', step === key ? 'border-ink-950 font-semibold text-ink-950' : 'border-transparent text-ink-500')}>
            {label}
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div>
          {!profile ? (
            <section className="rounded-xl border border-ink-100 bg-white p-6 sm:p-8" aria-labelledby="checkout-conta">
              <h2 id="checkout-conta" className="text-2xl font-medium">Entre para continuar</h2>
              <p className="mb-6 mt-2 text-sm text-ink-600">A conta permite acompanhar a encomenda e a pré-venda até à entrega. Demora menos de um minuto.</p>
              <AuthForm initialMode="registar" />
            </section>
          ) : step === 'dados' ? (
            <form onSubmit={onReview} noValidate className="space-y-10">
              <fieldset className="space-y-4">
                <legend className="mb-2 font-display text-2xl font-medium">Os seus dados</legend>
                <TextField label="Nome completo" autoComplete="name" value={form.fullName} onChange={set('fullName')} error={errors['customer.fullName']} required />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="E-mail" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors['customer.email']} required />
                  <TextField label="Telefone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors['customer.phone']} placeholder="+244 9xx xxx xxx" required />
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-4 font-display text-2xl font-medium">Entrega</legend>
                <div className="grid gap-3" role="radiogroup">
                  {deliveryMethods.map((m) => {
                    const cost = m.freeFrom !== null && totals.subtotal - totals.discount >= m.freeFrom ? 0 : m.cost;
                    return (
                      <label key={m.id} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-4 transition', form.deliveryMethod === m.id ? 'border-ink-950 ring-1 ring-ink-950' : 'border-ink-200 hover:border-ink-400')}>
                        <input type="radio" name="delivery" value={m.id} checked={form.deliveryMethod === m.id} onChange={set('deliveryMethod')} className="mt-1 accent-seal-700" />
                        <span className="flex-1">
                          <span className="flex justify-between gap-4 font-medium text-ink-900">
                            {m.label}
                            <span>{cost === 0 ? 'Grátis' : formatMoney(cost)}</span>
                          </span>
                          <span className="mt-0.5 block text-sm text-ink-500">
                            {m.description}
                            {m.freeFrom !== null && cost > 0 && ` Grátis a partir de ${formatMoney(m.freeFrom)}.`}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {items.some((i) => i.isPreorder) && (
                  <p className="mt-3 text-sm text-ink-600">Os livros em pré-venda são enviados a partir da data prevista em cada livro.</p>
                )}
              </fieldset>

              {delivery?.requiresAddress && (
                <fieldset className="space-y-4">
                  <legend className="mb-2 font-display text-2xl font-medium">Morada de entrega</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField label="País" autoComplete="country-name" value={form.country} onChange={set('country')} error={errors['address.country']} required>
                      {site.countries.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </SelectField>
                    <TextField label="Cidade" autoComplete="address-level2" value={form.city} onChange={set('city')} error={errors['address.city']} required />
                  </div>
                  <TextField label="Endereço" autoComplete="address-line1" value={form.line1} onChange={set('line1')} error={errors['address.line1']} placeholder="Rua, número, bairro" required />
                  <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                    <TextField label="Complemento (opcional)" autoComplete="address-line2" value={form.line2} onChange={set('line2')} placeholder="Prédio, andar, referência" />
                    <TextField label="Código postal (opcional)" autoComplete="postal-code" value={form.postalCode} onChange={set('postalCode')} />
                  </div>
                </fieldset>
              )}

              <fieldset>
                <legend className="mb-4 font-display text-2xl font-medium">Pagamento</legend>
                <div className="grid gap-3" role="radiogroup">
                  {enabledPayments.map((m) => (
                    <label key={m.id} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-4 transition', form.paymentMethod === m.id ? 'border-ink-950 ring-1 ring-ink-950' : 'border-ink-200 hover:border-ink-400')}>
                      <input type="radio" name="payment" value={m.id} checked={form.paymentMethod === m.id} onChange={set('paymentMethod')} className="mt-1 accent-seal-700" />
                      <span>
                        <span className="block font-medium text-ink-900">{m.label}</span>
                        <span className="mt-0.5 block text-sm text-ink-500">{m.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.paymentMethod && <p className="mt-2 text-sm text-seal-700" role="alert">{errors.paymentMethod}</p>}
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
                  <Lock size={13} aria-hidden="true" /> Nunca guardamos dados de cartão bancário.
                </p>
              </fieldset>

              <div>
                <Checkbox
                  checked={form.acceptTerms}
                  onChange={set('acceptTerms')}
                  aria-invalid={errors.acceptTerms ? true : undefined}
                  label={
                    <>
                      Li e aceito as políticas de <Link to="/informacoes/envios" className="underline" target="_blank">envio</Link>,{' '}
                      <Link to="/informacoes/pre-venda" className="underline" target="_blank">pré-venda</Link> e{' '}
                      <Link to="/informacoes/privacidade" className="underline" target="_blank">privacidade</Link>.
                    </>
                  }
                />
                {errors.acceptTerms && <p className="mt-2 text-sm text-seal-700" role="alert">{errors.acceptTerms}</p>}
              </div>

              {Object.keys(errors).length > 0 && <Notice tone="error">Reveja os campos assinalados.</Notice>}

              <Button type="submit" size="lg" className="w-full sm:w-auto">
                Rever encomenda
              </Button>
            </form>
          ) : (
            validated && (
              <ReviewStep
                input={validated}
                onEdit={() => setStep('dados')}
                onConfirm={onConfirm}
                submitting={submitting}
                error={submitError}
                total={totals.total}
              />
            )
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Resumo da encomenda">
          <OrderSummary totals={totals}>{summaryItems}</OrderSummary>
        </aside>
      </div>
    </div>
  );
}

function ReviewStep({
  input,
  onEdit,
  onConfirm,
  submitting,
  error,
  total,
}: {
  input: CheckoutInput;
  onEdit: () => void;
  onConfirm: () => void;
  submitting: boolean;
  error: string;
  total: number;
}) {
  const delivery = deliveryMethods.find((m) => m.id === input.deliveryMethod);
  const payment = paymentMethods.find((m) => m.id === input.paymentMethod);
  return (
    <section aria-labelledby="revisao-titulo" className="space-y-6">
      <h2 id="revisao-titulo" className="text-2xl font-medium">Confirme a sua encomenda</h2>
      <dl className="divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white">
        <ReviewRow label="Cliente">
          {input.customer.fullName}
          <br />
          {input.customer.email} · {input.customer.phone}
        </ReviewRow>
        <ReviewRow label="Entrega">
          {delivery?.label}
          {delivery?.requiresAddress && (
            <>
              <br />
              {input.address.line1}
              {input.address.line2 && `, ${input.address.line2}`}
              <br />
              {input.address.postalCode && `${input.address.postalCode} `}
              {input.address.city}, {input.address.country}
            </>
          )}
        </ReviewRow>
        <ReviewRow label="Pagamento">{payment?.label}</ReviewRow>
      </dl>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        Alterar dados
      </Button>
      {error && <Notice tone="error" title="Não foi possível concluir a encomenda">{error}</Notice>}
      <div className="rounded-xl bg-paper-200 p-5 text-sm text-ink-700">
        {payment?.kind === 'online'
          ? 'Ao confirmar, será encaminhado para a página segura do nosso parceiro de pagamentos.'
          : 'Ao confirmar, recebe de imediato as instruções de pagamento. A encomenda fica reservada enquanto aguardamos o pagamento.'}
      </div>
      <Button size="lg" className="w-full" onClick={onConfirm} loading={submitting}>
        Confirmar encomenda · {formatMoney(total)}
      </Button>
      <p className="text-center text-xs text-ink-500">O total final é confirmado pelo servidor com os preços e o stock em vigor.</p>
    </section>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[8rem_1fr]">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="text-sm text-ink-900">{children}</dd>
    </div>
  );
}
