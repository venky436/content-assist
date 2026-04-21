import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Card, Skeleton } from "@mobile/components/ui";
import { colors, font, radius, spacing } from "@mobile/constants/theme";

export function VideoSkeleton() {
	return (
		<Animated.View entering={FadeIn.duration(180)}>
			<Card padded>
				<View style={styles.preview}>
					<Skeleton height={220} rounded="lg" />
					<View style={styles.iconOverlay}>
						<Text style={styles.icon}>🎬</Text>
					</View>
				</View>
				<View style={styles.caption}>
					<Text style={styles.title}>Composing your reel…</Text>
					<Text style={styles.body}>
						Rendering scenes with Ken Burns motion, mixing voiceover + background
						music. ~10–20 seconds.
					</Text>
				</View>
				<View style={styles.actions}>
					<Skeleton height={44} width={150} rounded="pill" />
					<Skeleton height={44} width={120} rounded="pill" />
				</View>
			</Card>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	preview: {
		position: "relative",
		borderRadius: radius.lg,
		overflow: "hidden",
	},
	iconOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: "center",
		justifyContent: "center",
	},
	icon: { fontSize: 44, opacity: 0.6 },
	caption: { gap: 4, marginTop: spacing.lg },
	title: { ...font.bodyStrong, color: colors.textPrimary },
	body: { ...font.caption, color: colors.textSecondary },
	actions: {
		marginTop: spacing.lg,
		flexDirection: "row",
		gap: spacing.sm,
	},
});
