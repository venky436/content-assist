import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SectionLabel } from "@mobile/components/ui";
import { colors, font, radius, spacing } from "@mobile/constants/theme";

type Props = { insight: string };

export function InsightBlock({ insight }: Props) {
	if (!insight) return null;
	return (
		<Animated.View
			entering={FadeInDown.delay(330).springify().damping(18).mass(0.6)}
			style={styles.wrap}
		>
			<SectionLabel icon={<Text style={styles.icon}>💡</Text>} accent>
				Coach's take
			</SectionLabel>
			<View style={styles.card}>
				<View style={styles.accentBar} />
				<Text style={styles.body}>{insight}</Text>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	wrap: { gap: spacing.md },
	icon: { fontSize: 13 },
	card: {
		flexDirection: "row",
		backgroundColor: colors.surface,
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: "hidden",
	},
	accentBar: {
		width: 4,
		backgroundColor: colors.accent,
	},
	body: {
		...font.body,
		color: colors.textPrimary,
		lineHeight: 24,
		padding: spacing.lg,
		flex: 1,
	},
});
