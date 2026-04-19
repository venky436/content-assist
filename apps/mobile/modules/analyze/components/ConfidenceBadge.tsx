import { StyleSheet, Text, View } from "react-native";
import type { Confidence } from "@content-assist/shared";
import { colors, font, radius, spacing } from "@mobile/constants/theme";

type Props = { confidence: Confidence };

const CONFIG: Record<
	Confidence,
	{ label: string; bg: string; border: string; text: string; dotCount: number }
> = {
	low: {
		label: "LOW CONFIDENCE",
		bg: colors.surfaceAlt,
		border: colors.border,
		text: colors.textMuted,
		dotCount: 1,
	},
	medium: {
		label: "MEDIUM CONFIDENCE",
		bg: colors.surfaceAlt,
		border: colors.borderStrong,
		text: colors.textSecondary,
		dotCount: 2,
	},
	high: {
		label: "HIGH CONFIDENCE",
		bg: colors.successSoft,
		border: colors.success,
		text: colors.success,
		dotCount: 3,
	},
};

export function ConfidenceBadge({ confidence }: Props) {
	const cfg = CONFIG[confidence];
	return (
		<View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
			<View style={styles.dots}>
				{[0, 1, 2].map((i) => (
					<View
						key={i}
						style={[
							styles.dot,
							{ backgroundColor: i < cfg.dotCount ? cfg.text : colors.border },
						]}
					/>
				))}
			</View>
			<Text style={[styles.label, { color: cfg.text }]}>{cfg.label}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	badge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: spacing.md,
		paddingVertical: 6,
		borderRadius: radius.pill,
		borderWidth: 1,
		gap: spacing.sm,
		alignSelf: "flex-start",
	},
	dots: { flexDirection: "row", gap: 3 },
	dot: {
		width: 6,
		height: 6,
		borderRadius: radius.pill,
	},
	label: {
		...font.label,
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 0.6,
	},
});
