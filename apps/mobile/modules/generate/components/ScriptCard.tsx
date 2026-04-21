import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { GenerateScriptResponse } from "@content-assist/shared";
import { Card, SectionLabel } from "@mobile/components/ui";
import { colors, font, radius, spacing } from "@mobile/constants/theme";
import { CopyButton } from "@mobile/modules/generate/components/CopyButton";
import { Button } from "@mobile/components/ui";

type Props = {
	script: GenerateScriptResponse;
	onRegenerate?: () => void;
	onImproveHook?: () => void;
	regenerating?: boolean;
	improving?: boolean;
};

export function ScriptCard({
	script,
	onRegenerate,
	onImproveHook,
	regenerating = false,
	improving = false,
}: Props) {
	const fullText = `${script.hook}\n\n${script.lines.join("\n")}\n\n${script.cta}`;
	const busy = regenerating || improving;

	return (
		<Animated.View entering={FadeInDown.duration(220)}>
			<Card padded>
				<View style={styles.block}>
					<SectionLabel accent>Hook</SectionLabel>
					<Text style={styles.hook} accessibilityLabel={`Hook: ${script.hook}`}>
						{script.hook}
					</Text>
				</View>

				<View style={styles.divider} />

				<View style={styles.block}>
					<SectionLabel>Spoken lines</SectionLabel>
					<View style={styles.linesRow}>
						<View style={styles.accentBar} />
						<View style={styles.linesList}>
							{script.lines.map((line, idx) => (
								<View key={`line-${idx}`} style={styles.lineRow}>
									<Text style={styles.lineNum}>{idx + 1}</Text>
									<Text style={styles.lineText}>{line}</Text>
								</View>
							))}
						</View>
					</View>
				</View>

				<View style={styles.divider} />

				<View style={styles.block}>
					<SectionLabel>Closing CTA</SectionLabel>
					<Text style={styles.cta}>{script.cta}</Text>
				</View>

				<View style={styles.actions}>
					<CopyButton
						label="Copy script"
						getText={() => fullText}
						size="md"
						variant="primary"
					/>
					{onRegenerate ? (
						<Button
							label={regenerating ? "Regenerating…" : "Regenerate script"}
							onPress={onRegenerate}
							variant="secondary"
							size="md"
							loading={regenerating}
							disabled={busy}
							haptic="light"
						/>
					) : null}
					{onImproveHook ? (
						<Button
							label={improving ? "Improving…" : "Improve hook"}
							onPress={onImproveHook}
							variant="ghost"
							size="md"
							loading={improving}
							disabled={busy}
							haptic="light"
						/>
					) : null}
				</View>
			</Card>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	block: {
		gap: spacing.sm,
	},
	hook: {
		...font.h1,
		color: colors.textPrimary,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: colors.border,
		marginVertical: spacing.lg,
	},
	linesRow: {
		flexDirection: "row",
		gap: spacing.md,
		marginTop: spacing.xs,
	},
	accentBar: {
		width: 3,
		borderRadius: radius.pill,
		backgroundColor: colors.accent,
		alignSelf: "stretch",
	},
	linesList: {
		flex: 1,
		gap: spacing.md,
	},
	lineRow: {
		flexDirection: "row",
		gap: spacing.md,
		alignItems: "flex-start",
	},
	lineNum: {
		...font.caption,
		color: colors.textMuted,
		fontVariant: ["tabular-nums"],
		fontWeight: "700",
		minWidth: 16,
		paddingTop: 2,
	},
	lineText: {
		...font.body,
		color: colors.textPrimary,
		flex: 1,
		lineHeight: 24,
	},
	cta: {
		...font.bodyStrong,
		color: colors.accent,
		lineHeight: 24,
	},
	actions: {
		marginTop: spacing.xl,
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.sm,
	},
});
