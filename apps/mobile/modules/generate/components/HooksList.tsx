import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Button, Card, SectionLabel } from "@mobile/components/ui";
import { colors, font, radius, shadow, spacing } from "@mobile/constants/theme";
import { CopyButton } from "./CopyButton";

type Props = {
	hooks: string[];
	recommendedHook: string;
	recommendedReason?: string;
	onMakeStronger?: () => void;
	regenerating?: boolean;
};

export function HooksList({
	hooks,
	recommendedHook,
	recommendedReason,
	onMakeStronger,
	regenerating = false,
}: Props) {
	const recommended = recommendedHook || hooks[0] || "";
	const rest = hooks.filter((h) => h !== recommended);
	const allText = hooks.map((h, i) => `${i + 1}. ${h}`).join("\n");

	return (
		<Animated.View
			entering={FadeInDown.springify().damping(18).mass(0.6)}
			style={styles.wrap}
		>
			<View style={styles.header}>
				<SectionLabel icon={<Text style={styles.flame}>🔥</Text>} accent>
					5 viral hooks
				</SectionLabel>
				<CopyButton label="Copy all" getText={() => allText} />
			</View>

			{recommended ? (
				<View style={[styles.recommendedCard, shadow.accent]}>
					<View style={styles.recommendedHeader}>
						<View style={styles.recommendedBadge}>
							<Text style={styles.recommendedBadgeText}>🔥 RECOMMENDED</Text>
						</View>
						<CopyButton label="Copy" getText={() => recommended} />
					</View>
					<Text style={styles.recommendedText}>{recommended}</Text>
					<View style={styles.recommendedFooter}>
						<Text style={styles.recommendedSubtitle}>BEST FOR ENGAGEMENT</Text>
						{recommendedReason ? (
							<Text style={styles.recommendedReason}>
								<Text style={styles.recommendedReasonLabel}>Why this works: </Text>
								{recommendedReason}
							</Text>
						) : null}
					</View>
				</View>
			) : null}

			{rest.length > 0 ? (
				<View>
					<Text style={styles.moreLabel}>OTHER HOOKS</Text>
					<Card padded>
						{rest.map((hook, idx) => (
							<View
								key={`${idx}-${hook.slice(0, 12)}`}
								style={[
									styles.row,
									idx === rest.length - 1 ? styles.lastRow : null,
								]}
							>
								<View style={styles.badge}>
									<Text style={styles.badgeText}>{idx + 2}</Text>
								</View>
								<Text style={styles.hook}>{hook}</Text>
							</View>
						))}
					</Card>
				</View>
			) : null}

			{onMakeStronger ? (
				<Button
					label={regenerating ? "Making stronger…" : "Make hooks stronger"}
					onPress={onMakeStronger}
					loading={regenerating}
					disabled={regenerating}
					variant="secondary"
					size="md"
					fullWidth
					haptic="medium"
					iconLeft={<Text style={styles.sparkle}>✨</Text>}
				/>
			) : null}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	wrap: { gap: spacing.md },
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	flame: { fontSize: 12 },
	sparkle: { fontSize: 14 },
	recommendedCard: {
		padding: spacing.lg,
		borderRadius: radius.xl,
		backgroundColor: colors.accentSoft,
		borderWidth: 1.5,
		borderColor: colors.accent,
		gap: spacing.md,
	},
	recommendedHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	recommendedBadge: {
		backgroundColor: colors.accent,
		paddingHorizontal: spacing.md,
		paddingVertical: 4,
		borderRadius: radius.pill,
	},
	recommendedBadgeText: {
		color: "#FFFFFF",
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 0.8,
	},
	recommendedText: {
		...font.h2,
		color: colors.textPrimary,
		fontWeight: "700",
		fontSize: 20,
		lineHeight: 26,
	},
	recommendedFooter: {
		gap: 2,
	},
	recommendedSubtitle: {
		...font.label,
		color: colors.accent,
		fontWeight: "800",
		letterSpacing: 0.8,
	},
	recommendedReason: {
		...font.caption,
		color: colors.textSecondary,
		fontWeight: "500",
	},
	recommendedReasonLabel: {
		color: colors.textMuted,
		fontWeight: "700",
	},
	moreLabel: {
		...font.label,
		color: colors.textMuted,
		marginBottom: spacing.sm,
		marginLeft: 2,
	},
	row: {
		flexDirection: "row",
		alignItems: "flex-start",
		paddingVertical: spacing.md,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	lastRow: {
		borderBottomWidth: 0,
	},
	badge: {
		width: 26,
		height: 26,
		borderRadius: radius.pill,
		backgroundColor: colors.surfaceAlt,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: "center",
		justifyContent: "center",
		marginRight: spacing.md,
	},
	badgeText: {
		color: colors.textSecondary,
		fontWeight: "700",
		fontSize: 12,
	},
	hook: {
		...font.body,
		color: colors.textPrimary,
		flex: 1,
		lineHeight: 22,
	},
});
