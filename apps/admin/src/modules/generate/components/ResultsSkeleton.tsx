import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function ResultsSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-3">
				<Skeleton className="h-3 w-24" />
				<Card variant="accent" className="flex flex-col gap-3 p-5">
					<Skeleton className="h-3 w-20" />
					<Skeleton className="h-6 w-3/4" />
					<Skeleton className="h-3 w-full" />
				</Card>
				<Card className="flex flex-col gap-4 p-5">
					{[0, 1, 2, 3].map((i) => (
						<div key={i} className="flex items-center gap-3">
							<Skeleton className="h-6 w-6 rounded-md" />
							<Skeleton className="h-4 flex-1" />
						</div>
					))}
				</Card>
			</div>
			<div className="flex flex-col gap-3">
				<Skeleton className="h-3 w-20" />
				<Card className="flex flex-col gap-2 p-5">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-2/3" />
				</Card>
			</div>
			<div className="flex flex-col gap-3">
				<Skeleton className="h-3 w-20" />
				<Card className="flex flex-wrap gap-2 p-5">
					{[60, 80, 70, 90, 65, 85, 75, 100, 60, 70].map((w, i) => (
						<Skeleton key={i} className="h-8 rounded-full" style={{ width: `${w}px` }} />
					))}
				</Card>
			</div>
		</div>
	);
}
