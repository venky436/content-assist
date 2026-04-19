import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, font, spacing } from "@mobile/constants/theme";

type IconProps = { emoji: string; focused: boolean };

function TabIcon({ emoji, focused }: IconProps) {
	return (
		<View
			style={[
				styles.iconWrap,
				focused ? styles.iconWrapActive : null,
			]}
		>
			<Text style={styles.icon}>{emoji}</Text>
		</View>
	);
}

export default function TabsLayout() {
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarShowLabel: true,
				tabBarActiveTintColor: colors.accent,
				tabBarInactiveTintColor: colors.textMuted,
				tabBarStyle: {
					backgroundColor: colors.bgElevated,
					borderTopColor: colors.border,
					borderTopWidth: StyleSheet.hairlineWidth,
					height: 84,
					paddingTop: spacing.sm,
					paddingBottom: spacing.lg,
				},
				tabBarLabelStyle: {
					...font.label,
					fontSize: 11,
					marginTop: 2,
				},
				tabBarItemStyle: {
					gap: 2,
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Generate",
					tabBarIcon: ({ focused }) => <TabIcon emoji="✨" focused={focused} />,
				}}
			/>
			<Tabs.Screen
				name="analyze"
				options={{
					title: "Analyze",
					tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
				}}
			/>
			<Tabs.Screen
				name="saved"
				options={{
					title: "Saved",
					tabBarIcon: ({ focused }) => <TabIcon emoji="🗂️" focused={focused} />,
				}}
			/>
		</Tabs>
	);
}

const styles = StyleSheet.create({
	iconWrap: {
		width: 40,
		height: 28,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 14,
	},
	iconWrapActive: {
		backgroundColor: colors.accentSoft,
	},
	icon: {
		fontSize: 16,
	},
});
