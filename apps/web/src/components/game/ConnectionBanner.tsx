import { useGameStore } from '../../stores/gameStore';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const MESSAGES: Record<string, { text: string; tone: 'warn' | 'error' }> = {
  connecting: { text: 'Conectando…', tone: 'warn' },
  reconnecting: { text: 'Reconectando…', tone: 'warn' },
  disconnected: { text: 'Sin servidor. Reintentando…', tone: 'error' },
  error: { text: 'No pudimos conectar al servidor', tone: 'error' },
};

export default function ConnectionBanner() {
  const status = useGameStore((s) => s.connectionStatus);
  const online = useOnlineStatus();

  const cfg = !online
    ? { text: 'Sin internet', tone: 'error' as const, pulse: false }
    : MESSAGES[status]
      ? { ...MESSAGES[status], pulse: true }
      : null;

  if (!cfg) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sticky top-0 z-40 flex w-full items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium ${
        cfg.tone === 'warn'
          ? 'bg-amber-500/20 text-amber-100'
          : 'bg-red-600/30 text-red-100'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${cfg.pulse ? 'animate-pulse' : ''} ${
          cfg.tone === 'warn' ? 'bg-amber-300' : 'bg-red-300'
        }`}
        aria-hidden
      />
      <span>{cfg.text}</span>
    </div>
  );
}
