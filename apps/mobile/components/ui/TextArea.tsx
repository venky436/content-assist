import { forwardRef, useCallback, useState } from "react";
import {
	StyleSheet,
	TextInput,
	type TextInputProps,
	View,
} from "react-native";
import { colors, font, radius, spacing } from "@mobile/constants/theme";

type Props = TextInputProps & {
	minLines?: number;
	maxLines?: number;
};

export const TextArea = forwardRef<TextInput, Props>(function TextArea(
	{ minLines = 3, maxLines = 6, style, onFocus, onBlur, ...rest },
	ref,
) {
	const [focused, setFocused] = useState(false);
	const handleFocus = useCallback<NonNullable<TextInputProps["onFocus"]>>(
		(e) => {
			setFocused(true);
			onFocus?.(e);
		},
		[onFocus],
	);
	const handleBlur = useCallback<NonNullable<TextInputProps["onBlur"]>>(
		(e) => {
			setFocused(false);
			onBlur?.(e);
		},
		[onBlur],
	);

	const lineHeight = 22;
	const minHeight = minLines * lineHeight + spacing.lg;
	const maxHeight = maxLines * lineHeight + spacing.lg;

	return (
		<View
			style={[
				styles.container,
				{
					borderColor: focused ? colors.accent : colors.border,
					shadowColor: focused ? colors.accent : "transparent",
					shadowOpacity: focused ? 0.25 : 0,
					shadowRadius: 12,
				},
			]}
		>
			<TextInput
				ref={ref}
				multiline
				placeholderTextColor={colors.textMuted}
				selectionColor={colors.accent}
				onFocus={handleFocus}
				onBlur={handleBlur}
				style={[
					styles.input,
					{ minHeight, maxHeight },
					style,
				]}
				textAlignVertical="top"
				{...rest}
			/>
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		backgroundColor: colors.surfaceAlt,
		borderRadius: radius.lg,
		borderWidth: 1,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
	},
	input: {
		...font.body,
		color: colors.textPrimary,
		paddingVertical: spacing.sm,
	},
});
