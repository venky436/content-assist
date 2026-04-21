import type { GenerateMode } from "@content-assist/shared";

const STORAGE_KEY = "contentassist:generateMode";
const DEFAULT_MODE: GenerateMode = "faceless";

export { DEFAULT_MODE };
export type { GenerateMode };

export function loadMode(): GenerateMode {
	if (typeof window === "undefined") return DEFAULT_MODE;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (raw === "faceless" || raw === "on_camera") return raw;
	} catch {}
	return DEFAULT_MODE;
}

export function saveMode(mode: GenerateMode): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, mode);
	} catch {}
}
