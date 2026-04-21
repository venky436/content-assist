import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
	children: ReactNode;
	accent?: boolean;
	className?: string;
};

export function SectionLabel({ children, accent, className }: Props) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em]",
				accent ? "text-accent" : "text-text-muted",
				className,
			)}
		>
			{children}
		</span>
	);
}
