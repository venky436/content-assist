import { Loader2, Music, PlaySquare } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function VideoSkeleton() {
	return (
		<Card className="overflow-hidden p-6">
			<div className="flex flex-col gap-5 lg:flex-row">
				<div className="relative mx-auto aspect-[9/16] w-full max-w-[320px] shrink-0 overflow-hidden rounded-xl bg-surface-alt">
					<div className="absolute inset-0 animate-shimmer" />
					<div className="relative flex h-full flex-col items-center justify-center gap-3">
						<PlaySquare
							className="h-12 w-12 text-text-muted/50"
							strokeWidth={1.5}
						/>
						<div className="flex items-center gap-2 text-text-muted">
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
							<span className="text-[11px] font-semibold uppercase tracking-widest">
								Composing reel…
							</span>
						</div>
					</div>
				</div>
				<div className="flex flex-1 flex-col gap-5">
					<div className="rounded-xl border border-border bg-surface-alt p-4">
						<Skeleton className="h-3 w-24" />
						<div className="mt-3 flex flex-col gap-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
							<Skeleton className="h-4 w-3/4" />
						</div>
					</div>
					<div className="flex gap-2">
						<Skeleton className="h-11 w-36 rounded-full" />
						<Skeleton className="h-11 w-36 rounded-full" />
					</div>
					<div className="flex items-center gap-2 text-[11px] text-text-muted">
						<Music className="h-3 w-3" strokeWidth={2} />
						<span>Rendering Ken Burns motion, crossfade, voiceover, mix…</span>
					</div>
				</div>
			</div>
		</Card>
	);
}
