import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { colors, radius, spacing } from "@mobile/constants/theme";

function Shimmer() {
	const opacity = useSharedValue(0.35);
	useEffect(() => {
		opacity.value = withRepeat(
			withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }),
			-1,
			true,
		);
	}, [opacity]);
	const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
	return <Animated.View style={[styles.fill, style]} />;
}

export function ImageLoadingSkeleton() {
	return (
		<View style={styles.row}>
			<View style={styles.tile}>
				<Shimmer />
			</View>
			<View style={styles.tile}>
				<Shimmer />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", gap: spacing.md },
	tile: {
		flex: 1,
		aspectRatio: 1,
		borderRadius: radius.lg,
		overflow: "hidden",
		backgroundColor: colors.surfaceAlt,
	},
	fill: {
		flex: 1,
		backgroundColor: colors.surface,
	},
});
