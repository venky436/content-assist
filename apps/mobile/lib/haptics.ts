import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

function safe(fn: () => Promise<unknown> | unknown) {
	if (Platform.OS === "web") return;
	try {
		void fn();
	} catch {
		// non-fatal
	}
}

export const haptics = {
	selection: () => safe(() => Haptics.selectionAsync()),
	tapLight: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
	tapMedium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
	success: () =>
		safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
	warning: () =>
		safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
	error: () =>
		safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
