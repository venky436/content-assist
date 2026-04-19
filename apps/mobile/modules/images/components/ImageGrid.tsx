import { StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { GeneratedImage } from "@content-assist/shared";
import { spacing } from "@mobile/constants/theme";
import { ImageTile } from "./ImageTile";

type Props = {
	images: GeneratedImage[];
	selectedUrls?: Set<string>;
	onToggle?: (url: string) => void;
	onPreview?: (index: number) => void;
	readOnly?: boolean;
};

export function ImageGrid({
	images,
	selectedUrls,
	onToggle,
	onPreview,
	readOnly = false,
}: Props) {
	if (images.length === 0) return null;
	return (
		<Animated.View
			entering={FadeInDown.springify().damping(18).mass(0.6)}
			style={styles.grid}
		>
			{images.map((img, i) => (
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
					readOnly={readOnly}
				/>
			))}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	grid: {
		flexDirection: "row",
		gap: spacing.md,
	},
});
