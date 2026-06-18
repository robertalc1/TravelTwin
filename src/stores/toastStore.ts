import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastStore {
  toasts: Toast[];
  show: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

/**
 * Tiny in-memory toast queue. `show` enqueues a toast; the per-toast
 * auto-dismiss timer (with pause-on-hover) lives in `<Toaster />`, which is
 * mounted in layout.
 */
export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  show: (message, tone = "success") => {
    const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    set({ toasts: [...get().toasts, { id, message, tone }] });
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
