"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Search, Sparkles, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { JourneyStepper } from "@/components/landing/JourneyStepper";

const FEATURES = [
	{
		title: "Generate",
		href: "/generate" as const,
		description:
			"Drop an idea. Get 5 scroll-stopping hooks, a punchy caption, and India-relevant hashtags.",
		icon: Sparkles,
		accent: true,
	},
	{
		title: "Analyze",
		href: "/analyze" as const,
		description:
			"Paste any post. Get a ruthless score, specific weaknesses, and a ready-to-post rewrite that scores higher.",
		icon: Search,
	},
	{
		title: "Saved",
		href: "/saved" as const,
		description:
			"Your workspace. Every post you save lives here — revisit, re-analyze, or regenerate any time.",
		icon: Bookmark,
	},
];

export default function LandingPage() {
	return (
		<div className="mx-auto w-full max-w-6xl px-8 py-14 lg:py-20">
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="flex flex-col gap-4"
			>
				<span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-accent">
					<Sparkles className="h-3 w-3" strokeWidth={2.5} />
					AI Creator Studio
				</span>
				<h1 className="max-w-3xl text-balance text-5xl font-bold leading-[1.05] tracking-tight lg:text-[56px]">
					Make Instagram posts that{" "}
					<span className="bg-gradient-to-r from-accent to-[#ff7aa6] bg-clip-text text-transparent">
						actually hit
					</span>
					.
				</h1>
				<p className="max-w-2xl text-[17px] leading-relaxed text-text-secondary">
					Drop an idea. Get a scripted post, sharpened by AI, and ready to save — all in
					under 10 seconds. Built for creators who care about performance.
				</p>
			</motion.div>

			{/* Journey — makes the product obvious at a glance */}
			<motion.section
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1, duration: 0.4 }}
				className="mt-10"
			>
				<div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted">
					How it works
				</div>
				<JourneyStepper />
			</motion.section>

			{/* Primary CTA row */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.15, duration: 0.4 }}
				className="mt-10 flex flex-wrap items-center gap-3"
			>
				<Link href="/generate">
					<Button size="lg" iconRight={<ArrowRight className="h-4 w-4" />}>
						Start generating
					</Button>
				</Link>
				<Link href="/analyze">
					<Button size="lg" variant="secondary">
						Or analyze a post
					</Button>
				</Link>
			</motion.div>

			{/* Feature cards */}
			<div className="mt-16 grid gap-4 md:grid-cols-3">
				{FEATURES.map((f, i) => {
					const Icon = f.icon;
					return (
						<motion.div
							key={f.title}
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 + i * 0.06, duration: 0.35 }}
						>
							<Link href={f.href}>
								<Card
									variant={f.accent ? "accent" : "default"}
									className="group relative flex h-full flex-col gap-3 p-6 transition-all hover:border-border-strong hover:shadow-card"
								>
									<span
										className={
											f.accent
												? "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-accent shadow-accent-sm"
												: "flex h-10 w-10 items-center justify-center rounded-xl bg-surface-alt text-accent"
										}
									>
										<Icon
											className={f.accent ? "h-5 w-5 text-white" : "h-5 w-5"}
											strokeWidth={2}
										/>
									</span>
									<h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
									<p className="text-[14px] leading-relaxed text-text-secondary">
										{f.description}
									</p>
									<span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-accent transition-transform group-hover:translate-x-0.5">
										Open
										<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
									</span>
								</Card>
							</Link>
						</motion.div>
					);
				})}
			</div>
		</div>
	);
}
