import { useCallback, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import type { GenerateMode } from "@content-assist/shared";
import { colors, font, radius, shadow, spacing, timings } from "@mobile/constants/theme";
import { haptics } from "@mobile/lib/haptics";

type Option = {
	value: GenerateMode;
	label: string;
	glyph: string;
	accessibilityLabel: string;
};

const OPTIONS: Option[] = [
	{
		value: "on_camera",
		label: "On Camera",
		glyph: "🎤",
		accessibilityLabel: "On Camera mode — generate a spoken script",
	},
	{
		value: "faceless",
		label: "Faceless",
		glyph: "🎬",
		accessibilityLabel: "Faceless mode — generate hooks, caption, and hashtags",
	},
];

type Props = {
	value: GenerateMode;
	onChange: (mode: GenerateMode) => void;
	disabled?: boolean;
};

export function ModeToggle({ value, onChange, disabled }: Props) {
	const [trackWidth, setTrackWidth] = useState(0);
	const offset = useSharedValue(value === "on_camera" ? 0 : 1);

	const handleLayout = useCallback((e: LayoutChangeEvent) => {
		setTrackWidth(e.nativeEvent.layout.width);
	}, []);

	const handlePress = useCallback(
		(next: GenerateMode) => {
			if (disabled) return;
			if (next === value) return;
			haptics.selection();
			offset.value = withTiming(next === "on_camera" ? 0 : 1, {
				duration: timings.base,
			});
			onChange(next);
		},
		[disabled, offset, onChange, value],
	);

	const pillStyle = useAnimatedStyle(() => {
		if (trackWidth === 0) return { opacity: 0 };
		const segmentWidth = trackWidth / 2;
		return {
			opacity: 1,
			width: segmentWidth,
			transform: [{ translateX: offset.value * segmentWidth }],
		};
	});

	return (
		<View
			style={[styles.track, disabled && styles.trackDisabled]}
			onLayout={handleLayout}
			accessibilityRole="tablist"
		>
			<Animated.View style={[styles.pill, shadow.accent, pillStyle]} pointerEvents="none" />
			{OPTIONS.map((option) => {
				const selected = option.value === value;
				return (
					<Pressable
						key={option.value}
						onPress={() => handlePress(option.value)}
						disabled={disabled}
						accessibilityRole="tab"
						accessibilityState={{ selected, disabled: !!disabled }}
						accessibilityLabel={option.accessibilityLabel}
						style={styles.segment}
					>
						<Text
							style={styles.glyph}
							// Prevent system font scaling from breaking the pill height
							allowFontScaling={false}
						>
							{option.glyph}
						</Text>
						<Text
							style={[
								styles.label,
								{ color: selected ? colors.textPrimary : colors.textSecondary },
							]}
						>
							{option.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	track: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: colors.surfaceAlt,
		borderRadius: radius.pill,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 4,
		position: "relative",
		minHeight: 52,
	},
	trackDisabled: {
		opacity: 0.6,
	},
	pill: {
		position: "absolute",
		top: 4,
		bottom: 4,
		left: 4,
		backgroundColor: colors.accent,
		borderRadius: radius.pill,
	},
	segment: {
		flex: 1,
		minHeight: 44,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	glyph: {
		fontSize: 16,
	},
	label: {
		...font.bodyStrong,
		fontSize: 15,
	},
});
