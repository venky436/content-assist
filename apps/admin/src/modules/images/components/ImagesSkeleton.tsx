import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

type Props = { count?: 2 | 3 };

export function ImagesSkeleton({ count = 3 }: Props) {
	return (
		<div className={cn("grid gap-4", count === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
			{Array.from({ length: count }).map((_, i) => (
				<div key={i} className="flex flex-col gap-2">
					<Skeleton className="aspect-square w-full rounded-xl" />
					<Skeleton className="h-3 w-24" />
				</div>
			))}
		</div>
	);
}
