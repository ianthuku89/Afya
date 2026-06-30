import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { client } from '../../api/client';

interface Facility {
  id: string;
  name: string;
  distance: string;
  level: string;
  county: string;
  mflCode: string;
  fhirEnabled: boolean;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function FacilitiesScreen() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState<string>('Requesting permission...');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('Permission to access location was denied');
        setLoading(false);
        return;
      }

      setLocationStatus('Getting your location...');
      try {
        const location = await Location.getCurrentPositionAsync({});
        const userLat = location.coords.latitude;
        const userLon = location.coords.longitude;

        // Fetch facilities from backend API
        const res = await client.get('/facilities');
        const apiFacilities = res.data.facilities || res.data.data || [];

        const mapped = apiFacilities.map((f: any) => {
          const dist = (f.latitude && f.longitude) 
            ? haversineKm(userLat, userLon, f.latitude, f.longitude)
            : 0;
          return {
            id: f.id,
            name: f.name,
            distance: dist > 0 ? `${dist.toFixed(1)} km` : 'N/A',
            level: (f.level || '').replace('_', ' '),
            county: f.county || '',
            mflCode: f.mflCode || '',
            fhirEnabled: f.fhirEnabled ?? false,
          };
        });

        // Sort by distance
        mapped.sort((a: Facility, b: Facility) => parseFloat(a.distance) - parseFloat(b.distance));
        setFacilities(mapped);
        setLocationStatus(`Found ${mapped.length} facility(ies) near you`);
      } catch (e) {
        console.error('Facilities fetch error:', e);
        setLocationStatus('Failed to load facilities');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = search
    ? facilities.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.county.toLowerCase().includes(search.toLowerCase()))
    : facilities;

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="px-6 pt-6 pb-2">
        <Text className="text-white text-3xl font-bold tracking-tight mb-2">Find Care</Text>
        <Text className="text-slate-400 mb-4 text-sm">SHA-accredited facilities covered by your SHIF</Text>

        {/* Tier Coverage Banner */}
        <View className="bg-teal-900/20 border border-teal-500/20 rounded-2xl p-3 flex-row items-center gap-3 mb-6">
          <View className="w-8 h-8 bg-teal-500/20 rounded-lg items-center justify-center">
            <Feather name="shield" size={16} color="#14b8a6" />
          </View>
          <View>
            <Text className="text-teal-400 text-sm font-bold">Your Coverage is Active</Text>
            <Text className="text-slate-400 text-xs">Present your QR code at any facility below</Text>
          </View>
        </View>

        <View className="bg-white/5 border border-white/10 rounded-2xl flex-row items-center px-4 py-3 mb-6">
          <Feather name="search" size={20} color="#94a3b8" />
          <TextInput 
            placeholder="Search hospital names or county..."
            placeholderTextColor="#64748b"
            className="flex-1 text-white ml-3 font-medium h-8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Tab Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 flex-row shrink-0 flex-grow-0 min-h-12 max-h-12">
          {['All', 'Hospitals', 'Clinics', 'Pharmacy', 'Lab', 'Dental'].map((filter, idx) => (
            <TouchableOpacity 
              key={filter} 
              className={`px-5 py-2 rounded-xl mr-3 border justify-center items-center h-10 ${idx === 0 ? 'bg-teal-500 border-teal-400' : 'bg-transparent border-slate-700'}`}
            >
              <Text className={`font-bold ${idx === 0 ? 'text-white' : 'text-slate-400'}`}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        {loading ? (
           <View className="py-20 items-center">
             <ActivityIndicator size="large" color="#00C165" />
             <Text className="text-slate-500 mt-4 font-mono text-xs">{locationStatus}</Text>
           </View>
        ) : filtered.length === 0 ? (
           <View className="py-20 items-center">
             <Feather name="map-pin" size={40} color="#334155" />
             <Text className="text-slate-400 mt-4 text-center">{search ? 'No matching facilities.' : locationStatus}</Text>
           </View>
        ) : (
          filtered.map((fac) => (
            <View key={fac.id} className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-4">
              <View className="flex-row justify-between items-start mb-3">
                <Text className="text-white font-bold text-lg flex-1 pr-4">{fac.name}</Text>
                <View className={`px-2 py-1 rounded-md ${fac.fhirEnabled ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                  <Text className={`text-xs font-bold ${fac.fhirEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                    FHIR {fac.fhirEnabled ? '✓' : 'Pending'}
                  </Text>
                </View>
              </View>
              
              <View className="flex-row items-center gap-3 mb-5 flex-wrap">
                <View className="bg-slate-800 rounded-md px-2 py-1">
                  <Text className="text-slate-300 text-xs font-mono">{fac.level}</Text>
                </View>
                <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-1">
                  <Text className="text-emerald-400 text-xs font-bold tracking-wide">SHIF Covered</Text>
                </View>
                <Text className="text-slate-500 text-xs font-medium">{fac.distance} away</Text>
                <Text className="text-slate-600 text-xs font-mono">MFL: {fac.mflCode}</Text>
              </View>

              <TouchableOpacity className="bg-teal-500 py-3 rounded-xl items-center shadow-lg">
                <Text className="text-white font-bold tracking-wide">Verify Coverage Here</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
