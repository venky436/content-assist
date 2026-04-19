import { StyleSheet, Text, View } from "react-native";
import { SectionLabel, TextArea } from "@mobile/components/ui";
import { colors, font, spacing } from "@mobile/constants/theme";

const MAX = 2000;

type Props = {
	value: string;
	onChangeText: (text: string) => void;
	disabled?: boolean;
};

export function ContentInput({ value, onChangeText, disabled }: Props) {
	const count = value.length;
	const nearMax = count > MAX * 0.9;

	return (
		<View style={styles.wrap}>
			<SectionLabel>Your content</SectionLabel>
			<TextArea
				value={value}
				onChangeText={(t) => onChangeText(t.slice(0, MAX))}
				placeholder="Paste your caption, idea, or reel link…"
				editable={!disabled}
				minLines={6}
				maxLines={12}
				returnKeyType="default"
			/>
			<View style={styles.footer}>
				<Text style={styles.hint}>
					Paste a full caption or just the hook. We'll figure out the rest.
				</Text>
				<Text
					style={[
						styles.count,
						{ color: nearMax ? colors.accent : colors.textMuted },
					]}
				>
					{count}/{MAX}
				</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { gap: spacing.sm },
	footer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: spacing.xs,
	},
	hint: {
		...font.caption,
		color: colors.textMuted,
		flexShrink: 1,
	},
	count: {
		...font.caption,
		marginLeft: spacing.sm,
	},
});
