"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Check } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";

type Props = {
	onSave: () => Promise<unknown> | unknown;
	label?: string;
};

export function SaveButton({ onSave, label = "Save to workspace" }: Props) {
	const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

	const handlePress = useCallback(async () => {
		if (state !== "idle") return;
		setState("saving");
		try {
			await onSave();
			setState("saved");
			setTimeout(() => setState("idle"), 1600);
		} catch {
			setState("idle");
		}
	}, [onSave, state]);

	return (
		<AnimatePresence mode="wait" initial={false}>
			{state === "saved" ? (
				<motion.div
					key="saved"
					initial={{ opacity: 0, scale: 0.96 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.98 }}
					className="flex h-[52px] items-center justify-center gap-2 rounded-full border border-success bg-success-soft px-7 text-[15px] font-semibold text-success"
				>
					<Check className="h-4 w-4" strokeWidth={3} />
					Saved to workspace
				</motion.div>
			) : (
				<motion.div
					key="button"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<Button
						variant="secondary"
						size="lg"
						fullWidth
						loading={state === "saving"}
						onClick={handlePress}
						iconLeft={<Bookmark className="h-4 w-4" strokeWidth={2.25} />}
					>
						{state === "saving" ? "Saving…" : label}
					</Button>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
