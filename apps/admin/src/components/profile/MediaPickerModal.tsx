"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Check, ImageIcon, Music, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MediaAsset, MediaKind } from "@content-assist/shared";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMediaList } from "@/modules/profile/hooks";
import { cn } from "@/lib/cn";

type Props = {
	open: boolean;
	onClose: () => void;
	kind: MediaKind;
	multi?: boolean;
	/** Called with the picked assets when the user confirms. */
	onPick: (items: MediaAsset[]) => void;
	title?: string;
	/** Assets whose ids are in this set start as already-selected (used for
	 *  single-pick "current audio" highlight). */
	initialSelectedIds?: ReadonlyArray<string>;
};

/**
 * Reusable media-library picker. Wraps the existing `useMediaList` hook +
 * renders a grid of asset tiles. Multi or single select. Empty-state nudges
 * the user to upload something via the Profile page.
 *
 * Kept separate from ConfirmDialog so the modal can be scrollable + wider
 * than the confirmation modal without polluting its single-purpose styling.
 */
export function MediaPickerModal({
	open,
	onClose,
	kind,
	multi = false,
	onPick,
	title,
	initialSelectedIds,
}: Props) {
	const { data, isLoading } = useMediaList({ kind, limit: 60 });
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		() => new Set(initialSelectedIds ?? []),
	);

	// Reset selection every time the modal opens so stale picks don't linger.
	useEffect(() => {
		if (open) setSelectedIds(new Set(initialSelectedIds ?? []));
	}, [open, initialSelectedIds]);

	// Lock body + ESC handler.
	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = prev;
			window.removeEventListener("keydown", onKey);
		};
	}, [open, onClose]);

	const toggle = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (multi) {
				if (next.has(id)) next.delete(id);
				else next.add(id);
			} else {
				next.clear();
				next.add(id);
			}
			return next;
		});
	};

	const confirm = () => {
		const items = (data?.items ?? []).filter((a) => selectedIds.has(a.id));
		if (items.length === 0) return;
		onPick(items);
		onClose();
	};

	const heading = useMemo(
		() => title ?? (kind === "image" ? "Pick from library" : "Pick a track"),
		[title, kind],
	);
	const emptyIcon = kind === "image" ? ImageIcon : Music;
	const emptyCopy =
		kind === "image"
			? "No images yet. Upload a few from your Profile → Media Library."
			: "No audio yet. Upload a track from your Profile → Media Library.";

	return (
		<AnimatePresence>
			{open ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<motion.div
						key="scrim"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
						className="absolute inset-0 bg-black/70 backdrop-blur-sm"
						onClick={onClose}
					/>
					<motion.div
						key="card"
						initial={{ opacity: 0, scale: 0.97, y: 8 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.97, y: 4 }}
						transition={{ type: "spring", stiffness: 420, damping: 30 }}
						role="dialog"
						aria-modal="true"
						aria-label={heading}
						className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
					>
						<div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
							<div className="flex flex-col gap-0.5">
								<h2 className="text-[18px] font-bold tracking-tight text-text-primary">
									{heading}
								</h2>
								<p className="text-[12px] text-text-muted">
									{multi
										? "Select one or more — they'll attach to the post."
										: "Select one track to use as background music."}
								</p>
							</div>
							<button
								type="button"
								onClick={onClose}
								aria-label="Close"
								className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-alt hover:text-text-primary"
							>
								<X className="h-4 w-4" strokeWidth={2.25} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto px-6 py-5">
							{isLoading ? (
								<div
									className={cn(
										"grid gap-3",
										kind === "image"
											? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
											: "grid-cols-1 sm:grid-cols-2",
									)}
								>
									{Array.from({ length: 6 }).map((_, i) => (
										<Skeleton
											key={i}
											className={cn(
												"rounded-xl",
												kind === "image" ? "aspect-[4/5]" : "h-24",
											)}
										/>
									))}
								</div>
							) : !data || data.items.length === 0 ? (
								<div className="flex flex-col items-center gap-3 py-12 text-center">
									<span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft">
										{(() => {
											const Icon = emptyIcon;
											return <Icon className="h-5 w-5 text-accent" />;
										})()}
									</span>
									<p className="max-w-xs text-[13px] text-text-secondary">
										{emptyCopy}
									</p>
									<Link href="/profile">
										<Button variant="secondary" size="sm">
											Go to Media Library
										</Button>
									</Link>
								</div>
							) : (
								<div
									className={cn(
										"grid gap-3",
										kind === "image"
											? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
											: "grid-cols-1 sm:grid-cols-2",
									)}
								>
									{data.items.map((asset) => {
										const selected = selectedIds.has(asset.id);
										return (
											<button
												key={asset.id}
												type="button"
												onClick={() => toggle(asset.id)}
												className={cn(
													"group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all",
													selected
														? "border-accent bg-accent/5 shadow-accent-sm"
														: "border-border bg-surface-alt hover:border-border-strong",
												)}
											>
												{kind === "image" ? (
													<div className="aspect-[4/5] w-full overflow-hidden bg-bg">
														{/* eslint-disable-next-line @next/next/no-img-element */}
														<img
															src={asset.url}
															alt={asset.name}
															className={cn(
																"h-full w-full object-cover transition-transform",
																selected ? "scale-[1.02]" : "group-hover:scale-[1.02]",
															)}
															loading="lazy"
														/>
													</div>
												) : (
													<div className="flex h-20 items-center gap-3 bg-gradient-to-br from-accent/10 via-surface-alt to-bg px-4">
														<Music
															className={cn(
																"h-5 w-5",
																selected ? "text-accent" : "text-text-secondary",
															)}
														/>
														<div className="flex min-w-0 flex-1 flex-col">
															<span className="truncate text-[13px] font-semibold text-text-primary">
																{asset.name}
															</span>
															{asset.metadata.durationSec ? (
																<span className="text-[11px] text-text-muted">
																	{formatDuration(asset.metadata.durationSec)}
																</span>
															) : null}
														</div>
													</div>
												)}
												<div className="flex items-center justify-between gap-2 px-3 py-2">
													<span className="truncate text-[12px] font-medium text-text-secondary">
														{kind === "image" ? asset.name : asset.mime}
													</span>
													{selected ? (
														<span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-accent text-white">
															<Check className="h-3 w-3" strokeWidth={3} />
														</span>
													) : null}
												</div>
											</button>
										);
									})}
								</div>
							)}
						</div>

						<div className="flex items-center justify-between gap-2 border-t border-border bg-surface-alt/40 px-6 py-3">
							<span className="text-[12px] text-text-muted">
								{selectedIds.size > 0
									? `${selectedIds.size} selected`
									: multi
										? "Select at least one"
										: "Pick one track"}
							</span>
							<div className="flex gap-2">
								<Button type="button" variant="ghost" onClick={onClose}>
									Cancel
								</Button>
								<Button
									type="button"
									onClick={confirm}
									disabled={selectedIds.size === 0}
								>
									{multi ? "Add to post" : "Use this track"}
								</Button>
							</div>
						</div>
					</motion.div>
				</div>
			) : null}
		</AnimatePresence>
	);
}

function formatDuration(sec: number): string {
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}
