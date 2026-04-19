import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card, SectionLabel } from "@mobile/components/ui";
import { colors, font, spacing } from "@mobile/constants/theme";
import { CopyButton } from "./CopyButton";

type Props = { caption: string };

export function CaptionBlock({ caption }: Props) {
	return (
		<Animated.View
			entering={FadeInDown.delay(80).springify().damping(18).mass(0.6)}
		>
			<View style={styles.header}>
				<SectionLabel icon={<Text style={styles.icon}>✍️</Text>}>Caption</SectionLabel>
				<CopyButton label="Copy" getText={() => caption} />
			</View>
			<Card padded>
				<Text style={styles.caption}>{caption}</Text>
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
	icon: { fontSize: 12 },
	caption: {
		...font.body,
		color: colors.textPrimary,
		lineHeight: 24,
	},
});
