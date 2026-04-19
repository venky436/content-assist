import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { Button, Chip, TextArea } from "@mobile/components/ui";
import { colors, font, radius, spacing } from "@mobile/constants/theme";

const PRESETS = [
	{ label: "🎭  More dramatic", value: "more dramatic" },
	{ label: "🎨  Minimal / clean", value: "minimal and clean, lots of negative space" },
	{ label: "🌈  Vibrant colors", value: "vibrant, saturated colors" },
	{ label: "🌙  Moody / dark", value: "moody, dark, atmospheric" },
];

type Props = {
	visible: boolean;
	onPick: (modifier: string | undefined) => void;
	onCancel: () => void;
};

export function ModifierSheet({ visible, onPick, onCancel }: Props) {
	const [customValue, setCustomValue] = useState("");
	const [mode, setMode] = useState<"presets" | "custom">("presets");

	const reset = () => {
		setCustomValue("");
		setMode("presets");
	};
	const close = () => {
		reset();
		onCancel();
	};
	const pickPreset = (value: string) => {
		reset();
		onPick(value);
	};
	const pickNone = () => {
		reset();
		onPick(undefined);
	};
	const pickCustom = () => {
		const trimmed = customValue.trim();
		if (trimmed.length < 3) return;
		reset();
		onPick(trimmed.slice(0, 80));
	};

	return (
		<Modal transparent visible={visible} onRequestClose={close} animationType="none">
			<Animated.View entering={FadeIn.duration(160)} style={styles.backdrop}>
				<Pressable style={StyleSheet.absoluteFill} onPress={close} />
				<Animated.View
					entering={SlideInDown.springify().damping(18).mass(0.6)}
					style={styles.sheet}
				>
					<View style={styles.handle} />
					<Text style={styles.title}>
						{mode === "presets" ? "Regenerate as…" : "Custom style"}
					</Text>
					<Text style={styles.subtitle}>
						{mode === "presets"
							? "Pick a direction for the rewrite."
							: "Describe the feel in a few words."}
					</Text>

					{mode === "presets" ? (
						<>
							<View style={styles.chips}>
								{PRESETS.map((preset) => (
									<Chip
										key={preset.value}
										label={preset.label}
										onPress={() => pickPreset(preset.value)}
									/>
								))}
								<Chip
									label="✏️  Custom…"
									onPress={() => setMode("custom")}
								/>
							</View>

							<View style={styles.actions}>
								<Button
									label="Same style"
									onPress={pickNone}
									variant="secondary"
									size="md"
									fullWidth
									haptic="light"
								/>
							</View>
						</>
					) : (
						<>
							<TextArea
								value={customValue}
								onChangeText={(t) => setCustomValue(t.slice(0, 80))}
								placeholder="e.g. soft pastel illustration, 90s magazine"
								minLines={2}
								maxLines={3}
								autoFocus
							/>
							<View style={styles.actions}>
								<Button
									label="Back"
									onPress={() => setMode("presets")}
									variant="secondary"
									size="md"
									fullWidth
									haptic="light"
								/>
								<Button
									label="Regenerate"
									onPress={pickCustom}
									variant="primary"
									size="md"
									fullWidth
									haptic="medium"
									disabled={customValue.trim().length < 3}
								/>
							</View>
						</>
					)}
				</Animated.View>
			</Animated.View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: colors.overlay,
		justifyContent: "flex-end",
	},
	sheet: {
		backgroundColor: colors.bgElevated,
		borderTopLeftRadius: radius.xxl,
		borderTopRightRadius: radius.xxl,
		borderTopWidth: 1,
		borderLeftWidth: 1,
		borderRightWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.md,
		paddingBottom: spacing.xxl + spacing.md,
		gap: spacing.md,
	},
	handle: {
		width: 40,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.border,
		alignSelf: "center",
		marginBottom: spacing.sm,
	},
	title: { ...font.h1, color: colors.textPrimary, fontSize: 22 },
	subtitle: { ...font.body, color: colors.textSecondary },
	chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
	actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
});
