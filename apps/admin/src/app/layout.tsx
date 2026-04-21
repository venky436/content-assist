import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Content Assist — Creator Studio",
	description: "AI content for creators — hooks, captions, analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={`${inter.variable} dark`}>
			<body className="min-h-screen bg-bg font-sans text-text-primary antialiased">
				<QueryProvider>
					<div className="flex min-h-screen">
						<Sidebar />
						<main className="relative flex-1">
							{/* Subtle ambient glow behind the main content */}
							<div
								aria-hidden
								className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px] bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.12),transparent_60%)]"
							/>
							<div className="relative z-10">{children}</div>
						</main>
					</div>
				</QueryProvider>
			</body>
		</html>
	);
}
