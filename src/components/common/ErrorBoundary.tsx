import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Приложение перехватило ошибку:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-4">
          <div className="liquid-bubble-plate border border-amber-400/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative overflow-hidden backdrop-blur-xl shadow-2xl space-y-5 text-center">
            <span className="liquid-bubble-glare" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl liquid-bubble-secondary border border-amber-400/40 flex items-center justify-center mb-3 text-amber-300 shadow-md">
                <AlertCircle size={28} />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent text-smoke-anim mb-2">
                Временная пауза в отображении
              </h2>

              <p className="text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto">
                Интерфейс безопасно сохранил данные. Нажмите «Обновить раздел» для повторной инициализации модуля.
              </p>

              {this.state.error && (
                <div className="w-full mt-4 p-3.5 rounded-xl bg-zinc-950/70 border border-white/10 text-left overflow-x-auto text-sm font-mono text-zinc-400">
                  <div className="text-zinc-500 mb-1 text-sm font-semibold">Сведения системы:</div>
                  <div className="text-amber-200/90 break-words">{this.state.error.message || 'Произошла непредвиденная ошибка'}</div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4 w-full">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-5 py-2.5 liquid-bubble-gold text-amber-950 text-sm font-bold rounded-xl border border-amber-300 flex items-center gap-2 cursor-pointer shadow-md hover:scale-[1.02] transition-transform"
                >
                  <RefreshCw size={15} />
                  <span>Повторить</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleReload}
                  className="px-5 py-2.5 liquid-bubble-secondary text-zinc-200 border border-white/15 text-sm font-semibold rounded-xl flex items-center gap-2 cursor-pointer hover:border-amber-400/40 transition-colors"
                >
                  <RefreshCw size={15} />
                  <span>Перезагрузить страницу</span>
                </button>

                <a
                  href="/system-admin"
                  className="px-4 py-2.5 liquid-bubble-secondary text-zinc-300 border border-white/10 text-sm font-medium rounded-xl flex items-center gap-1.5 hover:text-white hover:border-white/25 transition-colors"
                >
                  <Home size={15} />
                  <span>В панель управления</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
