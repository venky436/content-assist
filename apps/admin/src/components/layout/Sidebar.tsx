"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
	Bookmark,
	Search,
	Sparkles,
	UserCircle,
	Wand2,
	type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { UserPill } from "@/components/layout/UserPill";

type NavItem = {
	href: "/generate" | "/analyze" | "/saved" | "/profile";
	label: string;
	hint: string;
	icon: LucideIcon;
};

const NAV: NavItem[] = [
	{
		href: "/generate",
		label: "Generate",
		hint: "Hooks · Caption · Hashtags",
		icon: Sparkles,
	},
	{
		href: "/analyze",
		label: "Analyze",
		hint: "Ruthless content critic",
		icon: Search,
	},
	{
		href: "/saved",
		label: "Saved",
		hint: "Your workspace",
		icon: Bookmark,
	},
	{
		href: "/profile",
		label: "Profile",
		hint: "You + your media",
		icon: UserCircle,
	},
];

export function Sidebar() {
	const pathname = usePathname();

	return (
		<aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-border/80 bg-gradient-surface">
			<Link href="/" className="flex items-center gap-2.5 px-5 py-6">
				<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-accent shadow-accent-sm">
					<Wand2 className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
				</span>
				<span className="flex flex-col leading-tight">
					<span className="text-[15px] font-semibold tracking-tight">
						Content Assist
					</span>
					<span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
						Creator Studio
					</span>
				</span>
			</Link>

			<nav className="mt-2 flex-1 space-y-1 px-3">
				{NAV.map((item) => {
					const active =
						pathname === item.href || pathname?.startsWith(`${item.href}/`);
					const Icon = item.icon;
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
								active
									? "bg-surface-alt text-text-primary"
									: "text-text-secondary hover:bg-surface-alt/60 hover:text-text-primary",
							)}
						>
							{active ? (
								<motion.span
									layoutId="sidebar-pill"
									className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
									transition={{ type: "spring", stiffness: 500, damping: 30 }}
								/>
							) : null}
							<Icon
								className={cn(
									"h-[18px] w-[18px] transition-colors",
									active ? "text-accent" : "text-text-muted group-hover:text-text-secondary",
								)}
								strokeWidth={2}
							/>
							<span className="flex flex-col leading-tight">
								<span className="font-medium">{item.label}</span>
								<span className="text-[11px] text-text-muted">{item.hint}</span>
							</span>
						</Link>
					);
				})}
			</nav>

			<div className="flex flex-col gap-3 border-t border-border/60 px-3 py-4">
				<div className="flex items-center gap-2 px-2 text-[11px] text-text-muted">
					<span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
					<span className="font-medium uppercase tracking-wider">API online</span>
				</div>
				<UserPill />
			</div>
		</aside>
	);
}
