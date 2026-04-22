"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

/**
 * App-wide toast system. Lightweight (no extra dep), framer-motion powered,
 * dark-themed to match the rest of the app.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success("Uploaded");
 *   toast.error("Couldn't save", "Try again in a moment");
 *   toast.show({ kind: "info", title: "…", action: { label: "Undo", onClick } });
 */

export type ToastKind = "success" | "error" | "info";

export type ToastAction = {
	label: string;
	onClick: () => void;
};

export type ToastInput = {
	kind?: ToastKind;
	title: string;
	description?: string;
	/** ms — set to 0 for persistent. Default 3500. */
	duration?: number;
	action?: ToastAction;
};

type ToastItem = ToastInput & { id: string };

type Ctx = {
	show: (t: ToastInput) => string;
	success: (title: string, description?: string) => string;
	error: (title: string, description?: string) => string;
	info: (title: string, description?: string) => string;
	dismiss: (id: string) => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<ToastItem[]>([]);
	const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

	const dismiss = useCallback((id: string) => {
		setItems((xs) => xs.filter((x) => x.id !== id));
		const t = timers.current.get(id);
		if (t) {
			clearTimeout(t);
			timers.current.delete(id);
		}
	}, []);

	const show = useCallback(
		(input: ToastInput) => {
			const id = Math.random().toString(36).slice(2, 10);
			const item: ToastItem = { kind: "info", duration: 3500, ...input, id };
			setItems((xs) => [...xs, item]);
			if (item.duration && item.duration > 0) {
				timers.current.set(
					id,
					setTimeout(() => dismiss(id), item.duration),
				);
			}
			return id;
		},
		[dismiss],
	);

	const api = useMemo<Ctx>(
		() => ({
			show,
			dismiss,
			success: (title, description) => show({ kind: "success", title, description }),
			error: (title, description) =>
				show({ kind: "error", title, description, duration: 5000 }),
			info: (title, description) => show({ kind: "info", title, description }),
		}),
		[show, dismiss],
	);

	return (
		<ToastContext.Provider value={api}>
			{children}
			<div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-6 sm:inset-x-auto sm:right-6 sm:items-end">
				<AnimatePresence initial={false}>
					{items.map((t) => (
						<ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
					))}
				</AnimatePresence>
			</div>
		</ToastContext.Provider>
	);
}

export function useToast(): Ctx {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
	return ctx;
}

const KIND_STYLES: Record<ToastKind, { ring: string; icon: typeof Info }> = {
	success: { ring: "border-success/50", icon: CheckCircle2 },
	error: { ring: "border-danger/50", icon: AlertCircle },
	info: { ring: "border-border-strong", icon: Info },
};

const ICON_COLOR: Record<ToastKind, string> = {
	success: "text-success",
	error: "text-danger",
	info: "text-accent",
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
	const kind = toast.kind ?? "info";
	const { ring, icon: Icon } = KIND_STYLES[kind];

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 12, scale: 0.96 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: -4, scale: 0.96, transition: { duration: 0.18 } }}
			transition={{ type: "spring", stiffness: 420, damping: 28 }}
			className={cn(
				"pointer-events-auto flex w-[340px] max-w-[92vw] items-start gap-3 rounded-xl border bg-surface-alt/95 px-4 py-3 shadow-card backdrop-blur",
				ring,
			)}
		>
			<Icon
				className={cn("mt-0.5 h-4.5 w-4.5 shrink-0", ICON_COLOR[kind])}
				strokeWidth={2.25}
			/>
			<div className="flex flex-1 flex-col gap-1 leading-tight">
				<p className="text-[13px] font-semibold text-text-primary">{toast.title}</p>
				{toast.description ? (
					<p className="text-[12px] leading-relaxed text-text-secondary">
						{toast.description}
					</p>
				) : null}
				{toast.action ? (
					<button
						type="button"
						onClick={() => {
							toast.action?.onClick();
							onDismiss();
						}}
						className="mt-1 self-start text-[12px] font-semibold text-accent transition-opacity hover:opacity-80"
					>
						{toast.action.label}
					</button>
				) : null}
			</div>
			<button
				type="button"
				onClick={onDismiss}
				className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-pressed hover:text-text-primary"
				aria-label="Dismiss"
			>
				<X className="h-3.5 w-3.5" strokeWidth={2.25} />
			</button>
		</motion.div>
	);
}
