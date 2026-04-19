import { StyleSheet, Text, View } from "react-native";
import { Button } from "@mobile/components/ui";
import { colors, font, spacing } from "@mobile/constants/theme";

type Props = {
	onRegenerate: () => void;
	onRegenerateAs: () => void;
	loading?: boolean;
	disabled?: boolean;
};

export function RegenerateImagesBar({
	onRegenerate,
	onRegenerateAs,
	loading,
	disabled,
}: Props) {
	const busy = loading || disabled;
	return (
		<View style={styles.wrap}>
			<Text style={styles.hint}>Not quite right?</Text>
			<View style={styles.row}>
				<View style={styles.btnItem}>
					<Button
						label={loading ? "Working…" : "🔄  Regenerate"}
						onPress={onRegenerate}
						variant="secondary"
						size="md"
						fullWidth
						loading={loading}
						disabled={busy}
						haptic="light"
					/>
				</View>
				<View style={styles.btnItem}>
					<Button
						label="Regenerate as…"
						onPress={onRegenerateAs}
						variant="ghost"
						size="md"
						fullWidth
						disabled={busy}
						haptic="light"
					/>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { gap: spacing.sm },
	hint: {
		...font.caption,
		color: colors.textMuted,
		marginLeft: spacing.xs,
	},
	row: { flexDirection: "row", gap: spacing.sm },
	btnItem: { flex: 1 },
});
