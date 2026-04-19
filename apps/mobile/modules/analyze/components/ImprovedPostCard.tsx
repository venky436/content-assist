import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, font, radius, shadow, spacing } from "@mobile/constants/theme";
import { CopyButton } from "@mobile/modules/generate/components/CopyButton";

type Props = {
	improvedPost: string;
};

export function ImprovedPostCard({ improvedPost }: Props) {
	if (!improvedPost) return null;
	return (
		<Animated.View
			entering={FadeInDown.delay(300).springify().damping(16).mass(0.6)}
			style={styles.wrap}
		>
			<View style={styles.headerRow}>
				<Text style={styles.badge}>✨ READY-TO-POST REWRITE</Text>
			</View>
			<View style={[styles.card, shadow.accent]}>
				<Text style={styles.body}>{improvedPost}</Text>
				<View style={styles.divider} />
				<View style={styles.footer}>
					<Text style={styles.subtitle}>
						Scores higher than your original. Paste this on Instagram.
					</Text>
					<CopyButton
						label="Copy full post"
						getText={() => improvedPost}
						variant="primary"
						size="lg"
					/>
				</View>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	wrap: { gap: spacing.md },
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	badge: {
		...font.label,
		color: colors.accent,
		fontWeight: "800",
		letterSpacing: 1,
	},
	card: {
		padding: spacing.lg,
		borderRadius: radius.xl,
		backgroundColor: colors.accentSoft,
		borderWidth: 1.5,
		borderColor: colors.accent,
		gap: spacing.md,
	},
	body: {
		...font.bodyStrong,
		color: colors.textPrimary,
		fontSize: 17,
		lineHeight: 26,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: colors.accent,
		opacity: 0.4,
	},
	footer: {
		gap: spacing.sm,
	},
	subtitle: {
		...font.caption,
		color: colors.textSecondary,
	},
});
