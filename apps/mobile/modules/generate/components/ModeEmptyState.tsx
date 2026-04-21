import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { GenerateMode } from "@content-assist/shared";
import { Card } from "@mobile/components/ui";
import { colors, font, radius, spacing } from "@mobile/constants/theme";

type Props = {
	mode: GenerateMode;
};

const COPY: Record<GenerateMode, { glyph: string; title: string; body: string }> = {
	on_camera: {
		glyph: "🎤",
		title: "Ready to script on camera",
		body: "You'll get a crisp hook, 3–5 spoken lines, and a closing CTA — everything you need to press record.",
	},
	faceless: {
		glyph: "🎬",
		title: "Ready to build a faceless post",
		body: "You'll get 5 viral hooks, a tight caption, and India-relevant hashtags — optional images too.",
	},
};

export function ModeEmptyState({ mode }: Props) {
	const copy = COPY[mode];
	return (
		<Animated.View entering={FadeIn.duration(180)}>
			<Card padded>
				<View style={styles.glyphWrap}>
					<Text style={styles.glyph}>{copy.glyph}</Text>
				</View>
				<Text style={styles.title}>{copy.title}</Text>
				<Text style={styles.body}>{copy.body}</Text>
				<View style={styles.tip}>
					<Text style={styles.tipText}>Tap Generate to create.</Text>
				</View>
			</Card>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	glyphWrap: {
		alignSelf: "flex-start",
		height: 48,
		width: 48,
		borderRadius: radius.lg,
		backgroundColor: colors.accentSoft,
		borderWidth: 1,
		borderColor: colors.accent,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: spacing.md,
	},
	glyph: {
		fontSize: 22,
	},
	title: {
		...font.h2,
		color: colors.textPrimary,
		marginBottom: spacing.xs,
	},
	body: {
		...font.body,
		color: colors.textSecondary,
		lineHeight: 22,
	},
	tip: {
		marginTop: spacing.md,
		alignSelf: "flex-start",
		paddingHorizontal: spacing.md,
		paddingVertical: 6,
		backgroundColor: colors.surfaceAlt,
		borderRadius: radius.pill,
		borderWidth: 1,
		borderColor: colors.border,
	},
	tipText: {
		...font.caption,
		color: colors.textSecondary,
		fontWeight: "700",
	},
});
