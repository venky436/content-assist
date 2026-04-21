import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card } from "@mobile/components/ui";
import { colors, font, radius, spacing } from "@mobile/constants/theme";
import { haptics } from "@mobile/lib/haptics";
import { downloadVideoToGallery } from "@mobile/modules/video/download";

type Props = {
	videoUrl: string;
	voiceover: string;
	durationMs: number;
	bgmUsed: boolean;
	onRegenerate?: () => void;
	regenerating?: boolean;
};

export function VideoPlayer({
	videoUrl,
	voiceover,
	durationMs,
	bgmUsed,
	onRegenerate,
	regenerating = false,
}: Props) {
	const player = useVideoPlayer(videoUrl, (p) => {
		p.loop = true;
		p.muted = false;
		p.play();
	});

	// Mirror the player's playing state locally so the play/pause overlay updates.
	const [isPlaying, setIsPlaying] = useState(true);
	useEffect(() => {
		const sub = player.addListener("playingChange", (next: boolean) => {
			setIsPlaying(next);
		});
		return () => {
			sub.remove();
		};
	}, [player]);

	const [downloadState, setDownloadState] = useState<
		"idle" | "downloading" | "saved" | "error"
	>("idle");

	const handleDownload = useCallback(async () => {
		if (downloadState !== "idle") return;
		setDownloadState("downloading");
		haptics.tapLight();
		const result = await downloadVideoToGallery(videoUrl);
		if (result.ok) {
			haptics.success();
			setDownloadState("saved");
			setTimeout(() => setDownloadState("idle"), 1800);
		} else {
			haptics.error();
			setDownloadState("error");
			setTimeout(() => setDownloadState("idle"), 1800);
		}
	}, [downloadState, videoUrl]);

	const togglePlayback = useCallback(() => {
		haptics.tapLight();
		if (player.playing) player.pause();
		else player.play();
	}, [player]);

	return (
		<Animated.View entering={FadeInDown.duration(220)}>
			<Card padded>
				<View style={styles.playerWrap}>
					<VideoView
						player={player}
						style={styles.player}
						contentFit="cover"
						nativeControls={false}
						allowsFullscreen
					/>
					<Pressable
						onPress={togglePlayback}
						style={styles.playOverlay}
						accessibilityRole="button"
						accessibilityLabel={isPlaying ? "Pause video" : "Play video"}
					>
						{!isPlaying ? (
							<View style={styles.playBadge}>
								<Text style={styles.playIcon}>▶</Text>
							</View>
						) : null}
					</Pressable>
					<View style={styles.meta}>
						<Text style={styles.metaText}>
							{(durationMs / 1000).toFixed(1)}s
							{bgmUsed ? " · 🎵 BGM" : " · voice only"}
						</Text>
					</View>
				</View>

				<View style={styles.scriptBlock}>
					<Text style={styles.scriptLabel}>VOICEOVER</Text>
					<Text style={styles.scriptText}>{voiceover}</Text>
				</View>

				<View style={styles.actions}>
					<Pressable
						onPress={handleDownload}
						disabled={downloadState !== "idle"}
						style={[
							styles.downloadAction,
							downloadState === "saved" && styles.downloadActionSaved,
							downloadState === "error" && styles.downloadActionError,
						]}
						accessibilityRole="button"
						accessibilityLabel="Download video to gallery"
					>
						{downloadState === "downloading" ? (
							<ActivityIndicator color="#fff" size="small" />
						) : (
							<Text style={styles.downloadActionText}>
								{downloadState === "saved"
									? "✓  Saved to gallery"
									: downloadState === "error"
										? "!  Couldn't save"
										: "⬇  Download"}
							</Text>
						)}
					</Pressable>
					{onRegenerate ? (
						<Pressable
							onPress={onRegenerate}
							disabled={regenerating}
							style={[
								styles.secondaryAction,
								regenerating && styles.secondaryActionDisabled,
							]}
						>
							{regenerating ? (
								<ActivityIndicator color={colors.textPrimary} size="small" />
							) : (
								<Text style={styles.secondaryActionText}>🔄 Regenerate</Text>
							)}
						</Pressable>
					) : null}
				</View>
			</Card>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	playerWrap: {
		position: "relative",
		borderRadius: radius.lg,
		overflow: "hidden",
		backgroundColor: "#000",
		aspectRatio: 9 / 16,
		alignSelf: "center",
		width: "100%",
		maxWidth: 360,
	},
	player: {
		width: "100%",
		height: "100%",
	},
	playOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: "center",
		justifyContent: "center",
	},
	playBadge: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: "rgba(0,0,0,0.6)",
		borderWidth: 2,
		borderColor: "rgba(255,255,255,0.85)",
		alignItems: "center",
		justifyContent: "center",
	},
	playIcon: {
		color: "#fff",
		fontSize: 22,
		marginLeft: 3,
	},
	meta: {
		position: "absolute",
		bottom: spacing.sm,
		right: spacing.sm,
		paddingHorizontal: spacing.sm,
		paddingVertical: 4,
		borderRadius: radius.pill,
		backgroundColor: "rgba(0,0,0,0.6)",
	},
	metaText: {
		...font.caption,
		color: "#fff",
		fontWeight: "700",
		fontSize: 11,
	},
	scriptBlock: {
		marginTop: spacing.lg,
		padding: spacing.md,
		borderRadius: radius.md,
		backgroundColor: colors.surfaceAlt,
		borderWidth: 1,
		borderColor: colors.border,
		gap: 4,
	},
	scriptLabel: {
		...font.label,
		color: colors.textMuted,
		fontSize: 10,
		fontWeight: "800",
	},
	scriptText: {
		...font.body,
		color: colors.textPrimary,
		lineHeight: 22,
	},
	actions: {
		marginTop: spacing.lg,
		flexDirection: "row",
		gap: spacing.sm,
	},
	downloadAction: {
		flex: 1,
		paddingVertical: 14,
		paddingHorizontal: spacing.lg,
		borderRadius: radius.pill,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.surfaceAlt,
		borderWidth: 1.5,
		borderColor: colors.border,
	},
	downloadActionSaved: {
		backgroundColor: colors.successSoft,
		borderColor: colors.success,
	},
	downloadActionError: {
		backgroundColor: colors.dangerSoft,
		borderColor: colors.danger,
	},
	downloadActionText: {
		...font.bodyStrong,
		fontSize: 15,
		color: colors.textPrimary,
	},
	secondaryAction: {
		paddingVertical: 14,
		paddingHorizontal: spacing.lg,
		borderRadius: radius.pill,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.surfaceAlt,
		borderWidth: 1.5,
		borderColor: colors.border,
	},
	secondaryActionDisabled: { opacity: 0.6 },
	secondaryActionText: {
		...font.bodyStrong,
		fontSize: 15,
		color: colors.textPrimary,
	},
});
