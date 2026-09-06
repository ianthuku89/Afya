import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/Dashboard/HomeScreen';
import ContributeScreen from '../screens/Dashboard/ContributeScreen';
import AutoDeductScreen from '../screens/Dashboard/AutoDeductScreen';
import TierBenefitsScreen from '../screens/Dashboard/TierBenefitsScreen';
import CoverageScreen from '../screens/Dashboard/WalletScreen';
import VisitHistoryScreen from '../screens/Activity/ClaimsScreen';
import FacilitiesScreen from '../screens/Facilities/FacilitiesScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import { Feather } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D1B3E',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.12)',
          height: 80,
          paddingBottom: 24,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#00C165',
        tabBarInactiveTintColor: '#8A9BB5',
        tabBarLabelStyle: {
          fontFamily: 'sans-serif',
          fontSize: 10,
          marginTop: 4,
          fontWeight: '600'
        }
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />
        }}
      />
      <Tab.Screen 
        name="Coverage" 
        component={CoverageScreen} 
        options={{
          tabBarIcon: ({ color }) => <Feather name="shield" size={24} color={color} />,
          tabBarLabel: 'Coverage',
        }}
      />
      <Tab.Screen 
        name="Visits" 
        component={VisitHistoryScreen} 
        options={{
          tabBarIcon: ({ color }) => <Feather name="clock" size={24} color={color} />,
          tabBarLabel: 'Visits',
        }}
      />
      <Tab.Screen 
        name="Facilities" 
        component={FacilitiesScreen} 
        options={{
          tabBarIcon: ({ color }) => <Feather name="plus-square" size={24} color={color} />
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />
        }}
      />
    </Tab.Navigator>
  );
}

export default function MainTabNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen name="Contribute" component={ContributeScreen} />
      <Stack.Screen name="AutoDeduct" component={AutoDeductScreen} />
      <Stack.Screen name="TierBenefits" component={TierBenefitsScreen} />
    </Stack.Navigator>
  );
}
