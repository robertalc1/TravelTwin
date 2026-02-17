"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User, Compass, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: `${firstName} ${lastName}`.trim(),
                    },
                },
            });

            if (error) {
                setError(error.message);
                return;
            }

            // Try to auto-login after signup
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (!loginError) {
                router.push("/");
                router.refresh();
            } else {
                setSuccess(true);
            }
        } catch {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <h1 className="text-h2 text-text-primary mb-2">Check your email</h1>
                <p className="text-body text-text-tertiary mb-6">
                    We&apos;ve sent a confirmation link to <strong className="text-text-primary">{email}</strong>.
                    Click the link to activate your account.
                </p>
                <Link href="/login">
                    <Button variant="primary" size="lg" className="w-full">
                        Back to Sign In
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div>
            {/* Mobile logo */}
            <div className="flex items-center gap-2.5 mb-8 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-radius-lg bg-primary-500">
                    <Compass className="h-5 w-5 text-white" />
                </div>
                <span className="font-display text-xl font-extrabold tracking-tight text-text-primary">
                    Travel<span className="text-accent-500">Twin</span>
                </span>
            </div>

            <h1 className="text-h2 text-text-primary mb-2">Create your account</h1>
            <p className="text-body text-text-tertiary mb-8">
                Join millions of travelers and start planning your next adventure
            </p>

            {error && (
                <div className="mb-4 rounded-radius-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                    {error}
                </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-3">
                    <Input
                        label="First Name"
                        placeholder="John"
                        leadingIcon={<User className="h-4 w-4" />}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                    />
                    <Input
                        label="Last Name"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                    />
                </div>
                <Input
                    label="Email"
                    type="email"
                    placeholder="john@example.com"
                    leadingIcon={<Mail className="h-4 w-4" />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <Input
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    leadingIcon={<Lock className="h-4 w-4" />}
                    trailingIcon={
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="hover:text-text-secondary transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                />
                <p className="text-caption text-text-muted">
                    Must be at least 6 characters.
                </p>

                <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-border-emphasis text-primary-500 mt-0.5" required />
                    <span className="text-body-sm text-text-secondary">
                        I agree to the{" "}
                        <a href="#" className="text-primary-500 hover:underline">Terms of Service</a>{" "}
                        and{" "}
                        <a href="#" className="text-primary-500 hover:underline">Privacy Policy</a>
                    </span>
                </label>

                <Button
                    variant="primary"
                    size="lg"
                    className="w-full mt-2"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating account...
                        </>
                    ) : (
                        "Create Account"
                    )}
                </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-border-default" />
                <span className="text-caption text-text-muted">or sign up with</span>
                <div className="flex-1 h-px bg-border-default" />
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="md" className="w-full">
                    <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    Google
                </Button>
                <Button variant="outline" size="md" className="w-full">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" /></svg>
                    Apple
                </Button>
            </div>

            <p className="mt-8 text-center text-body-sm text-text-muted">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary-500 hover:text-primary-600 transition-colors">
                    Sign in
                </Link>
            </p>
        </div>
    );
}
