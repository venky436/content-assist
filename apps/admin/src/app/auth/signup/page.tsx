"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Lock, Mail, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { AuthInput } from "@/components/ui/AuthInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { useAuthStore } from "@/stores/auth-store";

export default function SignUpPage() {
	const router = useRouter();
	const signUp = useAuthStore((s) => s.signUp);

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [nameError, setNameError] = useState<string | null>(null);
	const [emailError, setEmailError] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [shake, setShake] = useState(0);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setFormError(null);
		let hasErr = false;
		if (name.trim().length < 1) {
			setNameError("Tell us what to call you.");
			hasErr = true;
		} else setNameError(null);
		if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
			setEmailError("Enter a valid email.");
			hasErr = true;
		} else setEmailError(null);
		if (password.length < 8) {
			setPasswordError("At least 8 characters.");
			hasErr = true;
		} else setPasswordError(null);
		if (hasErr) {
			setShake((n) => n + 1);
			return;
		}
		setBusy(true);
		try {
			await signUp({ name: name.trim(), email: email.trim(), password });
			router.replace("/");
		} catch (err) {
			const status = (err as { status?: number })?.status;
			const msg = (err as Error)?.message ?? "Couldn't create account.";
			if (status === 409) {
				setEmailError("That email already has an account.");
				setFormError(null);
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
			<motion.header
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, ease: "easeOut" }}
				className="flex flex-col gap-3"
			>
				<span className="inline-flex w-fit items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
					<span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
					Create account
				</span>
				<h1 className="text-balance text-[40px] font-bold leading-[1.05] tracking-tight sm:text-[52px]">
					Start creating in 10 seconds.
				</h1>
				<p className="text-[15px] leading-relaxed text-text-secondary">
					Free account. No credit card.
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
					label="Your name"
					icon={User}
					autoComplete="name"
					autoFocus
					placeholder="Jane Creator"
					disabled={busy}
					value={name}
					onChange={(e) => setName(e.target.value)}
					error={nameError}
				/>
				<AuthInput
					label="Email"
					type="email"
					icon={Mail}
					autoComplete="email"
					placeholder="you@studio.com"
					disabled={busy}
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					error={emailError}
				/>
				<div className="flex flex-col gap-3">
					<AuthInput
						label="Password"
						type="password"
						icon={Lock}
						autoComplete="new-password"
						placeholder="At least 8 characters"
						disabled={busy}
						togglePassword
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						error={passwordError}
					/>
					<PasswordStrength password={password} />
				</div>
				<Button
					type="submit"
					size="lg"
					fullWidth
					loading={busy}
					disabled={busy}
					iconRight={busy ? undefined : <ArrowRight className="h-4 w-4" />}
					className="mt-2"
				>
					{busy ? "Creating your account…" : "Create account"}
				</Button>
			</motion.form>

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.4, delay: 0.15 }}
				className="flex flex-col gap-4 border-t border-border/60 pt-6"
			>
				<div className="flex items-center justify-between gap-4">
					<span className="text-[13px] text-text-secondary">Already a creator?</span>
					<Link
						href="/auth/signin"
						className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent transition-transform hover:translate-x-0.5"
					>
						Sign in
						<ArrowRight
							className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
							strokeWidth={2.5}
						/>
					</Link>
				</div>
				<p className="text-[11px] leading-relaxed text-text-muted">
					By signing up, you agree to our Terms + Privacy.
				</p>
			</motion.div>
		</motion.div>
	);
}
