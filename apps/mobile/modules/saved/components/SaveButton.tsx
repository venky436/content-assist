import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@mobile/components/ui";
import { colors, font, radius, spacing } from "@mobile/constants/theme";
import { haptics } from "@mobile/lib/haptics";

type Props = {
	onSave: () => Promise<unknown> | unknown;
	label?: string;
	size?: "md" | "lg";
	variant?: "primary" | "secondary";
	fullWidth?: boolean;
};

export function SaveButton({
	onSave,
	label = "Save",
	size = "md",
	variant = "secondary",
	fullWidth = true,
}: Props) {
	const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

	const handlePress = useCallback(async () => {
		if (state !== "idle") return;
		setState("saving");
		try {
			await onSave();
			haptics.success();
			setState("saved");
			setTimeout(() => setState("idle"), 1400);
		} catch {
			haptics.error();
			setState("idle");
		}
	}, [onSave, state]);

	if (state === "saved") {
		return (
			<View style={[styles.savedPill, size === "lg" ? styles.savedLg : styles.savedMd]}>
				<Text style={styles.savedText}>✓ Saved</Text>
			</View>
		);
	}

	return (
		<Button
			label={state === "saving" ? "Saving…" : label}
			onPress={handlePress}
			loading={state === "saving"}
			disabled={state === "saving"}
			variant={variant}
			size={size}
			fullWidth={fullWidth}
			haptic="light"
			iconLeft={<Text style={styles.icon}>💾</Text>}
		/>
	);
}

const styles = StyleSheet.create({
	icon: { fontSize: 14 },
	savedPill: {
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.successSoft,
		borderRadius: radius.pill,
		borderWidth: 1,
		borderColor: colors.success,
		alignSelf: "stretch",
	},
	savedMd: { minHeight: 48 },
	savedLg: { minHeight: 56 },
	savedText: {
		...font.bodyStrong,
		color: colors.success,
		fontWeight: "700",
	},
});
