"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { cn } from "@/lib/cn";

type Strength = 0 | 1 | 2 | 3 | 4;

function scorePassword(pw: string): Strength {
	let score = 0;
	if (pw.length >= 8) score++;
	if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
	if (/\d/.test(pw)) score++;
	if (/[^a-zA-Z0-9]/.test(pw)) score++;
	return score as Strength;
}

const LABELS: Record<Strength, string> = {
	0: "Too short",
	1: "Weak",
	2: "Okay",
	3: "Good",
	4: "Strong",
};

const COLORS: Record<Strength, string> = {
	0: "bg-border",
	1: "bg-danger",
	2: "bg-[hsl(38_92%_55%)]",
	3: "bg-accent",
	4: "bg-success",
};

const TEXT: Record<Strength, string> = {
	0: "text-text-muted",
	1: "text-danger",
	2: "text-[hsl(38_92%_62%)]",
	3: "text-accent",
	4: "text-success",
};

type Props = { password: string };

export function PasswordStrength({ password }: Props) {
	const strength = useMemo(() => scorePassword(password), [password]);
	const showBar = password.length > 0;
	return (
		<div className="flex flex-col gap-1.5 px-1">
			<div className="flex items-center gap-1.5" aria-hidden={!showBar}>
				{[1, 2, 3, 4].map((seg) => {
					const filled = showBar && strength >= (seg as Strength);
					return (
						<motion.div
							key={seg}
							animate={{ scaleX: filled ? 1 : 0.45, opacity: filled ? 1 : 0.4 }}
							transition={{ type: "spring", damping: 18, stiffness: 260 }}
							style={{ transformOrigin: "left" }}
							className={cn(
								"h-1 flex-1 rounded-full transition-colors",
								filled ? COLORS[strength] : "bg-border",
							)}
						/>
					);
				})}
			</div>
			<p
				className={cn(
					"text-[11px] font-semibold",
					showBar ? TEXT[strength] : "text-text-muted",
				)}
			>
				{showBar ? LABELS[strength] : "8+ chars, mix case, number, symbol"}
			</p>
		</div>
	);
}
