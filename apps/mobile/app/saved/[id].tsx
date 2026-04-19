import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, SectionLabel } from "@mobile/components/ui";
import { colors, font, radius, shadow, spacing } from "@mobile/constants/theme";
import { haptics } from "@mobile/lib/haptics";
import { useGenerate } from "@mobile/modules/generate/hooks";
import { CopyButton } from "@mobile/modules/generate/components/CopyButton";
import { useGenerateImages } from "@mobile/modules/images/hooks";
import { ImageGrid } from "@mobile/modules/images/components/ImageGrid";
import { ImageLoadingSkeleton } from "@mobile/modules/images/components/ImageLoadingSkeleton";
import { ImagePreviewModal } from "@mobile/modules/images/components/ImagePreviewModal";
import { ModifierSheet } from "@mobile/modules/images/components/ModifierSheet";
import { ConfirmSheet } from "@mobile/modules/saved/components/DeleteConfirmSheet";
import { formatRelative } from "@mobile/modules/saved/format";
import {
	useDeleteSavedPost,
	useSavedPost,
	useUpdateSavedPost,
} from "@mobile/modules/saved/hooks";

export default function SavedDetailScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { id } = useLocalSearchParams<{ id: string }>();
	const postId = Array.isArray(id) ? id[0] : id;
	const { data: post, isLoading } = useSavedPost(postId);
	const updatePost = useUpdateSavedPost();
	const deletePost = useDeleteSavedPost();
	const generate = useGenerate();

	const [showDelete, setShowDelete] = useState(false);
	const [showRegen, setShowRegen] = useState(false);
	const [regenError, setRegenError] = useState<string | null>(null);
	const [justRegenerated, setJustRegenerated] = useState(false);
	const [showImagesSheet, setShowImagesSheet] = useState(false);
	const [imagesError, setImagesError] = useState<string | null>(null);
	const [imagesJustRegenerated, setImagesJustRegenerated] = useState(false);
	const [previewIndex, setPreviewIndex] = useState<number | null>(null);
	const generateImages = useGenerateImages();

	const handleRegenerateConfirm = useCallback(async () => {
		if (!post) return;
		setShowRegen(false);
		setRegenError(null);
		generate.mutate(
			{ idea: post.idea, contentType: post.contentType },
			{
				onSuccess: async (data) => {
					await updatePost.mutateAsync({
						id: post.id,
						patch: {
							source: "generate",
							hooks: data.hooks,
							recommendedHook: data.recommendedHook,
							recommendedReason: data.recommendedReason,
							caption: data.caption,
							hashtags: data.hashtags,
							// clear analyzer-only fields on regenerate
							originalContent: undefined,
							score: undefined,
							verdict: undefined,
							betterHook: undefined,
							improvedPost: undefined,
						},
					});
					haptics.success();
					setJustRegenerated(true);
					setTimeout(() => setJustRegenerated(false), 2000);
				},
				onError: (err) => {
					setRegenError(err.message ?? "Could not regenerate. Try again.");
					haptics.error();
				},
			},
		);
	}, [generate, post, updatePost]);

	const handleRegenerateImages = useCallback(
		(modifier: string | undefined) => {
			if (!post) return;
			if (generateImages.isPending) return;
			setImagesError(null);
			setShowImagesSheet(false);
			const existingSceneTypes = post.images
				?.map((img) => img.sceneType)
				.filter((t): t is "struggle" | "decision" | "result" => Boolean(t));
			const count: 2 | 3 = post.images?.length === 3 ? 3 : 2;
			generateImages.mutate(
				{
					idea: post.idea,
					caption: post.caption,
					modifier,
					count,
					sceneTypes:
						existingSceneTypes && existingSceneTypes.length > 0
							? existingSceneTypes
							: undefined,
				},
				{
					onSuccess: async (data) => {
						await updatePost.mutateAsync({
							id: post.id,
							patch: { images: data.images },
						});
						haptics.success();
						setImagesJustRegenerated(true);
						setTimeout(() => setImagesJustRegenerated(false), 2000);
					},
					onError: (err) => {
						setImagesError(err.message ?? "Couldn't regenerate images.");
						haptics.error();
					},
				},
			);
		},
		[generateImages, post, updatePost],
	);

	const handleReAnalyze = useCallback(() => {
		if (!post) return;
		const content =
			post.source === "analyze"
				? post.originalContent ?? post.idea
				: [post.recommendedHook, post.caption, (post.hashtags ?? []).join(" ")]
						.filter(Boolean)
						.join("\n");
		router.push({ pathname: "/(tabs)/analyze", params: { seed: content } });
	}, [post, router]);

	const handleDelete = useCallback(() => {
		if (!post) return;
		deletePost.mutate(post.id);
		haptics.success();
		setShowDelete(false);
		router.back();
	}, [deletePost, post, router]);

	const copyable = post
		? post.source === "analyze"
			? post.improvedPost ?? ""
			: [post.recommendedHook, post.caption, (post.hashtags ?? []).join(" ")]
					.filter(Boolean)
					.join("\n\n")
		: "";

	if (isLoading) {
		return (
			<View style={[styles.root, styles.center]}>
				<Text style={styles.muted}>Loading…</Text>
			</View>
		);
	}

	if (!post) {
		return (
			<View style={[styles.root, styles.center]}>
				<Text style={styles.muted}>Post not found.</Text>
				<Button label="Back to Saved" onPress={() => router.back()} variant="secondary" />
			</View>
		);
	}

	const isAnalyzed = post.source === "analyze";
	const accent = isAnalyzed ? colors.accent : colors.success;
	const sourceLabel = isAnalyzed ? "🔍  ANALYZED" : "✨  GENERATED";

	return (
		<View style={styles.root}>
			<Stack.Screen options={{ headerShown: false }} />
			<ScrollView
				contentContainerStyle={[
					styles.scroll,
					{
						paddingTop: insets.top + spacing.md,
						paddingBottom: insets.bottom + 120,
					},
				]}
				showsVerticalScrollIndicator={false}
			>
				<Pressable style={styles.backBtn} onPress={() => router.back()}>
					<Text style={styles.backBtnText}>← Saved</Text>
				</Pressable>

				<View style={styles.hero}>
					<View style={[styles.sourcePill, { borderColor: accent }]}>
						<Text style={[styles.sourceText, { color: accent }]}>{sourceLabel}</Text>
					</View>
					<Text style={styles.idea}>{post.idea}</Text>
					<Text style={styles.timestamp}>
						Saved {formatRelative(post.createdAt)} · Updated{" "}
						{formatRelative(post.updatedAt)}
					</Text>
				</View>

				{justRegenerated ? (
					<View style={styles.successBanner}>
						<Text style={styles.successBannerText}>✓ New version generated</Text>
					</View>
				) : null}

				{regenError ? (
					<View style={styles.errorBanner}>
						<Text style={styles.errorBannerText}>{regenError}</Text>
					</View>
				) : null}

				{isAnalyzed ? (
					<View style={styles.section}>
						{typeof post.score === "number" ? (
							<View style={[styles.scoreBlock, shadow.accent]}>
								<Text style={styles.scoreLabel}>HOOK SCORE</Text>
								<View style={styles.scoreRow}>
									<Text style={styles.scoreValue}>{post.score}</Text>
									<Text style={styles.scoreMax}>/100</Text>
								</View>
								{post.verdict ? (
									<View style={[styles.verdictPill, { backgroundColor: accent }]}>
										<Text style={styles.verdictText}>
											{post.verdict.toUpperCase()}
										</Text>
									</View>
								) : null}
							</View>
						) : null}

						{post.improvedPost ? (
							<View style={styles.section}>
								<SectionLabel accent>Ready-to-post rewrite</SectionLabel>
								<View style={[styles.postCard, shadow.accent]}>
									<Text style={styles.postBody}>{post.improvedPost}</Text>
								</View>
							</View>
						) : null}

						{post.originalContent ? (
							<View style={styles.section}>
								<SectionLabel>Original content</SectionLabel>
								<Card padded>
									<Text style={styles.bodyText}>{post.originalContent}</Text>
								</Card>
							</View>
						) : null}
					</View>
				) : (
					<View style={styles.section}>
						{post.recommendedHook ? (
							<View style={styles.section}>
								<SectionLabel accent>🔥 Recommended hook</SectionLabel>
								<View style={[styles.recommendedCard, shadow.accent]}>
									<Text style={styles.recommendedText}>{post.recommendedHook}</Text>
									{post.recommendedReason ? (
										<Text style={styles.recommendedSubtitle}>
											Why this works: {post.recommendedReason}
										</Text>
									) : null}
								</View>
							</View>
						) : null}

						{post.hooks && post.hooks.length > 0 ? (
							<View style={styles.section}>
								<SectionLabel>All hooks</SectionLabel>
								<Card padded>
									{post.hooks.map((hook, idx) => (
										<View
											key={`${idx}-${hook.slice(0, 10)}`}
											style={[
												styles.hookRow,
												idx === (post.hooks?.length ?? 1) - 1 ? styles.lastRow : null,
											]}
										>
											<View style={styles.hookBadge}>
												<Text style={styles.hookBadgeText}>{idx + 1}</Text>
											</View>
											<Text style={styles.hookText}>{hook}</Text>
										</View>
									))}
								</Card>
							</View>
						) : null}

						{post.caption ? (
							<View style={styles.section}>
								<SectionLabel>Caption</SectionLabel>
								<Card padded>
									<Text style={styles.bodyText}>{post.caption}</Text>
								</Card>
							</View>
						) : null}

						{post.hashtags && post.hashtags.length > 0 ? (
							<View style={styles.section}>
								<SectionLabel>{`${post.hashtags.length} hashtags`}</SectionLabel>
								<Card padded>
									<View style={styles.tags}>
										{post.hashtags.map((tag) => (
											<View key={tag} style={styles.tag}>
												<Text style={styles.tagText}>{tag}</Text>
											</View>
										))}
									</View>
								</Card>
							</View>
						) : null}
					</View>
				)}
				{(post.images && post.images.length > 0) || generateImages.isPending ? (
					<View style={styles.section}>
						<SectionLabel accent>Your images</SectionLabel>
						{imagesJustRegenerated ? (
							<View style={styles.successBanner}>
								<Text style={styles.successBannerText}>
									✓ New images generated
								</Text>
							</View>
						) : null}
						{imagesError ? (
							<View style={styles.errorBanner}>
								<Text style={styles.errorBannerText}>{imagesError}</Text>
							</View>
						) : null}
						{generateImages.isPending ? (
							<ImageLoadingSkeleton />
						) : post.images && post.images.length > 0 ? (
							<ImageGrid
								images={post.images}
								readOnly
								onPreview={(i) => setPreviewIndex(i)}
							/>
						) : null}
						<Button
							label={
								generateImages.isPending
									? "Regenerating images…"
									: "🔄  Regenerate images"
							}
							onPress={() => setShowImagesSheet(true)}
							variant="secondary"
							size="md"
							fullWidth
							loading={generateImages.isPending}
							disabled={generateImages.isPending}
							haptic="light"
						/>
					</View>
				) : (
					<View style={styles.section}>
						<SectionLabel>Add images (optional)</SectionLabel>
						<Button
							label="✨  Generate images"
							onPress={() => handleRegenerateImages(undefined)}
							variant="secondary"
							size="md"
							fullWidth
							loading={generateImages.isPending}
							disabled={generateImages.isPending}
							haptic="medium"
						/>
					</View>
				)}
			</ScrollView>

			{/* Sticky action bar */}
			<View
				style={[
					styles.actionBar,
					{ paddingBottom: insets.bottom + spacing.md },
				]}
			>
				<View style={styles.actionRow}>
					<View style={styles.actionItem}>
						<CopyButton label="Copy" getText={() => copyable} variant="secondary" size="md" />
					</View>
					<View style={styles.actionItem}>
						<Button
							label="Re-analyze"
							onPress={handleReAnalyze}
							variant="secondary"
							size="md"
							fullWidth
							haptic="light"
						/>
					</View>
				</View>
				<View style={styles.actionRow}>
					<View style={styles.actionItem}>
						<Button
							label="Delete"
							onPress={() => setShowDelete(true)}
							variant="danger"
							size="md"
							fullWidth
							haptic="medium"
						/>
					</View>
					<View style={[styles.actionItem, { flex: 1.6 }]}>
						<Button
							label={generate.isPending ? "Regenerating…" : "✨ Regenerate"}
							onPress={() => setShowRegen(true)}
							variant="primary"
							size="md"
							fullWidth
							loading={generate.isPending}
							disabled={generate.isPending}
							haptic="medium"
						/>
					</View>
				</View>
			</View>

			<ConfirmSheet
				visible={showRegen}
				title="Replace with a new version?"
				message="We'll generate fresh hooks, caption, and hashtags for the same idea. The old content will be overwritten."
				confirmLabel="Regenerate"
				cancelLabel="Keep current"
				confirmVariant="primary"
				onConfirm={handleRegenerateConfirm}
				onCancel={() => setShowRegen(false)}
			/>

			<ConfirmSheet
				visible={showDelete}
				title="Delete this post?"
				message="It'll be removed from your saved workspace. This can't be undone."
				confirmLabel="Delete"
				cancelLabel="Keep"
				confirmVariant="danger"
				onConfirm={handleDelete}
				onCancel={() => setShowDelete(false)}
			/>

			<ModifierSheet
				visible={showImagesSheet}
				onPick={(modifier) => handleRegenerateImages(modifier)}
				onCancel={() => setShowImagesSheet(false)}
			/>

			<ImagePreviewModal
				visible={previewIndex !== null}
				images={post.images ?? []}
				initialIndex={previewIndex ?? 0}
				onClose={() => setPreviewIndex(null)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: colors.bg },
	center: { alignItems: "center", justifyContent: "center", gap: spacing.md },
	muted: { ...font.body, color: colors.textMuted },
	scroll: {
		paddingHorizontal: spacing.lg,
	},
	backBtn: {
		alignSelf: "flex-start",
		paddingVertical: spacing.sm,
		paddingRight: spacing.md,
		marginBottom: spacing.sm,
	},
	backBtnText: {
		...font.bodyStrong,
		color: colors.textSecondary,
	},
	hero: { gap: spacing.sm, marginBottom: spacing.xl },
	sourcePill: {
		alignSelf: "flex-start",
		paddingHorizontal: spacing.md,
		paddingVertical: 6,
		borderRadius: radius.pill,
		borderWidth: 1,
		backgroundColor: colors.surface,
	},
	sourceText: {
		...font.label,
		fontWeight: "800",
		letterSpacing: 1,
	},
	idea: {
		color: colors.textPrimary,
		fontSize: 17,
		lineHeight: 23,
		fontWeight: "700",
	},
	timestamp: {
		...font.caption,
		color: colors.textMuted,
	},
	successBanner: {
		backgroundColor: colors.successSoft,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.success,
		padding: spacing.md,
		marginBottom: spacing.md,
	},
	successBannerText: {
		...font.bodyStrong,
		color: colors.success,
	},
	errorBanner: {
		backgroundColor: colors.dangerSoft,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.danger,
		padding: spacing.md,
		marginBottom: spacing.md,
	},
	errorBannerText: {
		...font.bodyStrong,
		color: colors.danger,
	},
	section: { gap: spacing.md, marginBottom: spacing.xl },
	scoreBlock: {
		padding: spacing.xl,
		borderRadius: radius.xxl,
		borderWidth: 1.5,
		borderColor: colors.accent,
		backgroundColor: colors.accentSoft,
		alignItems: "center",
		gap: spacing.sm,
	},
	scoreLabel: { ...font.label, color: colors.accent, fontWeight: "800" },
	scoreRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
	scoreValue: {
		fontSize: 56,
		fontWeight: "800",
		color: colors.textPrimary,
		lineHeight: 56,
		letterSpacing: -2,
	},
	scoreMax: {
		...font.h2,
		color: colors.textSecondary,
		marginBottom: 6,
	},
	verdictPill: {
		paddingHorizontal: spacing.md,
		paddingVertical: 4,
		borderRadius: radius.pill,
	},
	verdictText: {
		color: "#fff",
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 0.8,
	},
	postCard: {
		padding: spacing.lg,
		borderRadius: radius.xl,
		backgroundColor: colors.accentSoft,
		borderWidth: 1.5,
		borderColor: colors.accent,
	},
	postBody: {
		...font.bodyStrong,
		color: colors.textPrimary,
		fontSize: 17,
		lineHeight: 26,
	},
	recommendedCard: {
		padding: spacing.lg,
		borderRadius: radius.xl,
		backgroundColor: colors.accentSoft,
		borderWidth: 1.5,
		borderColor: colors.accent,
		gap: spacing.md,
	},
	recommendedText: {
		...font.h2,
		color: colors.textPrimary,
		fontSize: 20,
		lineHeight: 26,
	},
	recommendedSubtitle: {
		...font.caption,
		color: colors.textSecondary,
	},
	hookRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		paddingVertical: spacing.md,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	lastRow: { borderBottomWidth: 0 },
	hookBadge: {
		width: 26,
		height: 26,
		borderRadius: radius.pill,
		backgroundColor: colors.surfaceAlt,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: "center",
		justifyContent: "center",
		marginRight: spacing.md,
	},
	hookBadgeText: {
		color: colors.textSecondary,
		fontWeight: "700",
		fontSize: 12,
	},
	hookText: { ...font.body, color: colors.textPrimary, flex: 1, lineHeight: 22 },
	bodyText: {
		...font.body,
		color: colors.textPrimary,
		lineHeight: 24,
	},
	tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
	tag: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		borderRadius: radius.pill,
		backgroundColor: colors.surfaceAlt,
		borderWidth: 1,
		borderColor: colors.border,
	},
	tagText: {
		...font.caption,
		color: colors.textSecondary,
		fontWeight: "600",
	},
	actionBar: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: colors.bgElevated,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.md,
		gap: spacing.sm,
	},
	actionRow: {
		flexDirection: "row",
		gap: spacing.sm,
	},
	actionItem: { flex: 1 },
});
