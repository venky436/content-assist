"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { SectionLabel } from "@/components/ui/SectionLabel";

type Props = { caption: string };

export function CaptionBlock({ caption }: Props) {
	return (
		<motion.section
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: 0.05 }}
			className="flex flex-col gap-3"
		>
			<div className="flex items-center justify-between">
				<SectionLabel className="inline-flex items-center gap-1.5">
					<FileText className="h-3 w-3" strokeWidth={2.5} /> Caption
				</SectionLabel>
				<CopyButton getText={() => caption} size="sm" />
			</div>
			<Card className="p-5">
				<p className="whitespace-pre-wrap text-[16px] leading-relaxed text-text-primary">
					{caption}
				</p>
			</Card>
		</motion.section>
	);
}
