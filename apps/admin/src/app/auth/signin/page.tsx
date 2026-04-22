"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Lock, Mail } from "lucide-react";
import { Suspense, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { AuthInput } from "@/components/ui/AuthInput";
import { SessionExpiredBanner } from "@/components/auth/SessionExpiredBanner";
import { useAuthStore } from "@/stores/auth-store";

function safeReturnTo(raw: string | null): string {
	if (!raw) return "/";
	try {
		const decoded = decodeURIComponent(raw);
		if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/";
		return decoded;
	} catch {
		return "/";
	}
}

function SignInForm() {
	const router = useRouter();
	const params = useSearchParams();
	const expired = params?.get("expired") === "1";
	const returnTo = params?.get("returnTo") ?? null;

	const signIn = useAuthStore((s) => s.signIn);

	const [email, setEmail] = useState(params?.get("email") ?? "");
	const [password, setPassword] = useState("");
	const [emailError, setEmailError] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [shake, setShake] = useState(0);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setFormError(null);
		let hasErr = false;
		if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
			setEmailError("Enter a valid email.");
			hasErr = true;
		} else setEmailError(null);
		if (password.length < 1) {
			setPasswordError("Password required.");
			hasErr = true;
		} else setPasswordError(null);
		if (hasErr) {
			setShake((n) => n + 1);
			return;
		}
		setBusy(true);
		try {
			await signIn({ email: email.trim(), password });
			// Dynamic return-to — not representable in Next's `typedRoutes`; cast.
			router.replace(safeReturnTo(returnTo) as never);
		} catch (err) {
			const status = (err as { status?: number })?.status;
			const msg = (err as Error)?.message ?? "Couldn't sign in.";
			if (status === 401) {
				setFormError("That email and password didn't match. Try again.");
			} else if (status === 429) {
				setFormError(msg);
			} else if (status === 0) {
				setFormError("Couldn't reach the server. Check your connection.");
			} else {
				setFormError(msg);
			}
			setShake((n) => n + 1);
			setBusy(false);
		}
	}

	return (
		<motion.div
			key={shake}
			initial={{ x: 0 }}
			animate={shake ? { x: [-3, 3, -2, 2, 0] } : { x: 0 }}
			transition={{ duration: 0.32 }}
			className="flex flex-col gap-8"
		>
			{expired ? <SessionExpiredBanner returnTo={returnTo} /> : null}

			<motion.header
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, ease: "easeOut" }}
				className="flex flex-col gap-3"
			>
				<span className="inline-flex w-fit items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
					<span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
					Sign in
				</span>
				<h1 className="text-balance text-[40px] font-bold leading-[1.05] tracking-tight sm:text-[52px]">
					Welcome back.
				</h1>
				<p className="text-[15px] leading-relaxed text-text-secondary">
					Sign in to keep creating.
				</p>
			</motion.header>

			<AnimatePresence initial={false}>
				{formError ? (
					<motion.div
						key="err"
						initial={{ opacity: 0, y: -6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -6 }}
						transition={{ duration: 0.2 }}
						className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3"
					>
						<AlertCircle
							className="mt-0.5 h-4 w-4 shrink-0 text-danger"
							strokeWidth={2.25}
						/>
						<p className="flex-1 text-[13px] leading-relaxed text-text-primary">
							{formError}
						</p>
					</motion.div>
				) : null}
			</AnimatePresence>

			<motion.form
				onSubmit={handleSubmit}
				noValidate
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
				className="flex flex-col gap-6"
			>
				<AuthInput
					label="Email"
					type="email"
					icon={Mail}
					autoComplete="email"
					autoFocus
					placeholder="you@studio.com"
					disabled={busy}
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					error={emailError}
				/>
				<AuthInput
					label="Password"
					type="password"
					icon={Lock}
					autoComplete="current-password"
					placeholder="At least 8 characters"
					disabled={busy}
					togglePassword
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					error={passwordError}
				/>
				<Button
					type="submit"
					size="lg"
					fullWidth
					loading={busy}
					disabled={busy}
					iconRight={busy ? undefined : <ArrowRight className="h-4 w-4" />}
					className="mt-2"
				>
					{busy ? "Signing you in…" : "Sign in"}
				</Button>
			</motion.form>

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.4, delay: 0.15 }}
				className="flex items-center justify-between gap-4 border-t border-border/60 pt-6"
			>
				<span className="text-[13px] text-text-secondary">New here?</span>
				<Link
					href="/auth/signup"
					className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent transition-transform hover:translate-x-0.5"
				>
					Create an account
					<ArrowRight
						className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
						strokeWidth={2.5}
					/>
				</Link>
			</motion.div>
		</motion.div>
	);
}

export default function SignInPage() {
	return (
		<Suspense fallback={null}>
			<SignInForm />
		</Suspense>
	);
}
