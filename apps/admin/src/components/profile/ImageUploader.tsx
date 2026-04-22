"use client";

import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import {
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { UploadKind } from "@content-assist/shared";
import { cn } from "@/lib/cn";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useToast } from "@/components/ui/Toast";
import {
	readImageDimensions,
	useUpload,
} from "@/modules/profile/useUpload";

type Props = {
	kind: Extract<UploadKind, "avatar" | "cover">;
	url: string | null;
	/** Fallback initial or letter for the empty-state avatar. */
	fallback?: string;
	/** Called after confirm success with the new presigned GET URL. */
	onUploaded: (url: string) => void;
	/** Visual shape. Avatar = circle, cover = wide rectangle. */
	shape: "circle" | "banner";
	size?: number;
	className?: string;
	disabled?: boolean;
};

function formatBytes(n: number): string {
	if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
	if (n >= 1024) return `${Math.round(n / 1024)} KB`;
	return `${n} B`;
}

/**
 * Shared base for avatar + cover uploaders.
 *
 * Flow: user picks a file → we show a confirm dialog with a preview of the
 * new image before touching the network. The actual upload kicks off only
 * on confirm, so an accidental pick is never uploaded.
 */
export function ImageUploader({
	kind,
	url,
	fallback,
	onUploaded,
	shape,
	size,
	className,
	disabled,
}: Props) {
	const { upload, status, progress } = useUpload();
	const toast = useToast();
	const inputRef = useRef<HTMLInputElement>(null);

	const [pending, setPending] = useState<File | null>(null);
	const [pendingUrl, setPendingUrl] = useState<string | null>(null);

	const isUploading = status === "presigning" || status === "uploading" || status === "confirming";
	const radius = shape === "circle" ? "rounded-full" : "rounded-2xl";
	const aspect = shape === "banner" ? "aspect-[3/1]" : "";
	const dimensionStyle = useMemo(
		() => (size ? { width: size, height: size } : undefined),
		[size],
	);

	// Revoke the object URL when the confirm dialog closes.
	useEffect(() => {
		return () => {
			if (pendingUrl) URL.revokeObjectURL(pendingUrl);
		};
	}, [pendingUrl]);

	function stageFile(file: File) {
		if (pendingUrl) URL.revokeObjectURL(pendingUrl);
		setPending(file);
		setPendingUrl(URL.createObjectURL(file));
	}

	function clearPending() {
		if (pendingUrl) URL.revokeObjectURL(pendingUrl);
		setPending(null);
		setPendingUrl(null);
	}

	async function confirmUpload() {
		if (!pending) return;
		const file = pending;
		try {
			const dims = await readImageDimensions(file).catch(() => null);
			const result = await upload(kind, file, dims ?? undefined);
			if ("url" in result) {
				onUploaded(result.url);
				toast.success(
					kind === "avatar" ? "Avatar updated" : "Cover updated",
				);
			}
			clearPending();
		} catch (err) {
			toast.error(
				kind === "avatar" ? "Avatar upload failed" : "Cover upload failed",
				err instanceof Error ? err.message : undefined,
			);
			// Leave the dialog open on failure so the user can retry / cancel.
		}
	}

	return (
		<>
			<button
				type="button"
				disabled={disabled || isUploading}
				onClick={() => inputRef.current?.click()}
				style={dimensionStyle}
				className={cn(
					"group relative overflow-hidden bg-surface-alt text-text-primary transition-all",
					radius,
					aspect,
					shape === "banner" && "w-full border border-border",
					!disabled && "hover:brightness-105",
					isUploading && "cursor-progress",
					className,
				)}
			>
				<input
					ref={inputRef}
					type="file"
					accept="image/jpeg,image/png,image/webp"
					className="sr-only"
					onChange={(e) => {
						const f = e.currentTarget.files?.[0];
						e.currentTarget.value = "";
						if (f) stageFile(f);
					}}
				/>

				{url ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={url}
						alt=""
						className="absolute inset-0 h-full w-full object-cover"
					/>
				) : (
					<div
						className={cn(
							"absolute inset-0 flex items-center justify-center",
							shape === "circle"
								? "bg-gradient-accent text-white"
								: "bg-gradient-to-br from-accent/20 via-surface-alt to-bg text-text-muted",
						)}
					>
						{shape === "circle" ? (
							<span
								className="font-bold"
								style={{ fontSize: size ? size * 0.4 : 48 }}
							>
								{fallback?.charAt(0).toUpperCase() ?? "?"}
							</span>
						) : (
							<span className="text-[12px] font-semibold uppercase tracking-[0.2em]">
								Upload a cover
							</span>
						)}
					</div>
				)}

				<motion.div
					initial={false}
					animate={{ opacity: isUploading ? 1 : undefined }}
					className={cn(
						"absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity duration-200",
						!disabled && "group-hover:opacity-100",
						isUploading && "opacity-100",
					)}
				>
					{isUploading ? (
						<div className="relative flex items-center justify-center text-white">
							<ProgressRing
								progress={progress}
								size={shape === "circle" ? Math.min(size ?? 128, 96) : 72}
								strokeWidth={4}
								className="text-white"
								indeterminate
							/>
							<span className="absolute text-[11px] font-bold tabular-nums">
								{progress > 0 ? `${progress}%` : "…"}
							</span>
						</div>
					) : (
						<span className="flex flex-col items-center gap-1.5 text-white">
							<Camera className="h-5 w-5" strokeWidth={2} />
							<span className="text-[11px] font-semibold uppercase tracking-[0.2em]">
								{shape === "circle" ? "Change photo" : "Change cover"}
							</span>
						</span>
					)}
				</motion.div>
			</button>

			<ConfirmDialog
				open={!!pending}
				onClose={clearPending}
				onConfirm={confirmUpload}
				busy={isUploading}
				title={
					kind === "avatar"
						? "Use this as your profile photo?"
						: "Use this as your cover?"
				}
				description={
					pending
						? `${pending.name} · ${formatBytes(pending.size)}`
						: undefined
				}
				confirmLabel={isUploading ? "Uploading…" : "Upload"}
			>
				{pendingUrl ? (
					<div
						className={cn(
							"relative overflow-hidden border border-border bg-bg",
							shape === "circle"
								? "mx-auto aspect-square w-40 rounded-full"
								: "aspect-[3/1] w-full rounded-xl",
						)}
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={pendingUrl}
							alt="Selected preview"
							className="absolute inset-0 h-full w-full object-cover"
						/>
					</div>
				) : null}
			</ConfirmDialog>
		</>
	);
}
