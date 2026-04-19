import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Dimensions,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { GeneratedImage, SceneType } from "@content-assist/shared";
import { colors, font, radius, spacing } from "@mobile/constants/theme";
import { haptics } from "@mobile/lib/haptics";
import { downloadImageToGallery } from "@mobile/modules/images/download";
import { formatRelative } from "@mobile/modules/saved/format";

type Props = {
	visible: boolean;
	images: GeneratedImage[];
	initialIndex: number;
	selectedUrls?: Set<string>;
	onToggleSelect?: (url: string) => void;
	onClose: () => void;
};

const SCENE_COLORS: Record<SceneType, { bg: string; fg: string; border: string }> = {
	struggle: { bg: "rgba(239,68,68,0.16)", fg: "#EF4444", border: "#EF4444" },
	decision: { bg: "rgba(245,158,11,0.16)", fg: "#F59E0B", border: "#F59E0B" },
	result: { bg: "rgba(34,197,94,0.16)", fg: "#22C55E", border: "#22C55E" },
};
const FALLBACK_TYPE_COLOR = {
	bg: "rgba(255,61,127,0.16)",
	fg: "#FF3D7F",
	border: "#FF3D7F",
};

export function ImagePreviewModal({
	visible,
	images,
	initialIndex,
	selectedUrls,
	onToggleSelect,
	onClose,
}: Props) {
	const insets = useSafeAreaInsets();
	const [index, setIndex] = useState(initialIndex);
	const [promptExpanded, setPromptExpanded] = useState(false);
	const [downloadState, setDownloadState] = useState<
		"idle" | "downloading" | "saved" | "error"
	>("idle");

	useEffect(() => {
		if (visible) {
			setIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
			setPromptExpanded(false);
		}
	}, [visible, initialIndex, images.length]);

	const current = images[index];
	if (!visible || !current) {
		return (
			<Modal transparent visible={visible} onRequestClose={onClose} animationType="fade">
				<View style={styles.backdrop}>
					<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
				</View>
			</Modal>
		);
	}

	const isSelected = selectedUrls?.has(current.url) ?? false;
	const canToggle = Boolean(onToggleSelect && selectedUrls);
	const canSwipeNext = index < images.length - 1;
	const canSwipePrev = index > 0;
	const screenWidth = Dimensions.get("window").width;
	const imageSize = Math.min(screenWidth - spacing.xl * 2, 440);

	const typeStyle =
		(current.sceneType && SCENE_COLORS[current.sceneType]) || FALLBACK_TYPE_COLOR;
	const displayLabel = current.label ?? current.type;

	const handleSelect = () => {
		if (!canToggle || !onToggleSelect) return;
		haptics.selection();
		onToggleSelect(current.url);
	};

	const handleDownload = useCallback(async () => {
		if (downloadState !== "idle") return;
		setDownloadState("downloading");
		haptics.tapLight();
		const result = await downloadImageToGallery(current.url);
		if (result.ok) {
			haptics.success();
			setDownloadState("saved");
			setTimeout(() => setDownloadState("idle"), 1800);
		} else {
			haptics.error();
			setDownloadState("error");
			setTimeout(() => setDownloadState("idle"), 1800);
		}
	}, [current.url, downloadState]);

	return (
		<Modal
			transparent
			visible={visible}
			onRequestClose={onClose}
			animationType="fade"
		>
			<Animated.View entering={FadeIn.duration(160)} style={styles.backdrop}>
				<Pressable
					style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
					onPress={onClose}
				/>

				{/* Top bar */}
				<View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
					<Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
						<Text style={styles.closeText}>✕</Text>
					</Pressable>
					<Text style={styles.counterText}>
						{images.length > 1 ? `${index + 1} / ${images.length}` : "Preview"}
					</Text>
					<View style={styles.topBarSpacer} />
				</View>

				{/* Image area */}
				<View style={styles.imageArea}>
					<View style={[styles.imageWrap, { width: imageSize, height: imageSize }]}>
						<Image
							source={current.url}
							style={StyleSheet.absoluteFill}
							contentFit="contain"
							transition={220}
							recyclingKey={current.url}
						/>
					</View>

					{/* Prev/next chevrons */}
					{images.length > 1 ? (
						<>
							<Pressable
								style={[styles.navBtn, styles.navBtnLeft, !canSwipePrev && styles.navDisabled]}
								onPress={() => canSwipePrev && setIndex(index - 1)}
								disabled={!canSwipePrev}
							>
								<Text style={styles.navText}>‹</Text>
							</Pressable>
							<Pressable
								style={[styles.navBtn, styles.navBtnRight, !canSwipeNext && styles.navDisabled]}
								onPress={() => canSwipeNext && setIndex(index + 1)}
								disabled={!canSwipeNext}
							>
								<Text style={styles.navText}>›</Text>
							</Pressable>
						</>
					) : null}
				</View>

				{/* Bottom sheet */}
				<View
					style={[
						styles.bottomSheet,
						{ paddingBottom: insets.bottom + spacing.md },
					]}
				>
					{/* Top row: type pill + timestamp */}
					<View style={styles.metaRow}>
						{displayLabel ? (
							<View
								style={[
									styles.typePill,
									{ backgroundColor: typeStyle.bg, borderColor: typeStyle.border },
								]}
							>
								<Text style={[styles.typeText, { color: typeStyle.fg }]}>
									{displayLabel}
								</Text>
							</View>
						) : (
							<View style={{ flex: 1 }} />
						)}
						<Text style={styles.timestamp}>
							{formatRelative(current.generatedAt)}
						</Text>
					</View>

					{/* Prompt */}
					<Pressable
						onPress={() => setPromptExpanded((v) => !v)}
						style={styles.promptCard}
					>
						<Text style={styles.promptLabel}>PROMPT</Text>
						<Text
							style={styles.promptText}
							numberOfLines={promptExpanded ? undefined : 3}
						>
							{current.prompt}
						</Text>
						<Text style={styles.promptToggle}>
							{promptExpanded ? "Tap to collapse" : "Tap to see full prompt"}
						</Text>
					</Pressable>

					{/* Action row: download + (optional) include-in-post */}
					<View style={styles.actionRow}>
						<Pressable
							onPress={handleDownload}
							disabled={downloadState !== "idle"}
							style={[
								styles.downloadAction,
								downloadState === "saved" && styles.downloadActionSaved,
								downloadState === "error" && styles.downloadActionError,
							]}
							accessibilityRole="button"
							accessibilityLabel="Download image to gallery"
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
					</View>

					{/* Selection toggle */}
					{canToggle ? (
						<Pressable
							onPress={handleSelect}
							style={[
								styles.selectBtn,
								isSelected ? styles.selectBtnOn : styles.selectBtnOff,
							]}
						>
							<Text
								style={[
									styles.selectBtnText,
									isSelected ? styles.selectBtnTextOn : styles.selectBtnTextOff,
								]}
							>
								{isSelected ? "✓  Included in post" : "Include in post"}
							</Text>
						</Pressable>
					) : null}
				</View>
			</Animated.View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.92)",
	},
	topBar: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.sm,
		zIndex: 10,
		elevation: 10,
	},
	closeBtn: {
		width: 36,
		height: 36,
		borderRadius: radius.pill,
		backgroundColor: "rgba(255,255,255,0.12)",
		alignItems: "center",
		justifyContent: "center",
	},
	closeText: { color: "#fff", fontSize: 18, fontWeight: "700" },
	counterText: {
		...font.label,
		color: "rgba(255,255,255,0.72)",
		fontWeight: "700",
	},
	topBarSpacer: { width: 36 },
	imageArea: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	imageWrap: {
		borderRadius: radius.xl,
		overflow: "hidden",
		backgroundColor: colors.surfaceAlt,
	},
	navBtn: {
		position: "absolute",
		top: "50%",
		width: 44,
		height: 44,
		marginTop: -22,
		borderRadius: radius.pill,
		backgroundColor: "rgba(255,255,255,0.12)",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 10,
		elevation: 10,
	},
	navBtnLeft: { left: spacing.sm },
	navBtnRight: { right: spacing.sm },
	navDisabled: { opacity: 0.3 },
	navText: { color: "#fff", fontSize: 28, fontWeight: "700" },
	bottomSheet: {
		backgroundColor: colors.bgElevated,
		borderTopLeftRadius: radius.xxl,
		borderTopRightRadius: radius.xxl,
		borderTopWidth: 1,
		borderLeftWidth: 1,
		borderRightWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.lg,
		gap: spacing.md,
		zIndex: 10,
		elevation: 10,
	},
	metaRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	typePill: {
		paddingHorizontal: spacing.md,
		paddingVertical: 5,
		borderRadius: radius.pill,
		borderWidth: 1,
	},
	typeText: {
		...font.label,
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 1,
	},
	timestamp: { ...font.caption, color: colors.textMuted },
	promptCard: {
		padding: spacing.md,
		borderRadius: radius.lg,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		gap: spacing.xs,
	},
	promptLabel: {
		...font.label,
		color: colors.textMuted,
		fontWeight: "700",
	},
	promptText: {
		...font.body,
		color: colors.textPrimary,
		lineHeight: 22,
	},
	promptToggle: {
		...font.caption,
		color: colors.accent,
		fontWeight: "700",
		marginTop: 2,
	},
	actionRow: {
		flexDirection: "row",
		gap: spacing.sm,
	},
	downloadAction: {
		flex: 1,
		paddingVertical: spacing.md,
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
	selectBtn: {
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.lg,
		borderRadius: radius.pill,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1.5,
	},
	selectBtnOn: {
		backgroundColor: colors.accent,
		borderColor: colors.accent,
	},
	selectBtnOff: {
		backgroundColor: colors.surfaceAlt,
		borderColor: colors.border,
	},
	selectBtnText: {
		...font.bodyStrong,
		fontSize: 15,
	},
	selectBtnTextOn: { color: "#fff" },
	selectBtnTextOff: { color: colors.textPrimary },
});
