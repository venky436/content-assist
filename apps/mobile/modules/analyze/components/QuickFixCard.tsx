import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, font, radius, spacing } from "@mobile/constants/theme";

type Props = { quickFix: string };

export function QuickFixCard({ quickFix }: Props) {
	if (!quickFix) return null;
	return (
		<Animated.View
			entering={FadeInDown.delay(40).springify().damping(18).mass(0.6)}
			style={styles.wrap}
		>
			<View style={styles.header}>
				<Text style={styles.icon}>🔥</Text>
				<Text style={styles.label}>QUICK FIX</Text>
			</View>
			<Text style={styles.body}>{quickFix}</Text>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		padding: spacing.lg,
		borderRadius: radius.xl,
		backgroundColor: colors.accentSoft,
		borderWidth: 1.5,
		borderColor: colors.accent,
		gap: spacing.sm,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
	},
	icon: { fontSize: 14 },
	label: {
		...font.label,
		color: colors.accent,
		fontWeight: "800",
		letterSpacing: 0.8,
	},
	body: {
		...font.bodyStrong,
		color: colors.textPrimary,
		lineHeight: 24,
	},
});
