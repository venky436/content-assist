import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card, SectionLabel } from "@mobile/components/ui";
import { colors, font, radius, spacing } from "@mobile/constants/theme";
import { CopyButton } from "./CopyButton";

type Props = { hashtags: string[] };

export function HashtagsBlock({ hashtags }: Props) {
	const joined = hashtags.join(" ");
	return (
		<Animated.View
			entering={FadeInDown.delay(160).springify().damping(18).mass(0.6)}
		>
			<View style={styles.header}>
				<SectionLabel icon={<Text style={styles.icon}>#</Text>}>
					{`${hashtags.length} hashtags`}
				</SectionLabel>
				<CopyButton label="Copy" getText={() => joined} />
			</View>
			<Card padded>
				<View style={styles.chips}>
					{hashtags.map((tag) => (
						<View key={tag} style={styles.tag}>
							<Text style={styles.tagText}>{tag}</Text>
						</View>
					))}
				</View>
			</Card>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: spacing.md,
	},
	icon: { ...font.label, color: colors.accent, fontWeight: "700" },
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.sm,
	},
	tag: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		borderRadius: radius.pill,
		backgroundColor: colors.surfaceAlt,
		borderWidth: 1,
		borderColor: colors.border,
	},
	tagText: {
		...font.caption,
		color: colors.textSecondary,
		fontWeight: "600",
	},
});
