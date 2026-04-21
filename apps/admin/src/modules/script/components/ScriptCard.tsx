"use client";

import { motion } from "framer-motion";
import { Mic, RefreshCcw, Wand2 } from "lucide-react";
import type { GenerateScriptResponse } from "@content-assist/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { SectionLabel } from "@/components/ui/SectionLabel";

type Props = {
	script: GenerateScriptResponse;
	onRegenerate?: () => void;
	onImproveHook?: () => void;
	regenerating?: boolean;
	improving?: boolean;
};

export function ScriptCard({
	script,
	onRegenerate,
	onImproveHook,
	regenerating,
	improving,
}: Props) {
	const fullText = `${script.hook}\n\n${script.lines.join("\n")}\n\n${script.cta}`;
	const busy = Boolean(regenerating || improving);

	return (
		<motion.section
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35 }}
			className="flex flex-col gap-4"
		>
			<div className="flex items-center justify-between">
				<SectionLabel className="inline-flex items-center gap-1.5">
					<Mic className="h-3 w-3" strokeWidth={2.5} /> Spoken script
				</SectionLabel>
				<CopyButton getText={() => fullText} label="Copy script" size="sm" />
			</div>
			<Card variant="accent" className="relative overflow-hidden p-6">
				<div
					aria-hidden
					className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-accent/15 blur-3xl"
				/>
				<div className="relative flex flex-col gap-6">
					{/* Hook */}
					<div className="flex flex-col gap-1.5">
						<SectionLabel accent>Hook</SectionLabel>
						<p className="text-[22px] font-semibold leading-snug tracking-tight text-text-primary">
							{script.hook}
						</p>
					</div>
					<div className="h-px bg-border/60" />
					{/* Lines */}
					<div className="flex flex-col gap-3">
						<SectionLabel>Spoken lines</SectionLabel>
						<div className="flex gap-4">
							<div className="w-1 shrink-0 rounded-full bg-accent" />
							<div className="flex flex-1 flex-col gap-3">
								{script.lines.map((line, i) => (
									<motion.div
										key={`${i}-${line.slice(0, 10)}`}
										initial={{ opacity: 0, x: -4 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: 0.04 * i, duration: 0.25 }}
										className="flex items-start gap-3"
									>
										<span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-alt text-[11px] font-bold tabular-nums text-text-muted">
											{i + 1}
										</span>
										<p className="flex-1 text-[16px] leading-relaxed text-text-primary">
											{line}
										</p>
									</motion.div>
								))}
							</div>
						</div>
					</div>
					<div className="h-px bg-border/60" />
					{/* CTA */}
					<div className="flex flex-col gap-1.5">
						<SectionLabel>Closing CTA</SectionLabel>
						<p className="text-[17px] font-semibold leading-snug text-accent">
							{script.cta}
						</p>
					</div>
				</div>
			</Card>
			{/* Actions */}
			<div className="flex flex-wrap gap-2">
				{onRegenerate ? (
					<Button
						variant="secondary"
						size="md"
						loading={regenerating}
						disabled={busy}
						onClick={onRegenerate}
						iconLeft={<RefreshCcw className="h-4 w-4" strokeWidth={2.25} />}
					>
						{regenerating ? "Regenerating…" : "Regenerate script"}
					</Button>
				) : null}
				{onImproveHook ? (
					<Button
						variant="ghost"
						size="md"
						loading={improving}
						disabled={busy}
						onClick={onImproveHook}
						iconLeft={<Wand2 className="h-4 w-4" strokeWidth={2.25} />}
					>
						{improving ? "Improving…" : "Improve hook"}
					</Button>
				) : null}
			</div>
		</motion.section>
	);
}
