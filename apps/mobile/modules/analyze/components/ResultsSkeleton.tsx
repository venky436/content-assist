import { StyleSheet, View } from "react-native";
import { Card, Skeleton } from "@mobile/components/ui";
import { radius, spacing } from "@mobile/constants/theme";

export function ResultsSkeleton() {
	return (
		<View style={styles.wrap}>
			<View style={[styles.scoreBlock]}>
				<Skeleton height={12} width={100} />
				<View style={{ height: spacing.md }} />
				<Skeleton height={64} width={160} />
				<View style={{ height: spacing.md }} />
				<Skeleton height={20} width={100} rounded="pill" />
				<View style={{ height: spacing.md }} />
				<Skeleton height={14} width="90%" />
				<View style={{ height: spacing.xs }} />
				<Skeleton height={14} width="70%" />
			</View>

			<View style={styles.section}>
				<Skeleton height={12} width={140} />
				<Card padded>
					<Skeleton height={14} width="90%" />
					<View style={{ height: spacing.sm }} />
					<Skeleton height={14} width="70%" />
				</Card>
			</View>

			<View style={styles.section}>
				<Skeleton height={12} width={90} />
				<View style={styles.chips}>
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} height={28} width={90} rounded="pill" />
					))}
				</View>
			</View>

			<View style={styles.section}>
				<Skeleton height={12} width={120} />
				<Card padded>
					<Skeleton height={22} width="90%" />
					<View style={{ height: spacing.md }} />
					<Skeleton height={12} width="60%" />
				</Card>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { gap: spacing.xl },
	scoreBlock: {
		padding: spacing.xl,
		borderRadius: radius.xxl,
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.03)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.06)",
	},
	section: { gap: spacing.md },
	chips: { flexDirection: "row", gap: spacing.sm },
});
