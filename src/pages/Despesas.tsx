import { useState } from 'react';
import { Plus } from 'lucide-react';
import { TransactionList } from '../components/transactions/TransactionList';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { Modal } from '../components/ui/Modal';
import type { Transaction } from '../types/database';

export default function Despesas() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Despesas</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
            Regista tudo o que gastas para saberes para onde vai o teu dinheiro.
          </p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={16} /> Nova despesa
        </button>
      </div>

      <TransactionList type="despesa" onEdit={openEdit} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar despesa' : 'Nova despesa'}
      >
        <TransactionForm type="despesa" initial={editing} onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
