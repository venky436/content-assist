"use client";

import {
	AudioWaveform,
	ImagePlus,
	Music,
	UploadCloud,
} from "lucide-react";
import { useState } from "react";
import type { MediaAsset, UploadKind } from "@content-assist/shared";
import { Dropzone } from "@/components/ui/Dropzone";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
	useDeleteMedia,
	useMediaList,
	useUpdateMedia,
} from "@/modules/profile/hooks";
import {
	readAudioDuration,
	readImageDimensions,
	useUpload,
} from "@/modules/profile/useUpload";
import { MediaCard } from "./MediaCard";

type Kind = "audio" | "image";

type Props = { kind: Kind };

const CONFIG: Record<
	Kind,
	{
		uploadKind: Extract<UploadKind, "audio" | "image">;
		accept: string;
		dropTitle: string;
		dropHint: string;
		emptyTitle: string;
		emptyCopy: string;
	}
> = {
	audio: {
		uploadKind: "audio",
		accept: "audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/aac,.mp3,.wav,.m4a,.aac",
		dropTitle: "Drop tracks, or click to browse",
		dropHint: "MP3, WAV, M4A — up to 20 MB each",
		emptyTitle: "No tracks yet",
		emptyCopy:
			"Upload your own music. We'll let you pick from this library inside the video composer.",
	},
	image: {
		uploadKind: "image",
		accept: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
		dropTitle: "Drop images, or click to browse",
		dropHint: "JPG, PNG, WebP — up to 8 MB each",
		emptyTitle: "No images yet",
		emptyCopy:
			"Upload b-roll, brand shots, product images — anything you might drop into a video.",
	},
};

export function MediaLibrary({ kind }: Props) {
	const cfg = CONFIG[kind];
	const list = useMediaList({ kind });
	const del = useDeleteMedia();
	const update = useUpdateMedia();
	const toast = useToast();
	const { upload } = useUpload();
	const [uploading, setUploading] = useState<number>(0);

	async function handleFiles(files: File[]) {
		setUploading((n) => n + files.length);
		for (const file of files) {
			try {
				let extras: { durationSec?: number; width?: number; height?: number } = {};
				if (kind === "image") {
					const dims = await readImageDimensions(file).catch(() => null);
					if (dims) extras = { ...extras, ...dims };
				} else {
					const duration = await readAudioDuration(file).catch(() => null);
					if (duration) extras.durationSec = duration;
				}
				await upload(cfg.uploadKind, file, extras);
				toast.success(`Uploaded "${file.name}"`);
			} catch (err) {
				toast.error(
					`Couldn't upload "${file.name}"`,
					err instanceof Error ? err.message : undefined,
				);
			} finally {
				setUploading((n) => n - 1);
			}
		}
		list.refetch();
	}

	function handleDelete(asset: MediaAsset) {
		del.mutate(
			{ id: asset.id, kind },
			{
				onSuccess: () => {
					toast.success(`Deleted "${asset.name}"`);
				},
				onError: (err) => {
					toast.error("Delete failed", err.message);
				},
			},
		);
	}

	function handleRename(asset: MediaAsset, name: string) {
		update.mutate(
			{ id: asset.id, kind, patch: { name } },
			{
				onError: (err) => toast.error("Rename failed", err.message),
			},
		);
	}

	const items = list.data?.items ?? [];
	const isLoading = list.isLoading;
	const isEmpty = !isLoading && items.length === 0 && uploading === 0;

	return (
		<div className="flex flex-col gap-4">
			<Dropzone
				accept={cfg.accept}
				multiple
				onFiles={handleFiles}
				title={cfg.dropTitle}
				hint={cfg.dropHint}
				icon={kind === "audio" ? Music : UploadCloud}
			/>

			{isLoading ? (
				<div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
					<Skeleton className="h-48 rounded-2xl" />
					<Skeleton className="h-48 rounded-2xl" />
					<Skeleton className="h-48 rounded-2xl" />
				</div>
			) : isEmpty ? (
				<EmptyState
					icon={kind === "audio" ? AudioWaveform : ImagePlus}
					title={cfg.emptyTitle}
					description={cfg.emptyCopy}
				/>
			) : (
				<div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
					{items.map((asset) => (
						<MediaCard
							key={asset.id}
							asset={asset}
							onDelete={handleDelete}
							onRename={handleRename}
						/>
					))}
				</div>
			)}
		</div>
	);
}
