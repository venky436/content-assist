import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import type { SceneType } from "@content-assist/shared";
import { colors, font, radius, shadow, spacing, timings } from "@mobile/constants/theme";
import { haptics } from "@mobile/lib/haptics";
import { downloadImageToGallery } from "@mobile/modules/images/download";
import { formatRelative } from "@mobile/modules/saved/format";

type Props = {
	url: string;
	generatedAt: number;
	sceneType?: SceneType;
	label?: string;
	/** legacy — when `label` isn't present (old saved posts), fall back to this */
	legacyType?: string;
	selected: boolean;
	onToggle?: () => void;
	onPreview?: () => void;
	onRegenerate?: () => void;
	regenerating?: boolean;
	readOnly?: boolean;
};

const SCENE_COLORS: Record<SceneType, { bg: string; fg: string }> = {
	struggle: { bg: "rgba(239,68,68,0.14)", fg: "#EF4444" },
	decision: { bg: "rgba(245,158,11,0.14)", fg: "#F59E0B" },
	result: { bg: "rgba(34,197,94,0.14)", fg: "#22C55E" },
};
const FALLBACK_COLOR = { bg: "rgba(255,61,127,0.14)", fg: "#FF3D7F" };

export function ImageTile({
	url,
	generatedAt,
	sceneType,
	label,
	legacyType,
	selected,
	onToggle,
	onPreview,
	onRegenerate,
	regenerating = false,
	readOnly = false,
}: Props) {
	const [imageError, setImageError] = useState(false);
	const [downloadState, setDownloadState] = useState<
		"idle" | "downloading" | "saved" | "error"
	>("idle");

	const scale = useSharedValue(1);
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	// Shimmer animation driver for the regenerating skeleton state.
	const shimmer = useSharedValue(0.35);
	useEffect(() => {
		if (regenerating) {
			shimmer.value = withRepeat(
				withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }),
				-1,
				true,
			);
		} else {
			shimmer.value = withTiming(0.35, { duration: 200 });
		}
	}, [regenerating, shimmer]);
	const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

	const handlePressIn = useCallback(() => {
		scale.value = withTiming(0.97, { duration: timings.fast });
	}, [scale]);
	const handlePressOut = useCallback(() => {
		scale.value = withTiming(1, { duration: timings.fast });
	}, [scale]);
	const handlePress = useCallback(() => {
		if (imageError) return;
		haptics.selection();
		onPreview?.();
	}, [imageError, onPreview]);
	const handleToggle = useCallback(() => {
		if (readOnly || !onToggle) return;
		haptics.selection();
		onToggle();
	}, [onToggle, readOnly]);

	const handleRegenerate = useCallback(() => {
		if (!onRegenerate || regenerating) return;
		haptics.tapMedium();
		onRegenerate();
	}, [onRegenerate, regenerating]);

	const handleDownload = useCallback(async () => {
		if (downloadState !== "idle") return;
		setDownloadState("downloading");
		haptics.tapLight();
		const result = await downloadImageToGallery(url);
		if (result.ok) {
			haptics.success();
			setDownloadState("saved");
			setTimeout(() => setDownloadState("idle"), 1800);
		} else {
			haptics.error();
			setDownloadState("error");
			setTimeout(() => setDownloadState("idle"), 1800);
		}
	}, [downloadState, url]);

	const sceneStyle = (sceneType && SCENE_COLORS[sceneType]) || FALLBACK_COLOR;
	const displayLabel = label ?? legacyType;
	const showCheckbox = !readOnly && Boolean(onToggle);

	return (
		<Animated.View style={[styles.wrap, animatedStyle]}>
			<Pressable
				onPress={handlePress}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				accessibilityRole="button"
				accessibilityLabel={imageError ? "Image unavailable" : "Preview image"}
				style={[
					styles.tile,
					selected ? [styles.tileSelected, shadow.accent] : styles.tileUnselected,
				]}
			>
				{regenerating ? (
					<Animated.View style={[styles.skeleton, shimmerStyle]}>
						<ActivityIndicator color={colors.textSecondary} size="small" />
						<Text style={styles.skeletonLabel}>Regenerating…</Text>
					</Animated.View>
				) : imageError ? (
					<View style={styles.fallback}>
						<Text style={styles.fallbackIcon}>🖼️</Text>
						<Text style={styles.fallbackTitle}>Image unavailable</Text>
						<Text style={styles.fallbackHint}>Regenerate to refresh</Text>
					</View>
				) : (
					<Image
						source={url}
						style={styles.image}
						contentFit="cover"
						transition={220}
						recyclingKey={url}
						onError={() => setImageError(true)}
					/>
				)}

				{displayLabel && !imageError && !regenerating ? (
					<View
						style={[
							styles.labelPill,
							{ backgroundColor: sceneStyle.bg, borderColor: sceneStyle.fg },
						]}
					>
						<Text
							style={[styles.labelText, { color: sceneStyle.fg }]}
							numberOfLines={1}
						>
							{displayLabel}
						</Text>
					</View>
				) : null}

				{showCheckbox && !imageError && !regenerating ? (
					<Pressable
						onPress={handleToggle}
						hitSlop={12}
						style={[
							styles.checkbox,
							selected ? styles.checkboxOn : styles.checkboxOff,
						]}
						accessibilityRole="checkbox"
						accessibilityState={{ checked: selected }}
					>
						{selected ? <Text style={styles.checkText}>✓</Text> : null}
					</Pressable>
				) : null}

				{onRegenerate ? (
					<Pressable
						onPress={handleRegenerate}
						hitSlop={10}
						disabled={regenerating}
						style={[
							styles.regenBtn,
							showCheckbox ? styles.regenBtnBelowCheckbox : styles.regenBtnTopRight,
							regenerating ? styles.regenBtnDisabled : null,
						]}
						accessibilityRole="button"
						accessibilityLabel={
							regenerating ? "Regenerating this scene" : "Regenerate this scene"
						}
						accessibilityState={{ busy: regenerating }}
					>
						{regenerating ? (
							<ActivityIndicator color="#fff" size="small" />
						) : (
							<Text style={styles.regenText}>↻</Text>
						)}
					</Pressable>
				) : null}

				{!imageError && !regenerating ? (
					<Pressable
						onPress={handleDownload}
						hitSlop={8}
						disabled={downloadState !== "idle"}
						style={[
							styles.downloadBtn,
							downloadState === "saved" ? styles.downloadBtnSaved : null,
							downloadState === "error" ? styles.downloadBtnError : null,
						]}
						accessibilityRole="button"
						accessibilityLabel="Download image"
					>
						{downloadState === "downloading" ? (
							<ActivityIndicator color="#fff" size="small" />
						) : downloadState === "saved" ? (
							<Text style={styles.downloadText}>✓</Text>
						) : downloadState === "error" ? (
							<Text style={styles.downloadText}>!</Text>
						) : (
							<Text style={styles.downloadText}>⬇</Text>
						)}
					</Pressable>
				) : null}
			</Pressable>

			<Text style={styles.timestamp}>
				{regenerating
					? "Regenerating this scene…"
					: imageError
						? "Unavailable"
						: `Updated ${formatRelative(generatedAt)}`}
			</Text>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		flex: 1,
		gap: spacing.xs,
	},
	tile: {
		aspectRatio: 1,
		borderRadius: radius.lg,
		overflow: "hidden",
		borderWidth: 2,
		position: "relative",
	},
	tileUnselected: {
		borderColor: colors.border,
	},
	tileSelected: {
		borderColor: colors.accent,
	},
	image: {
		width: "100%",
		height: "100%",
		backgroundColor: colors.surfaceAlt,
	},
	fallback: {
		width: "100%",
		height: "100%",
		backgroundColor: colors.surfaceAlt,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.md,
		gap: 4,
	},
	fallbackIcon: { fontSize: 28 },
	fallbackTitle: {
		...font.bodyStrong,
		fontSize: 12,
		color: colors.textPrimary,
	},
	fallbackHint: {
		...font.caption,
		fontSize: 11,
		color: colors.textMuted,
	},
	skeleton: {
		width: "100%",
		height: "100%",
		backgroundColor: colors.surfaceAlt,
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.sm,
	},
	skeletonLabel: {
		...font.caption,
		fontSize: 11,
		color: colors.textSecondary,
		fontWeight: "700",
		letterSpacing: 0.6,
		textTransform: "uppercase",
	},
	labelPill: {
		position: "absolute",
		bottom: spacing.sm,
		left: spacing.sm,
		maxWidth: "62%",
		paddingHorizontal: spacing.sm,
		paddingVertical: 4,
		borderRadius: radius.pill,
		borderWidth: 1,
	},
	labelText: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.3,
	},
	checkbox: {
		position: "absolute",
		top: spacing.sm,
		right: spacing.sm,
		width: 30,
		height: 30,
		borderRadius: radius.pill,
		borderWidth: 2,
		alignItems: "center",
		justifyContent: "center",
	},
	checkboxOn: {
		backgroundColor: colors.accent,
		borderColor: colors.accent,
	},
	checkboxOff: {
		backgroundColor: "rgba(0,0,0,0.35)",
		borderColor: "rgba(255,255,255,0.8)",
	},
	checkText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "800",
	},
	downloadBtn: {
		position: "absolute",
		bottom: spacing.sm,
		right: spacing.sm,
		width: 32,
		height: 32,
		borderRadius: radius.pill,
		backgroundColor: "rgba(0,0,0,0.55)",
		alignItems: "center",
		justifyContent: "center",
	},
	regenBtn: {
		position: "absolute",
		right: spacing.sm,
		width: 32,
		height: 32,
		borderRadius: radius.pill,
		backgroundColor: "rgba(0,0,0,0.55)",
		alignItems: "center",
		justifyContent: "center",
	},
	regenBtnTopRight: {
		top: spacing.sm,
	},
	regenBtnBelowCheckbox: {
		// Checkbox is 30pt, spacing.sm = 8pt → stack ~6pt below
		top: spacing.sm + 30 + 6,
	},
	regenBtnDisabled: {
		opacity: 0.7,
	},
	regenText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "700",
	},
	downloadBtnSaved: {
		backgroundColor: colors.success,
	},
	downloadBtnError: {
		backgroundColor: colors.danger,
	},
	downloadText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "700",
	},
	timestamp: {
		...font.caption,
		color: colors.textMuted,
		marginLeft: spacing.xs,
	},
});
