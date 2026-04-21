import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Button } from "@mobile/components/ui";
import { colors, font, radius, spacing } from "@mobile/constants/theme";

type Props = {
	message: string;
	code?: string;
	onRetry: () => void;
};

export function ImageErrorState({ message, code, onRetry }: Props) {
	const isTimeout = code === "timeout";
	const isOutOfCredit = code === "insufficient_credit";
	const isRateLimited = code === "rate_limited";
	const icon = isTimeout ? "⏱" : isOutOfCredit ? "$" : isRateLimited ? "⏳" : "!";
	const title = isTimeout
		? "Images took too long"
		: isOutOfCredit
			? "Out of image credit"
			: isRateLimited
				? "Rate limit hit"
				: "Couldn't generate images";
	return (
		<Animated.View entering={FadeIn.duration(180)} style={styles.wrap}>
			<View style={styles.iconWrap}>
				<Text style={styles.icon}>{icon}</Text>
			</View>
			<View style={styles.content}>
				<Text style={styles.title}>{title}</Text>
				<Text style={styles.message}>{message}</Text>
			</View>
			{!isOutOfCredit && (
				<Button label="Retry" onPress={onRetry} variant="danger" />
			)}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		flexDirection: "row",
		alignItems: "center",
		padding: spacing.lg,
		borderRadius: radius.lg,
		backgroundColor: colors.dangerSoft,
		borderWidth: 1,
		borderColor: colors.danger,
		gap: spacing.md,
	},
	iconWrap: {
		height: 36,
		width: 36,
		borderRadius: radius.pill,
		backgroundColor: colors.danger,
		alignItems: "center",
		justifyContent: "center",
	},
	icon: { color: "#fff", fontWeight: "900", fontSize: 18 },
	content: { flex: 1, gap: 2 },
	title: { ...font.bodyStrong, color: colors.textPrimary },
	message: { ...font.caption, color: colors.textSecondary },
});
