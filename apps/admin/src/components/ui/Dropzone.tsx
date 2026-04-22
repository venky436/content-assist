"use client";

import { motion } from "framer-motion";
import { UploadCloud, type LucideIcon } from "lucide-react";
import {
	useRef,
	useState,
	type DragEvent,
	type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type Props = {
	/** MIME or extensions. e.g. "image/*", ".mp3,audio/*". */
	accept?: string;
	multiple?: boolean;
	disabled?: boolean;
	/** Called with the first / all files, depending on `multiple`. */
	onFiles: (files: File[]) => void;
	title?: string;
	hint?: string;
	icon?: LucideIcon;
	className?: string;
	/** Render custom content inside instead of the default title/hint/icon. */
	children?: ReactNode;
};

/**
 * Generic drag-and-drop surface. Reused for avatar/cover/audio/image uploaders.
 * Active state (drag-over) lights up accent. Click anywhere opens the file picker.
 */
export function Dropzone({
	accept,
	multiple = false,
	disabled,
	onFiles,
	title = "Drop a file here, or click to browse",
	hint,
	icon: Icon = UploadCloud,
	className,
	children,
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [active, setActive] = useState(false);

	function emit(list: FileList | null | undefined) {
		if (!list || list.length === 0) return;
		onFiles(Array.from(list));
	}

	function onDragEnter(e: DragEvent<HTMLLabelElement>) {
		e.preventDefault();
		if (disabled) return;
		setActive(true);
	}
	function onDragLeave(e: DragEvent<HTMLLabelElement>) {
		e.preventDefault();
		if (e.currentTarget === e.target) setActive(false);
	}
	function onDrop(e: DragEvent<HTMLLabelElement>) {
		e.preventDefault();
		setActive(false);
		if (disabled) return;
		emit(e.dataTransfer?.files);
	}

	return (
		<label
			onDragEnter={onDragEnter}
			onDragOver={(e) => e.preventDefault()}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
			className={cn(
				"group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all",
				active
					? "border-accent bg-accent-soft/40"
					: "border-border/70 bg-surface-alt/40 hover:border-border-strong hover:bg-surface-alt",
				disabled && "cursor-not-allowed opacity-60",
				className,
			)}
		>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				multiple={multiple}
				disabled={disabled}
				onChange={(e) => {
					emit(e.currentTarget.files);
					// Reset so picking the same file twice still fires onChange.
					e.currentTarget.value = "";
				}}
				className="sr-only"
			/>
			{children ?? (
				<>
					<motion.span
						animate={active ? { y: -2, scale: 1.05 } : { y: 0, scale: 1 }}
						transition={{ type: "spring", stiffness: 400, damping: 26 }}
						className={cn(
							"flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
							active
								? "bg-accent text-white"
								: "bg-surface-pressed text-text-muted group-hover:text-accent",
						)}
					>
						<Icon className="h-5 w-5" strokeWidth={2} />
					</motion.span>
					<div className="flex flex-col gap-1">
						<p className="text-[14px] font-semibold text-text-primary">{title}</p>
						{hint ? (
							<p className="text-[12px] leading-relaxed text-text-muted">{hint}</p>
						) : null}
					</div>
				</>
			)}
		</label>
	);
}
