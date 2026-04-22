"use client";

import type {
	BgmMood,
	Niche,
	Tone,
} from "@content-assist/shared";
import { ChipSelector, type Chip } from "@/components/ui/ChipSelector";

const NICHE_OPTIONS: ReadonlyArray<Chip<Niche>> = [
	{ value: "beauty", label: "Beauty", icon: "💄" },
	{ value: "finance", label: "Finance", icon: "💼" },
	{ value: "fitness", label: "Fitness", icon: "🏋️" },
	{ value: "food", label: "Food", icon: "🍜" },
	{ value: "travel", label: "Travel", icon: "✈️" },
	{ value: "tech", label: "Tech", icon: "💻" },
	{ value: "edu", label: "Education", icon: "📚" },
	{ value: "lifestyle", label: "Lifestyle", icon: "🌱" },
	{ value: "business", label: "Business", icon: "📈" },
	{ value: "comedy", label: "Comedy", icon: "🎭" },
	{ value: "other", label: "Other", icon: "✨" },
];

const TONE_OPTIONS: ReadonlyArray<Chip<Tone>> = [
	{ value: "casual", label: "Casual", description: "Easy, everyday voice." },
	{
		value: "professional",
		label: "Professional",
		description: "Clear + polished.",
	},
	{ value: "witty", label: "Witty", description: "A little sharp, a little fun." },
	{ value: "bold", label: "Bold", description: "Punchy, high-confidence." },
	{ value: "warm", label: "Warm", description: "Friendly, welcoming." },
];

const BGM_OPTIONS: ReadonlyArray<Chip<BgmMood>> = [
	{ value: "uplifting", label: "Uplifting", icon: "☀️" },
	{ value: "chill", label: "Chill", icon: "🌊" },
	{ value: "dramatic", label: "Dramatic", icon: "🎬" },
	{ value: "minimal", label: "Minimal", icon: "◦" },
	{ value: "none", label: "No BGM", icon: "🔇" },
];

export function NicheSelector({
	value,
	onChange,
	disabled,
}: {
	value: Niche | null;
	onChange: (v: Niche | null) => void;
	disabled?: boolean;
}) {
	return (
		<ChipSelector
			label="Niche"
			options={NICHE_OPTIONS}
			value={value}
			onChange={onChange}
			disabled={disabled}
		/>
	);
}

export function ToneSelector({
	value,
	onChange,
	disabled,
}: {
	value: Tone | null;
	onChange: (v: Tone | null) => void;
	disabled?: boolean;
}) {
	return (
		<ChipSelector
			label="Default tone"
			hint="We'll use this as the starting voice for your AI generations."
			options={TONE_OPTIONS}
			value={value}
			onChange={onChange}
			disabled={disabled}
		/>
	);
}

export function BgmMoodSelector({
	value,
	onChange,
	disabled,
}: {
	value: BgmMood | null;
	onChange: (v: BgmMood | null) => void;
	disabled?: boolean;
}) {
	return (
		<ChipSelector
			label="Default BGM mood"
			hint="Suggested background music mood for your videos."
			options={BGM_OPTIONS}
			value={value}
			onChange={onChange}
			disabled={disabled}
		/>
	);
}
