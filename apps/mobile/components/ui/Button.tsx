import { forwardRef, useCallback } from "react";
import {
	ActivityIndicator,
	Pressable,
	type PressableProps,
	StyleSheet,
	Text,
	type TextStyle,
	View,
	type ViewStyle,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { colors, font, radius, shadow, spacing, timings } from "@mobile/constants/theme";
import { haptics } from "@mobile/lib/haptics";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

type Props = Omit<PressableProps, "style" | "onPress" | "children"> & {
	label: string;
	onPress?: () => void;
	variant?: Variant;
	size?: Size;
	loading?: boolean;
	iconLeft?: React.ReactNode;
	iconRight?: React.ReactNode;
	fullWidth?: boolean;
	haptic?: "selection" | "light" | "medium" | "none";
	style?: ViewStyle;
};

export const Button = forwardRef<View, Props>(function Button(
	{
		label,
		onPress,
		variant = "primary",
		size = "md",
		loading = false,
		iconLeft,
		iconRight,
		fullWidth = false,
		haptic = "medium",
		disabled,
		style,
		...rest
	},
	ref,
) {
	const scale = useSharedValue(1);
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const handlePressIn = useCallback(() => {
		scale.value = withTiming(0.97, { duration: timings.fast });
	}, [scale]);

	const handlePressOut = useCallback(() => {
		scale.value = withTiming(1, { duration: timings.fast });
	}, [scale]);

	const handlePress = useCallback(() => {
		if (disabled || loading) return;
		if (haptic === "selection") haptics.selection();
		else if (haptic === "light") haptics.tapLight();
		else if (haptic === "medium") haptics.tapMedium();
		onPress?.();
	}, [disabled, loading, haptic, onPress]);

	const containerStyles: ViewStyle[] = [
		styles.base,
		size === "lg" ? styles.sizeLg : styles.sizeMd,
		variantContainer[variant],
		fullWidth ? styles.fullWidth : null,
		disabled || loading ? styles.disabled : null,
		variant === "primary" && !disabled ? shadow.accent : null,
		style as ViewStyle,
	].filter(Boolean) as ViewStyle[];

	const labelStyle: TextStyle[] = [
		styles.labelBase,
		size === "lg" ? styles.labelLg : styles.labelMd,
		variantLabel[variant],
	];

	return (
		<Animated.View style={[animatedStyle, fullWidth ? { width: "100%" } : null]}>
			<Pressable
				ref={ref}
				onPress={handlePress}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				disabled={disabled || loading}
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityState={{ disabled: disabled || loading, busy: loading }}
				style={({ pressed }) => [
					...containerStyles,
					pressed ? { opacity: 0.92 } : null,
				]}
				{...rest}
			>
				{loading ? (
					<ActivityIndicator color={variantSpinner[variant]} />
				) : (
					<>
						{iconLeft ? <View style={styles.icon}>{iconLeft}</View> : null}
						<Text style={labelStyle}>{label}</Text>
						{iconRight ? <View style={styles.icon}>{iconRight}</View> : null}
					</>
				)}
			</Pressable>
		</Animated.View>
	);
});

const styles = StyleSheet.create({
	base: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: radius.pill,
		borderWidth: 1,
		gap: spacing.sm,
	},
	sizeMd: {
		paddingHorizontal: spacing.lg,
		minHeight: 48,
	},
	sizeLg: {
		paddingHorizontal: spacing.xl,
		minHeight: 56,
	},
	fullWidth: {
		alignSelf: "stretch",
	},
	disabled: {
		opacity: 0.5,
	},
	labelBase: {
		...font.bodyStrong,
		textAlign: "center",
	},
	labelMd: {
		fontSize: 15,
	},
	labelLg: {
		fontSize: 17,
	},
	icon: {
		height: 20,
		width: 20,
		alignItems: "center",
		justifyContent: "center",
	},
});

const variantContainer: Record<Variant, ViewStyle> = {
	primary: {
		backgroundColor: colors.accent,
		borderColor: colors.accent,
	},
	secondary: {
		backgroundColor: colors.surfaceAlt,
		borderColor: colors.border,
	},
	ghost: {
		backgroundColor: "transparent",
		borderColor: "transparent",
	},
	danger: {
		backgroundColor: colors.dangerSoft,
		borderColor: colors.danger,
	},
};

const variantLabel: Record<Variant, TextStyle> = {
	primary: { color: "#FFFFFF" },
	secondary: { color: colors.textPrimary },
	ghost: { color: colors.textPrimary },
	danger: { color: colors.danger },
};

const variantSpinner: Record<Variant, string> = {
	primary: "#FFFFFF",
	secondary: colors.textPrimary,
	ghost: colors.textPrimary,
	danger: colors.danger,
};
