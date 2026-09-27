import type { ReactNode } from 'react';

/** Tabela com scroll horizontal no telemóvel e cabeçalhos acessíveis. */
export function DataTable({ caption, head, children }: { caption: string; head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line bg-background text-xs uppercase tracking-wider text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
