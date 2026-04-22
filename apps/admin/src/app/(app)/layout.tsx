"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Wand2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { migrateLocalStorageSavedPosts } from "@/modules/saved/migration";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Authenticated shell.
 *
 * - Calls `bootstrap()` exactly once on mount. That verifies the persisted
 *   token against `/auth/me`; on 401 it clears auth state so the redirect
 *   below fires.
 * - While bootstrap is in-flight, renders a dark full-bleed skeleton so the
 *   user doesn't see a flash of the app before the auth check lands.
 * - Once settled, if the user isn't authenticated we imperatively redirect
 *   to /auth/signin (preserves return-to via api-client's 401 handler for
 *   in-app expirations; first-load unauthed users land on the bare signin).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const bootstrap = useAuthStore((s) => s.bootstrap);
	const isLoading = useAuthStore((s) => s.isLoading);
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

	useEffect(() => {
		bootstrap();
	}, [bootstrap]);

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			router.replace("/auth/signin");
		}
	}, [isLoading, isAuthenticated, router]);

	// One-time localStorage → server migration for pre-auth saved posts.
	// Fires once after we've confirmed the user is authenticated; idempotent
	// (the helper sets a flag in localStorage so it never re-runs).
	const migratedRef = useRef(false);
	useEffect(() => {
		if (!isAuthenticated || migratedRef.current) return;
		migratedRef.current = true;
		void migrateLocalStorageSavedPosts();
	}, [isAuthenticated]);

	if (isLoading || !isAuthenticated) {
		return <BootSkeleton />;
	}

	return (
		<div className="flex min-h-screen">
			<Sidebar />
			<main className="relative flex-1">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px] bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.12),transparent_60%)]"
				/>
				<div className="relative z-10">{children}</div>
			</main>
		</div>
	);
}

function BootSkeleton() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-bg">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px] bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.12),transparent_60%)]"
			/>
			<motion.div
				initial={{ opacity: 0, scale: 0.96 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.35, ease: "easeOut" }}
				className="relative z-10 flex flex-col items-center gap-4"
			>
				<motion.span
					initial={{ opacity: 0.6 }}
					animate={{ opacity: [0.6, 1, 0.6] }}
					transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
					className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-accent shadow-accent-sm"
				>
					<Wand2 className="h-5 w-5 text-white" strokeWidth={2.5} />
				</motion.span>
				<span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-text-muted">
					Loading your studio
				</span>
			</motion.div>
		</div>
	);
}
