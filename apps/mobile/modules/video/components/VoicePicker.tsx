import { useCallback, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import type { VideoVoice } from "@content-assist/shared";
import { colors, font, radius, spacing, timings } from "@mobile/constants/theme";
import { haptics } from "@mobile/lib/haptics";

type Option = {
	value: VideoVoice;
	label: string;
	glyph: string;
	hint: string;
};

// Mobile keeps the 2-option simple toggle for now (admin has the 6-voice
// picker with previews). Uses the same VideoVoice enum values the server
// expects — nova is our default bright/female voice, onyx is the deep male.
const OPTIONS: Option[] = [
	{ value: "nova", label: "Female", glyph: "🎤", hint: "Bright, confident" },
	{ value: "onyx", label: "Male", glyph: "🎙️", hint: "Deep, grounded" },
];

type Props = {
	value: VideoVoice;
	onChange: (next: VideoVoice) => void;
	disabled?: boolean;
};

export function VoicePicker({ value, onChange, disabled }: Props) {
	const [trackWidth, setTrackWidth] = useState(0);
	const offset = useSharedValue(value === "nova" ? 0 : 1);

	const handleLayout = useCallback((e: LayoutChangeEvent) => {
		setTrackWidth(e.nativeEvent.layout.width);
	}, []);

	const handlePress = useCallback(
		(next: VideoVoice) => {
			if (disabled) return;
			if (next === value) return;
			haptics.selection();
			offset.value = withTiming(next === "nova" ? 0 : 1, {
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
		<View style={styles.wrap}>
			<Text style={styles.label}>Voice</Text>
			<View
				style={[styles.track, disabled && styles.trackDisabled]}
				onLayout={handleLayout}
				accessibilityRole="tablist"
			>
				<Animated.View style={[styles.pill, pillStyle]} pointerEvents="none" />
				{OPTIONS.map((option) => {
					const selected = option.value === value;
					return (
						<Pressable
							key={option.value}
							onPress={() => handlePress(option.value)}
							disabled={disabled}
							accessibilityRole="tab"
							accessibilityState={{ selected, disabled: !!disabled }}
							accessibilityLabel={`${option.label} voice — ${option.hint}`}
							style={styles.segment}
						>
							<Text style={styles.glyph} allowFontScaling={false}>
								{option.glyph}
							</Text>
							<Text
								style={[
									styles.segmentLabel,
									{ color: selected ? colors.textPrimary : colors.textSecondary },
								]}
							>
								{option.label}
							</Text>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		gap: spacing.sm,
	},
	label: {
		...font.label,
		color: colors.textMuted,
		marginLeft: spacing.xs,
	},
	track: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: colors.surfaceAlt,
		borderRadius: radius.pill,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 4,
		position: "relative",
		minHeight: 48,
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
		minHeight: 40,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.sm,
		paddingHorizontal: spacing.md,
	},
	glyph: {
		fontSize: 14,
	},
	segmentLabel: {
		...font.bodyStrong,
		fontSize: 14,
	},
});
