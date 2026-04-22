"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Sidebar footer identity chip.
 *
 * Shows the signed-in user's avatar (or initial), name, and email. The whole
 * chip links to /profile; the sign-out button lives next to it and stops
 * propagation so clicking it doesn't navigate.
 */
export function UserPill() {
	const router = useRouter();
	const user = useAuthStore((s) => s.user);
	const signOut = useAuthStore((s) => s.signOut);
	const [busy, setBusy] = useState(false);

	if (!user) return null;

	const initial = user.name?.trim().charAt(0)?.toUpperCase() || "U";

	async function handleSignOut(e: React.MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (busy) return;
		setBusy(true);
		try {
			await signOut();
		} finally {
			router.replace("/auth/signin");
		}
	}

	return (
		<Link
			href="/profile"
			className="group/pill relative flex items-center gap-3 rounded-xl border border-border/70 bg-surface-alt/60 px-3 py-2.5 transition-colors hover:border-border-strong hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
		>
			<span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-accent text-[14px] font-bold text-white shadow-accent-sm">
				{user.avatarUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={user.avatarUrl}
						alt={user.name}
						className="absolute inset-0 h-full w-full object-cover"
					/>
				) : (
					initial
				)}
				<span
					aria-hidden
					className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10"
				/>
			</span>
			<div className="flex min-w-0 flex-1 flex-col leading-tight">
				<span className="truncate text-[13px] font-semibold text-text-primary">
					{user.name}
				</span>
				<span className="truncate text-[11px] text-text-muted">
					{user.username ? `@${user.username}` : user.email}
				</span>
			</div>
			<AnimatePresence>
				<motion.button
					key="signout"
					type="button"
					onClick={handleSignOut}
					disabled={busy}
					whileTap={{ scale: 0.92 }}
					initial={{ opacity: 0.6 }}
					animate={{ opacity: 1 }}
					className={cn(
						"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-all",
						"opacity-70 hover:bg-danger-soft hover:text-danger group-hover/pill:opacity-100",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
						busy && "animate-pulse",
					)}
					aria-label="Sign out"
					title="Sign out"
				>
					<LogOut className="h-4 w-4" strokeWidth={2.25} />
				</motion.button>
			</AnimatePresence>
		</Link>
	);
}
