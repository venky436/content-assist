import type { Config } from "tailwindcss";

const config: Config = {
	content: ["./src/**/*.{ts,tsx}"],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				bg: "hsl(var(--bg))",
				"bg-elevated": "hsl(var(--bg-elevated))",
				surface: "hsl(var(--surface))",
				"surface-alt": "hsl(var(--surface-alt))",
				"surface-pressed": "hsl(var(--surface-pressed))",
				border: "hsl(var(--border))",
				"border-strong": "hsl(var(--border-strong))",
				"text-primary": "hsl(var(--text-primary))",
				"text-secondary": "hsl(var(--text-secondary))",
				"text-muted": "hsl(var(--text-muted))",
				accent: {
					DEFAULT: "hsl(var(--accent))",
					pressed: "hsl(var(--accent-pressed))",
					soft: "hsl(var(--accent-soft))",
				},
				success: {
					DEFAULT: "hsl(var(--success))",
					soft: "hsl(var(--success-soft))",
				},
				danger: {
					DEFAULT: "hsl(var(--danger))",
					soft: "hsl(var(--danger-soft))",
				},
			},
			fontFamily: {
				sans: ["var(--font-sans)", "system-ui", "sans-serif"],
			},
			borderRadius: {
				sm: "8px",
				md: "12px",
				lg: "16px",
				xl: "20px",
				"2xl": "28px",
			},
			boxShadow: {
				card: "0 8px 20px rgba(0,0,0,0.35)",
				accent: "0 10px 24px -8px rgba(255,61,127,0.45)",
				"accent-sm": "0 4px 12px -2px rgba(255,61,127,0.35)",
			},
			keyframes: {
				"fade-in": {
					"0%": { opacity: "0" },
					"100%": { opacity: "1" },
				},
				"fade-in-up": {
					"0%": { opacity: "0", transform: "translateY(8px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				shimmer: {
					"0%, 100%": { opacity: "0.35" },
					"50%": { opacity: "0.8" },
				},
			},
			animation: {
				"fade-in": "fade-in 180ms ease-out",
				"fade-in-up": "fade-in-up 220ms ease-out",
				shimmer: "shimmer 1.4s ease-in-out infinite",
			},
			backgroundImage: {
				"gradient-surface":
					"linear-gradient(180deg, hsl(var(--surface)) 0%, hsl(var(--bg-elevated)) 100%)",
				"gradient-accent":
					"linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--accent-pressed)) 100%)",
			},
		},
	},
	plugins: [],
};

export default config;
