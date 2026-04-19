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

export function normalizeIdea(raw: string): string {
	let text = raw.trim().toLowerCase();

	for (const [from, to] of Object.entries(SLANG_MAP)) {
		text = text.split(from).join(to);
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
