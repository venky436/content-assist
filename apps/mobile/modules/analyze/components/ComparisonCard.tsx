import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SectionLabel } from "@mobile/components/ui";
import { colors, font, radius, shadow, spacing } from "@mobile/constants/theme";

type Props = {
	originalHook: string;
	betterHook: string;
};

export function ComparisonCard({ originalHook, betterHook }: Props) {
	return (
		<Animated.View
			entering={FadeInDown.delay(60).springify().damping(18).mass(0.6)}
			style={styles.wrap}
		>
			<SectionLabel>Hook comparison</SectionLabel>
			<View style={styles.row}>
				<View style={[styles.side, styles.yours]}>
					<Text style={styles.sideLabel}>YOUR HOOK</Text>
					<Text style={styles.yourHookText}>{originalHook}</Text>
				</View>
				<View style={[styles.side, styles.better, shadow.accent]}>
					<View style={styles.betterHeader}>
						<Text style={styles.betterLabel}>BETTER HOOK</Text>
						<View style={styles.arrowBadge}>
							<Text style={styles.arrowText}>→</Text>
						</View>
					</View>
					<Text style={styles.betterHookText}>{betterHook}</Text>
				</View>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	wrap: { gap: spacing.md },
	row: {
		gap: spacing.md,
	},
	side: {
		padding: spacing.lg,
		borderRadius: radius.xl,
		borderWidth: 1,
		gap: spacing.md,
	},
	yours: {
		backgroundColor: colors.surface,
		borderColor: colors.border,
	},
	better: {
		backgroundColor: colors.accentSoft,
		borderColor: colors.accent,
		borderWidth: 1.5,
	},
	sideLabel: {
		...font.label,
		color: colors.textMuted,
		fontWeight: "800",
	},
	yourHookText: {
		...font.body,
		color: colors.textSecondary,
		lineHeight: 22,
		fontStyle: "italic",
	},
	betterHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	betterLabel: {
		...font.label,
		color: colors.accent,
		fontWeight: "800",
	},
	arrowBadge: {
		width: 24,
		height: 24,
		borderRadius: radius.pill,
		backgroundColor: colors.accent,
		alignItems: "center",
		justifyContent: "center",
	},
	arrowText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "800",
	},
	betterHookText: {
		...font.h2,
		color: colors.textPrimary,
		fontWeight: "700",
		fontSize: 18,
		lineHeight: 24,
	},
});
