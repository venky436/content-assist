import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function ScriptSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-3 w-28" />
			<Card variant="accent" className="flex flex-col gap-6 p-6">
				<div className="flex flex-col gap-2">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-7 w-3/4" />
				</div>
				<div className="flex gap-4">
					<Skeleton className="w-1 rounded-full" />
					<div className="flex flex-1 flex-col gap-3">
						<Skeleton className="h-5 w-full" />
						<Skeleton className="h-5 w-11/12" />
						<Skeleton className="h-5 w-10/12" />
						<Skeleton className="h-5 w-9/12" />
					</div>
				</div>
				<div className="flex flex-col gap-2">
					<Skeleton className="h-3 w-24" />
					<Skeleton className="h-5 w-2/3" />
				</div>
			</Card>
			<div className="flex gap-2">
				<Skeleton className="h-11 w-40 rounded-full" />
				<Skeleton className="h-11 w-32 rounded-full" />
			</div>
		</div>
	);
}
