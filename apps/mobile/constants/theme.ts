export const colors = {
	bg: "#0B0B0F",
	bgElevated: "#11111A",
	surface: "#14141B",
	surfaceAlt: "#1C1C26",
	surfacePressed: "#232332",
	border: "#2A2A36",
	borderStrong: "#353548",
	textPrimary: "#FFFFFF",
	textSecondary: "#B0B0BF",
	textMuted: "#6B6B78",
	accent: "#FF3D7F",
	accentPressed: "#E0285F",
	accentSoft: "rgba(255, 61, 127, 0.14)",
	success: "#22C55E",
	successSoft: "rgba(34, 197, 94, 0.16)",
	danger: "#EF4444",
	dangerSoft: "rgba(239, 68, 68, 0.14)",
	overlay: "rgba(0,0,0,0.5)",
} as const;

export const spacing = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
	xxl: 32,
	xxxl: 48,
} as const;

export const radius = {
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	xxl: 28,
	pill: 999,
} as const;

export const font = {
	display: { fontSize: 32, fontWeight: "700" as const, lineHeight: 38, letterSpacing: -0.5 },
	h1: { fontSize: 24, fontWeight: "700" as const, lineHeight: 30, letterSpacing: -0.3 },
	h2: { fontSize: 18, fontWeight: "600" as const, lineHeight: 24 },
	body: { fontSize: 16, fontWeight: "500" as const, lineHeight: 22 },
	bodyStrong: { fontSize: 16, fontWeight: "600" as const, lineHeight: 22 },
	caption: { fontSize: 13, fontWeight: "500" as const, lineHeight: 18 },
	label: {
		fontSize: 12,
		fontWeight: "700" as const,
		lineHeight: 16,
		letterSpacing: 0.8,
	},
} as const;

export const shadow = {
	card: {
		shadowColor: "#000",
		shadowOpacity: 0.35,
		shadowRadius: 20,
		shadowOffset: { width: 0, height: 8 },
		elevation: 6,
	},
	accent: {
		shadowColor: "#FF3D7F",
		shadowOpacity: 0.45,
		shadowRadius: 20,
		shadowOffset: { width: 0, height: 10 },
		elevation: 10,
	},
} as const;

export const timings = {
	fast: 140,
	base: 220,
	slow: 360,
} as const;

export type ColorKey = keyof typeof colors;
