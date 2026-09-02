import { useState, type FormEvent } from 'react';
import { Plus, Wallet, Landmark, PiggyBank, Smartphone, Banknote, ArrowLeftRight, Trash2 } from 'lucide-react';
import { useAccounts, useAccountBalances, useAccountMutations } from '../hooks/useAccounts';
import { useTransactionMutations } from '../hooks/useTransactions';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../lib/currency';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorBanner } from '../components/ui/Feedback';
import { Paywall, isLimitReachedMessage } from '../components/ui/Paywall';
import type { Account, AccountType } from '../types/database';

const ACCOUNT_ICONS: Record<AccountType, typeof Wallet> = {
  dinheiro: Banknote,
  banco: Landmark,
  conta_salario: Landmark,
  poupanca: PiggyBank,
  carteira_digital: Smartphone,
  outra: Wallet,
};

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  dinheiro: 'Dinheiro',
  banco: 'Banco',
  conta_salario: 'Conta salário',
  poupanca: 'Poupança',
  carteira_digital: 'Carteira digital',
  outra: 'Outra',
};

export default function Contas() {
  const { profile } = useProfile();
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: balances = [] } = useAccountBalances();
  const { remove } = useAccountMutations();
  const { showToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);

  const balanceOf = (id: string) => balances.find((b) => b.account_id === id)?.balance ?? 0;
  const totalBalance = balances.reduce((acc, b) => acc + Number(b.balance), 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Contas</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
            Saldo total: <strong className="text-ink-800 dark:text-white">{formatCurrency(totalBalance, profile?.currency)}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setTransferOpen(true)} disabled={accounts.length < 2}>
            <ArrowLeftRight size={16} /> Transferir
          </button>
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Nova conta
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-ink-400 text-sm py-10">A carregar…</div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Ainda sem contas"
          description="Cria a tua primeira conta ou carteira para começares a registar transações."
          action={<button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Criar conta</button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const Icon = ACCOUNT_ICONS[account.type];
            const balance = balanceOf(account.id);
            return (
              <div key={account.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: account.color }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-ink-900 dark:text-white">{account.name}</p>
                      <p className="text-xs text-ink-400">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteAccount(account)}
                    className="p-1.5 rounded-lg text-ink-400 hover:bg-coral-50 hover:text-coral-600 dark:hover:bg-coral-900/20"
                    aria-label="Arquivar conta"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <p className={`font-display text-2xl font-bold mt-4 tabular-nums ${balance < 0 ? 'text-coral-600 dark:text-coral-400' : 'text-ink-900 dark:text-white'}`}>
                  {formatCurrency(balance, profile?.currency)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nova conta">
        <NewAccountForm onDone={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transferir entre contas" description="Não afeta o total de receitas ou despesas — só move dinheiro entre as tuas contas.">
        <TransferForm accounts={accounts} onDone={() => setTransferOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={!!deleteAccount}
        title="Arquivar conta"
        message={`Tens a certeza que queres arquivar "${deleteAccount?.name}"? O histórico de transações é mantido, mas a conta deixa de aparecer nas novas transações.`}
        confirmLabel="Arquivar"
        loading={remove.isPending}
        onConfirm={async () => {
          if (!deleteAccount) return;
          try {
            await remove.mutateAsync(deleteAccount.id);
            showToast('Conta arquivada.');
          } catch {
            showToast('Não foi possível arquivar a conta.', 'error');
          } finally {
            setDeleteAccount(null);
          }
        }}
        onCancel={() => setDeleteAccount(null)}
      />
    </div>
  );
}

const ACCOUNT_TYPES: AccountType[] = ['dinheiro', 'banco', 'conta_salario', 'poupanca', 'carteira_digital', 'outra'];
const ACCOUNT_COLORS = ['#17A48C', '#3B82F6', '#D4A017', '#8B5CF6', '#E85D5D', '#64748B'];

function NewAccountForm({ onDone }: { onDone: () => void }) {
  const { create } = useAccountMutations();
  const { data: accounts = [] } = useAccounts();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('banco');
  const [initialBalance, setInitialBalance] = useState('0');
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Indica o nome da conta.');

    try {
      await create.mutateAsync({
        name: name.trim(),
        type,
        initial_balance: Number(initialBalance.replace(',', '.')) || 0,
        color,
        icon: 'wallet',
      });
      showToast('Conta criada.');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conta.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (isLimitReachedMessage(error) ? <Paywall resource="accounts" current={accounts.length} /> : <ErrorBanner message={error} />)}
      <div>
        <label className="label">Nome</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Conta salário" />
      </div>
      <div>
        <label className="label">Tipo</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Saldo inicial</label>
        <input className="input" inputMode="decimal" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
      </div>
      <div>
        <label className="label">Cor</label>
        <div className="flex gap-2">
          {ACCOUNT_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-ink-400 dark:ring-offset-ink-900' : ''}`}
              style={{ backgroundColor: c }}
              aria-label={`Escolher cor ${c}`}
            />
          ))}
        </div>
      </div>
      <button type="submit" className="btn-primary w-full" disabled={create.isPending}>
        {create.isPending ? 'A criar…' : 'Criar conta'}
      </button>
    </form>
  );
}

function TransferForm({ accounts, onDone }: { accounts: Account[]; onDone: () => void }) {
  const { transfer } = useTransactionMutations();
  const { showToast } = useToast();
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '');
  const [toId, setToId] = useState(accounts[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const numericAmount = Number(amount.replace(',', '.'));
    if (!numericAmount || numericAmount <= 0) return setError('Indica um valor válido.');
    if (!fromId || !toId) return setError('Escolhe as duas contas.');
    if (fromId === toId) return setError('A conta de origem e destino não podem ser a mesma.');

    try {
      await transfer.mutateAsync({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: numericAmount,
        date,
        description: 'Transferência entre contas',
      });
      showToast('Transferência registada.');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível transferir.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">De</label>
          <select className="input" value={fromId} onChange={(e) => setFromId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Para</label>
          <select className="input" value={toId} onChange={(e) => setToId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Valor</label>
          <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </div>
        <div>
          <label className="label">Data</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full" disabled={transfer.isPending}>
        {transfer.isPending ? 'A transferir…' : 'Transferir'}
      </button>
    </form>
  );
}
