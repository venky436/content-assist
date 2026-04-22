"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Flame, PlaySquare, Sparkles, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

type Feature = {
	icon: LucideIcon;
	title: string;
	body: string;
};

const FEATURES: Feature[] = [
	{
		icon: Sparkles,
		title: "5 hooks in 3 seconds.",
		body: "Drop an idea, get scroll-stopping hooks tuned for Instagram.",
	},
	{
		icon: Flame,
		title: "Analyze before you post.",
		body: "Paste any caption → get a ruthless score + a rewrite that scores higher.",
	},
	{
		icon: PlaySquare,
		title: "One click to reel.",
		body: "Scene-typed images + TTS voiceover + BGM composed into a shareable MP4.",
	},
];

export function BrandPanel() {
	const [index, setIndex] = useState(0);
	useEffect(() => {
		const id = setInterval(() => {
			setIndex((i) => (i + 1) % FEATURES.length);
		}, 5500);
		return () => clearInterval(id);
	}, []);

	const feature = FEATURES[index]!;
	const Icon = feature.icon;

	return (
		<div className="relative hidden h-full overflow-hidden bg-bg lg:block">
			{/* Rotating conic glow */}
			<div
				aria-hidden
				className="pointer-events-none absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 opacity-60"
				style={{
					background:
						"conic-gradient(from 0deg at 50% 50%, hsl(339 100% 62% / 0.18), transparent 30%, hsl(270 80% 65% / 0.14) 55%, transparent 80%, hsl(339 100% 62% / 0.18))",
					animation: "rotate-slow 48s linear infinite",
				}}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--accent)/0.12),transparent_65%)]"
			/>

			<div className="relative z-10 flex h-full flex-col justify-between p-14 xl:p-16">
				<div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-text-muted">
					<span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
					Creator Studio
				</div>
				<div className="mx-auto flex w-full max-w-xl flex-col gap-8">
					<AnimatePresence mode="wait">
						<motion.div
							key={index}
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -12 }}
							transition={{ duration: 0.45, ease: "easeOut" }}
							className="flex flex-col gap-5"
						>
							<span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-accent shadow-accent">
								<Icon className="h-7 w-7 text-white" strokeWidth={2} />
							</span>
							<h2 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight xl:text-5xl">
								{feature.title}
							</h2>
							<p className="text-[17px] leading-relaxed text-text-secondary xl:text-[18px]">
								{feature.body}
							</p>
						</motion.div>
					</AnimatePresence>
					<div className="flex gap-2">
						{FEATURES.map((_, i) => (
							<div
								key={i}
								className={`h-[3px] flex-1 rounded-full transition-colors ${
									i === index ? "bg-accent" : "bg-border"
								}`}
							/>
						))}
					</div>
				</div>
				<p className="text-[13px] leading-relaxed text-text-muted">
					Make Instagram posts that actually hit.
				</p>
			</div>
			<style jsx>{`
				@keyframes rotate-slow {
					from { transform: translate(-50%, -50%) rotate(0deg); }
					to { transform: translate(-50%, -50%) rotate(360deg); }
				}
			`}</style>
		</div>
	);
}
