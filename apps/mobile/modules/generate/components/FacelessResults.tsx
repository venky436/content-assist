import { StyleSheet, Text, View } from "react-native";
import type {
	GeneratedImage,
	GenerateResponse,
	GenerateVideoResponse,
	SceneType,
	VideoVoice,
} from "@content-assist/shared";
import { SectionLabel } from "@mobile/components/ui";
import { colors, font, spacing } from "@mobile/constants/theme";
import { CaptionBlock } from "@mobile/modules/generate/components/CaptionBlock";
import { EmptyState } from "@mobile/modules/generate/components/EmptyState";
import { ErrorState } from "@mobile/modules/generate/components/ErrorState";
import { HashtagsBlock } from "@mobile/modules/generate/components/HashtagsBlock";
import { HooksList } from "@mobile/modules/generate/components/HooksList";
import { ResultsSkeleton } from "@mobile/modules/generate/components/ResultsSkeleton";
import { ModeEmptyState } from "@mobile/modules/generate/components/ModeEmptyState";
import { CountChips } from "@mobile/modules/images/components/CountChips";
import { GenerateImagesButton } from "@mobile/modules/images/components/GenerateImagesButton";
import { ImageErrorState } from "@mobile/modules/images/components/ImageErrorState";
import { ImageGrid } from "@mobile/modules/images/components/ImageGrid";
import { ImageLoadingSkeleton } from "@mobile/modules/images/components/ImageLoadingSkeleton";
import { RegenerateImagesBar } from "@mobile/modules/images/components/RegenerateImagesBar";
import { SaveButton } from "@mobile/modules/saved/components/SaveButton";
import { BgmToggle } from "@mobile/modules/video/components/BgmToggle";
import { GenerateVideoButton } from "@mobile/modules/video/components/GenerateVideoButton";
import { VideoErrorState } from "@mobile/modules/video/components/VideoErrorState";
import { VideoPlayer } from "@mobile/modules/video/components/VideoPlayer";
import { VideoSkeleton } from "@mobile/modules/video/components/VideoSkeleton";
import { VoicePicker } from "@mobile/modules/video/components/VoicePicker";

type ImagesError = {
	message?: string;
	body?: unknown;
} | null;

type Props = {
	// Text results state
	results: GenerateResponse | null;
	pending: boolean;
	error?: { message?: string } | null;
	onRetry: () => void;
	// Hook regeneration
	onMakeStronger: () => void;
	regeneratingHooks: boolean;
	regenHooksError: boolean;
	// Idle flag — show ModeEmptyState when idea exists but nothing generated yet
	showModeEmpty: boolean;
	// Images
	generatedImages: GeneratedImage[] | null;
	selectedImageUrls: Set<string>;
	imageCount: 2 | 3;
	onImageCountChange: (count: 2 | 3) => void;
	onGenerateImages: () => void;
	onRegenerateImages: () => void;
	onOpenModifier: () => void;
	onToggleImage: (url: string) => void;
	onPreviewImage: (index: number) => void;
	onRegenerateOneImage: (sceneType: SceneType) => void;
	regeneratingSceneType?: SceneType;
	imagesPending: boolean;
	imagesError: ImagesError;
	imagesJustRegenerated: boolean;
	// Video
	video: GenerateVideoResponse | null;
	videoPending: boolean;
	videoError: ImagesError;
	bgmEnabled: boolean;
	onBgmChange: (next: boolean) => void;
	voiceGender: VideoVoice;
	onVoiceGenderChange: (next: VideoVoice) => void;
	onGenerateVideo: () => void;
	onRegenerateVideo: () => void;
	// Save
	onSave: () => Promise<unknown> | unknown;
};

export function FacelessResults({
	results,
	pending,
	error,
	onRetry,
	onMakeStronger,
	regeneratingHooks,
	regenHooksError,
	showModeEmpty,
	generatedImages,
	selectedImageUrls,
	imageCount,
	onImageCountChange,
	onGenerateImages,
	onRegenerateImages,
	onOpenModifier,
	onToggleImage,
	onPreviewImage,
	onRegenerateOneImage,
	regeneratingSceneType,
	imagesPending,
	imagesError,
	imagesJustRegenerated,
	video,
	videoPending,
	videoError,
	bgmEnabled,
	onBgmChange,
	voiceGender,
	onVoiceGenderChange,
	onGenerateVideo,
	onRegenerateVideo,
	onSave,
}: Props) {
	if (pending) return <ResultsSkeleton />;

	if (error && !results) {
		return (
			<ErrorState
				message={error.message ?? "Please check your connection and try again."}
				onRetry={onRetry}
			/>
		);
	}

	if (!results) {
		return showModeEmpty ? <ModeEmptyState mode="faceless" /> : <EmptyState />;
	}

	const imagesErrorCode =
		imagesError?.body && typeof imagesError.body === "object" && "error" in imagesError.body
			? String((imagesError.body as { error: unknown }).error)
			: undefined;

	// Single-scene regenerate keeps the grid visible with a per-tile skeleton.
	// Only swap to the full-grid skeleton on a true bulk generate/regenerate.
	const isBulkPending = imagesPending && !regeneratingSceneType;

	return (
		<View style={styles.results}>
			<HooksList
				hooks={results.hooks}
				recommendedHook={results.recommendedHook}
				recommendedReason={results.recommendedReason}
				onMakeStronger={onMakeStronger}
				regenerating={regeneratingHooks}
			/>
			{regenHooksError ? (
				<Text style={styles.regenError}>Couldn't refresh hooks. Tap again.</Text>
			) : null}
			<CaptionBlock caption={results.caption} />
			<HashtagsBlock hashtags={results.hashtags} />

			<View style={styles.imagesBlock}>
				<SectionLabel>Images (optional)</SectionLabel>

				{!generatedImages && !imagesPending && !imagesError ? (
					<View style={styles.genImagesStack}>
						<CountChips value={imageCount} onChange={onImageCountChange} />
						<GenerateImagesButton onPress={onGenerateImages} loading={false} />
					</View>
				) : null}

				{isBulkPending ? <ImageLoadingSkeleton /> : null}

				{imagesError && !generatedImages ? (
					<ImageErrorState
						message={imagesError.message ?? "Please try again in a moment."}
						code={imagesErrorCode}
						onRetry={onGenerateImages}
					/>
				) : null}

				{generatedImages && !isBulkPending ? (
					<View style={styles.imagesStack}>
						{imagesJustRegenerated ? (
							<View style={styles.banner}>
								<Text style={styles.bannerText}>✓ New images generated</Text>
							</View>
						) : null}
						<ImageGrid
							images={generatedImages}
							selectedUrls={selectedImageUrls}
							onToggle={onToggleImage}
							onPreview={onPreviewImage}
							onRegenerate={onRegenerateOneImage}
							regeneratingSceneType={regeneratingSceneType}
						/>
						<Text style={styles.imagesHint}>
							{selectedImageUrls.size === 0
								? "Tap an image to include it in your saved post."
								: `${selectedImageUrls.size} selected · tap again to deselect.`}
						</Text>
						<RegenerateImagesBar
							onRegenerate={onRegenerateImages}
							onRegenerateAs={onOpenModifier}
							loading={imagesPending}
						/>
					</View>
				) : null}
			</View>

			{generatedImages && generatedImages.length >= 2 ? (
				<View style={styles.videoBlock}>
					<SectionLabel>Reel video (optional)</SectionLabel>

					{!video && !videoPending && !videoError ? (
						<View style={styles.videoStack}>
							<VoicePicker value={voiceGender} onChange={onVoiceGenderChange} />
							<BgmToggle value={bgmEnabled} onChange={onBgmChange} />
							<GenerateVideoButton onPress={onGenerateVideo} loading={false} />
							<Text style={styles.videoHint}>
								Uses your selected images + a TTS voiceover of the caption. ~10–20s
								clip. Composed locally — no extra AI cost beyond voiceover.
							</Text>
						</View>
					) : null}

					{videoPending ? <VideoSkeleton /> : null}

					{videoError && !video ? (
						<VideoErrorState
							message={videoError.message ?? "Please try again in a moment."}
							code={
								videoError.body &&
								typeof videoError.body === "object" &&
								"error" in videoError.body
									? String((videoError.body as { error: unknown }).error)
									: undefined
							}
							onRetry={onGenerateVideo}
						/>
					) : null}

					{video && !videoPending ? (
						<VideoPlayer
							videoUrl={video.videoUrl}
							voiceover={video.voiceover}
							durationMs={video.durationMs}
							bgmUsed={video.bgmUsed}
							onRegenerate={onRegenerateVideo}
							regenerating={false}
						/>
					) : null}
				</View>
			) : null}

			<View style={styles.saveWrap}>
				<SaveButton
					onSave={onSave}
					label="Save to workspace"
					size="lg"
					variant="secondary"
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	results: { gap: spacing.xl },
	regenError: {
		...font.caption,
		color: colors.danger,
		textAlign: "center",
	},
	saveWrap: { marginTop: spacing.sm },
	imagesBlock: { gap: spacing.md },
	imagesStack: { gap: spacing.md },
	genImagesStack: { gap: spacing.md },
	videoBlock: { gap: spacing.md },
	videoStack: { gap: spacing.md },
	videoHint: {
		...font.caption,
		color: colors.textMuted,
		textAlign: "center",
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
