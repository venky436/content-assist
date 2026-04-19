import { StyleSheet, Text, View } from "react-native";
import { SectionLabel, TextArea } from "@mobile/components/ui";
import { colors, font, spacing } from "@mobile/constants/theme";

const MAX = 500;

type Props = {
	value: string;
	onChangeText: (text: string) => void;
	disabled?: boolean;
};

export function IdeaInput({ value, onChangeText, disabled }: Props) {
	const count = value.length;
	const nearMax = count > MAX * 0.85;

	return (
		<View style={styles.wrap}>
			<View style={styles.header}>
				<SectionLabel>Your idea</SectionLabel>
			</View>
			<TextArea
				value={value}
				onChangeText={(t) => onChangeText(t.slice(0, MAX))}
				placeholder="Describe your content idea…"
				editable={!disabled}
				minLines={3}
				maxLines={6}
				returnKeyType="default"
			/>
			<View style={styles.footer}>
				<Text style={styles.hint}>
					Tip: be specific. Niche + angle beats generic topics.
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
	header: {
		marginBottom: 2,
	},
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
