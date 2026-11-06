import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  getManagerDashboardSummary,
  ManagerDashboardSummary,
} from '@/api/dashboard.api';

import { createThemedStyles, createThemedValue } from '@/theme/themeStore';
import { colors } from '@/theme/colors';
/* ============================================================
   COLORS
============================================================ */

const COLORS = createThemedValue(() => ({
  background: colors.background,
  surface: colors.surface,

  primary: colors.primary,
  primaryLight: colors.primaryLight,

  text: colors.text,
  textSecondary: colors.textSecondary,
  textMuted: colors.textMuted,

  border: colors.border,

  green: colors.success,
  greenLight: colors.successSoft,

  orange: colors.warning,
  orangeLight: colors.warningSoft,

  purple: colors.accent,
  purpleLight: colors.accentSoft,

  red: colors.danger,
  redLight: colors.dangerSoft,
}));

/* ============================================================
   TYPES
============================================================ */

type Navigation = {
  navigate: (screen: string, params?: any) => void;
};

/* ============================================================
   HELPERS
============================================================ */

function formatCurrency(value: number): string {
  const amount = Number(value || 0);

  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)} Cr`;
  }

  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} L`;
  }

  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)} K`;
  }

  return `₹${amount.toLocaleString('en-IN')}`;
}

/* ============================================================
   ICON
============================================================ */

function Icon({
  symbol,
  size = 20,
  color = COLORS.primary,
}: {
  symbol: string;
  size?: number;
  color?: string;
}) {
  return (
    <Text
      style={{
        fontSize: size,
        color,
        lineHeight: size + 4,
        fontWeight: '700',
      }}
    >
      {symbol}
    </Text>
  );
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      {action && onPress ? (
        <Pressable
          onPress={onPress}
          hitSlop={8}
        >
          <Text style={styles.sectionAction}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ============================================================
   KPI CARD
============================================================ */

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  iconBackground,
  width,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  iconBackground: string;
  width: number;
}) {
  const compact = width < 370;

  return (
    <View
      style={[
        styles.kpiCard,
        compact && styles.kpiCardCompact,
      ]}
    >
      <View
        style={[
          styles.kpiIcon,
          {
            backgroundColor: iconBackground,
          },
        ]}
      >
        <Icon
          symbol={icon}
          size={compact ? 18 : 20}
          color={iconColor}
        />
      </View>

      <Text
        style={[
          styles.kpiTitle,
          compact && styles.kpiTitleCompact,
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.kpiValue,
          compact && styles.kpiValueCompact,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <Text
        style={[
          styles.kpiSubtitle,
          compact && styles.kpiSubtitleCompact,
        ]}
        numberOfLines={1}
      >
        {subtitle}
      </Text>
    </View>
  );
}

/* ============================================================
   QUICK ACTION
============================================================ */

function QuickAction({
  title,
  icon,
  iconColor,
  background,
  onPress,
}: {
  title: string;
  icon: string;
  iconColor: string;
  background: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.quickIcon,
          {
            backgroundColor: background,
          },
        ]}
      >
        <Icon
          symbol={icon}
          size={18}
          color={iconColor}
        />
      </View>

      <Text
        style={styles.quickTitle}
        numberOfLines={1}
      >
        {title}
      </Text>
    </Pressable>
  );
}

/* ============================================================
   PERFORMANCE ITEM
============================================================ */

function PerformanceItem({
  label,
  value,
  icon,
  color,
  background,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  background: string;
}) {
  return (
    <View style={styles.performanceItem}>
      <View
        style={[
          styles.performanceIcon,
          {
            backgroundColor: background,
          },
        ]}
      >
        <Icon
          symbol={icon}
          size={17}
          color={color}
        />
      </View>

      <Text
        style={styles.performanceLabel}
        numberOfLines={1}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.performanceValue,
          {
            color,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

/* ============================================================
   DASHBOARD
============================================================ */

export function ManagerDashboardScreen({
  navigation,
}: {
  navigation: Navigation;
}) {
  const { width } = useWindowDimensions();

  const [summary, setSummary] =
    useState<ManagerDashboardSummary | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const compact = width < 370;

  /* ==========================================================
     LOAD DASHBOARD
  ========================================================== */

  const loadDashboard = useCallback(
    async () => {
      try {
        setError(null);

        const result =
          await getManagerDashboardSummary();

        console.log(
          '[MANAGER DASHBOARD]',
          result,
        );

        setSummary(result);
      } catch (err: any) {
        console.error(
          '[MANAGER DASHBOARD ERROR]',
          err,
        );

        setError(
          err?.response?.data?.error ??
            err?.message ??
            'Unable to load manager dashboard.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, [loadDashboard]);

  /* ==========================================================
     SAFE VALUES

     IMPORTANT:
     These are the ONLY fields returned by the
     manager-summary backend endpoint.
  ========================================================== */

  const teamLeads =
    Number(summary?.teamLeads ?? 0);

  const openDeals =
    Number(summary?.openDeals ?? 0);

  const pipelineRevenue =
    Number(summary?.pipelineRevenue ?? 0);

  const pendingTasks =
    Number(summary?.pendingTasks ?? 0);

  const todaysActivities =
    Number(summary?.todaysActivities ?? 0);

  const totalWonRevenue =
    Number(summary?.totalWonRevenue ?? 0);

  const wonDeals =
    Number(summary?.wonDeals ?? 0);

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading && !summary) {
    return (
      <View style={styles.loadingContainer}>

        <View style={styles.loadingLogo}>
          <Icon
            symbol="◆"
            size={24}
            color={COLORS.primary}
          />
        </View>

        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={styles.loadingSpinner}
        />

        <Text style={styles.loadingText}>
          Loading manager dashboard...
        </Text>
      </View>
    );
  }

  /* ==========================================================
     SCREEN
  ========================================================== */

  return (
    <View style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={[
          styles.content,
          compact && styles.contentCompact,
        ]}
      >

        {/* ====================================================
            HEADER
        ==================================================== */}

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              MANAGER
            </Text>

            <Text
              style={[
                styles.headerTitle,
                compact && styles.headerTitleCompact,
              ]}
            >
              Team performance
            </Text>

            <Text style={styles.headerSubtitle}>
              Monitor your team's sales
            </Text>
          </View>

          <Pressable
            onPress={() =>
              navigation.navigate('Profile')
            }
            style={({ pressed }) => [
              styles.profileButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.profileText}>
              M
            </Text>
          </Pressable>
        </View>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error ? (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Text style={styles.errorIconText}>
                !
              </Text>
            </View>

            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>
                Dashboard unavailable
              </Text>

              <Text
                style={styles.errorMessage}
                numberOfLines={2}
              >
                {error}
              </Text>
            </View>

            <Pressable
              onPress={loadDashboard}
              hitSlop={10}
            >
              <Text style={styles.retry}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* ====================================================
            TEAM PERFORMANCE
        ==================================================== */}

        <SectionHeader title="Team performance" />

        <View style={styles.kpiGrid}>

          <KpiCard
            title="Open Leads"
            value={String(teamLeads)}
            subtitle="Active leads"
            icon="↗"
            iconColor={COLORS.primary}
            iconBackground={COLORS.primaryLight}
            width={width}
          />

          <KpiCard
            title="Open Deals"
            value={String(openDeals)}
            subtitle="Active opportunities"
            icon="◆"
            iconColor={COLORS.purple}
            iconBackground={COLORS.purpleLight}
            width={width}
          />

          <KpiCard
            title="Pipeline"
            value={formatCurrency(
              pipelineRevenue,
            )}
            subtitle="Expected revenue"
            icon="₹"
            iconColor={COLORS.green}
            iconBackground={COLORS.greenLight}
            width={width}
          />

          <KpiCard
            title="Pending Tasks"
            value={String(pendingTasks)}
            subtitle="Need attention"
            icon="✓"
            iconColor={COLORS.orange}
            iconBackground={COLORS.orangeLight}
            width={width}
          />

        </View>

        {/* ====================================================
            QUICK ACCESS
        ==================================================== */}

        <SectionHeader title="Manager access" />

        <View style={styles.quickGrid}>

          <QuickAction
            title="Leads"
            icon="↗"
            iconColor={COLORS.primary}
            background={COLORS.primaryLight}
            onPress={() =>
              navigation.navigate('LeadList')
            }
          />

          <QuickAction
            title="Deals"
            icon="◆"
            iconColor={COLORS.purple}
            background={COLORS.purpleLight}
            onPress={() =>
              navigation.navigate(
                'OpportunitiesBoard',
              )
            }
          />

          <QuickAction
            title="Tasks"
            icon="✓"
            iconColor={COLORS.orange}
            background={COLORS.orangeLight}
            onPress={() =>
              navigation.navigate('Activities')
            }
          />

          <QuickAction
            title="Customers"
            icon="♙"
            iconColor={COLORS.green}
            background={COLORS.greenLight}
            onPress={() =>
              navigation.navigate(
                'CustomerList',
              )
            }
          />

          <QuickAction
            title="Calendar"
            icon="□"
            iconColor={COLORS.primary}
            background={COLORS.primaryLight}
            onPress={() =>
              navigation.navigate('Calendar')
            }
          />

          <QuickAction
            title="Alerts"
            icon="!"
            iconColor={COLORS.red}
            background={COLORS.redLight}
            onPress={() =>
              navigation.navigate(
                'NotificationList',
              )
            }
          />

        </View>

        {/* ====================================================
            SALES PERFORMANCE
        ==================================================== */}

        <SectionHeader title="Sales performance" />

        <View style={styles.salesCard}>

          <View style={styles.salesTop}>

            <View style={styles.salesText}>
              <Text style={styles.salesLabel}>
                Won revenue
              </Text>

              <Text
                style={[
                  styles.salesRevenue,
                  compact &&
                    styles.salesRevenueCompact,
                ]}
              >
                {formatCurrency(
                  totalWonRevenue,
                )}
              </Text>

              <Text style={styles.salesDescription}>
                Revenue from won opportunities
              </Text>
            </View>

            <View style={styles.salesIcon}>
              <Icon
                symbol="₹"
                size={23}
                color={COLORS.green}
              />
            </View>

          </View>

          <View style={styles.salesDivider} />

          <View style={styles.salesStats}>

            <View style={styles.salesStat}>
              <Text style={styles.salesStatValue}>
                {wonDeals}
              </Text>

              <Text style={styles.salesStatLabel}>
                Won deals
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.salesStat}>
              <Text style={styles.salesStatValue}>
                {openDeals}
              </Text>

              <Text style={styles.salesStatLabel}>
                Open deals
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.salesStat}>
              <Text style={styles.salesStatValue}>
                {teamLeads}
              </Text>

              <Text style={styles.salesStatLabel}>
                Open leads
              </Text>
            </View>

          </View>

        </View>

        {/* ====================================================
            PIPELINE
        ==================================================== */}

        <SectionHeader
          title="Sales pipeline"
          action="View deals"
          onPress={() =>
            navigation.navigate(
              'OpportunitiesBoard',
            )
          }
        />

        <Pressable
          onPress={() =>
            navigation.navigate(
              'OpportunitiesBoard',
            )
          }
          style={({ pressed }) => [
            styles.pipelineCard,
            pressed && styles.pressed,
          ]}
        >

          <View style={styles.pipelineTop}>

            <View>
              <Text style={styles.pipelineLabel}>
                Expected revenue
              </Text>

              <Text
                style={[
                  styles.pipelineRevenue,
                  compact &&
                    styles.pipelineRevenueCompact,
                ]}
              >
                {formatCurrency(
                  pipelineRevenue,
                )}
              </Text>
            </View>

            <View style={styles.pipelineIcon}>
              <Icon
                symbol="↗"
                size={21}
                color={COLORS.primary}
              />
            </View>

          </View>

          <View style={styles.pipelineBottom}>

            <Text style={styles.pipelineCount}>
              {openDeals} open opportunities
            </Text>

            <Text style={styles.pipelineArrow}>
              →
            </Text>

          </View>

        </Pressable>

        {/* ====================================================
            TODAY'S ACTIVITY
        ==================================================== */}

        <SectionHeader
          title="Today's activity"
          action="View all"
          onPress={() =>
            navigation.navigate('Activities')
          }
        />

        <View style={styles.activityCard}>

          <PerformanceItem
            label="Activities"
            value={String(todaysActivities)}
            icon="✓"
            color={COLORS.primary}
            background={COLORS.primaryLight}
          />

          <View style={styles.activityDivider} />

          <PerformanceItem
            label="Pending"
            value={String(pendingTasks)}
            icon="!"
            color={COLORS.orange}
            background={COLORS.orangeLight}
          />

          <View style={styles.activityDivider} />

          <PerformanceItem
            label="Won"
            value={String(wonDeals)}
            icon="★"
            color={COLORS.green}
            background={COLORS.greenLight}
          />

        </View>

        {/* ====================================================
            MANAGER TOOLS
        ==================================================== */}

        <SectionHeader title="Manager tools" />

        <View style={styles.toolsCard}>

          <Pressable
            onPress={() =>
              navigation.navigate('Reports')
            }
            style={({ pressed }) => [
              styles.toolItem,
              pressed && styles.toolPressed,
            ]}
          >
            <View
              style={[
                styles.toolIcon,
                {
                  backgroundColor:
                    COLORS.primaryLight,
                },
              ]}
            >
              <Icon
                symbol="▥"
                size={18}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.toolText}>
              <Text style={styles.toolTitle}>
                Reports & Analytics
              </Text>

              <Text style={styles.toolSubtitle}>
                Review sales performance
              </Text>
            </View>

            <Text style={styles.toolArrow}>
              →
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              navigation.navigate('AiCenter')
            }
            style={({ pressed }) => [
              styles.toolItem,
              styles.toolBorder,
              pressed && styles.toolPressed,
            ]}
          >
            <View
              style={[
                styles.toolIcon,
                {
                  backgroundColor:
                    COLORS.purpleLight,
                },
              ]}
            >
              <Icon
                symbol="✦"
                size={18}
                color={COLORS.purple}
              />
            </View>

            <View style={styles.toolText}>
              <Text style={styles.toolTitle}>
                AI Center
              </Text>

              <Text style={styles.toolSubtitle}>
                AI-powered CRM insights
              </Text>
            </View>

            <Text style={styles.toolArrow}>
              →
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              navigation.navigate('Profile')
            }
            style={({ pressed }) => [
              styles.toolItem,
              styles.toolBorder,
              pressed && styles.toolPressed,
            ]}
          >
            <View
              style={[
                styles.toolIcon,
                {
                  backgroundColor:
                    COLORS.greenLight,
                },
              ]}
            >
              <Icon
                symbol="●"
                size={16}
                color={COLORS.green}
              />
            </View>

            <View style={styles.toolText}>
              <Text style={styles.toolTitle}>
                My Profile
              </Text>

              <Text style={styles.toolSubtitle}>
                Manage your account
              </Text>
            </View>

            <Text style={styles.toolArrow}>
              →
            </Text>
          </Pressable>

        </View>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>
            Manager Workspace
          </Text>

          <Text style={styles.footerSubtitle}>
            Focus on your team and sales performance
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = createThemedStyles(() => StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 38,
  },

  contentCompact: {
    paddingHorizontal: 16,
  },

  /* ==========================================================
     LOADING
  ========================================================== */

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  loadingLogo: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },

  loadingSpinner: {
    marginTop: 14,
  },

  loadingText: {
    marginTop: 9,
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  headerTitle: {
    color: COLORS.text,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  headerTitleCompact: {
    fontSize: 24,
    lineHeight: 29,
  },

  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },

  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },

  profileText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: '800',
  },

  /* ==========================================================
     ERROR
  ========================================================== */

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.redLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 13,
    padding: 11,
    marginBottom: 18,
  },

  errorIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  errorIconText: {
    color: COLORS.red,
    fontSize: 14,
    fontWeight: '800',
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '700',
  },

  errorMessage: {
    color: colors.danger,
    fontSize: 10,
    marginTop: 2,
  },

  retry: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 8,
  },

  /* ==========================================================
     SECTION
  ========================================================== */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },

  sectionAction: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },

  /* ==========================================================
     KPI
  ========================================================== */

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 21,
  },

  kpiCard: {
    width: '48.4%',
    minHeight: 142,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },

  kpiCardCompact: {
    minHeight: 132,
    padding: 12,
  },

  kpiIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  kpiTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  kpiTitleCompact: {
    fontSize: 11,
  },

  kpiValue: {
    color: COLORS.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    marginTop: 2,
  },

  kpiValueCompact: {
    fontSize: 19,
    lineHeight: 24,
  },

  kpiSubtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },

  kpiSubtitleCompact: {
    fontSize: 9,
  },

  /* ==========================================================
     QUICK ACCESS
  ========================================================== */

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 21,
  },

  quickAction: {
    width: '31.5%',
    minHeight: 76,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
    paddingHorizontal: 5,
  },

  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  quickTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },

  /* ==========================================================
     SALES
  ========================================================== */

  salesCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 16,
    marginBottom: 21,
    elevation: 1,
  },

  salesTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  salesText: {
    flex: 1,
  },

  salesLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  salesRevenue: {
    color: COLORS.green,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },

  salesRevenueCompact: {
    fontSize: 25,
    lineHeight: 30,
  },

  salesDescription: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },

  salesIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  salesDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },

  salesStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  salesStat: {
    flex: 1,
    alignItems: 'center',
  },

  salesStatValue: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },

  salesStatLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 2,
  },

  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },

  /* ==========================================================
     PIPELINE
  ========================================================== */

  pipelineCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 16,
    marginBottom: 21,
    elevation: 1,
  },

  pipelineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  pipelineLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  pipelineRevenue: {
    color: COLORS.primary,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '800',
    marginTop: 2,
  },

  pipelineRevenueCompact: {
    fontSize: 25,
    lineHeight: 30,
  },

  pipelineIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pipelineBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 14,
    paddingTop: 12,
  },

  pipelineCount: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },

  pipelineArrow: {
    color: COLORS.primary,
    fontSize: 19,
    fontWeight: '700',
  },

  /* ==========================================================
     ACTIVITY
  ========================================================== */

  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 14,
    marginBottom: 21,
    elevation: 1,
  },

  performanceItem: {
    flex: 1,
    alignItems: 'center',
  },

  performanceIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },

  performanceLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    textAlign: 'center',
  },

  performanceValue: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },

  activityDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },

  /* ==========================================================
     TOOLS
  ========================================================== */

  toolsCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    overflow: 'hidden',
    marginBottom: 22,
    elevation: 1,
  },

  toolItem: {
    minHeight: 65,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  toolBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  toolIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  toolText: {
    flex: 1,
  },

  toolTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },

  toolSubtitle: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 2,
  },

  toolArrow: {
    color: COLORS.primary,
    fontSize: 19,
    fontWeight: '600',
    marginLeft: 8,
  },

  toolPressed: {
    backgroundColor: '#F9FAFB',
  },

  /* ==========================================================
     PRESS
  ========================================================== */

  pressed: {
    opacity: 0.72,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  /* ==========================================================
     FOOTER
  ========================================================== */

  footer: {
    alignItems: 'center',
    paddingTop: 1,
    paddingBottom: 5,
  },

  footerTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },

  footerSubtitle: {
    color: '#B5BDC9',
    fontSize: 9,
    marginTop: 3,
  },

}));