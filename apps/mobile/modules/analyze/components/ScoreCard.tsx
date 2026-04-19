import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { Confidence, HookVerdict } from "@content-assist/shared";
import { colors, font, radius, shadow, spacing } from "@mobile/constants/theme";
import { ConfidenceBadge } from "./ConfidenceBadge";

type Props = {
	score: number;
	verdict: HookVerdict;
	explanation: string;
	confidence: Confidence;
};

type VerdictStyle = {
	text: string;
	bg: string;
	border: string;
	shadow: ViewStyle;
};

function verdictLabel(verdict: HookVerdict, score: number): string {
	if (verdict === "Strong" && score < 76) return "STRONG · STILL IMPROVABLE";
	return verdict.toUpperCase();
}

const AVERAGE_COLOR = "#F59E0B"; // amber
const AVERAGE_BG = "rgba(245, 158, 11, 0.14)";

const VERDICT_STYLES: Record<HookVerdict, VerdictStyle> = {
	Weak: {
		text: colors.danger,
		bg: colors.dangerSoft,
		border: colors.danger,
		shadow: {
			shadowColor: colors.danger,
			shadowOpacity: 0.4,
			shadowRadius: 20,
			shadowOffset: { width: 0, height: 10 },
			elevation: 10,
		},
	},
	Average: {
		text: AVERAGE_COLOR,
		bg: AVERAGE_BG,
		border: AVERAGE_COLOR,
		shadow: {
			shadowColor: AVERAGE_COLOR,
			shadowOpacity: 0.35,
			shadowRadius: 20,
			shadowOffset: { width: 0, height: 10 },
			elevation: 10,
		},
	},
	Strong: {
		text: colors.accent,
		bg: colors.accentSoft,
		border: colors.accent,
		shadow: shadow.accent,
	},
	"Very Strong": {
		text: colors.success,
		bg: colors.successSoft,
		border: colors.success,
		shadow: {
			shadowColor: colors.success,
			shadowOpacity: 0.4,
			shadowRadius: 20,
			shadowOffset: { width: 0, height: 10 },
			elevation: 10,
		},
	},
};

export function ScoreCard({ score, verdict, explanation, confidence }: Props) {
	const style = VERDICT_STYLES[verdict];

	return (
		<Animated.View
			entering={FadeInDown.springify().damping(16).mass(0.6)}
			style={[styles.card, { backgroundColor: style.bg, borderColor: style.border }, style.shadow]}
		>
			<Text style={[styles.label, { color: style.text }]}>HOOK SCORE</Text>
			<View style={styles.scoreRow}>
				<Text style={[styles.score, { color: style.text }]}>{score}</Text>
				<Text style={[styles.scoreMax, { color: style.text }]}>/100</Text>
			</View>
			<View style={[styles.verdictBadge, { backgroundColor: style.text }]}>
				<Text style={styles.verdictText}>{verdictLabel(verdict, score)}</Text>
			</View>
			<Text style={styles.reason}>{explanation}</Text>
			<ConfidenceBadge confidence={confidence} />
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: spacing.xl,
		borderRadius: radius.xxl,
		borderWidth: 1.5,
		alignItems: "center",
		gap: spacing.md,
	},
	label: {
		...font.label,
		fontWeight: "800",
	},
	scoreRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		gap: 4,
	},
	score: {
		fontSize: 64,
		fontWeight: "800",
		lineHeight: 64,
		letterSpacing: -2,
	},
	scoreMax: {
		...font.h2,
		opacity: 0.7,
		marginBottom: 8,
	},
	verdictBadge: {
		paddingHorizontal: spacing.md,
		paddingVertical: 6,
		borderRadius: radius.pill,
	},
	verdictText: {
		color: "#FFFFFF",
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 0.8,
	},
	reason: {
		...font.body,
		color: colors.textPrimary,
		textAlign: "center",
		lineHeight: 22,
	},
});
