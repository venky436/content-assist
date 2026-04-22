"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { Suspense, useEffect } from "react";
import { BrandPanel } from "@/components/auth/BrandPanel";
import { useAuthStore } from "@/stores/auth-store";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
	const token = useAuthStore((s) => s.token);

	// If the user somehow hits /auth/* while already signed in, bounce them.
	// `isAuthenticated` is only true AFTER bootstrap; a stale token alone
	// doesn't redirect (covers the server-rendered first paint case).
	useEffect(() => {
		if (isAuthenticated && token) {
			router.replace("/");
		}
	}, [isAuthenticated, token, router]);

	return (
		<div className="relative grid min-h-screen grid-cols-1 bg-bg lg:grid-cols-2">
			{/* Left: form column (mobile = only column) */}
			<div className="relative flex flex-col px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px] bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.12),transparent_60%)]"
				/>
				<header className="relative z-10">
					<Link
						href="/"
						className="inline-flex items-center gap-2.5 text-text-primary transition-opacity hover:opacity-90"
					>
						<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-accent shadow-accent-sm">
							<Wand2 className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
						</span>
						<span className="flex flex-col leading-tight">
							<span className="text-[15px] font-semibold tracking-tight">
								Content Assist
							</span>
							<span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
								Creator Studio
							</span>
						</span>
					</Link>
				</header>
				<main className="relative z-10 flex flex-1 items-center justify-center py-10">
					<div className="w-full max-w-[520px]">
						<Suspense fallback={null}>{children}</Suspense>
					</div>
				</main>
			</div>
			{/* Right: brand panel (desktop only) */}
			<div className="relative">
				<BrandPanel />
			</div>
		</div>
	);
}
