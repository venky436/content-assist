import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function AnalyzeResultsSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			<Card className="flex items-center gap-6 p-7">
				<Skeleton className="h-[112px] w-[112px] rounded-full" />
				<div className="flex flex-1 flex-col gap-3">
					<Skeleton className="h-3 w-24" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
				</div>
			</Card>
			<Card className="flex flex-col gap-3 p-6">
				<Skeleton className="h-3 w-32" />
				<Skeleton className="h-5 w-2/3" />
				<Skeleton className="h-5 w-1/2" />
			</Card>
			<Card variant="accent" className="flex flex-col gap-3 p-6">
				<Skeleton className="h-3 w-28" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
				<Skeleton className="h-4 w-3/4" />
			</Card>
		</div>
	);
}
