import { StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { GeneratedImage, SceneType } from "@content-assist/shared";
import { spacing } from "@mobile/constants/theme";
import { ImageTile } from "./ImageTile";

type Props = {
	images: GeneratedImage[];
	selectedUrls?: Set<string>;
	onToggle?: (url: string) => void;
	onPreview?: (index: number) => void;
	/** Per-image regenerate. Invoked with the tile's sceneType when present. */
	onRegenerate?: (sceneType: SceneType) => void;
	/** When true, dim + disable the regenerate button on every tile. */
	regenerating?: boolean;
	/** Optional: only dim the tile whose scene is currently regenerating. */
	regeneratingSceneType?: SceneType;
	readOnly?: boolean;
};

export function ImageGrid({
	images,
	selectedUrls,
	onToggle,
	onPreview,
	onRegenerate,
	regenerating = false,
	regeneratingSceneType,
	readOnly = false,
}: Props) {
	if (images.length === 0) return null;
	return (
		<Animated.View
			entering={FadeInDown.springify().damping(18).mass(0.6)}
			style={styles.grid}
		>
			{images.map((img, i) => {
				const tileRegenerating = regeneratingSceneType
					? img.sceneType === regeneratingSceneType
					: regenerating;
				return (
					<ImageTile
						key={img.url}
						url={img.url}
						generatedAt={img.generatedAt}
						sceneType={img.sceneType}
						label={img.label}
						legacyType={img.type}
						selected={selectedUrls?.has(img.url) ?? false}
						onToggle={onToggle ? () => onToggle(img.url) : undefined}
						onPreview={onPreview ? () => onPreview(i) : undefined}
						onRegenerate={
							onRegenerate && img.sceneType
								? () => onRegenerate(img.sceneType as SceneType)
								: undefined
						}
						regenerating={tileRegenerating}
						readOnly={readOnly}
					/>
				);
			})}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	grid: {
		flexDirection: "row",
		gap: spacing.md,
	},
});
