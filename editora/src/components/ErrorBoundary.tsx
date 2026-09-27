import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/**
 * Última rede de segurança: se um componente rebentar, mostra uma mensagem
 * com opção de recarregar em vez de deixar a página em branco.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro na interface:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <p className="eyebrow">Algo correu mal</p>
          <h1 className="t-h2 mt-3">Não foi possível mostrar esta página.</h1>
          <p className="mt-3 text-muted">Tente recarregar. Se o problema continuar, contacte-nos e indique o que estava a fazer.</p>
          <div className="mt-8 flex justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-md bg-primary px-5 font-medium text-white hover:bg-primary-hover">
              Recarregar a página
            </button>
            <a href="/" className="inline-flex min-h-11 items-center rounded-md border border-secondary/80 px-5 font-medium text-fg hover:bg-secondary hover:text-background">
              Página inicial
            </a>
          </div>
        </div>
      </div>
    );
  }
}
