import { StyleSheet, Text, View } from "react-native";
import type { ContentType } from "@content-assist/shared";
import { Chip, SectionLabel } from "@mobile/components/ui";
import { spacing } from "@mobile/constants/theme";

type Option = {
	value: ContentType;
	label: string;
	emoji: string;
};

const options: Option[] = [
	{ value: "reel", label: "Reel", emoji: "🎬" },
	{ value: "image", label: "Image Post", emoji: "🖼️" },
	{ value: "story", label: "Story", emoji: "⚡" },
];

type Props = {
	value: ContentType;
	onChange: (value: ContentType) => void;
	disabled?: boolean;
};

export function ContentTypeSelector({ value, onChange, disabled }: Props) {
	return (
		<View style={styles.wrap}>
			<SectionLabel>Content format</SectionLabel>
			<View style={styles.row}>
				{options.map((opt) => (
					<Chip
						key={opt.value}
						label={opt.label}
						icon={<Text style={{ fontSize: 14 }}>{opt.emoji}</Text>}
						selected={value === opt.value}
						onPress={disabled ? undefined : () => onChange(opt.value)}
						accessibilityLabel={`Select ${opt.label}`}
					/>
				))}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { gap: spacing.md },
	row: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.sm,
	},
});
