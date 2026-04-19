import { StyleSheet, Text, type TextStyle, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { PriorityArea } from "@content-assist/shared";
import { Card, SectionLabel } from "@mobile/components/ui";
import { colors, font, radius, shadow, spacing } from "@mobile/constants/theme";

type Props = {
	betterHook: string;
	hookReason: string;
	improvedCaption: string;
	captionReason: string;
	priorityFix: PriorityArea;
};

export function FixesBlock({
	betterHook,
	hookReason,
	improvedCaption,
	captionReason,
	priorityFix,
}: Props) {
	return (
		<View style={styles.wrap}>
			<FixCard
				title="Better hook"
				icon="✨"
				body={betterHook}
				bodyStyle={styles.bodyStrong as TextStyle}
				secondaryLabel="Why it works"
				secondaryBody={hookReason}
				priority={priorityFix === "hook"}
				animationDelay={240}
			/>
			<FixCard
				title="Improved caption"
				icon="✍️"
				body={improvedCaption}
				bodyStyle={styles.body as TextStyle}
				secondaryLabel="What changed"
				secondaryBody={captionReason}
				priority={priorityFix === "caption"}
				animationDelay={300}
			/>
		</View>
	);
}

type FixCardProps = {
	title: string;
	icon: string;
	body: string;
	bodyStyle: TextStyle;
	secondaryLabel: string;
	secondaryBody: string;
	priority: boolean;
	animationDelay: number;
};

function FixCard({
	title,
	icon,
	body,
	bodyStyle,
	secondaryLabel,
	secondaryBody,
	priority,
	animationDelay,
}: FixCardProps) {
	return (
		<Animated.View
			entering={FadeInDown.delay(animationDelay).springify().damping(18).mass(0.6)}
			style={styles.cardWrap}
		>
			<View style={styles.headerRow}>
				<SectionLabel icon={<Text style={styles.icon}>{icon}</Text>} accent={priority}>
					{title}
				</SectionLabel>
			</View>
			<Card padded style={priority ? [styles.priorityCard, shadow.accent] : undefined}>
				{priority ? (
					<View style={styles.priorityBadge}>
						<Text style={styles.priorityBadgeText}>🎯 PRIORITY FIX</Text>
					</View>
				) : null}
				<Text style={bodyStyle}>{body}</Text>
				<View style={styles.secondary}>
					<Text style={styles.secondaryLabel}>{secondaryLabel.toUpperCase()}</Text>
					<Text style={styles.secondaryBody}>{secondaryBody}</Text>
				</View>
			</Card>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	wrap: { gap: spacing.xl },
	cardWrap: { gap: spacing.md },
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	icon: { fontSize: 12 },
	priorityCard: {
		borderColor: colors.accent,
		borderWidth: 1.5,
		backgroundColor: colors.accentSoft,
	},
	priorityBadge: {
		alignSelf: "flex-start",
		backgroundColor: colors.accent,
		paddingHorizontal: spacing.md,
		paddingVertical: 4,
		borderRadius: radius.pill,
		marginBottom: spacing.md,
	},
	priorityBadgeText: {
		color: "#FFFFFF",
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 0.8,
	},
	bodyStrong: {
		...font.h2,
		color: colors.textPrimary,
		fontWeight: "700",
		fontSize: 18,
		lineHeight: 24,
	},
	body: {
		...font.body,
		color: colors.textPrimary,
		lineHeight: 22,
	},
	secondary: {
		marginTop: spacing.md,
		gap: 2,
	},
	secondaryLabel: {
		...font.label,
		color: colors.textMuted,
		fontWeight: "800",
	},
	secondaryBody: {
		...font.caption,
		color: colors.textSecondary,
	},
});
