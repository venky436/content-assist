import { StyleSheet, Text } from "react-native";
import { Button } from "@mobile/components/ui";

type Props = {
	onPress: () => void;
	loading?: boolean;
	disabled?: boolean;
};

export function GenerateVideoButton({ onPress, loading = false, disabled }: Props) {
	return (
		<Button
			label={loading ? "Composing video…" : "🎬  Generate video"}
			onPress={onPress}
			variant="primary"
			size="lg"
			fullWidth
			loading={loading}
			disabled={disabled || loading}
			haptic="medium"
			iconLeft={<Text style={styles.icon}>{loading ? "" : ""}</Text>}
		/>
	);
}

const styles = StyleSheet.create({
	icon: { fontSize: 14 },
});
