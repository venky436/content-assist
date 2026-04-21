"use client";

import { motion } from "framer-motion";
import { Flame, RefreshCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/cn";

type Props = {
	hooks: string[];
	recommendedHook: string;
	recommendedReason: string;
	onMakeStronger: () => void;
	regenerating?: boolean;
};

export function HooksList({
	hooks,
	recommendedHook,
	recommendedReason,
	onMakeStronger,
	regenerating,
}: Props) {
	const otherHooks = hooks.filter((h) => h !== recommendedHook);

	return (
		<motion.section
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className="flex flex-col gap-4"
		>
			<div className="flex items-center justify-between">
				<SectionLabel className="inline-flex items-center gap-1.5">
					<Flame className="h-3 w-3" strokeWidth={2.5} /> 5 Viral Hooks
				</SectionLabel>
				<CopyButton
					getText={() => hooks.map((h, i) => `${i + 1}. ${h}`).join("\n")}
					label="Copy all"
					size="sm"
				/>
			</div>

			<Card variant="accent" className="relative overflow-hidden p-5">
				<div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
				<div className="relative flex items-start justify-between gap-3">
					<div className="flex-1">
						<SectionLabel accent className="mb-2 inline-flex items-center gap-1.5">
							<Zap className="h-3 w-3" strokeWidth={2.5} /> Recommended
						</SectionLabel>
						<p className="text-[20px] font-semibold leading-snug tracking-tight text-text-primary">
							{recommendedHook}
						</p>
						{recommendedReason ? (
							<p className="mt-2.5 text-[13px] leading-relaxed text-text-secondary">
								<span className="font-semibold text-text-primary">
									Why this works:
								</span>{" "}
								{recommendedReason}
							</p>
						) : null}
					</div>
					<CopyButton getText={() => recommendedHook} size="sm" />
				</div>
			</Card>

			<Card className="divide-y divide-border/60">
				{otherHooks.map((hook, idx) => (
					<motion.div
						key={hook}
						initial={{ opacity: 0, x: -4 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.05 * idx, duration: 0.25 }}
						className={cn(
							"flex items-start gap-3 px-5 py-4",
							"transition-colors hover:bg-surface-alt/40",
						)}
					>
						<span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-alt text-[11px] font-bold text-text-muted">
							{idx + 2}
						</span>
						<p className="flex-1 text-[15px] leading-relaxed text-text-primary">
							{hook}
						</p>
						<CopyButton getText={() => hook} variant="ghost" size="sm" />
					</motion.div>
				))}
			</Card>

			<Button
				variant="secondary"
				size="md"
				loading={regenerating}
				onClick={onMakeStronger}
				iconLeft={<RefreshCcw className="h-4 w-4" strokeWidth={2.25} />}
				className="self-start"
			>
				{regenerating ? "Sharpening…" : "Make hooks stronger"}
			</Button>
		</motion.section>
	);
}
