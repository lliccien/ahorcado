import { useToastStore } from '../../stores/toastStore';

const TONE_CLASSES = {
  info: 'bg-slate-800 text-slate-100 ring-1 ring-white/10',
  success: 'bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-300/30',
  warn: 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-300/30',
  error: 'bg-red-600/20 text-red-100 ring-1 ring-red-300/30',
};

export default function ToastStack() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 bottom-4 z-50 flex w-[min(420px,90vw)] -translate-x-1/2 flex-col gap-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismiss(toast.id)}
          className={`pointer-events-auto rounded-xl px-4 py-2 text-sm shadow-lg backdrop-blur-md transition ${
            TONE_CLASSES[toast.tone]
          }`}
        >
          {toast.text}
        </button>
      ))}
    </div>
  );
}
