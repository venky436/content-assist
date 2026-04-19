import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { colors, font, radius, spacing, timings } from "@mobile/constants/theme";
import { haptics } from "@mobile/lib/haptics";

type Props = {
	label: string;
	icon?: React.ReactNode;
	selected?: boolean;
	onPress?: () => void;
	accessibilityLabel?: string;
};

export function Chip({ label, icon, selected = false, onPress, accessibilityLabel }: Props) {
	const scale = useSharedValue(1);
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const handlePressIn = useCallback(() => {
		scale.value = withTiming(0.96, { duration: timings.fast });
	}, [scale]);
	const handlePressOut = useCallback(() => {
		scale.value = withTiming(1, { duration: timings.fast });
	}, [scale]);
	const handlePress = useCallback(() => {
		haptics.selection();
		onPress?.();
	}, [onPress]);

	return (
		<Animated.View style={[styles.wrap, animatedStyle]}>
			<Pressable
				onPress={handlePress}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				accessibilityRole="button"
				accessibilityLabel={accessibilityLabel ?? label}
				accessibilityState={{ selected }}
				style={[
					styles.chip,
					{
						backgroundColor: selected ? colors.accentSoft : colors.surfaceAlt,
						borderColor: selected ? colors.accent : colors.border,
					},
				]}
			>
				{icon ? <View style={styles.icon}>{icon}</View> : null}
				<Text
					style={[
						styles.label,
						{ color: selected ? colors.textPrimary : colors.textSecondary },
					]}
				>
					{label}
				</Text>
			</Pressable>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	wrap: { flexShrink: 0 },
	chip: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: spacing.lg,
		paddingVertical: 10,
		borderRadius: radius.pill,
		borderWidth: 1,
		minHeight: 44,
	},
	icon: {
		marginRight: spacing.sm,
	},
	label: {
		...font.bodyStrong,
		fontSize: 14,
	},
});
