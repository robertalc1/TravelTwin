import { create } from "zustand";

export type AuthView = "login" | "register";

interface AuthModalStore {
  isOpen: boolean;
  view: AuthView;
  /** Where to send the user after a successful sign-in. */
  redirectTo: string | null;
  open: (view?: AuthView, redirectTo?: string) => void;
  close: () => void;
  toggle: () => void;
  setView: (view: AuthView) => void;
}

export const useAuthModalStore = create<AuthModalStore>((set, get) => ({
  isOpen: false,
  view: "login",
  redirectTo: null,
  open: (view = "login", redirectTo) => set({ isOpen: true, view, redirectTo: redirectTo ?? null }),
  close: () => set({ isOpen: false, redirectTo: null }),
  toggle: () => set({ view: get().view === "login" ? "register" : "login" }),
  setView: (view) => set({ view }),
}));
