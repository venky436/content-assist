import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SavedPost } from "@content-assist/shared";
import { colors, font, spacing } from "@mobile/constants/theme";
import { haptics } from "@mobile/lib/haptics";
import { ConfirmSheet } from "@mobile/modules/saved/components/DeleteConfirmSheet";
import { EmptySavedState } from "@mobile/modules/saved/components/EmptySavedState";
import { SavedPostCard } from "@mobile/modules/saved/components/SavedPostCard";
import { useDeleteSavedPost, useSavedPosts } from "@mobile/modules/saved/hooks";

export default function SavedScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const { data: posts, isLoading, refetch, isRefetching } = useSavedPosts();
	const deletePost = useDeleteSavedPost();
	const [pendingDelete, setPendingDelete] = useState<SavedPost | null>(null);

	const handleOpen = useCallback(
		(post: SavedPost) => {
			router.push({ pathname: "/saved/[id]", params: { id: post.id } });
		},
		[router],
	);

	const handleLongPress = useCallback((post: SavedPost) => {
		setPendingDelete(post);
	}, []);

	const handleConfirmDelete = useCallback(() => {
		if (!pendingDelete) return;
		deletePost.mutate(pendingDelete.id);
		haptics.success();
		setPendingDelete(null);
	}, [deletePost, pendingDelete]);

	const renderItem = useCallback(
		({ item, index }: { item: SavedPost; index: number }) => (
			<SavedPostCard
				post={item}
				index={index}
				onPress={() => handleOpen(item)}
				onLongPress={() => handleLongPress(item)}
			/>
		),
		[handleLongPress, handleOpen],
	);

	const isEmpty = !isLoading && (!posts || posts.length === 0);

	return (
		<View style={styles.root}>
			{isEmpty ? (
				<FlatList
					data={[]}
					renderItem={null}
					ListEmptyComponent={<EmptySavedState />}
					contentContainerStyle={[
						styles.emptyScroll,
						{
							paddingTop: insets.top + spacing.xl,
							paddingBottom: insets.bottom + spacing.xxxl,
						},
					]}
					refreshControl={
						<RefreshControl
							refreshing={isRefetching}
							onRefresh={refetch}
							tintColor={colors.accent}
						/>
					}
					ListHeaderComponent={<Hero />}
				/>
			) : (
				<FlatList
					data={posts ?? []}
					keyExtractor={(post) => post.id}
					renderItem={renderItem}
					contentContainerStyle={[
						styles.scroll,
						{
							paddingTop: insets.top + spacing.xl,
							paddingBottom: insets.bottom + spacing.xxxl,
						},
					]}
					ListHeaderComponent={<Hero count={posts?.length ?? 0} />}
					refreshControl={
						<RefreshControl
							refreshing={isRefetching}
							onRefresh={refetch}
							tintColor={colors.accent}
						/>
					}
					showsVerticalScrollIndicator={false}
				/>
			)}

			<ConfirmSheet
				visible={Boolean(pendingDelete)}
				title="Delete this saved post?"
				message={
					pendingDelete
						? `"${pendingDelete.idea.slice(0, 80)}${pendingDelete.idea.length > 80 ? "…" : ""}"`
						: undefined
				}
				confirmLabel="Delete"
				cancelLabel="Keep"
				confirmVariant="danger"
				onConfirm={handleConfirmDelete}
				onCancel={() => setPendingDelete(null)}
			/>
		</View>
	);
}

function Hero({ count }: { count?: number }) {
	return (
		<View style={styles.hero}>
			<View style={styles.badge}>
				<Text style={styles.badgeText}>YOUR WORKSPACE</Text>
			</View>
			<Text style={styles.title}>Saved posts</Text>
			<Text style={styles.subtitle}>
				{count === undefined
					? "Everything you've kept, in one place."
					: `${count} ${count === 1 ? "post" : "posts"} saved. Long-press any card to delete.`}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: colors.bg },
	scroll: {
		paddingHorizontal: spacing.lg,
	},
	emptyScroll: {
		paddingHorizontal: spacing.lg,
		flexGrow: 1,
	},
	hero: {
		gap: spacing.sm,
		marginBottom: spacing.xl,
	},
	badge: {
		alignSelf: "flex-start",
		paddingHorizontal: spacing.md,
		paddingVertical: 6,
		backgroundColor: colors.accentSoft,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.accent,
	},
	badgeText: {
		...font.label,
		color: colors.accent,
	},
	title: {
		...font.display,
		color: colors.textPrimary,
		fontSize: 32,
	},
	subtitle: {
		...font.body,
		color: colors.textSecondary,
		lineHeight: 22,
	},
});
