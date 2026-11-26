import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { client } from '../../api/client';
import { colors, fonts, radii, shadows, tabularNums } from '../../theme';

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
  const [searchFocused, setSearchFocused] = useState(false);

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
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Find Care</Text>
          <Text style={styles.subtitle}>SHA-accredited facilities covered by your SHIF</Text>
        </View>

        {/* Tier Coverage Banner */}
        <View style={styles.card}>
          <View style={styles.bannerRow}>
            <View style={styles.iconBox}>
              <Feather name="shield" size={20} color={colors.accent} />
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Your Coverage is Active</Text>
              <Text style={styles.small}>Present your QR code at any facility below</Text>
            </View>
          </View>
        </View>

        <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
          <Feather name="search" size={20} color={searchFocused ? colors.accent : colors.muted} />
          <TextInput
            placeholder="Search hospital names or county..."
            placeholderTextColor="#8A9099"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            accessibilityLabel="Search hospital names or county"
          />
        </View>

        {/* Tab Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {['All', 'Hospitals', 'Clinics', 'Pharmacy', 'Lab', 'Dental'].map((filter, idx) => (
            <TouchableOpacity
              key={filter}
              accessibilityRole="button"
              accessibilityState={{ selected: idx === 0 }}
              style={[styles.chip, idx === 0 && styles.chipActive]}
            >
              <Text style={[styles.chipText, idx === 0 && styles.chipTextActive]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.small, styles.stateText]}>{locationStatus}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centerState}>
            <Feather name="map-pin" size={40} color={colors.muted} />
            <Text style={[styles.body, styles.stateText, styles.centerText]}>
              {search ? 'No matching facilities.' : locationStatus}
            </Text>
          </View>
        ) : (
          filtered.map((fac) => (
            <View key={fac.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.facilityName}>{fac.name}</Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: fac.fhirEnabled ? colors.accent : colors.muted },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    FHIR {fac.fhirEnabled ? '✓' : 'Pending'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.levelChip}>
                  <Text style={styles.levelText}>{fac.level}</Text>
                </View>
                <View style={styles.coveredChip}>
                  <Text style={styles.coveredText}>SHIF Covered</Text>
                </View>
                <Text style={[styles.small, tabularNums]}>{fac.distance} away</Text>
                <Text style={[styles.small, tabularNums]}>MFL: {fac.mflCode}</Text>
              </View>

              <TouchableOpacity style={styles.secondaryButton} accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>Verify Coverage Here</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 16,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 30,
    letterSpacing: -0.5,
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.muted,
  },
  body: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  small: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    padding: 22,
    ...shadows.card,
  },

  // Coverage banner
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.icon,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ground,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchBoxFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    height: 52,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },

  // Filters
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterContent: {
    gap: 10,
    paddingRight: 20,
  },
  chip: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.accent + '14',
    borderColor: colors.accent + '33',
  },
  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.muted,
  },
  chipTextActive: {
    fontFamily: fonts.bold,
    color: colors.accent,
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  centerState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  stateText: {
    marginTop: 16,
  },
  centerText: {
    textAlign: 'center',
  },

  // Facility card
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 14,
  },
  facilityName: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  levelChip: {
    backgroundColor: colors.ground,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  levelText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.text,
  },
  coveredChip: {
    backgroundColor: colors.accent + '14',
    borderWidth: 1,
    borderColor: colors.accent + '33',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  coveredText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.accent,
  },

  // Buttons
  secondaryButton: {
    height: 50,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
});