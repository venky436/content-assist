import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import type { SavedPost } from "@content-assist/shared";
import { colors, font, radius, shadow, spacing, timings } from "@mobile/constants/theme";
import { haptics } from "@mobile/lib/haptics";
import { formatRelative } from "@mobile/modules/saved/format";

type Props = {
	post: SavedPost;
	index: number;
	onPress: () => void;
	onLongPress: () => void;
};

const VERDICT_COLORS: Record<NonNullable<SavedPost["verdict"]>, string> = {
	Weak: colors.danger,
	Average: "#F59E0B",
	Strong: colors.accent,
	"Very Strong": colors.success,
};

export function SavedPostCard({ post, index, onPress, onLongPress }: Props) {
	const scale = useSharedValue(1);
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const handlePressIn = useCallback(() => {
		scale.value = withTiming(0.98, { duration: timings.fast });
	}, [scale]);
	const handlePressOut = useCallback(() => {
		scale.value = withTiming(1, { duration: timings.fast });
	}, [scale]);
	const handleLongPress = useCallback(() => {
		haptics.tapMedium();
		onLongPress();
	}, [onLongPress]);
	const handlePress = useCallback(() => {
		haptics.selection();
		onPress();
	}, [onPress]);

	const isAnalyzed = post.source === "analyze";
	const sourceColor = isAnalyzed ? colors.accent : colors.success;
	const sourceLabel = isAnalyzed ? "🔍  ANALYZED" : "✨  GENERATED";

	const preview =
		post.source === "analyze"
			? post.improvedPost ?? post.betterHook ?? post.originalContent
			: post.recommendedHook ?? post.hooks?.[0];

	return (
		<Animated.View
			entering={FadeInDown.delay(index * 40).springify().damping(18).mass(0.6)}
			style={[animatedStyle]}
		>
			<Pressable
				onPress={handlePress}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				onLongPress={handleLongPress}
				delayLongPress={450}
				accessibilityRole="button"
				accessibilityLabel={`Open saved post: ${post.idea}`}
				style={[styles.card, shadow.card]}
			>
				{/* Accent stripe on the left based on source */}
				<View style={[styles.stripe, { backgroundColor: sourceColor }]} />

				<View style={styles.body}>
					<View style={styles.headerRow}>
						<View style={styles.sourcePill}>
							<Text style={[styles.sourceText, { color: sourceColor }]}>
								{sourceLabel}
							</Text>
						</View>
						<Text style={styles.timestamp}>
							{formatRelative(post.updatedAt)}
						</Text>
					</View>

					<Text style={styles.idea} numberOfLines={2}>
						{post.idea}
					</Text>

					{preview ? (
						<Text style={styles.preview} numberOfLines={2}>
							{preview.split("\n")[0]}
						</Text>
					) : null}

					<View style={styles.footer}>
						{typeof post.score === "number" ? (
							<View style={styles.scorePill}>
								<Text
									style={[
										styles.scoreText,
										{
											color:
												post.verdict && VERDICT_COLORS[post.verdict]
													? VERDICT_COLORS[post.verdict]
													: colors.textSecondary,
										},
									]}
								>
									{post.score}
									<Text style={styles.scoreMax}>/100</Text>
								</Text>
							</View>
						) : (
							<View style={styles.formatPill}>
								<Text style={styles.formatText}>
									{post.contentType.toUpperCase()}
								</Text>
							</View>
						)}
						<View style={styles.chevron}>
							<Text style={styles.chevronText}>→</Text>
						</View>
					</View>
				</View>
			</Pressable>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	card: {
		flexDirection: "row",
		backgroundColor: colors.surface,
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: "hidden",
		marginBottom: spacing.md,
	},
	stripe: {
		width: 4,
	},
	body: {
		flex: 1,
		padding: spacing.lg,
		gap: spacing.sm,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	sourcePill: {
		paddingHorizontal: spacing.sm,
		paddingVertical: 4,
		borderRadius: radius.pill,
		backgroundColor: colors.surfaceAlt,
		borderWidth: 1,
		borderColor: colors.border,
	},
	sourceText: {
		...font.label,
		fontSize: 10,
		letterSpacing: 1,
		fontWeight: "800",
	},
	timestamp: {
		...font.caption,
		color: colors.textMuted,
	},
	idea: {
		...font.h2,
		color: colors.textPrimary,
		fontSize: 17,
		lineHeight: 24,
	},
	preview: {
		...font.body,
		color: colors.textSecondary,
		fontStyle: "italic",
		lineHeight: 22,
	},
	footer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: spacing.xs,
	},
	scorePill: {
		paddingHorizontal: spacing.md,
		paddingVertical: 4,
		borderRadius: radius.pill,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
	},
	scoreText: {
		fontSize: 16,
		fontWeight: "800",
		letterSpacing: -0.5,
	},
	scoreMax: {
		fontSize: 11,
		color: colors.textMuted,
		fontWeight: "600",
	},
	formatPill: {
		paddingHorizontal: spacing.md,
		paddingVertical: 4,
		borderRadius: radius.pill,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
	},
	formatText: {
		...font.label,
		fontSize: 10,
		color: colors.textSecondary,
		fontWeight: "700",
	},
	chevron: {
		width: 28,
		height: 28,
		borderRadius: radius.pill,
		backgroundColor: colors.surfaceAlt,
		alignItems: "center",
		justifyContent: "center",
	},
	chevronText: {
		color: colors.textSecondary,
		fontSize: 16,
		fontWeight: "700",
	},
});
