import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { T } from './theme';
import HomeScreen from './screens/HomeScreen';
import TrendsScreen from './screens/TrendsScreen';
import BudgetsScreen from './screens/BudgetsScreen';
import GoalsScreen from './screens/GoalsScreen';
import InsightsScreen from './screens/InsightsScreen';
import ConnectBankScreen from './screens/ConnectBankScreen';
import AccountsScreen from './screens/AccountsScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import CategoryDetailScreen from './screens/CategoryDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ICONS = {
  Home: 'wallet',
  Trends: 'trending-up',
  Budgets: 'pie-chart',
  Goals: 'flag',
  Insights: 'sparkles',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`}
            size={size - 2}
            color={color}
          />
        ),
        tabBarActiveTintColor: T.violet,
        tabBarInactiveTintColor: T.faint,
        tabBarStyle: {
          backgroundColor: T.surfaceSolid,
          borderTopColor: T.hairline,
          borderTopWidth: 1,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Trends" component={TrendsScreen} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
        theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: T.ink } }}
      >
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={Tabs} />
          <Stack.Screen name="ConnectBank" component={ConnectBankScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Accounts" component={AccountsScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} options={{ presentation: 'card', animation: 'slide_from_right' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
