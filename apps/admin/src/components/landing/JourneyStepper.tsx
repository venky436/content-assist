"use client";

import { motion } from "framer-motion";
import {
	Lightbulb,
	FileText,
	Wand2,
	ImageIcon,
	PlaySquare,
	Bookmark,
	ChevronRight,
	type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Step = {
	label: string;
	sub: string;
	icon: LucideIcon;
	phase: 1 | 2;
};

const STEPS: Step[] = [
	{ label: "Idea", sub: "Drop your topic", icon: Lightbulb, phase: 1 },
	{ label: "Script", sub: "Hooks · caption · tags", icon: FileText, phase: 1 },
	{ label: "Improve", sub: "Ruthless critic", icon: Wand2, phase: 1 },
	{ label: "Images", sub: "Scene-driven visuals", icon: ImageIcon, phase: 1 },
	{ label: "Video", sub: "Reel-ready clip", icon: PlaySquare, phase: 1 },
	{ label: "Save", sub: "Your workspace", icon: Bookmark, phase: 1 },
];

export function JourneyStepper() {
	return (
		<div className="flex flex-wrap items-stretch gap-1.5 sm:gap-2">
			{STEPS.map((step, i) => {
				const Icon = step.icon;
				const active = step.phase === 1;
				const isLast = i === STEPS.length - 1;
				return (
					<div key={step.label} className="flex items-center gap-1.5 sm:gap-2">
						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.05 * i, duration: 0.35, ease: "easeOut" }}
							className={cn(
								"relative flex min-w-[112px] flex-col gap-1 rounded-xl border px-3.5 py-2.5 transition-colors",
								active
									? "border-accent/40 bg-surface"
									: "border-border bg-surface-alt/50 opacity-70",
							)}
						>
							<div className="flex items-center gap-2">
								<span
									className={cn(
										"flex h-6 w-6 items-center justify-center rounded-md",
										active ? "bg-accent-soft text-accent" : "bg-border/50 text-text-muted",
									)}
								>
									<Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
								</span>
								<span
									className={cn(
										"text-[13px] font-semibold",
										active ? "text-text-primary" : "text-text-secondary",
									)}
								>
									{step.label}
								</span>
								{!active ? (
									<span className="ml-auto rounded-full bg-border/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-muted">
										Soon
									</span>
								) : null}
							</div>
							<span className="text-[11px] leading-tight text-text-muted">
								{step.sub}
							</span>
						</motion.div>
						{!isLast ? (
							<ChevronRight
								className="h-4 w-4 shrink-0 text-text-muted"
								strokeWidth={2}
							/>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
