import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Card, Skeleton } from "@mobile/components/ui";
import { colors, spacing } from "@mobile/constants/theme";

export function ScriptSkeleton() {
	return (
		<Animated.View entering={FadeIn.duration(180)}>
			<Card padded>
				<View style={styles.block}>
					<Skeleton width={60} height={12} rounded="sm" />
					<View style={styles.hookRows}>
						<Skeleton height={26} />
						<Skeleton height={26} width="70%" />
					</View>
				</View>
				<View style={styles.divider} />
				<View style={styles.block}>
					<Skeleton width={110} height={12} rounded="sm" />
					<View style={styles.linesList}>
						<Skeleton height={18} />
						<Skeleton height={18} width="92%" />
						<Skeleton height={18} width="85%" />
						<Skeleton height={18} width="88%" />
					</View>
				</View>
				<View style={styles.divider} />
				<View style={styles.block}>
					<Skeleton width={96} height={12} rounded="sm" />
					<Skeleton height={20} width="80%" />
				</View>
				<View style={styles.actions}>
					<Skeleton height={48} width={150} rounded="pill" />
					<Skeleton height={48} width={170} rounded="pill" />
				</View>
			</Card>
			<View style={styles.hashtagsBlock}>
				<Skeleton width={120} height={12} rounded="sm" />
				<View style={styles.tagRow}>
					<Skeleton height={28} width={90} rounded="pill" />
					<Skeleton height={28} width={110} rounded="pill" />
					<Skeleton height={28} width={80} rounded="pill" />
					<Skeleton height={28} width={120} rounded="pill" />
				</View>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	block: { gap: spacing.sm },
	hookRows: { gap: spacing.sm, marginTop: spacing.xs },
	divider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: colors.border,
		marginVertical: spacing.lg,
	},
	linesList: { gap: spacing.md, marginTop: spacing.xs },
	actions: {
		marginTop: spacing.xl,
		flexDirection: "row",
		gap: spacing.sm,
	},
	hashtagsBlock: {
		marginTop: spacing.xl,
		gap: spacing.md,
	},
	tagRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.sm,
	},
});
