import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('[PWA] SW registration error', error);
    },
  });

  if (!needRefresh && !offlineReady) return null;

  const dismiss = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-xl backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {needRefresh ? '🔄' : '✅'}
        </span>
        <div className="flex-1 text-sm text-slate-200">
          {needRefresh ? (
            <>
              <p className="font-semibold text-white">Hay una versión nueva</p>
              <p className="text-slate-400">Recarga para usar la última.</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-white">Listo para usar sin conexión</p>
              <p className="text-slate-400">La app ya está instalada en este dispositivo.</p>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {needRefresh && (
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Recargar
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
