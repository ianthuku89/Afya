import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { client } from '../../api/client';
import { colors, fonts, radii, shadows, tabularNums, tierColors } from '../../theme';

interface Visit {
  id: string;
  facilityName: string;
  facilityCode: string;
  county: string;
  coverageActive: boolean;
  tier: string;
  date: string;
}

export default function VisitHistoryScreen() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const res = await client.get('/coverage/history');
      setVisits(res.data.data || []);
    } catch (e) {
      console.error('Failed to load visit history:', e);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVisits(); }, []);

  const renderItem = ({ item }: { item: Visit }) => {
    const tierColor = tierColors[item.tier] || tierColors.BRONZE;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.facilityName}>{item.facilityName}</Text>
            <Text style={[styles.small, styles.metaLine]}>
              {item.county} · MFL: <Text style={tabularNums}>{item.facilityCode}</Text>
            </Text>
          </View>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: item.coverageActive ? colors.accent : colors.danger },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: item.coverageActive ? colors.text : colors.danger },
              ]}
            >
              {item.coverageActive ? 'Covered ✓' : 'Not Covered'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBottom}>
          <Text style={[styles.small, tabularNums]}>
            {new Date(item.date).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
          </Text>
          <View style={styles.tierChip}>
            <View style={[styles.dot, { backgroundColor: tierColor }]} />
            <Text style={styles.tierText}>
              {item.tier.charAt(0) + item.tier.slice(1).toLowerCase()} Tier
            </Text>
          </View>
        </View>
        {/* Privacy: No payment amounts shown — only coverage verification status */}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Visit History</Text>
        <Text style={styles.subtitle}>Your facility visits with coverage verification</Text>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchVisits}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No facility visits recorded yet.</Text>
              <Text style={[styles.small, styles.emptyHint]}>
                Present your QR code at any SHA-accredited facility
              </Text>
            </View>
          }
        />
      )}
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
    paddingBottom: 8,
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
  small: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },

  // List
  listContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: 8,
    textAlign: 'center',
  },

  // Visit card
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    padding: 22,
    ...shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  cardInfo: {
    flex: 1,
  },
  facilityName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  metaLine: {
    marginTop: 4,
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
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 16,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.ground,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tierText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.text,
  },
});