import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'warn' | 'error';

export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  push: (text: string, tone?: ToastTone, durationMs?: number) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (text, tone = 'info', durationMs = 3500) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, text, tone }] });
    if (typeof window !== 'undefined' && durationMs > 0) {
      window.setTimeout(() => {
        set({ toasts: get().toasts.filter((t) => t.id !== id) });
      }, durationMs);
    }
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
