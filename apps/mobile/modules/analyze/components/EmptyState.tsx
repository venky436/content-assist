import { StyleSheet, Text, View } from "react-native";
import { Card } from "@mobile/components/ui";
import { colors, font, radius, spacing } from "@mobile/constants/theme";

export function EmptyState() {
	return (
		<Card padded style={styles.card}>
			<View style={styles.iconWrap}>
				<Text style={styles.icon}>🔍</Text>
			</View>
			<Text style={styles.title}>We'll tear it apart</Text>
			<Text style={styles.body}>
				Paste a hook, caption, or existing post. You'll get a score, the
				specific things that are weak, and <Text style={styles.bold}>exact rewrites</Text>
				you can post — not generic tips.
			</Text>
		</Card>
	);
}

const styles = StyleSheet.create({
	card: {
		alignItems: "center",
		paddingVertical: spacing.xxl,
		paddingHorizontal: spacing.xl,
	},
	iconWrap: {
		height: 56,
		width: 56,
		borderRadius: radius.pill,
		backgroundColor: colors.accentSoft,
		borderWidth: 1,
		borderColor: colors.accent,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: spacing.lg,
	},
	icon: { fontSize: 24 },
	title: {
		...font.h2,
		color: colors.textPrimary,
		marginBottom: spacing.sm,
	},
	body: {
		...font.body,
		color: colors.textSecondary,
		textAlign: "center",
		lineHeight: 22,
	},
	bold: {
		color: colors.textPrimary,
		fontWeight: "700",
	},
});
