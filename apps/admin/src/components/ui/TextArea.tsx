"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	forwardRef,
	type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
	label: string;
	error?: string | null;
	hint?: string;
	/** Enforce + surface a character counter. */
	maxLength?: number;
	className?: string;
};

/**
 * Multi-line editorial input — same underline + accent-focus language as
 * AuthInput. Resizable vertically. Character counter appears when maxLength
 * is set, shifting color as the user approaches the cap.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, Props>(function TextArea(
	{ label, error, hint, maxLength, id, value, className, ...rest },
	ref,
) {
	const fieldId = id ?? `textarea-${label.replace(/\s+/g, "-").toLowerCase()}`;
	const errored = Boolean(error);
	const count = typeof value === "string" ? value.length : 0;
	const nearLimit = maxLength ? count / maxLength >= 0.8 : false;
	const atLimit = maxLength ? count >= maxLength : false;

	return (
		<div className={cn("group/field flex flex-col gap-2", className)}>
			<div className="flex items-end justify-between gap-2">
				<label
					htmlFor={fieldId}
					className={cn(
						"select-none text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
						errored
							? "text-danger"
							: "text-text-muted group-focus-within/field:text-accent",
					)}
				>
					{label}
				</label>
				{maxLength ? (
					<span
						className={cn(
							"text-[11px] font-medium tabular-nums transition-colors",
							atLimit
								? "text-danger"
								: nearLimit
									? "text-accent"
									: "text-text-muted",
						)}
					>
						{count} / {maxLength}
					</span>
				) : null}
			</div>
			<div
				className={cn(
					"relative border-b transition-colors",
					errored
						? "border-danger"
						: "border-border/70 group-focus-within/field:border-accent",
				)}
			>
				<textarea
					{...rest}
					ref={ref}
					id={fieldId}
					value={value}
					maxLength={maxLength}
					rows={rest.rows ?? 3}
					className="w-full resize-y bg-transparent py-2 text-[16px] font-medium leading-relaxed text-text-primary placeholder:text-text-muted/60 focus:outline-none disabled:opacity-50"
				/>
				<span
					aria-hidden
					className={cn(
						"pointer-events-none absolute inset-x-0 -bottom-px h-px opacity-0 transition-opacity",
						errored
							? "bg-gradient-to-r from-transparent via-danger/60 to-transparent opacity-100"
							: "bg-gradient-to-r from-transparent via-accent/70 to-transparent group-focus-within/field:opacity-100",
					)}
				/>
			</div>
			<AnimatePresence initial={false}>
				{error ? (
					<motion.p
						key="err"
						initial={{ opacity: 0, y: -2, height: 0 }}
						animate={{ opacity: 1, y: 0, height: "auto" }}
						exit={{ opacity: 0, y: -2, height: 0 }}
						transition={{ duration: 0.18 }}
						className="text-[12px] font-medium leading-tight text-danger"
					>
						{error}
					</motion.p>
				) : hint ? (
					<p className="text-[11px] leading-tight text-text-muted">{hint}</p>
				) : null}
			</AnimatePresence>
		</div>
	);
});
