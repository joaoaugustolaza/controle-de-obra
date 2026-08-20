import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import ObrasScreen from './src/screens/ObrasScreen';
import FuncionariosScreen from './src/screens/FuncionariosScreen';
import RelatoriosScreen from './src/screens/RelatoriosScreen';
import ValesScreen from './src/screens/ValesScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Obras') {
              iconName = focused ? 'business' : 'business-outline';
            } else if (route.name === 'Funcionários') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Relatórios') {
              iconName = focused ? 'document-text' : 'document-text-outline';
            } else if (route.name === 'Vales') {
              iconName = focused ? 'cash' : 'cash-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#94a3b8',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Obras" component={ObrasScreen} />
        <Tab.Screen name="Funcionários" component={FuncionariosScreen} />
        <Tab.Screen name="Relatórios" component={RelatoriosScreen} />
        <Tab.Screen name="Vales" component={ValesScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}