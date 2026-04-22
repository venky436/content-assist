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
	GenerateMode,
	GenerateResponse,
	GenerateScriptResponse,
	GenerateVideoResponse,
	SceneType,
	VideoVoice,
} from "@content-assist/shared";
import { ModeToggle } from "@mobile/components/ui";
import { colors, font, spacing } from "@mobile/constants/theme";
import {
	useGenerate,
	useGenerateScript,
	useRegenerateHooks,
} from "@mobile/modules/generate/hooks";
import { FacelessResults } from "@mobile/modules/generate/components/FacelessResults";
import { GenerateButton } from "@mobile/modules/generate/components/GenerateButton";
import { IdeaInput } from "@mobile/modules/generate/components/IdeaInput";
import { OnCameraResults } from "@mobile/modules/generate/components/OnCameraResults";
import { DEFAULT_MODE, loadMode, saveMode } from "@mobile/modules/generate/mode";
import { useGenerateImages } from "@mobile/modules/images/hooks";
import { ImagePreviewModal } from "@mobile/modules/images/components/ImagePreviewModal";
import { ModifierSheet } from "@mobile/modules/images/components/ModifierSheet";
import { useSavePost } from "@mobile/modules/saved/hooks";
import { useGenerateVideo } from "@mobile/modules/video/hooks";

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const params = useLocalSearchParams<{ idea?: string }>();

	const [mode, setMode] = useState<GenerateMode>(DEFAULT_MODE);
	const [idea, setIdea] = useState("");
	const [contentType, setContentType] = useState<ContentType>("reel");
	const [results, setResults] = useState<GenerateResponse | null>(null);
	const [scriptResult, setScriptResult] = useState<GenerateScriptResponse | null>(null);
	const consumedIdeaRef = useRef<string | null>(null);

	// Load persisted mode once on mount
	useEffect(() => {
		let cancelled = false;
		(async () => {
			const stored = await loadMode();
			if (!cancelled) setMode(stored);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

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
	const generateScript = useGenerateScript({
		onSuccess: (data) => setScriptResult(data),
	});

	const [generatedImages, setGeneratedImages] = useState<GeneratedImage[] | null>(null);
	const [selectedImageUrls, setSelectedImageUrls] = useState<Set<string>>(new Set());
	const [modifierSheetOpen, setModifierSheetOpen] = useState(false);
	const [imagesJustRegenerated, setImagesJustRegenerated] = useState(false);
	const [previewIndex, setPreviewIndex] = useState<number | null>(null);
	const [imageCount, setImageCount] = useState<2 | 3>(3);
	const [regeneratingSceneType, setRegeneratingSceneType] = useState<
		SceneType | undefined
	>(undefined);

	// IMPORTANT: no global onSuccess here. Each call site (generate / bulk
	// regenerate / single-scene regenerate) owns its own success logic.
	// A global handler was clobbering the `generatedImages` array during
	// single-scene regenerate — it overwrote all 3 images with the 1-element
	// response, which made the .map() swap logic below produce a single tile.
	const generateImages = useGenerateImages();

	const [video, setVideo] = useState<GenerateVideoResponse | null>(null);
	const [bgmEnabled, setBgmEnabled] = useState(true);
	const [voiceGender, setVoiceGender] = useState<VideoVoice>("nova");
	const generateVideo = useGenerateVideo({
		onSuccess: (data) => setVideo(data),
	});

	// Clear faceless-specific state when a fresh faceless generate starts.
	// Deliberately depend ONLY on generate.isPending — putting the mutation
	// object in deps caused a re-entrancy loop that clobbered `results` back
	// to null after onSuccess had already set it.
	useEffect(() => {
		if (generate.isPending) {
			setResults(null);
			setGeneratedImages(null);
			setSelectedImageUrls(new Set());
			setVideo(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [generate.isPending]);

	// Consume external `?idea=` param (e.g. from Analyze "Generate improved version" CTA)
	useEffect(() => {
		const incoming = typeof params.idea === "string" ? params.idea : undefined;
		if (!incoming) return;
		if (consumedIdeaRef.current === incoming) return;
		consumedIdeaRef.current = incoming;
		const trimmed = incoming.trim();
		if (trimmed.length < 3) return;
		setIdea(trimmed.slice(0, 500));
		router.setParams({ idea: undefined });
		if (mode === "on_camera") {
			generateScript.mutate({ idea: trimmed, contentType });
		} else {
			generate.mutate({ idea: trimmed, contentType });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.idea]);

	const isPending =
		mode === "on_camera" ? generateScript.isPending : generate.isPending;
	const canGenerate = idea.trim().length >= 3 && !isPending;

	const handleModeChange = useCallback(
		(next: GenerateMode) => {
			if (next === mode) return;
			// Clear both result sets so the user sees a clean empty-state in the new mode.
			setResults(null);
			setScriptResult(null);
			setGeneratedImages(null);
			setSelectedImageUrls(new Set());
			generate.reset();
			generateScript.reset();
			regenerateHooks.reset();
			generateImages.reset();
			setMode(next);
			saveMode(next);
		},
		[generate, generateImages, generateScript, mode, regenerateHooks],
	);

	const handleGenerate = useCallback(() => {
		if (!canGenerate) return;
		const trimmedIdea = idea.trim();
		if (mode === "on_camera") {
			generateScript.mutate({ idea: trimmedIdea, contentType });
		} else {
			regenerateHooks.reset();
			generate.mutate({ idea: trimmedIdea, contentType });
		}
	}, [canGenerate, contentType, generate, generateScript, idea, mode, regenerateHooks]);

	const handleRetry = useCallback(() => {
		if (mode === "on_camera") generateScript.reset();
		else generate.reset();
		handleGenerate();
	}, [generate, generateScript, handleGenerate, mode]);

	const handleMakeStronger = useCallback(() => {
		if (!results || regenerateHooks.isPending) return;
		regenerateHooks.mutate({
			idea: idea.trim(),
			contentType,
			stronger: true,
			avoidHooks: results.hooks,
		});
	}, [contentType, idea, regenerateHooks, results]);

	const handleRegenerateScript = useCallback(() => {
		if (generateScript.isPending) return;
		generateScript.mutate({ idea: idea.trim(), contentType });
	}, [contentType, generateScript, idea]);

	const handleImproveHook = useCallback(() => {
		if (!scriptResult || generateScript.isPending) return;
		generateScript.mutate({
			idea: idea.trim(),
			contentType,
			stronger: true,
			avoidHooks: [scriptResult.hook],
		});
	}, [contentType, generateScript, idea, scriptResult]);

	const handleGenerateImages = useCallback(() => {
		if (!results) return;
		if (generateImages.isPending) return;
		setVideo(null);
		generateVideo.reset();
		generateImages.mutate(
			{
				idea: idea.trim(),
				caption: results.caption,
				count: imageCount,
			},
			{
				onSuccess: (data) => {
					setGeneratedImages(data.images);
					setSelectedImageUrls(new Set(data.images.map((i) => i.url)));
					setImagesJustRegenerated(true);
					setTimeout(() => setImagesJustRegenerated(false), 2000);
				},
			},
		);
	}, [generateImages, generateVideo, idea, imageCount, results]);

	const handleRegenerateImages = useCallback(
		(modifier?: string) => {
			if (!results) return;
			if (generateImages.isPending) return;
			setVideo(null);
			generateVideo.reset();
			const sceneTypes = generatedImages
				?.map((img) => img.sceneType)
				.filter((t): t is NonNullable<GeneratedImage["sceneType"]> => Boolean(t));
			generateImages.mutate(
				{
					idea: idea.trim(),
					caption: results.caption,
					modifier,
					count: imageCount,
					sceneTypes: sceneTypes && sceneTypes.length > 0 ? sceneTypes : undefined,
				},
				{
					onSuccess: (data) => {
						setGeneratedImages(data.images);
						setSelectedImageUrls(new Set(data.images.map((i) => i.url)));
						setImagesJustRegenerated(true);
						setTimeout(() => setImagesJustRegenerated(false), 2000);
					},
				},
			);
		},
		[generateImages, generateVideo, generatedImages, idea, imageCount, results],
	);

	const handleRegenerateOneImage = useCallback(
		(sceneType: SceneType) => {
			if (!results) return;
			if (generateImages.isPending) return;
			if (!generatedImages) return;
			setVideo(null);
			generateVideo.reset();
			setRegeneratingSceneType(sceneType);
			generateImages.mutate(
				{
					idea: idea.trim(),
					caption: results.caption,
					count: 1,
					sceneTypes: [sceneType],
				},
				{
					onSuccess: (data) => {
						const fresh = data.images[0];
						setRegeneratingSceneType(undefined);
						if (!fresh) return;
						const oldImg = generatedImages.find((i) => i.sceneType === sceneType);
						setGeneratedImages((prev) =>
							prev
								? prev.map((img) => (img.sceneType === sceneType ? fresh : img))
								: prev,
						);
						setSelectedImageUrls((prev) => {
							const next = new Set(prev);
							if (oldImg && prev.has(oldImg.url)) {
								next.delete(oldImg.url);
								next.add(fresh.url);
							}
							return next;
						});
					},
					onError: () => {
						setRegeneratingSceneType(undefined);
					},
				},
			);
		},
		[generateImages, generateVideo, generatedImages, idea, results],
	);

	const handleGenerateVideo = useCallback(() => {
		if (!results) return;
		if (generateVideo.isPending) return;
		// Prefer selected images; if none selected, use all generated.
		const source =
			generatedImages?.filter((img) => selectedImageUrls.has(img.url)) ??
			generatedImages ??
			[];
		const images = (source.length >= 2 ? source : generatedImages ?? []).slice(
			0,
			3,
		);
		if (images.length < 2) return;
		generateVideo.mutate({
			idea: idea.trim(),
			caption: results.caption,
			hook: results.recommendedHook,
			images: images.map((img) => ({
				url: img.url,
				label: img.label,
				sceneType: img.sceneType,
			})),
			bgm: bgmEnabled,
			tone: "motivational",
			voice: voiceGender,
		});
	}, [bgmEnabled, generateVideo, generatedImages, idea, results, selectedImageUrls]);

	const handleRegenerateVideo = useCallback(() => {
		setVideo(null);
		generateVideo.reset();
		handleGenerateVideo();
	}, [generateVideo, handleGenerateVideo]);

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
	const handleSaveFaceless = useCallback(async () => {
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
			mode: "faceless",
			idea: idea.trim(),
			contentType,
			hooks: results.hooks,
			recommendedHook: results.recommendedHook,
			recommendedReason: results.recommendedReason,
			caption: results.caption,
			hashtags: results.hashtags,
			images: selectedImages.length > 0 ? selectedImages : undefined,
			video: video
				? {
						videoUrl: video.videoUrl,
						voiceover: video.voiceover,
						durationMs: video.durationMs,
						bgmUsed: video.bgmUsed,
						voice: video.voice,
						generatedAt: Date.now(),
					}
				: undefined,
		});
	}, [contentType, generatedImages, idea, results, savePost, selectedImageUrls, video]);

	const handleSaveScript = useCallback(async () => {
		if (!scriptResult) return;
		await savePost.mutateAsync({
			source: "generate",
			mode: "on_camera",
			idea: idea.trim(),
			contentType,
			scriptHook: scriptResult.hook,
			scriptLines: scriptResult.lines,
			scriptCta: scriptResult.cta,
			hashtags: scriptResult.hashtags,
		});
	}, [contentType, idea, savePost, scriptResult]);

	const hasDraftIdea = idea.trim().length >= 3;

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
					<Text style={styles.title}>
						{mode === "on_camera"
							? "What to say,\nword for word."
							: "Post-ready content\nin seconds."}
					</Text>
					<Text style={styles.subtitle}>
						{mode === "on_camera"
							? "Drop an idea — get a hook, spoken lines, and a closing CTA that sounds like you."
							: "Drop an idea, pick a format, and get hooks, caption, and hashtags — built to perform."}
					</Text>
				</View>

				<View style={styles.form}>
					<ModeToggle value={mode} onChange={handleModeChange} disabled={isPending} />
					<IdeaInput value={idea} onChangeText={setIdea} disabled={isPending} />
					<GenerateButton
						onPress={handleGenerate}
						loading={isPending}
						disabled={!canGenerate}
					/>
				</View>

				<View style={styles.resultsContainer}>
					{mode === "on_camera" ? (
						(() => {
							const isImproveCall =
								generateScript.isPending &&
								generateScript.variables?.stronger === true;
							// Only show the full-screen skeleton when the INITIAL generation is in flight
							// (no script rendered yet). Regenerate / Improve Hook keep the current card
							// in place with inline spinners on the action buttons.
							const initialPending =
								generateScript.isPending && scriptResult === null;
							return (
								<OnCameraResults
									script={scriptResult}
									pending={initialPending}
									error={
										generateScript.isError
											? { message: generateScript.error?.message }
											: null
									}
									onRetry={handleRetry}
									onRegenerate={handleRegenerateScript}
									onImproveHook={handleImproveHook}
									regenerating={generateScript.isPending && !isImproveCall}
									improvingHook={isImproveCall}
									onSave={handleSaveScript}
								/>
							);
						})()
					) : (
						<FacelessResults
							results={results}
							pending={generate.isPending}
							error={generate.isError ? { message: generate.error?.message } : null}
							onRetry={handleRetry}
							onMakeStronger={handleMakeStronger}
							regeneratingHooks={regenerateHooks.isPending}
							regenHooksError={regenerateHooks.isError}
							showModeEmpty={hasDraftIdea}
							generatedImages={generatedImages}
							selectedImageUrls={selectedImageUrls}
							imageCount={imageCount}
							onImageCountChange={setImageCount}
							onGenerateImages={handleGenerateImages}
							onRegenerateImages={() => handleRegenerateImages()}
							onOpenModifier={handleOpenModifier}
							onToggleImage={handleToggleImage}
							onPreviewImage={(i) => setPreviewIndex(i)}
							onRegenerateOneImage={handleRegenerateOneImage}
							regeneratingSceneType={regeneratingSceneType}
							imagesPending={generateImages.isPending}
							imagesError={
								generateImages.isError
									? {
											message: generateImages.error?.message,
											body:
												generateImages.error && "body" in generateImages.error
													? (generateImages.error as { body?: unknown }).body
													: undefined,
										}
									: null
							}
							imagesJustRegenerated={imagesJustRegenerated}
							video={video}
							videoPending={generateVideo.isPending}
							videoError={
								generateVideo.isError
									? {
											message: generateVideo.error?.message,
											body:
												generateVideo.error && "body" in generateVideo.error
													? (generateVideo.error as { body?: unknown }).body
													: undefined,
										}
									: null
							}
							bgmEnabled={bgmEnabled}
							onBgmChange={setBgmEnabled}
							voiceGender={voiceGender}
							onVoiceGenderChange={setVoiceGender}
							onGenerateVideo={handleGenerateVideo}
							onRegenerateVideo={handleRegenerateVideo}
							onSave={handleSaveFaceless}
						/>
					)}
				</View>
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
	root: { flex: 1, backgroundColor: colors.bg },
	scroll: {
		paddingHorizontal: spacing.lg,
		gap: spacing.xxl,
	},
	hero: { gap: spacing.md },
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
	title: { ...font.display, color: colors.textPrimary },
	subtitle: {
		...font.body,
		color: colors.textSecondary,
		lineHeight: 24,
	},
	form: { gap: spacing.xl },
	resultsContainer: { minHeight: 200 },
});
