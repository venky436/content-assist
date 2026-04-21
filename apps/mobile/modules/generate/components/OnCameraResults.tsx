import { StyleSheet, View } from "react-native";
import type { GenerateScriptResponse } from "@content-assist/shared";
import { spacing } from "@mobile/constants/theme";
import { ErrorState } from "@mobile/modules/generate/components/ErrorState";
import { HashtagsBlock } from "@mobile/modules/generate/components/HashtagsBlock";
import { ModeEmptyState } from "@mobile/modules/generate/components/ModeEmptyState";
import { ScriptCard } from "@mobile/modules/generate/components/ScriptCard";
import { ScriptSkeleton } from "@mobile/modules/generate/components/ScriptSkeleton";
import { SaveButton } from "@mobile/modules/saved/components/SaveButton";

type Props = {
	script: GenerateScriptResponse | null;
	pending: boolean;
	error?: { message?: string } | null;
	onRetry: () => void;
	onRegenerate: () => void;
	onImproveHook: () => void;
	regenerating: boolean;
	improvingHook: boolean;
	onSave: () => Promise<unknown> | unknown;
};

export function OnCameraResults({
	script,
	pending,
	error,
	onRetry,
	onRegenerate,
	onImproveHook,
	regenerating,
	improvingHook,
	onSave,
}: Props) {
	if (pending) return <ScriptSkeleton />;

	if (error && !script) {
		return (
			<ErrorState
				message={error.message ?? "Please check your connection and try again."}
				onRetry={onRetry}
			/>
		);
	}

	if (!script) {
		return <ModeEmptyState mode="on_camera" />;
	}

	return (
		<View style={styles.stack}>
			<ScriptCard
				script={script}
				onRegenerate={onRegenerate}
				onImproveHook={onImproveHook}
				regenerating={regenerating}
				improving={improvingHook}
			/>
			<HashtagsBlock hashtags={script.hashtags} />
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
	stack: {
		gap: spacing.xl,
	},
	saveWrap: {
		marginTop: spacing.sm,
	},
});
