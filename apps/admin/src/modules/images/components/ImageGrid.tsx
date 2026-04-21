"use client";

import type { GeneratedImage, SceneType } from "@content-assist/shared";
import { cn } from "@/lib/cn";
import { ImageTile } from "./ImageTile";

type Props = {
	images: GeneratedImage[];
	selectedUrls?: Set<string>;
	readOnly?: boolean;
	onToggle?: (url: string) => void;
	onRegenerate?: (sceneType: SceneType) => void;
	regeneratingSceneType?: SceneType;
};

export function ImageGrid({
	images,
	selectedUrls,
	readOnly,
	onToggle,
	onRegenerate,
	regeneratingSceneType,
}: Props) {
	if (images.length === 0) return null;
	return (
		<div
			className={cn(
				"grid gap-4",
				images.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3",
			)}
		>
			{images.map((image) => {
				const tileRegenerating = Boolean(
					regeneratingSceneType &&
						image.sceneType &&
						image.sceneType === regeneratingSceneType,
				);
				return (
					<ImageTile
						key={image.url}
						image={image}
						selected={selectedUrls?.has(image.url) ?? false}
						readOnly={readOnly}
						onToggle={onToggle ? () => onToggle(image.url) : undefined}
						onRegenerate={
							onRegenerate && image.sceneType
								? () => onRegenerate(image.sceneType as SceneType)
								: undefined
						}
						regenerating={tileRegenerating}
					/>
				);
			})}
		</div>
	);
}
