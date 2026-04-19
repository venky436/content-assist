import { useEffect } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { colors, radius } from "@mobile/constants/theme";

type Props = {
	height?: number;
	width?: number | `${number}%`;
	style?: ViewStyle;
	rounded?: keyof typeof radius;
};

export function Skeleton({ height = 16, width = "100%", style, rounded = "md" }: Props) {
	const opacity = useSharedValue(0.35);

	useEffect(() => {
		opacity.value = withRepeat(
			withTiming(0.8, { duration: 900, easing: Easing.inOut(Easing.ease) }),
			-1,
			true,
		);
	}, [opacity]);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	return (
		<Animated.View
			style={[
				styles.base,
				{ height, width, borderRadius: radius[rounded] },
				animatedStyle,
				style,
			]}
		/>
	);
}

const styles = StyleSheet.create({
	base: {
		backgroundColor: colors.surfaceAlt,
	},
});
