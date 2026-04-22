const TYPO_MAP: Record<string, string> = {
	zym: "gym",
	jym: "gym",
	studdy: "study",
	studdies: "studies",
	moneey: "money",
	fitnes: "fitness",
	ficness: "fitness",
	excersize: "exercise",
	excercise: "exercise",
	buisness: "business",
	bussiness: "business",
	recipie: "recipe",
	definately: "definitely",
	begginer: "beginner",
	begginers: "beginners",
};

const SLANG_MAP: Record<string, string> = {
	"wrk out": "workout",
	wrkout: "workout",
	lil: "little",
	u: "you",
	ur: "your",
	"u r": "you are",
	"wanna ": "want to ",
	"gonna ": "going to ",
};

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeIdea(raw: string): string {
	let text = raw.trim().toLowerCase();

	// Slang replacements must respect word boundaries — a naive substring
	// replace turns "about" → "aboyout" because the `u → you` rule matches
	// every `u` character inside every word. Keys ending in a space are
	// phrase-level shortcuts; others are single tokens.
	for (const [from, to] of Object.entries(SLANG_MAP)) {
		const pattern = from.endsWith(" ")
			? new RegExp(`\\b${escapeRegex(from.trimEnd())}\\s`, "g")
			: new RegExp(`\\b${escapeRegex(from)}\\b`, "g");
		text = text.replace(pattern, to);
	}

	text = text
		.split(/(\s+)/)
		.map((chunk) => {
			if (/^\s+$/.test(chunk)) return chunk;
			const stripped = chunk.replace(/[^a-z0-9]/g, "");
			const replacement = TYPO_MAP[stripped];
			if (!replacement) return chunk;
			return chunk.replace(stripped, replacement);
		})
		.join("");

	return text.replace(/\s+/g, " ").trim();
}
