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
import { Button } from "@mobile/components/ui";
import { colors, font, spacing } from "@mobile/constants/theme";
import { useAnalyze } from "@mobile/modules/analyze/hooks";
import { ComparisonCard } from "@mobile/modules/analyze/components/ComparisonCard";
import { ContentInput } from "@mobile/modules/analyze/components/ContentInput";
import { EmptyState } from "@mobile/modules/analyze/components/EmptyState";
import { ErrorState } from "@mobile/modules/analyze/components/ErrorState";
import { FixesBlock } from "@mobile/modules/analyze/components/FixesBlock";
import { ImprovedPostCard } from "@mobile/modules/analyze/components/ImprovedPostCard";
import { InsightBlock } from "@mobile/modules/analyze/components/InsightBlock";
import { IssuesList } from "@mobile/modules/analyze/components/IssuesList";
import { ProblemsBadges } from "@mobile/modules/analyze/components/ProblemsBadges";
import { QuickFixCard } from "@mobile/modules/analyze/components/QuickFixCard";
import { RegenerateCTA } from "@mobile/modules/analyze/components/RegenerateCTA";
import { ResultsSkeleton } from "@mobile/modules/analyze/components/ResultsSkeleton";
import { ScoreCard } from "@mobile/modules/analyze/components/ScoreCard";
import { SaveButton } from "@mobile/modules/saved/components/SaveButton";
import { useSavePost } from "@mobile/modules/saved/hooks";

export function AnalyzeScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ seed?: string }>();
	const [content, setContent] = useState("");
	const analyze = useAnalyze();
	const savePost = useSavePost();
	const consumedSeedRef = useRef<string | null>(null);

	useEffect(() => {
		const incoming = typeof params.seed === "string" ? params.seed : undefined;
		if (!incoming) return;
		if (consumedSeedRef.current === incoming) return;
		consumedSeedRef.current = incoming;
		const trimmed = incoming.trim();
		if (trimmed.length < 10) return;
		setContent(trimmed.slice(0, 2000));
		router.setParams({ seed: undefined });
		analyze.mutate({ content: trimmed });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.seed]);

	const canAnalyze = content.trim().length >= 10 && !analyze.isPending;

	const handleAnalyze = useCallback(() => {
		if (!canAnalyze) return;
		analyze.mutate({ content: content.trim() });
	}, [analyze, canAnalyze, content]);

	const handleRetry = useCallback(() => {
		analyze.reset();
		handleAnalyze();
	}, [analyze, handleAnalyze]);

	const handleRegenerate = useCallback(() => {
		const improved = analyze.data?.improvedPost;
		if (!improved) return;
		router.push({
			pathname: "/(tabs)",
			params: { idea: improved },
		});
	}, [analyze.data, router]);

	const handleSave = useCallback(async () => {
		if (!analyze.data) return;
		const r = analyze.data;
		await savePost.mutateAsync({
			source: "analyze",
			idea: r.originalHook || content.trim().split("\n")[0] || "Analyzed post",
			contentType: "reel",
			originalContent: content.trim(),
			score: r.score,
			verdict: r.verdict,
			betterHook: r.betterHook,
			improvedPost: r.improvedPost,
		});
	}, [analyze.data, content, savePost]);

	const errorCode =
		analyze.error?.body && typeof analyze.error.body === "object" && "error" in analyze.error.body
			? String((analyze.error.body as { error: unknown }).error)
			: undefined;

	const renderResults = () => {
		if (analyze.isPending) return <ResultsSkeleton />;
		if (analyze.isError) {
			return (
				<ErrorState
					code={errorCode}
					message={analyze.error?.message ?? "Please try again."}
					onRetry={handleRetry}
				/>
			);
		}
		if (analyze.data) {
			const r = analyze.data;
			return (
				<View style={styles.results}>
					<ScoreCard
						score={r.score}
						verdict={r.verdict}
						explanation={r.explanation}
						confidence={r.confidence}
					/>
					<QuickFixCard quickFix={r.quickFix} />
					<ComparisonCard
						originalHook={r.originalHook}
						betterHook={r.betterHook}
					/>
					<ProblemsBadges problems={r.problems} score={r.score} />
					<IssuesList issues={r.captionIssues} />
					<FixesBlock
						betterHook={r.betterHook}
						hookReason={r.hookReason}
						improvedCaption={r.improvedCaption}
						captionReason={r.captionReason}
						priorityFix={r.priorityFix}
					/>
					<ImprovedPostCard improvedPost={r.improvedPost} />
					<InsightBlock insight={r.insight} />
					<View style={styles.saveWrap}>
						<SaveButton onSave={handleSave} label="Save to workspace" size="lg" />
					</View>
					<RegenerateCTA onPress={handleRegenerate} />
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
						<Text style={styles.badgeText}>ANALYZE</Text>
					</View>
					<Text style={styles.title}>Make your next{"\n"}post hit harder.</Text>
					<Text style={styles.subtitle}>
						Paste a hook, caption, or existing content. You'll get a score, the
						specific problems, and exact rewrites.
					</Text>
				</View>

				<View style={styles.form}>
					<ContentInput
						value={content}
						onChangeText={setContent}
						disabled={analyze.isPending}
					/>
					<Button
						label={analyze.isPending ? "Analyzing…" : "Analyze"}
						onPress={handleAnalyze}
						loading={analyze.isPending}
						disabled={!canAnalyze}
						variant="primary"
						size="lg"
						fullWidth
						haptic="medium"
						iconLeft={<Text style={styles.buttonIcon}>🔍</Text>}
					/>
				</View>

				<View style={styles.resultsContainer}>{renderResults()}</View>
			</ScrollView>
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
	title: {
		...font.display,
		color: colors.textPrimary,
	},
	subtitle: {
		...font.body,
		color: colors.textSecondary,
		lineHeight: 24,
	},
	form: { gap: spacing.xl },
	buttonIcon: { fontSize: 16 },
	resultsContainer: { minHeight: 300 },
	results: { gap: spacing.xl },
	saveWrap: { marginTop: spacing.sm },
});
