import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Send, MessageCircleQuestion, Bot, User } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useBudgets } from '../hooks/useBudgets';
import { useGoals } from '../hooks/useGoals';
import { useCategories } from '../hooks/useCategories';
import { useRecurringPayments } from '../hooks/useRecurring';
import { useProfile } from '../context/ProfileContext';
import { answerQuestion } from '../lib/assistant';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'Quanto posso gastar hoje?',
  'Quanto gastei em alimentação?',
  'Quanto preciso poupar por mês?',
  'Quanto falta para a minha meta?',
];

export default function Assistente() {
  const { profile } = useProfile();
  const { data: transactions = [] } = useTransactions();
  const { data: budgets = [] } = useBudgets(new Date().getFullYear(), new Date().getMonth() + 1);
  const { data: goals = [] } = useGoals();
  const { data: categories = [] } = useCategories();
  const { data: recurringPayments = [] } = useRecurringPayments();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Olá! Sou o teu assistente financeiro. Podes perguntar-me sobre os teus gastos, orçamento, poupança e metas — respondo com base nos teus dados reais.',
    },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function ask(question: string) {
    if (!question.trim() || !profile) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: question };

    const result = answerQuestion(question, {
      transactions,
      budgets,
      goals,
      categories,
      recurringPayments,
      monthlyIncome: profile.monthly_income,
      currency: profile.currency,
    });

    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', text: result.answer };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="space-y-6 animate-fade-up flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-7rem)]">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white flex items-center gap-2">
          <MessageCircleQuestion size={22} className="text-brand-500" /> Assistente financeiro
        </h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Respostas baseadas nos teus dados reais — sem inventar valores.</p>
      </div>

      <div ref={scrollRef} className="flex-1 card p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                m.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-ink-50 dark:bg-ink-800 text-ink-800 dark:text-ink-100 rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-ink-100 dark:bg-ink-800 text-ink-500 flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => ask(s)} className="text-xs px-3 py-1.5 rounded-full bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700 transition">
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="input flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunta algo sobre as tuas finanças…"
        />
        <button type="submit" className="btn-primary px-4" aria-label="Enviar">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
