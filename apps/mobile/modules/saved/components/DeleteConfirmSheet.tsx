import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { Button } from "@mobile/components/ui";
import { colors, font, radius, spacing } from "@mobile/constants/theme";

type Props = {
	visible: boolean;
	title?: string;
	message?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	confirmVariant?: "primary" | "danger";
	onConfirm: () => void;
	onCancel: () => void;
};

export function ConfirmSheet({
	visible,
	title = "Are you sure?",
	message,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	confirmVariant = "danger",
	onConfirm,
	onCancel,
}: Props) {
	return (
		<Modal transparent visible={visible} onRequestClose={onCancel} animationType="none">
			<Animated.View
				entering={FadeIn.duration(160)}
				style={styles.backdrop}
			>
				<Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
				<Animated.View
					entering={SlideInDown.springify().damping(18).mass(0.6)}
					style={styles.sheet}
				>
					<View style={styles.handle} />
					<Text style={styles.title}>{title}</Text>
					{message ? <Text style={styles.message}>{message}</Text> : null}
					<View style={styles.actions}>
						<Button
							label={cancelLabel}
							onPress={onCancel}
							variant="secondary"
							size="lg"
							fullWidth
							haptic="light"
						/>
						<Button
							label={confirmLabel}
							onPress={onConfirm}
							variant={confirmVariant}
							size="lg"
							fullWidth
							haptic="medium"
						/>
					</View>
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
	title: {
		...font.h1,
		color: colors.textPrimary,
		fontSize: 22,
	},
	message: {
		...font.body,
		color: colors.textSecondary,
		lineHeight: 22,
	},
	actions: {
		gap: spacing.sm,
		marginTop: spacing.md,
	},
});
