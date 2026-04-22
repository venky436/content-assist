"use client";

import { motion } from "framer-motion";
import {
	ImageIcon,
	ImagePlus,
	Keyboard,
	PlaySquare,
	Sparkles,
	Video,
	type LucideIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
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
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ModeToggle } from "@/components/ui/ModeToggle";
import { PromptInput } from "@/components/ui/PromptInput";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SegmentedTabs, type SegmentOption } from "@/components/ui/SegmentedTabs";
import { IngestPanel } from "@/components/ingest/IngestPanel";
import { ApiError } from "@/lib/api-client";
import { CaptionBlock } from "@/modules/generate/components/CaptionBlock";
import { EmptyState } from "@/modules/generate/components/EmptyState";
import { ErrorState } from "@/modules/generate/components/ErrorState";
import { HashtagsBlock } from "@/modules/generate/components/HashtagsBlock";
import { HooksList } from "@/modules/generate/components/HooksList";
import { ResultsSkeleton } from "@/modules/generate/components/ResultsSkeleton";
import { useGenerate, useRegenerateHooks } from "@/modules/generate/hooks";
import { DEFAULT_MODE, loadMode, saveMode } from "@/modules/generate/mode";
import { CountChips } from "@/modules/images/components/CountChips";
import { ImageGrid } from "@/modules/images/components/ImageGrid";
import { ImagesErrorState } from "@/modules/images/components/ImagesErrorState";
import { ImagesSkeleton } from "@/modules/images/components/ImagesSkeleton";
import { ModifierMenu } from "@/modules/images/components/ModifierMenu";
import { useGenerateImages } from "@/modules/images/hooks";
import { SaveButton } from "@/modules/saved/components/SaveButton";
import { useSavePost } from "@/modules/saved/hooks";
import { ScriptCard } from "@/modules/script/components/ScriptCard";
import { ScriptSkeleton } from "@/modules/script/components/ScriptSkeleton";
import { useGenerateScript } from "@/modules/script/hooks";
import { BgmPicker, type BgmSelection } from "@/modules/video/components/BgmPicker";
import { MediaPickerModal } from "@/components/profile/MediaPickerModal";
import type { MediaAsset } from "@content-assist/shared";
import { VideoErrorState } from "@/modules/video/components/VideoErrorState";
import { VideoPlayer } from "@/modules/video/components/VideoPlayer";
import { VideoSkeleton } from "@/modules/video/components/VideoSkeleton";
import { VoicePicker } from "@/modules/video/components/VoicePicker";
import { useGenerateVideo } from "@/modules/video/hooks";

const INPUT_MODE_OPTIONS: ReadonlyArray<
	SegmentOption<"text" | "video" | "image">
> = [
	{ value: "text", label: "Text", icon: Keyboard as LucideIcon },
	{ value: "video", label: "Video", icon: Video as LucideIcon },
	{ value: "image", label: "Image", icon: ImageIcon as LucideIcon },
];

function errorCode(error: Error | null): string | undefined {
	if (!error || !(error instanceof ApiError)) return undefined;
	const body = error.body;
	if (body && typeof body === "object" && "error" in body) {
		return String((body as { error: unknown }).error);
	}
	return undefined;
}

function GenerateInner() {
	const searchParams = useSearchParams();
	const [mode, setMode] = useState<GenerateMode>(DEFAULT_MODE);
	const [idea, setIdea] = useState("");
	const [inputMode, setInputMode] = useState<"text" | "video" | "image">("text");
	const [contentType] = useState<ContentType>("reel");
	const [results, setResults] = useState<GenerateResponse | null>(null);
	const [script, setScript] = useState<GenerateScriptResponse | null>(null);
	const consumedIdeaRef = useRef<string | null>(null);

	// Hydrate persisted mode once on mount.
	useEffect(() => {
		setMode(loadMode());
	}, []);

	const generate = useGenerate({ onSuccess: (data) => setResults(data) });
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
		onSuccess: (data) => setScript(data),
	});

	// Images state (faceless only)
	const [generatedImages, setGeneratedImages] = useState<GeneratedImage[] | null>(null);
	const [selectedImageUrls, setSelectedImageUrls] = useState<Set<string>>(new Set());
	const [imageCount, setImageCount] = useState<2 | 3>(3);
	const [regeneratingSceneType, setRegeneratingSceneType] = useState<
		SceneType | undefined
	>(undefined);
	const generateImages = useGenerateImages();

	// Video state (faceless only)
	const [video, setVideo] = useState<GenerateVideoResponse | null>(null);
	const [bgmSelection, setBgmSelection] = useState<BgmSelection>({ mode: "preset" });
	const [imagePickerOpen, setImagePickerOpen] = useState(false);
	const [voiceGender, setVoiceGender] = useState<VideoVoice>("nova");
	const generateVideo = useGenerateVideo({ onSuccess: (data) => setVideo(data) });

	const clearAll = useCallback(() => {
		setResults(null);
		setScript(null);
		setGeneratedImages(null);
		setSelectedImageUrls(new Set());
		setVideo(null);
		generate.reset();
		generateScript.reset();
		generateImages.reset();
		generateVideo.reset();
		regenerateHooks.reset();
	}, [generate, generateImages, generateScript, generateVideo, regenerateHooks]);

	const handleModeChange = useCallback(
		(next: GenerateMode) => {
			if (next === mode) return;
			clearAll();
			setMode(next);
			saveMode(next);
		},
		[clearAll, mode],
	);

	const handleGenerate = useCallback(
		(overrideIdea?: string) => {
			const target = (overrideIdea ?? idea).trim();
			if (target.length < 3) return;
			if (mode === "on_camera") {
				if (generateScript.isPending) return;
				setScript(null);
				generateScript.mutate({ idea: target, contentType });
			} else {
				if (generate.isPending) return;
				setResults(null);
				setGeneratedImages(null);
				setSelectedImageUrls(new Set());
				setVideo(null);
				generateImages.reset();
				generateVideo.reset();
				regenerateHooks.reset();
				generate.mutate({ idea: target, contentType });
			}
		},
		[
			contentType,
			generate,
			generateImages,
			generateScript,
			generateVideo,
			idea,
			mode,
			regenerateHooks,
		],
	);

	// ?idea= consumer from Analyze's "Generate improved version"
	useEffect(() => {
		const incoming = searchParams?.get("idea");
		if (!incoming) return;
		if (consumedIdeaRef.current === incoming) return;
		consumedIdeaRef.current = incoming;
		const trimmed = incoming.trim();
		if (trimmed.length < 3) return;
		setIdea(trimmed.slice(0, 500));
		handleGenerate(trimmed);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams]);

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
		if (!script || generateScript.isPending) return;
		generateScript.mutate({
			idea: idea.trim(),
			contentType,
			stronger: true,
			avoidHooks: [script.hook],
		});
	}, [contentType, generateScript, idea, script]);

	// ---- Images handlers ----
	const handleGenerateImages = useCallback(() => {
		if (!results || generateImages.isPending) return;
		setVideo(null);
		generateVideo.reset();
		generateImages.mutate(
			{ idea: idea.trim(), caption: results.caption, count: imageCount },
			{
				onSuccess: (data) => {
					setGeneratedImages(data.images);
					setSelectedImageUrls(new Set(data.images.map((i) => i.url)));
				},
			},
		);
	}, [generateImages, generateVideo, idea, imageCount, results]);

	const handleRegenerateBulk = useCallback(
		(modifier?: string) => {
			if (!results || generateImages.isPending || !generatedImages) return;
			setVideo(null);
			generateVideo.reset();
			const sceneTypes = generatedImages
				.map((img) => img.sceneType)
				.filter((t): t is NonNullable<GeneratedImage["sceneType"]> => Boolean(t));
			generateImages.mutate(
				{
					idea: idea.trim(),
					caption: results.caption,
					modifier,
					count: imageCount,
					sceneTypes: sceneTypes.length > 0 ? sceneTypes : undefined,
				},
				{
					onSuccess: (data) => {
						setGeneratedImages(data.images);
						setSelectedImageUrls(new Set(data.images.map((i) => i.url)));
					},
				},
			);
		},
		[generateImages, generateVideo, generatedImages, idea, imageCount, results],
	);

	const handleRegenerateOne = useCallback(
		(sceneType: SceneType) => {
			if (!results || generateImages.isPending || !generatedImages) return;
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
						setRegeneratingSceneType(undefined);
						const fresh = data.images[0];
						if (!fresh) return;
						const old = generatedImages.find((i) => i.sceneType === sceneType);
						setGeneratedImages((prev) =>
							prev
								? prev.map((img) => (img.sceneType === sceneType ? fresh : img))
								: prev,
						);
						setSelectedImageUrls((prev) => {
							const next = new Set(prev);
							if (old && prev.has(old.url)) {
								next.delete(old.url);
								next.add(fresh.url);
							}
							return next;
						});
					},
					onError: () => setRegeneratingSceneType(undefined),
				},
			);
		},
		[generateImages, generateVideo, generatedImages, idea, results],
	);

	const handleToggleImage = useCallback((url: string) => {
		setSelectedImageUrls((prev) => {
			const next = new Set(prev);
			if (next.has(url)) next.delete(url);
			else next.add(url);
			return next;
		});
	}, []);

	// Append images from the user's own library to the generated grid. These
	// get treated identically to AI-generated images downstream — selectable,
	// included in video composition, carried through save. No `sceneType` so
	// compose falls back to gentle L/R pans for motion.
	const handleAttachLibraryImages = useCallback(
		(picked: MediaAsset[]) => {
			const now = Date.now();
			const additions: GeneratedImage[] = picked.map((asset) => ({
				url: asset.url,
				prompt: "From your library",
				generatedAt: now,
				label: asset.name,
				objectKey: asset.objectKey,
			}));
			setGeneratedImages((prev) => (prev ? [...prev, ...additions] : additions));
		},
		[setGeneratedImages],
	);

	// ---- Video handlers ----
	const handleGenerateVideo = useCallback(() => {
		if (!results || generateVideo.isPending || !generatedImages) return;
		const selected = generatedImages.filter((img) => selectedImageUrls.has(img.url));
		const pool = selected.length >= 2 ? selected : generatedImages;
		// Cap matches the shared schema (max 6 scenes). With more images the
		// compose step keeps each scene shorter so the overall video length stays
		// in the 12–30s window.
		const imgs = pool.slice(0, 6);
		if (imgs.length < 2) return;
		// BGM: three modes translate to server fields —
		//   preset  → bgm=true, no bgmKey (server resolves by tone)
		//   custom  → bgm=true, bgmKey=<asset.objectKey>
		//   off     → bgm=false
		const wantsBgm = bgmSelection.mode !== "off";
		const bgmKey =
			bgmSelection.mode === "custom" ? bgmSelection.asset?.objectKey : undefined;
		generateVideo.mutate({
			idea: idea.trim(),
			caption: results.caption,
			hook: results.recommendedHook,
			images: imgs.map((img) => ({
				url: img.url,
				label: img.label,
				sceneType: img.sceneType,
			})),
			bgm: wantsBgm,
			tone: "motivational",
			voice: voiceGender,
			...(bgmKey ? { bgmKey } : {}),
		});
	}, [
		bgmSelection,
		generateVideo,
		generatedImages,
		idea,
		results,
		selectedImageUrls,
		voiceGender,
	]);

	// ---- Save ----
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
					// Persist the S3 key so the server can re-presign on every fetch.
					objectKey: img.objectKey,
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
						videoKey: video.videoKey,
						voiceover: video.voiceover,
						durationMs: video.durationMs,
						bgmUsed: video.bgmUsed,
						voice: video.voice,
						bgmKey: video.bgmKey,
						energy: video.energy,
						generatedAt: Date.now(),
					}
				: undefined,
		});
	}, [contentType, generatedImages, idea, results, savePost, selectedImageUrls, video]);

	const handleSaveScript = useCallback(async () => {
		if (!script) return;
		await savePost.mutateAsync({
			source: "generate",
			mode: "on_camera",
			idea: idea.trim(),
			contentType,
			scriptHook: script.hook,
			scriptLines: script.lines,
			scriptCta: script.cta,
			hashtags: script.hashtags,
		});
	}, [contentType, idea, savePost, script]);

	const imagesPending = generateImages.isPending && !regeneratingSceneType;
	const canGenerateVideo = Boolean(generatedImages && generatedImages.length >= 2);
	const isPending =
		mode === "on_camera" ? generateScript.isPending : generate.isPending;

	return (
		<div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
			{/* Hero */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="mb-6 flex flex-col gap-3"
			>
				<SectionLabel accent className="inline-flex items-center gap-1.5">
					<Sparkles className="h-3 w-3" strokeWidth={2.5} /> Generate
				</SectionLabel>
				<h1 className="text-balance text-4xl font-bold leading-tight tracking-tight">
					{mode === "on_camera"
						? "What to say, word for word."
						: "What would you like to post about?"}
				</h1>
				<p className="text-[15px] leading-relaxed text-text-secondary">
					{mode === "on_camera"
						? "Drop an idea — get a crisp hook, 3–5 spoken lines, and a closing CTA that sounds like you."
						: "Drop an idea — get 5 scroll-stopping hooks, a sharp caption, and India-relevant hashtags in ~3 seconds."}
				</p>
			</motion.div>

			{/* Mode toggle */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, delay: 0.04 }}
				className="mb-4"
			>
				<ModeToggle value={mode} onChange={handleModeChange} disabled={isPending} />
			</motion.div>

			{/* Input-mode tabs — compact + right-aligned so they read as a
			    secondary utility, not a second ModeToggle. */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, delay: 0.07 }}
				className="mb-2 flex items-center justify-between gap-3"
			>
				<span className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">
					Input
				</span>
				<SegmentedTabs
					compact
					value={inputMode}
					onChange={setInputMode}
					options={INPUT_MODE_OPTIONS}
					disabled={isPending}
					layoutId="generate-input-pill"
				/>
			</motion.div>

			{/* Input surface — text / video ingest / image ingest */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, delay: 0.08 }}
			>
				{inputMode === "text" ? (
					<PromptInput
						value={idea}
						onChange={setIdea}
						onSubmit={() => handleGenerate()}
						loading={isPending}
						submitLabel={mode === "on_camera" ? "Script it" : "Generate"}
						placeholder={
							mode === "on_camera"
								? `Try: "how to actually save money in your 20s"`
								: `Try: "why beginners quit the gym in 2 weeks"`
						}
						hint={
							<>
								Tip: be specific. Niche + angle beats generic topics.{" "}
								<span className="text-text-secondary">⌘/Ctrl + Enter to send</span>
							</>
						}
					/>
				) : (
					<IngestPanel
						mode={inputMode}
						applyLabel="Use as idea →"
						onApply={(context) => {
							setIdea(context);
							setInputMode("text");
						}}
					/>
				)}
			</motion.div>

			{/* Results */}
			<div className="mt-10">
				{mode === "on_camera" ? (
					generateScript.isPending && !script ? (
						<ScriptSkeleton />
					) : generateScript.isError && !script ? (
						<ErrorState
							message={
								generateScript.error?.message ??
								"Please check your connection and try again."
							}
							onRetry={() => handleGenerate()}
						/>
					) : script ? (
						<div className="flex flex-col gap-8">
							<ScriptCard
								script={script}
								onRegenerate={handleRegenerateScript}
								onImproveHook={handleImproveHook}
								regenerating={
									generateScript.isPending &&
									generateScript.variables?.stronger !== true
								}
								improving={
									generateScript.isPending &&
									generateScript.variables?.stronger === true
								}
							/>
							<HashtagsBlock hashtags={script.hashtags} />
							<div className="pt-2">
								<SaveButton onSave={handleSaveScript} />
							</div>
						</div>
					) : (
						<EmptyState />
					)
				) : generate.isPending ? (
					<ResultsSkeleton />
				) : generate.isError ? (
					<ErrorState
						message={
							generate.error?.message ??
							"Please check your connection and try again."
						}
						onRetry={() => handleGenerate()}
					/>
				) : results ? (
					<div className="flex flex-col gap-10">
						<HooksList
							hooks={results.hooks}
							recommendedHook={results.recommendedHook}
							recommendedReason={results.recommendedReason}
							onMakeStronger={handleMakeStronger}
							regenerating={regenerateHooks.isPending}
						/>
						<CaptionBlock caption={results.caption} />
						<HashtagsBlock hashtags={results.hashtags} />

						{/* Images block */}
						<section className="flex flex-col gap-4">
							<div className="flex items-center justify-between">
								<SectionLabel className="inline-flex items-center gap-1.5">
									<ImageIcon className="h-3 w-3" strokeWidth={2.5} /> Images
									(optional)
								</SectionLabel>
							</div>

							{!generatedImages && !imagesPending && !generateImages.isError ? (
								<Card className="flex flex-col gap-4 p-5">
									<CountChips
										value={imageCount}
										onChange={setImageCount}
										disabled={imagesPending}
									/>
									<Button
										variant="primary"
										size="md"
										fullWidth
										onClick={handleGenerateImages}
										iconLeft={<Sparkles className="h-4 w-4" strokeWidth={2.25} />}
									>
										Generate images
									</Button>
									<p className="text-[11px] leading-relaxed text-text-muted">
										Scene-driven visuals (struggle · decision · result). ~10–30s on
										Replicate.
									</p>
								</Card>
							) : null}

							{imagesPending ? <ImagesSkeleton count={imageCount} /> : null}

							{generateImages.isError && !generatedImages ? (
								<ImagesErrorState
									message={
										generateImages.error?.message ??
										"Please try again in a moment."
									}
									code={errorCode(generateImages.error)}
									onRetry={handleGenerateImages}
								/>
							) : null}

							{generatedImages ? (
								<div className="flex flex-col gap-4">
									<ImageGrid
										images={generatedImages}
										selectedUrls={selectedImageUrls}
										onToggle={handleToggleImage}
										onRegenerate={handleRegenerateOne}
										regeneratingSceneType={regeneratingSceneType}
									/>
									<div className="flex flex-wrap items-center justify-between gap-3">
										<p className="text-[12px] text-text-muted">
											{selectedImageUrls.size === 0
												? "Tap an image to include it in your saved post."
												: `${selectedImageUrls.size} selected · tap again to deselect.`}
										</p>
										<div className="flex flex-wrap gap-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setImagePickerOpen(true)}
												iconLeft={<ImagePlus className="h-4 w-4" strokeWidth={2.25} />}
											>
												Add from library
											</Button>
											<Button
												variant="secondary"
												size="sm"
												onClick={() => handleRegenerateBulk()}
												loading={imagesPending}
											>
												Regenerate all
											</Button>
											<ModifierMenu
												onPick={(modifier) => handleRegenerateBulk(modifier)}
												disabled={generateImages.isPending}
											/>
										</div>
									</div>
								</div>
							) : null}
						</section>

						{/* Video block */}
						{canGenerateVideo ? (
							<section className="flex flex-col gap-4">
								<div className="flex items-center justify-between">
									<SectionLabel className="inline-flex items-center gap-1.5">
										<PlaySquare className="h-3 w-3" strokeWidth={2.5} /> Reel video
										(optional)
									</SectionLabel>
								</div>

								{!video && !generateVideo.isPending && !generateVideo.isError ? (
									<Card className="flex flex-col gap-4 p-5">
										<VoicePicker
											value={voiceGender}
											onChange={setVoiceGender}
										/>
										<BgmPicker
											value={bgmSelection}
											onChange={setBgmSelection}
										/>
										<Button
											variant="primary"
											size="md"
											fullWidth
											onClick={handleGenerateVideo}
											iconLeft={
												<PlaySquare className="h-4 w-4" strokeWidth={2.25} />
											}
										>
											Generate video
										</Button>
										<p className="text-[11px] leading-relaxed text-text-muted">
											Uses your selected images + a TTS voiceover. ~15–25s clip.
											Composed locally — no AI cost beyond voice.
										</p>
									</Card>
								) : null}

								{generateVideo.isPending ? <VideoSkeleton /> : null}

								{generateVideo.isError && !video ? (
									<VideoErrorState
										message={
											generateVideo.error?.message ??
											"Please try again in a moment."
										}
										code={errorCode(generateVideo.error)}
										onRetry={handleGenerateVideo}
									/>
								) : null}

								{video && !generateVideo.isPending ? (
									<VideoPlayer
										videoUrl={video.videoUrl}
										voiceover={video.voiceover}
										durationMs={video.durationMs}
										bgmUsed={video.bgmUsed}
										onRegenerate={handleGenerateVideo}
									/>
								) : null}
							</section>
						) : null}

						<div className="pt-2">
							<SaveButton onSave={handleSaveFaceless} />
						</div>
					</div>
				) : (
					<EmptyState />
				)}
			</div>

			<MediaPickerModal
				open={imagePickerOpen}
				onClose={() => setImagePickerOpen(false)}
				kind="image"
				multi
				onPick={handleAttachLibraryImages}
				title="Add images from your library"
			/>
		</div>
	);
}

export default function GeneratePage() {
	return (
		<Suspense
			fallback={
				<div className="mx-auto w-full max-w-5xl px-6 py-14 sm:px-10 lg:px-14">
					<ResultsSkeleton />
				</div>
			}
		>
			<GenerateInner />
		</Suspense>
	);
}
