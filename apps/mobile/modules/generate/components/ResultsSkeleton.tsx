import { StyleSheet, View } from "react-native";
import { Card, Skeleton } from "@mobile/components/ui";
import { spacing } from "@mobile/constants/theme";

export function ResultsSkeleton() {
	return (
		<View style={styles.wrap}>
			<View style={styles.section}>
				<Skeleton height={12} width={120} />
				<Card padded>
					{[0, 1, 2, 3, 4].map((i) => (
						<View key={i} style={styles.row}>
							<Skeleton height={26} width={26} rounded="pill" />
							<View style={styles.hookText}>
								<Skeleton height={14} width="80%" />
							</View>
						</View>
					))}
				</Card>
			</View>

			<View style={styles.section}>
				<Skeleton height={12} width={80} />
				<Card padded>
					<Skeleton height={14} width="100%" />
					<View style={{ height: spacing.sm }} />
					<Skeleton height={14} width="70%" />
				</Card>
			</View>

			<View style={styles.section}>
				<Skeleton height={12} width={100} />
				<Card padded>
					<View style={styles.tags}>
						{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
							<Skeleton key={i} height={28} width={72} rounded="pill" />
						))}
					</View>
				</Card>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { gap: spacing.xl },
	section: { gap: spacing.md },
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: spacing.md,
		gap: spacing.md,
	},
	hookText: { flex: 1 },
	tags: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.sm,
	},
});
