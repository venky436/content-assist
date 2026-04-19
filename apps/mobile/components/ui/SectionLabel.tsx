import { StyleSheet, Text, View } from "react-native";
import { colors, font, spacing } from "@mobile/constants/theme";

type Props = {
	children: string;
	icon?: React.ReactNode;
	accent?: boolean;
};

export function SectionLabel({ children, icon, accent = false }: Props) {
	return (
		<View style={styles.row}>
			{icon ? <View style={styles.icon}>{icon}</View> : null}
			<Text
				style={[
					styles.text,
					{ color: accent ? colors.accent : colors.textMuted },
				]}
			>
				{children.toUpperCase()}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
	},
	icon: {
		height: 14,
		width: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	text: {
		...font.label,
	},
});
