import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ObrasScreen from '../screens/ObrasScreen';
import FuncionariosScreen from '../screens/FuncionariosScreen';
import PontoScreen from '../screens/PontoScreen';
import RelatoriosScreen from '../screens/RelatoriosScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Obras') iconName = focused ? 'business' : 'business-outline';
          else if (route.name === 'Ponto') iconName = focused ? 'camera' : 'camera-outline';
          else if (route.name === 'Relatorios') iconName = focused ? 'document-text' : 'document-text-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Obras" component={ObrasScreen} options={{ title: 'Obras' }} />
      <Tab.Screen name="Ponto" component={PontoScreen} options={{ title: 'Marcar Ponto' }} />
      <Tab.Screen name="Relatorios" component={RelatoriosScreen} options={{ title: 'Relatórios' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar Conta' }} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Funcionarios" component={FuncionariosScreen} options={{ title: 'Funcionários' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}