import type { ReactNode } from 'react';

/** Tabela com scroll horizontal no telemóvel e cabeçalhos acessíveis. */
export function DataTable({ caption, head, children }: { caption: string; head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-ink-100 bg-white">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-ink-100 bg-paper-50 text-xs uppercase tracking-wider text-ink-500">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">{children}</tbody>
      </table>
    </div>
  );
}
