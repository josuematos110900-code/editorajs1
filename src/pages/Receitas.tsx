import { useState } from 'react';
import { Plus } from 'lucide-react';
import { TransactionList } from '../components/transactions/TransactionList';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { Modal } from '../components/ui/Modal';
import type { Transaction } from '../types/database';

export default function Receitas() {
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
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Receitas</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
            Salário, freelance, negócio, comissões e outros rendimentos.
          </p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={16} /> Nova receita
        </button>
      </div>

      <TransactionList type="receita" onEdit={openEdit} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar receita' : 'Nova receita'}
      >
        <TransactionForm type="receita" initial={editing} onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
