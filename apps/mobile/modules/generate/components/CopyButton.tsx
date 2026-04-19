import * as Clipboard from "expo-clipboard";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@mobile/components/ui";
import { colors } from "@mobile/constants/theme";
import { haptics } from "@mobile/lib/haptics";

type Props = {
	label?: string;
	getText: () => string;
	size?: "md" | "lg";
	variant?: "primary" | "secondary" | "ghost";
};

export function CopyButton({ label = "Copy", getText, size = "md", variant = "secondary" }: Props) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		try {
			await Clipboard.setStringAsync(getText());
			haptics.success();
			setCopied(true);
			setTimeout(() => setCopied(false), 1200);
		} catch {
			haptics.error();
		}
	}, [getText]);

	if (copied) {
		return (
			<View style={[styles.copiedPill, size === "lg" ? styles.lg : styles.md]}>
				<Text style={styles.copiedText}>✓ Copied</Text>
			</View>
		);
	}

	return (
		<Button
			label={label}
			onPress={handleCopy}
			variant={variant}
			size={size}
			haptic="light"
		/>
	);
}

const styles = StyleSheet.create({
	copiedPill: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 999,
		backgroundColor: colors.successSoft,
		borderWidth: 1,
		borderColor: colors.success,
	},
	md: {
		paddingHorizontal: 16,
		minHeight: 48,
	},
	lg: {
		paddingHorizontal: 24,
		minHeight: 56,
	},
	copiedText: {
		color: colors.success,
		fontWeight: "700",
		fontSize: 15,
	},
});
