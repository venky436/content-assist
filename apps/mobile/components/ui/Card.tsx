import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radius, shadow, spacing } from "@mobile/constants/theme";

type Props = {
	children: ReactNode;
	style?: ViewStyle | ViewStyle[];
	padded?: boolean;
	variant?: "default" | "subtle";
};

export function Card({ children, style, padded = true, variant = "default" }: Props) {
	const bg = variant === "subtle" ? colors.bgElevated : colors.surface;
	return (
		<View
			style={[
				styles.card,
				{ backgroundColor: bg },
				padded ? styles.padded : null,
				shadow.card,
				style,
			]}
		>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.border,
	},
	padded: {
		padding: spacing.lg,
	},
});
