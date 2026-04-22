"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import {
	forwardRef,
	useState,
	type InputHTMLAttributes,
	type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
	label: string;
	icon?: LucideIcon;
	error?: string | null;
	hint?: ReactNode;
	togglePassword?: boolean;
	className?: string;
};

/**
 * Editorial auth input.
 *
 * Label sits above a transparent input with a thin underline. On focus, the
 * underline grows to 2px accent and a hairline of accent glow fades in
 * underneath. Error state recolours the underline + label without shifting
 * layout.
 */
export const AuthInput = forwardRef<HTMLInputElement, Props>(function AuthInput(
	{
		label,
		icon: Icon,
		error,
		hint,
		togglePassword,
		type: typeProp = "text",
		id,
		className,
		...inputProps
	},
	ref,
) {
	const [revealed, setRevealed] = useState(false);
	const effectiveType = togglePassword && revealed ? "text" : typeProp;
	const fieldId = id ?? `auth-input-${label.replace(/\s+/g, "-").toLowerCase()}`;
	const errored = Boolean(error);

	return (
		<div className={cn("group/field flex flex-col gap-2", className)}>
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
			<div
				className={cn(
					"relative flex items-center gap-3 border-b transition-colors",
					errored
						? "border-danger"
						: "border-border/70 group-focus-within/field:border-accent",
				)}
			>
				{Icon ? (
					<Icon
						className={cn(
							"h-[18px] w-[18px] shrink-0 transition-colors",
							errored
								? "text-danger"
								: "text-text-muted group-focus-within/field:text-accent",
						)}
						strokeWidth={2}
					/>
				) : null}
				<input
					{...inputProps}
					ref={ref}
					id={fieldId}
					type={effectiveType}
					className={cn(
						"peer h-12 flex-1 bg-transparent text-[16px] font-medium text-text-primary placeholder:text-text-muted/60 focus:outline-none disabled:opacity-50",
					)}
				/>
				{togglePassword ? (
					<button
						type="button"
						onClick={() => setRevealed((v) => !v)}
						aria-label={revealed ? "Hide password" : "Show password"}
						tabIndex={-1}
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-alt hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
					>
						<AnimatePresence mode="wait" initial={false}>
							{revealed ? (
								<motion.span
									key="on"
									initial={{ opacity: 0, y: 4 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -4 }}
									transition={{ duration: 0.15 }}
								>
									<EyeOff className="h-[18px] w-[18px]" strokeWidth={2} />
								</motion.span>
							) : (
								<motion.span
									key="off"
									initial={{ opacity: 0, y: 4 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -4 }}
									transition={{ duration: 0.15 }}
								>
									<Eye className="h-[18px] w-[18px]" strokeWidth={2} />
								</motion.span>
							)}
						</AnimatePresence>
					</button>
				) : null}
				{/* Accent glow beneath the underline on focus — hairline, fades in */}
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
