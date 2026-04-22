"use client";

import { motion } from "framer-motion";
import {
	CheckCircle2,
	ChevronRight,
	Circle,
	Sparkles,
	X,
} from "lucide-react";
import type { Profile } from "@content-assist/shared";
import { cn } from "@/lib/cn";

type Props = {
	profile: Profile;
	onNavigate: (sectionId: string) => void;
	onDismiss: () => void;
};

function checklist(p: Profile) {
	return [
		{
			id: "section-about",
			label: "Add a profile photo",
			done: !!p.avatarUrl,
		},
		{
			id: "section-about",
			label: "Pick your niche",
			done: !!p.niche,
		},
		{
			id: "section-defaults",
			label: "Set a default tone",
			done: !!p.defaultTone,
		},
	];
}

export function OnboardingChecklist({ profile, onNavigate, onDismiss }: Props) {
	const items = checklist(profile);
	const done = items.filter((i) => i.done).length;
	const total = items.length;
	const percent = Math.round((done / total) * 100);

	return (
		<motion.div
			initial={{ opacity: 0, y: -6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className="relative overflow-hidden rounded-2xl border border-accent/30 bg-accent-soft/40 p-5 sm:p-6"
		>
			<span
				aria-hidden
				className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-accent/30 blur-3xl"
			/>
			<div className="relative flex items-start gap-4">
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-accent text-white shadow-accent-sm">
					<Sparkles className="h-5 w-5" strokeWidth={2.25} />
				</span>
				<div className="flex flex-1 flex-col gap-3">
					<div className="flex items-baseline justify-between gap-3">
						<div>
							<h3 className="text-[16px] font-bold tracking-tight text-text-primary sm:text-[17px]">
								Let's finish setting you up
							</h3>
							<p className="mt-0.5 text-[12px] text-text-secondary">
								A few details help the AI match your voice and your vibe.
							</p>
						</div>
						<button
							type="button"
							onClick={onDismiss}
							className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-pressed hover:text-text-primary"
							aria-label="Dismiss"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					</div>

					{/* Progress bar */}
					<div className="h-1 overflow-hidden rounded-full bg-surface-pressed">
						<motion.div
							initial={{ width: 0 }}
							animate={{ width: `${percent}%` }}
							transition={{ type: "spring", stiffness: 140, damping: 22 }}
							className="h-full rounded-full bg-gradient-accent"
						/>
					</div>

					<ul className="flex flex-col gap-1">
						{items.map((item, i) => (
							<li key={`${item.id}-${i}`}>
								<button
									type="button"
									onClick={() => onNavigate(item.id)}
									disabled={item.done}
									className={cn(
										"flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors",
										item.done
											? "text-text-muted line-through"
											: "text-text-primary hover:bg-surface-pressed/60",
									)}
								>
									<span className="flex items-center gap-2">
										{item.done ? (
											<CheckCircle2
												className="h-4 w-4 text-success"
												strokeWidth={2.25}
											/>
										) : (
											<Circle className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
										)}
										{item.label}
									</span>
									{!item.done ? (
										<ChevronRight
											className="h-3.5 w-3.5 text-text-muted"
											strokeWidth={2.25}
										/>
									) : null}
								</button>
							</li>
						))}
					</ul>
				</div>
			</div>
		</motion.div>
	);
}
