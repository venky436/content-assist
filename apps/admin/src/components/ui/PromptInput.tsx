"use client";

import { motion } from "framer-motion";
import { ArrowUp, Sparkles } from "lucide-react";
import {
	forwardRef,
	useCallback,
	useEffect,
	useRef,
	useState,
	type ReactNode,
	type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

type Props = Omit<
	TextareaHTMLAttributes<HTMLTextAreaElement>,
	"onChange" | "value" | "onSubmit"
> & {
	value: string;
	onChange: (next: string) => void;
	onSubmit?: () => void;
	submitLabel?: string;
	disabled?: boolean;
	loading?: boolean;
	minRows?: number;
	maxRows?: number;
	maxLength?: number;
	label?: string; // small pill at the top (e.g. "✨ AI")
	hint?: ReactNode; // muted one-liner below the textarea
	canSubmit?: boolean; // parent-controlled enable
};

export const PromptInput = forwardRef<HTMLTextAreaElement, Props>(function PromptInput(
	{
		value,
		onChange,
		onSubmit,
		submitLabel = "Ask AI",
		disabled,
		loading,
		minRows = 3,
		maxRows = 10,
		maxLength = 500,
		label = "AI",
		hint,
		canSubmit,
		placeholder = "What would you like to post about?",
		className,
		...props
	},
	_ref,
) {
	const [focused, setFocused] = useState(false);
	const innerRef = useRef<HTMLTextAreaElement | null>(null);

	// Auto-grow the textarea between min/max rows as content changes.
	const resize = useCallback(() => {
		const el = innerRef.current;
		if (!el) return;
		el.style.height = "auto";
		const lineHeight = 24;
		const min = minRows * lineHeight;
		const max = maxRows * lineHeight;
		const next = Math.min(Math.max(el.scrollHeight, min), max);
		el.style.height = `${next}px`;
	}, [minRows, maxRows]);

	useEffect(() => {
		resize();
	}, [value, resize]);

	const handleSubmit = useCallback(() => {
		if (disabled || loading) return;
		if (canSubmit === false) return;
		if (value.trim().length < 3) return;
		onSubmit?.();
	}, [canSubmit, disabled, loading, onSubmit, value]);

	const handleKey = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit],
	);

	const submitEnabled =
		!disabled && !loading && value.trim().length >= 3 && canSubmit !== false;
	const charCount = value.length;
	const nearLimit = charCount > maxLength * 0.85;

	return (
		<div
			className={cn(
				"group relative w-full rounded-2xl border bg-gradient-surface shadow-card transition-all duration-200",
				focused
					? "border-accent/60 shadow-accent-sm ring-4 ring-accent/15"
					: "border-border hover:border-border-strong",
				className,
			)}
		>
			{/* Subtle top tag — signals this is an AI input */}
			<div className="flex items-center justify-between px-5 pt-4">
				<span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
					<Sparkles className="h-3 w-3" strokeWidth={2.5} />
					{label}
				</span>
				<span
					className={cn(
						"text-[11px] font-medium tabular-nums transition-colors",
						nearLimit ? "text-accent" : "text-text-muted",
					)}
				>
					{charCount}/{maxLength}
				</span>
			</div>

			<textarea
				{...props}
				ref={innerRef}
				value={value}
				onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				onKeyDown={handleKey}
				placeholder={placeholder}
				disabled={disabled}
				rows={minRows}
				className={cn(
					"w-full resize-none bg-transparent px-5 pb-3 pt-3 text-[16px] leading-[1.5] text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50",
				)}
				style={{ minHeight: `${minRows * 24}px` }}
			/>

			<div className="flex items-end justify-between gap-3 px-5 pb-4">
				<p className="text-[12px] leading-snug text-text-muted">
					{hint ?? (
						<>
							Tip: be specific. Niche + angle beats generic topics.{" "}
							<span className="text-text-secondary">⌘ Enter to send</span>
						</>
					)}
				</p>
				<motion.button
					type="button"
					onClick={handleSubmit}
					disabled={!submitEnabled}
					whileHover={submitEnabled ? { scale: 1.04 } : undefined}
					whileTap={submitEnabled ? { scale: 0.95 } : undefined}
					transition={{ type: "spring", stiffness: 500, damping: 28 }}
					aria-label={submitLabel}
					className={cn(
						"relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
						submitEnabled
							? "bg-gradient-accent text-white shadow-accent-sm"
							: "bg-surface-alt text-text-muted",
					)}
				>
					{loading ? (
						<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
					) : (
						<ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
					)}
				</motion.button>
			</div>
		</div>
	);
});
