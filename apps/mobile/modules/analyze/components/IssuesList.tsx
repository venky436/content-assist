import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card, SectionLabel } from "@mobile/components/ui";
import { colors, font, radius, spacing } from "@mobile/constants/theme";

type Props = {
	issues: string[];
};

export function IssuesList({ issues }: Props) {
	if (issues.length === 0) return null;
	return (
		<Animated.View
			entering={FadeInDown.delay(120).springify().damping(18).mass(0.6)}
			style={styles.wrap}
		>
			<SectionLabel>Caption issues</SectionLabel>
			<Card padded>
				{issues.map((issue, idx) => (
					<View
						key={`${idx}-${issue.slice(0, 12)}`}
						style={[
							styles.row,
							idx === issues.length - 1 ? styles.lastRow : null,
						]}
					>
						<View style={styles.bullet} />
						<Text style={styles.issue}>{issue}</Text>
					</View>
				))}
			</Card>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	wrap: { gap: spacing.md },
	row: {
		flexDirection: "row",
		alignItems: "flex-start",
		paddingVertical: spacing.md,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
		gap: spacing.md,
	},
	lastRow: {
		borderBottomWidth: 0,
	},
	bullet: {
		width: 6,
		height: 6,
		borderRadius: radius.pill,
		backgroundColor: colors.danger,
		marginTop: 8,
	},
	issue: {
		...font.body,
		color: colors.textPrimary,
		flex: 1,
		lineHeight: 22,
	},
});
