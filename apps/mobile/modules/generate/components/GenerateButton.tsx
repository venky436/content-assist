import { StyleSheet, Text } from "react-native";
import { Button } from "@mobile/components/ui";

type Props = {
	onPress: () => void;
	loading?: boolean;
	disabled?: boolean;
	label?: string;
};

export function GenerateButton({ onPress, loading, disabled, label = "Generate" }: Props) {
	return (
		<Button
			label={loading ? "Generating…" : label}
			onPress={onPress}
			loading={loading}
			disabled={disabled}
			variant="primary"
			size="lg"
			fullWidth
			haptic="medium"
			iconLeft={<Text style={styles.icon}>✨</Text>}
		/>
	);
}

const styles = StyleSheet.create({
	icon: { fontSize: 16 },
});
