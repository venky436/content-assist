import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, font, radius, spacing } from "@mobile/constants/theme";

export function EmptySavedState() {
	return (
		<Animated.View
			entering={FadeInDown.springify().damping(18).mass(0.7)}
			style={styles.wrap}
		>
			<View style={styles.iconWrap}>
				<Text style={styles.icon}>🗂️</Text>
			</View>
			<Text style={styles.title}>Nothing saved yet</Text>
			<Text style={styles.body}>
				Generated a post you like? Tap{" "}
				<Text style={styles.bold}>Save</Text> and it'll land here.{"\n"}
				Come back to copy, re-analyze, or regenerate anytime.
			</Text>

			<View style={styles.stepCard}>
				<View style={styles.stepRow}>
					<View style={styles.stepNum}>
						<Text style={styles.stepNumText}>1</Text>
					</View>
					<Text style={styles.stepText}>Generate or analyze content</Text>
				</View>
				<View style={styles.stepDivider} />
				<View style={styles.stepRow}>
					<View style={styles.stepNum}>
						<Text style={styles.stepNumText}>2</Text>
					</View>
					<Text style={styles.stepText}>Tap 💾 Save</Text>
				</View>
				<View style={styles.stepDivider} />
				<View style={styles.stepRow}>
					<View style={styles.stepNum}>
						<Text style={styles.stepNumText}>3</Text>
					</View>
					<Text style={styles.stepText}>Open Saved tab to revisit</Text>
				</View>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		alignItems: "center",
		paddingHorizontal: spacing.xl,
		paddingTop: spacing.xxxl,
		gap: spacing.lg,
	},
	iconWrap: {
		width: 72,
		height: 72,
		borderRadius: radius.pill,
		backgroundColor: colors.accentSoft,
		borderWidth: 1,
		borderColor: colors.accent,
		alignItems: "center",
		justifyContent: "center",
	},
	icon: { fontSize: 32 },
	title: {
		...font.h1,
		color: colors.textPrimary,
		textAlign: "center",
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
	stepCard: {
		alignSelf: "stretch",
		backgroundColor: colors.surface,
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.lg,
		gap: spacing.sm,
		marginTop: spacing.lg,
	},
	stepRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.md,
		paddingVertical: spacing.sm,
	},
	stepNum: {
		width: 28,
		height: 28,
		borderRadius: radius.pill,
		backgroundColor: colors.accentSoft,
		borderWidth: 1,
		borderColor: colors.accent,
		alignItems: "center",
		justifyContent: "center",
	},
	stepNumText: {
		color: colors.accent,
		fontWeight: "800",
		fontSize: 12,
	},
	stepText: {
		...font.body,
		color: colors.textPrimary,
		flex: 1,
	},
	stepDivider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: colors.border,
	},
});
