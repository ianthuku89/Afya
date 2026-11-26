import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { client } from '../../api/client';
import { useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors, fonts, radii, shadows, tabularNums, tierColors } from '../../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const navigation = useNavigation<any>();
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);
  const [lockingStatus, setLockingStatus] = useState<"IDLE" | "PENDING">("IDLE");
  const [afyaData, setAfyaData] = useState<{ tier: string; tierLabel: string; tierFacilities: string; streakDays: number } | null>(null);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricEnrolled(enrolled);

      // Fetch AfyaScore / Streak data
      try {
        const res = await client.get('/afyascore');
        setAfyaData(res.data.data);
      } catch (e) {
        console.error('Failed to load AfyaScore:', e);
      }
    })();
  }, []);

  const handleFHIRDownload = () => {
    Alert.alert("Data Portability", "Your FHIR R4 JSON bundle will be downloaded securely to your device.");
  };

  const handleBiometricToggle = async () => {
    if (!isBiometricSupported || !isBiometricEnrolled) {
      Alert.alert("Hardware Unavailable", "Your device does not support or have biometrics configured.");
      return;
    }

    setLockingStatus("PENDING");
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Verify identity to change security settings",
      fallbackLabel: "Use Passcode"
    });
    setLockingStatus("IDLE");

    if (result.success) {
      Alert.alert("Success", "App lock settings updated.");
    } else {
      Alert.alert("Authentication Failed", "We could not verify your identity.");
    }
  };

  const coverageRows: { label: string; value: string; active?: boolean }[] = [
    { label: 'SHA Membership Plan', value: 'SHA Universal' },
    { label: 'Primary Healthcare Fund', value: 'Active ✓', active: true },
    { label: 'Emergency Fund', value: 'Active ✓', active: true },
    { label: 'Preventive Tier', value: afyaData ? `${afyaData.tierLabel} Tier` : 'Loading...' },
    { label: 'Facility Access', value: afyaData?.tierFacilities || 'Level 1 & 2' },
    { label: 'SHIF Paybill Routing', value: '200222' },
    { label: 'Auto-Deduct Rate', value: 'KES 30 / day' },
  ];

  const tierDotColor = afyaData
    ? tierColors[(afyaData.tier || '').toUpperCase()] ?? colors.muted
    : colors.muted;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Profile Header */}
        <View style={[styles.card, styles.profileCard]}>
          <View style={styles.avatar}>
            <Feather name="user" size={36} color={colors.accent} />
          </View>
          <Text style={styles.name}>{user?.name || 'Citizen'}</Text>
          <Text style={styles.small}>SHA Member · Nairobi County</Text>

          {afyaData && (
            <TouchableOpacity
              style={styles.badgeRow}
              onPress={() => navigation.navigate('TierBenefits' as never)}
              accessibilityRole="button"
              accessibilityLabel={`${afyaData.tierLabel} tier, ${afyaData.streakDays} day streak. View tier benefits`}
            >
              <View style={styles.tierBadge}>
                <View style={[styles.dot, { backgroundColor: tierDotColor }]} />
                <Text style={styles.tierBadgeText}>{afyaData.tierLabel} Tier</Text>
              </View>
              <View style={styles.streakBadge}>
                <Feather name="zap" size={13} color={colors.accent} />
                <Text style={[styles.streakBadgeText, tabularNums]}>{afyaData.streakDays} Day Streak</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.memberId}>
            <Text style={[styles.memberIdText, tabularNums]}>SHA-KE-2024-8821</Text>
          </View>
        </View>

        {/* Coverage Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>COVERAGE DETAILS</Text>

          {coverageRows.map((item, idx) => (
            <View
              key={item.label}
              style={[styles.listRow, idx !== coverageRows.length - 1 && styles.divider]}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <View style={styles.rowValueWrap}>
                {item.active && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
                <Text style={[styles.rowValue, tabularNums]}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Data & Privacy (DHA Compliant) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DATA & PRIVACY (KDPA 2019)</Text>

          <TouchableOpacity
            onPress={handleFHIRDownload}
            style={[styles.actionRow, styles.divider]}
            accessibilityRole="button"
          >
            <View style={styles.iconBox}>
              <Feather name="download-cloud" size={20} color={colors.accent} />
            </View>
            <Text style={styles.actionLabel}>Download My Records (FHIR)</Text>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBiometricToggle}
            style={[styles.actionRow, styles.divider]}
            accessibilityRole="button"
            accessibilityState={{ busy: lockingStatus === "PENDING" }}
          >
            <View style={styles.iconBox}>
              <Feather name="shield" size={20} color={colors.accent} />
            </View>
            <Text style={styles.actionLabel}>Biometric App Lock</Text>
            {lockingStatus === "PENDING" ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: isBiometricEnrolled ? colors.accent : colors.muted },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: isBiometricEnrolled ? colors.accent : colors.muted },
                  ]}
                >
                  {isBiometricEnrolled ? 'Enabled' : 'Unavailable'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.divider]}
            onPress={() => navigation.navigate('TierBenefits' as never)}
            accessibilityRole="button"
          >
            <View style={styles.iconBox}>
              <Feather name="award" size={20} color={colors.accent} />
            </View>
            <Text style={styles.actionLabel}>Preventive Packages Infographic</Text>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} accessibilityRole="button">
            <View style={styles.iconBox}>
              <Feather name="external-link" size={20} color={colors.accent} />
            </View>
            <Text style={styles.actionLabel}>ODPC Data Protection Portal</Text>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={logout}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
    gap: 16,
  },
  small: {
    fontFamily: fonts.medium,
    fontSize: 13,
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
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    marginBottom: 8,
  },

  // Profile header
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.ground,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: -0.5,
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 44,
    marginTop: 8,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accent + '14',
    borderWidth: 1,
    borderColor: colors.accent + '33',
  },
  tierBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.accent,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  streakBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.text,
  },
  memberId: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.button,
    backgroundColor: colors.ground,
    borderWidth: 1,
    borderColor: colors.line,
  },
  memberIdText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 1.5,
    color: colors.accent,
  },

  // Status dot
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },

  // List rows
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.muted,
  },
  rowValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
  },
  rowValue: {
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
  },

  // Action rows
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 44,
    paddingVertical: 12,
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
  actionLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
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