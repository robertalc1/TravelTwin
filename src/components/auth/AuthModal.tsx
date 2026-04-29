"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Mail, Lock, Eye, EyeOff, User, Loader2, Compass } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthModalStore } from "@/stores/authModalStore";
import { SocialButtons } from "./SocialButtons";
import { useUser } from "@/hooks/useUser";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 8 },
};

export function AuthModal() {
  const router = useRouter();
  const { isOpen, view, close, toggle, redirectTo } = useAuthModalStore();
  const { user } = useUser();

  // If the user becomes authenticated while the modal is open (e.g. magic
  // link in another tab), close it automatically.
  useEffect(() => {
    if (user && isOpen) close();
  }, [user, isOpen, close]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset transient state whenever the modal closes or the view flips.
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [view]);

  // Close on Escape, lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, close]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      if (view === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          setError(err.message);
          return;
        }
        finishSuccess();
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() || null } },
        });
        if (err) {
          setError(err.message);
          return;
        }
        // Try silent login — Supabase may require email confirmation depending on settings.
        const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
        if (loginErr) {
          setSuccess("Account created — check your email to confirm, then log in.");
          return;
        }
        finishSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function finishSuccess() {
    close();
    router.refresh();
    if (redirectTo) router.push(redirectTo);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="auth-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.18 }}
          onClick={close}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8"
        >
          <motion.div
            key="auth-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-surface shadow-2xl ring-1 ring-black/5 dark:ring-white/5 max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-surface-elevated transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="px-7 pt-8 pb-7">
              {/* Brand */}
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
                  <Compass className="h-4 w-4 text-white" />
                </div>
                <span className="font-display text-base font-extrabold tracking-tight text-text-primary">
                  Travel<span className="text-accent-500">Twin</span>
                </span>
              </div>

              <h2 id="auth-modal-title" className="text-2xl font-bold text-text-primary mb-1">
                {view === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-sm text-text-secondary mb-6">
                {view === "login"
                  ? "Log in to access your trips and bookings."
                  : "Start planning your next adventure in seconds."}
              </p>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-800 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-800 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
                  {success}
                </div>
              )}

              {/* Email + password */}
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {view === "register" && (
                  <label className="block">
                    <span className="block text-xs font-semibold text-text-secondary mb-1.5">Full name</span>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Doe"
                        autoComplete="name"
                        className="w-full rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated pl-10 pr-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </label>
                )}

                <label className="block">
                  <span className="block text-xs font-semibold text-text-secondary mb-1.5">Email</span>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated pl-10 pr-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="block text-xs font-semibold text-text-secondary mb-1.5">Password</span>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={view === "register" ? "At least 6 characters" : "Your password"}
                      autoComplete={view === "register" ? "new-password" : "current-password"}
                      className="w-full rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated pl-10 pr-10 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {view === "login" ? "Log in" : "Sign up"}
                </button>
              </form>

              {/* OR divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-neutral-200 dark:bg-border-default" />
                <span className="text-xs font-semibold tracking-wider text-text-muted uppercase">or</span>
                <div className="flex-1 h-px bg-neutral-200 dark:bg-border-default" />
              </div>

              {/* Social */}
              <SocialButtons />

              {/* Toggle */}
              <p className="mt-6 text-center text-sm text-text-secondary">
                {view === "login" ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={toggle}
                      className="font-semibold text-primary-500 hover:text-primary-600"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={toggle}
                      className="font-semibold text-primary-500 hover:text-primary-600"
                    >
                      Log in
                    </button>
                  </>
                )}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
