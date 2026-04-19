import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SectionLabel } from "@mobile/components/ui";
import { colors, font, radius, spacing } from "@mobile/constants/theme";

type Props = {
	problems: string[];
	score: number;
};

export function ProblemsBadges({ problems, score }: Props) {
	if (problems.length === 0) return null;
	const constructive = score >= 60;
	const title = constructive ? "Improvement areas" : "Problems";
	const chipStyle = constructive ? styles.chipImprove : styles.chipProblem;
	const textStyle = constructive ? styles.textImprove : styles.textProblem;

	return (
		<Animated.View
			entering={FadeInDown.delay(180).springify().damping(18).mass(0.6)}
			style={styles.wrap}
		>
			<SectionLabel accent={constructive}>{title}</SectionLabel>
			<View style={styles.chips}>
				{problems.map((p, idx) => (
					<View key={`${idx}-${p}`} style={[styles.chip, chipStyle]}>
						<Text style={[styles.chipText, textStyle]}>{p}</Text>
					</View>
				))}
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	wrap: { gap: spacing.sm },
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.sm,
	},
	chip: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		borderRadius: radius.pill,
		borderWidth: 1,
	},
	chipProblem: {
		backgroundColor: colors.dangerSoft,
		borderColor: colors.danger,
	},
	chipImprove: {
		backgroundColor: colors.accentSoft,
		borderColor: colors.accent,
	},
	chipText: {
		...font.caption,
		fontWeight: "700",
	},
	textProblem: {
		color: colors.danger,
	},
	textImprove: {
		color: colors.accent,
	},
});
