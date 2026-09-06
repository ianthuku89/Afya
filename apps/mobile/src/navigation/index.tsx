import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './AuthStack';
import MainTabNavigator from './MainTabNavigator';
import { useAuthStore } from '../store/auth';
import { ActivityIndicator, View } from 'react-native';

export default function AppNavigator() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}
