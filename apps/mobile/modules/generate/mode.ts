import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GenerateMode } from "@content-assist/shared";

const STORAGE_KEY = "contentassist:generateMode";
const DEFAULT_MODE: GenerateMode = "faceless";

export { DEFAULT_MODE };
export type { GenerateMode };

export async function loadMode(): Promise<GenerateMode> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_KEY);
		if (raw === "faceless" || raw === "on_camera") return raw;
	} catch {}
	return DEFAULT_MODE;
}

export async function saveMode(mode: GenerateMode): Promise<void> {
	try {
		await AsyncStorage.setItem(STORAGE_KEY, mode);
	} catch {}
}
