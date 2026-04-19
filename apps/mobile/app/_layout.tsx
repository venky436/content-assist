import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "@mobile/providers/QueryProvider";
import { colors } from "@mobile/constants/theme";

export default function RootLayout() {
	return (
		<View style={{ flex: 1, backgroundColor: colors.bg }}>
			<SafeAreaProvider>
				<QueryProvider>
					<StatusBar style="light" />
					<Stack
						screenOptions={{
							headerShown: false,
							contentStyle: { backgroundColor: colors.bg },
							animation: "fade",
						}}
					/>
				</QueryProvider>
			</SafeAreaProvider>
		</View>
	);
}
