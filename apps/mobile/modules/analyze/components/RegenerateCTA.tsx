import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Button } from "@mobile/components/ui";
import { colors, font, spacing } from "@mobile/constants/theme";

type Props = {
	onPress: () => void;
	disabled?: boolean;
};

export function RegenerateCTA({ onPress, disabled }: Props) {
	return (
		<Animated.View
			entering={FadeInDown.delay(360).springify().damping(18).mass(0.6)}
			style={styles.wrap}
		>
			<View style={styles.divider} />
			<Text style={styles.subtitle}>Ready to ship the upgrade?</Text>
			<Button
				label="Generate improved version"
				onPress={onPress}
				disabled={disabled}
				variant="primary"
				size="lg"
				fullWidth
				haptic="medium"
				iconLeft={<Text style={styles.icon}>✨</Text>}
			/>
			<Text style={styles.hint}>
				We'll pre-fill the improved caption on the Generate tab and run a fresh pass.
			</Text>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		gap: spacing.md,
		alignItems: "center",
	},
	divider: {
		width: "100%",
		height: StyleSheet.hairlineWidth,
		backgroundColor: colors.border,
		marginTop: spacing.md,
	},
	subtitle: {
		...font.h2,
		color: colors.textPrimary,
		marginTop: spacing.md,
	},
	icon: { fontSize: 16 },
	hint: {
		...font.caption,
		color: colors.textMuted,
		textAlign: "center",
		lineHeight: 18,
	},
});
