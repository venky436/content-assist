import { StyleSheet, Text, View } from "react-native";
import { Chip } from "@mobile/components/ui";
import { colors, font, spacing } from "@mobile/constants/theme";

type Props = {
	value: 2 | 3;
	onChange: (count: 2 | 3) => void;
	disabled?: boolean;
};

export function CountChips({ value, onChange, disabled }: Props) {
	return (
		<View style={styles.row}>
			<Text style={styles.label}>How many?</Text>
			<View style={styles.chips}>
				<Chip
					label="2 images"
					selected={value === 2}
					onPress={disabled ? undefined : () => onChange(2)}
					accessibilityLabel="Generate 2 images (struggle + result)"
				/>
				<Chip
					label="3 images"
					selected={value === 3}
					onPress={disabled ? undefined : () => onChange(3)}
					accessibilityLabel="Generate 3 images (struggle + decision + result)"
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: spacing.md,
	},
	label: {
		...font.caption,
		color: colors.textMuted,
		fontWeight: "700",
	},
	chips: {
		flexDirection: "row",
		gap: spacing.sm,
	},
});
