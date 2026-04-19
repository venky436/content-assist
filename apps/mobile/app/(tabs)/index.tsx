import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
	ContentType,
	GeneratedImage,
	GenerateResponse,
} from "@content-assist/shared";
import { colors, font, spacing } from "@mobile/constants/theme";
import {
	useGenerate,
	useRegenerateHooks,
} from "@mobile/modules/generate/hooks";
import { CaptionBlock } from "@mobile/modules/generate/components/CaptionBlock";
import { ContentTypeSelector } from "@mobile/modules/generate/components/ContentTypeSelector";
import { EmptyState } from "@mobile/modules/generate/components/EmptyState";
import { ErrorState } from "@mobile/modules/generate/components/ErrorState";
import { GenerateButton } from "@mobile/modules/generate/components/GenerateButton";
import { HashtagsBlock } from "@mobile/modules/generate/components/HashtagsBlock";
import { HooksList } from "@mobile/modules/generate/components/HooksList";
import { IdeaInput } from "@mobile/modules/generate/components/IdeaInput";
import { ResultsSkeleton } from "@mobile/modules/generate/components/ResultsSkeleton";
import { useGenerateImages } from "@mobile/modules/images/hooks";
import { CountChips } from "@mobile/modules/images/components/CountChips";
import { GenerateImagesButton } from "@mobile/modules/images/components/GenerateImagesButton";
import { ImageErrorState } from "@mobile/modules/images/components/ImageErrorState";
import { ImageGrid } from "@mobile/modules/images/components/ImageGrid";
import { ImageLoadingSkeleton } from "@mobile/modules/images/components/ImageLoadingSkeleton";
import { ImagePreviewModal } from "@mobile/modules/images/components/ImagePreviewModal";
import { ModifierSheet } from "@mobile/modules/images/components/ModifierSheet";
import { RegenerateImagesBar } from "@mobile/modules/images/components/RegenerateImagesBar";
import { SaveButton } from "@mobile/modules/saved/components/SaveButton";
import { useSavePost } from "@mobile/modules/saved/hooks";
import { SectionLabel } from "@mobile/components/ui";

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const params = useLocalSearchParams<{ idea?: string }>();
	const [idea, setIdea] = useState("");
	const [contentType, setContentType] = useState<ContentType>("reel");
	const [results, setResults] = useState<GenerateResponse | null>(null);
	const consumedIdeaRef = useRef<string | null>(null);

	const generate = useGenerate({
		onSuccess: (data) => setResults(data),
	});
	const regenerateHooks = useRegenerateHooks({
		onSuccess: (data) =>
			setResults((prev) =>
				prev
					? {
							...prev,
							hooks: data.hooks,
							recommendedHook: data.recommendedHook,
							recommendedReason: data.recommendedReason,
						}
					: prev,
			),
	});

	useEffect(() => {
		if (generate.isPending) {
			setResults(null);
			setGeneratedImages(null);
			setSelectedImageUrls(new Set());
		}
	}, [generate.isPending]);

	useEffect(() => {
		const incoming = typeof params.idea === "string" ? params.idea : undefined;
		if (!incoming) return;
		if (consumedIdeaRef.current === incoming) return;
		consumedIdeaRef.current = incoming;
		const trimmed = incoming.trim();
		if (trimmed.length < 3) return;
		setIdea(trimmed.slice(0, 500));
		router.setParams({ idea: undefined });
		generate.mutate({ idea: trimmed, contentType });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.idea]);

	const canGenerate = idea.trim().length >= 3 && !generate.isPending;

	const handleGenerate = useCallback(() => {
		if (!canGenerate) return;
		regenerateHooks.reset();
		generate.mutate({ idea: idea.trim(), contentType });
	}, [canGenerate, contentType, generate, idea, regenerateHooks]);

	const handleRetry = useCallback(() => {
		generate.reset();
		handleGenerate();
	}, [generate, handleGenerate]);

	const handleMakeStronger = useCallback(() => {
		if (!results || regenerateHooks.isPending) return;
		regenerateHooks.mutate({
			idea: idea.trim(),
			contentType,
			stronger: true,
			avoidHooks: results.hooks,
		});
	}, [contentType, idea, regenerateHooks, results]);

	const [generatedImages, setGeneratedImages] = useState<GeneratedImage[] | null>(null);
	const [selectedImageUrls, setSelectedImageUrls] = useState<Set<string>>(new Set());
	const [modifierSheetOpen, setModifierSheetOpen] = useState(false);
	const [imagesJustRegenerated, setImagesJustRegenerated] = useState(false);
	const [previewIndex, setPreviewIndex] = useState<number | null>(null);
	const [imageCount, setImageCount] = useState<2 | 3>(2);

	const generateImages = useGenerateImages({
		onSuccess: (data) => {
			setGeneratedImages(data.images);
			setSelectedImageUrls(new Set(data.images.map((i) => i.url)));
			setImagesJustRegenerated(true);
			setTimeout(() => setImagesJustRegenerated(false), 2000);
		},
	});

	const handleGenerateImages = useCallback(() => {
		if (!results) return;
		if (generateImages.isPending) return;
		generateImages.mutate({
			idea: idea.trim(),
			caption: results.caption,
			count: imageCount,
		});
	}, [generateImages, idea, imageCount, results]);

	const handleRegenerateImages = useCallback(
		(modifier?: string) => {
			if (!results) return;
			if (generateImages.isPending) return;
			// Preserve existing scene types on regenerate so the narrative arc stays intact
			const sceneTypes = generatedImages
				?.map((img) => img.sceneType)
				.filter((t): t is NonNullable<GeneratedImage["sceneType"]> => Boolean(t));
			generateImages.mutate({
				idea: idea.trim(),
				caption: results.caption,
				modifier,
				count: imageCount,
				sceneTypes: sceneTypes && sceneTypes.length > 0 ? sceneTypes : undefined,
			});
		},
		[generateImages, generatedImages, idea, imageCount, results],
	);

	const handleToggleImage = useCallback((url: string) => {
		setSelectedImageUrls((prev) => {
			const next = new Set(prev);
			if (next.has(url)) next.delete(url);
			else next.add(url);
			return next;
		});
	}, []);

	const handleOpenModifier = useCallback(() => setModifierSheetOpen(true), []);
	const handleModifierPick = useCallback(
		(modifier: string | undefined) => {
			setModifierSheetOpen(false);
			handleRegenerateImages(modifier);
		},
		[handleRegenerateImages],
	);

	const savePost = useSavePost();
	const handleSave = useCallback(async () => {
		if (!results) return;
		const selectedImages =
			generatedImages
				?.filter((img) => selectedImageUrls.has(img.url))
				.map((img) => ({
					url: img.url,
					prompt: img.prompt,
					generatedAt: img.generatedAt,
					sceneType: img.sceneType,
					label: img.label,
				})) ?? [];
		await savePost.mutateAsync({
			source: "generate",
			idea: idea.trim(),
			contentType,
			hooks: results.hooks,
			recommendedHook: results.recommendedHook,
			recommendedReason: results.recommendedReason,
			caption: results.caption,
			hashtags: results.hashtags,
			images: selectedImages.length > 0 ? selectedImages : undefined,
		});
	}, [contentType, generatedImages, idea, results, savePost, selectedImageUrls]);

	const renderResults = () => {
		if (generate.isPending) return <ResultsSkeleton />;
		if (generate.isError) {
			return (
				<ErrorState
					message={
						generate.error?.message ?? "Please check your connection and try again."
					}
					onRetry={handleRetry}
				/>
			);
		}
		if (results) {
			return (
				<View style={styles.results}>
					<HooksList
						hooks={results.hooks}
						recommendedHook={results.recommendedHook}
						recommendedReason={results.recommendedReason}
						onMakeStronger={handleMakeStronger}
						regenerating={regenerateHooks.isPending}
					/>
					{regenerateHooks.isError ? (
						<Text style={styles.regenError}>
							Couldn't refresh hooks. Tap again.
						</Text>
					) : null}
					<CaptionBlock caption={results.caption} />
					<HashtagsBlock hashtags={results.hashtags} />

					<View style={styles.imagesBlock}>
						<SectionLabel>Images (optional)</SectionLabel>

						{!generatedImages && !generateImages.isPending && !generateImages.isError ? (
							<View style={styles.genImagesStack}>
								<CountChips value={imageCount} onChange={setImageCount} />
								<GenerateImagesButton
									onPress={handleGenerateImages}
									loading={false}
								/>
							</View>
						) : null}

						{generateImages.isPending ? <ImageLoadingSkeleton /> : null}

						{generateImages.isError && !generatedImages ? (
							<ImageErrorState
								message={
									generateImages.error?.message ?? "Please try again in a moment."
								}
								code={
									generateImages.error?.body &&
									typeof generateImages.error.body === "object" &&
									"error" in generateImages.error.body
										? String(
												(generateImages.error.body as { error: unknown }).error,
											)
										: undefined
								}
								onRetry={handleGenerateImages}
							/>
						) : null}

						{generatedImages && !generateImages.isPending ? (
							<View style={styles.imagesStack}>
								{imagesJustRegenerated ? (
									<View style={styles.banner}>
										<Text style={styles.bannerText}>✓ New images generated</Text>
									</View>
								) : null}
								<ImageGrid
									images={generatedImages}
									selectedUrls={selectedImageUrls}
									onToggle={handleToggleImage}
									onPreview={(i) => setPreviewIndex(i)}
								/>
								<Text style={styles.imagesHint}>
									{selectedImageUrls.size === 0
										? "Tap an image to include it in your saved post."
										: `${selectedImageUrls.size} selected · tap again to deselect.`}
								</Text>
								<RegenerateImagesBar
									onRegenerate={() => handleRegenerateImages()}
									onRegenerateAs={handleOpenModifier}
									loading={generateImages.isPending}
								/>
							</View>
						) : null}
					</View>

					<View style={styles.saveWrap}>
						<SaveButton onSave={handleSave} label="Save to workspace" size="lg" variant="secondary" />
					</View>
				</View>
			);
		}
		return <EmptyState />;
	};

	return (
		<KeyboardAvoidingView
			style={styles.root}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScrollView
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={[
					styles.scroll,
					{
						paddingTop: insets.top + spacing.lg,
						paddingBottom: insets.bottom + spacing.xxxl,
					},
				]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.hero}>
					<View style={styles.badge}>
						<Text style={styles.badgeText}>CONTENT ASSIST</Text>
					</View>
					<Text style={styles.title}>Post-ready content{"\n"}in seconds.</Text>
					<Text style={styles.subtitle}>
						Drop an idea, pick a format, and get hooks, caption, and hashtags — built to
						perform.
					</Text>
				</View>

				<View style={styles.form}>
					<IdeaInput value={idea} onChangeText={setIdea} disabled={generate.isPending} />
					<ContentTypeSelector
						value={contentType}
						onChange={setContentType}
						disabled={generate.isPending}
					/>
					<GenerateButton
						onPress={handleGenerate}
						loading={generate.isPending}
						disabled={!canGenerate}
					/>
				</View>

				<View style={styles.resultsContainer}>{renderResults()}</View>
			</ScrollView>

			<ModifierSheet
				visible={modifierSheetOpen}
				onPick={handleModifierPick}
				onCancel={() => setModifierSheetOpen(false)}
			/>

			<ImagePreviewModal
				visible={previewIndex !== null}
				images={generatedImages ?? []}
				initialIndex={previewIndex ?? 0}
				selectedUrls={selectedImageUrls}
				onToggleSelect={handleToggleImage}
				onClose={() => setPreviewIndex(null)}
			/>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	scroll: {
		paddingHorizontal: spacing.lg,
		gap: spacing.xxl,
	},
	hero: {
		gap: spacing.md,
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
	},
	subtitle: {
		...font.body,
		color: colors.textSecondary,
		lineHeight: 24,
	},
	form: {
		gap: spacing.xl,
	},
	resultsContainer: {
		minHeight: 200,
	},
	results: {
		gap: spacing.xl,
	},
	regenError: {
		...font.caption,
		color: colors.danger,
		textAlign: "center",
	},
	saveWrap: {
		marginTop: spacing.sm,
	},
	imagesBlock: {
		gap: spacing.md,
	},
	imagesStack: {
		gap: spacing.md,
	},
	genImagesStack: {
		gap: spacing.md,
	},
	imagesHint: {
		...font.caption,
		color: colors.textMuted,
		textAlign: "center",
	},
	banner: {
		padding: spacing.md,
		borderRadius: 12,
		backgroundColor: colors.successSoft,
		borderWidth: 1,
		borderColor: colors.success,
	},
	bannerText: {
		...font.bodyStrong,
		color: colors.success,
		textAlign: "center",
	},
});
