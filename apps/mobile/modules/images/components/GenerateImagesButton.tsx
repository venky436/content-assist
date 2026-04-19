import { StyleSheet, Text } from "react-native";
import { Button } from "@mobile/components/ui";

type Props = {
	onPress: () => void;
	loading?: boolean;
	disabled?: boolean;
	label?: string;
};

export function GenerateImagesButton({
	onPress,
	loading,
	disabled,
	label = "Generate images",
}: Props) {
	return (
		<Button
			label={loading ? "Generating images…" : label}
			onPress={onPress}
			loading={loading}
			disabled={disabled || loading}
			variant="secondary"
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
