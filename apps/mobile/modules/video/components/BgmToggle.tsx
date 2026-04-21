import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, font, radius, spacing } from "@mobile/constants/theme";
import { haptics } from "@mobile/lib/haptics";

type Props = {
	value: boolean;
	onChange: (next: boolean) => void;
	disabled?: boolean;
};

export function BgmToggle({ value, onChange, disabled }: Props) {
	const handlePress = useCallback(() => {
		if (disabled) return;
		haptics.selection();
		onChange(!value);
	}, [disabled, onChange, value]);

	return (
		<Pressable
			onPress={handlePress}
			disabled={disabled}
			accessibilityRole="switch"
			accessibilityState={{ checked: value, disabled: !!disabled }}
			accessibilityLabel="Add background music to the video"
			style={[
				styles.row,
				value ? styles.rowOn : styles.rowOff,
				disabled && styles.rowDisabled,
			]}
		>
			<View
				style={[
					styles.checkbox,
					value ? styles.checkboxOn : styles.checkboxOff,
				]}
			>
				{value ? <Text style={styles.check}>✓</Text> : null}
			</View>
			<View style={styles.body}>
				<Text style={styles.title}>Add background music</Text>
				<Text style={styles.subtitle}>Low-volume track behind the voiceover</Text>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.md,
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.lg,
		borderRadius: radius.lg,
		borderWidth: 1,
	},
	rowOn: {
		backgroundColor: colors.accentSoft,
		borderColor: colors.accent,
	},
	rowOff: {
		backgroundColor: colors.surfaceAlt,
		borderColor: colors.border,
	},
	rowDisabled: { opacity: 0.5 },
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 1.5,
		alignItems: "center",
		justifyContent: "center",
	},
	checkboxOn: {
		backgroundColor: colors.accent,
		borderColor: colors.accent,
	},
	checkboxOff: {
		backgroundColor: "transparent",
		borderColor: colors.borderStrong,
	},
	check: {
		color: "#fff",
		fontWeight: "900",
		fontSize: 14,
	},
	body: { flex: 1, gap: 2 },
	title: {
		...font.bodyStrong,
		color: colors.textPrimary,
	},
	subtitle: {
		...font.caption,
		color: colors.textSecondary,
	},
});
