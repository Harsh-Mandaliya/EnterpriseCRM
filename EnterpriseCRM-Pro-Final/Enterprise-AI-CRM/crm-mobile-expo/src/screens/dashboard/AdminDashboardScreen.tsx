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

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  getAdminDashboardSummary,
} from '@/api/dashboard.api';

import type {
  AdminDashboardSummary,
} from '@/api/dashboard.api';

import type {
  AdminStackParamList,
} from '@/navigation/AdminNavigator';


import { createThemedStyles, createThemedValue } from '@/theme/themeStore';
import { colors } from '@/theme/colors';
/* ============================================================
   PROPS
============================================================ */

type Props =
  NativeStackScreenProps<
    AdminStackParamList,
    'AdminDashboard'
  >;


/* ============================================================
   COLORS
============================================================ */

const COLORS = createThemedValue(() => ({
  background: colors.background,
  surface: colors.surface,
  white: colors.textInverse,

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
   HELPERS
============================================================ */

function scaleSize(
  width: number,
  base: number,
  min: number,
  max: number,
) {
  const scale = width / 390;

  return Math.min(
    max,
    Math.max(min, base * scale),
  );
}


/* ============================================================
   ICON
============================================================ */

function Icon({
  symbol,
  size = 22,
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
        lineHeight: size + 2,
      }}
    >
      {symbol}
    </Text>
  );
}


/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
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
  subtitle?: string;
  icon: string;
  iconColor: string;
  iconBackground: string;
  width: number;
}) {
  const compact = width < 360;

  return (
    <View
      style={[
        styles.statCard,
        {
          padding: compact ? 13 : 15,
        },
      ]}
    >
      <View
        style={[
          styles.statIcon,
          {
            width: compact ? 38 : 42,
            height: compact ? 38 : 42,
            borderRadius: compact ? 11 : 12,
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
          styles.statTitle,
          {
            fontSize: compact ? 11 : 12,
          },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.statValue,
          {
            fontSize: compact ? 20 : 23,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      {subtitle ? (
        <Text
          style={[
            styles.statSubtitle,
            {
              fontSize: compact ? 9 : 10,
            },
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}


/* ============================================================
   QUICK ACTION
============================================================ */

function QuickAction({
  title,
  subtitle,
  icon,
  background,
  color,
  onPress,
  width,
}: {
  title: string;
  subtitle: string;
  icon: string;
  background: string;
  color: string;
  onPress: () => void;
  width: number;
}) {
  const compact = width < 360;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        {
          width:
            compact
              ? '31%'
              : '31.5%',
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.quickIcon,
          {
            width: compact ? 36 : 40,
            height: compact ? 36 : 40,
            borderRadius: compact ? 10 : 11,
            backgroundColor: background,
          },
        ]}
      >
        <Icon
          symbol={icon}
          size={compact ? 17 : 19}
          color={color}
        />
      </View>

      <Text
        style={[
          styles.quickTitle,
          {
            fontSize: compact ? 11 : 12,
          },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.quickSubtitle,
          {
            fontSize: compact ? 9 : 10,
          },
        ]}
        numberOfLines={1}
      >
        {subtitle}
      </Text>
    </Pressable>
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
   ADMIN DASHBOARD
============================================================ */

export function AdminDashboardScreen({
  navigation,
}: Props) {

  const { width } =
    useWindowDimensions();

  const [summary, setSummary] =
    useState<AdminDashboardSummary | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);


  const compact =
    width < 360;


  const horizontalPadding =
    width < 350
      ? 16
      : width < 400
        ? 20
        : Math.min(
            28,
            width * 0.07,
          );


  /* ==========================================================
     LOAD
  ========================================================== */

  const loadDashboard =
    useCallback(async () => {

      try {

        setError(null);

        const data =
          await getAdminDashboardSummary();

        setSummary(data);

      } catch (err) {

        console.log(
          '[ADMIN DASHBOARD ERROR]',
          err,
        );

        setError(
          "Couldn't load admin dashboard. Pull down to try again.",
        );

      } finally {

        setLoading(false);
        setRefreshing(false);

      }

    }, []);


  useEffect(() => {

    loadDashboard();

  }, [loadDashboard]);


  /* ==========================================================
     REFRESH
  ========================================================== */

  function handleRefresh() {

    setRefreshing(true);

    loadDashboard();

  }


  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    loading &&
    !summary
  ) {

    return (
      <View
        style={
          styles.loadingScreen
        }
      >


        <View
          style={
            styles.loadingIcon
          }
        >
          <Icon
            symbol="⚙"
            size={26}
            color={
              COLORS.primary
            }
          />
        </View>

        <ActivityIndicator
          size="small"
          color={
            COLORS.primary
          }
          style={{
            marginTop: 16,
          }}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading admin dashboard...
        </Text>

      </View>
    );

  }


  /* ==========================================================
     SCREEN
  ========================================================== */

  return (
    <>

      <View
        style={
          styles.container
        }
      >

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
              tintColor={
                COLORS.primary
              }
            />
          }
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal:
                horizontalPadding,
              paddingBottom:
                compact
                  ? 28
                  : 40,
            },
          ]}
        >

          {/* ==================================================
              HEADER
          ================================================== */}

          <View
            style={
              styles.header
            }
          >

            <View
              style={
                styles.headerLeft
              }
            >

              <Text
                style={
                  styles.roleLabel
                }
              >
                ADMIN
              </Text>

              <Text
                style={[
                  styles.headerTitle,
                  {
                    fontSize:
                      scaleSize(
                        width,
                        29,
                        24,
                        34,
                      ),
                  },
                ]}
              >
                Admin Dashboard
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Manage users, operations and CRM
              </Text>

            </View>


            <Pressable
              onPress={() =>
                navigation.navigate(
                  'Profile',
                )
              }
              style={({ pressed }) => [
                styles.profileButton,
                pressed &&
                  styles.pressed,
              ]}
            >

              <Text
                style={
                  styles.profileInitial
                }
              >
                A
              </Text>

            </Pressable>

          </View>


          {/* ==================================================
              ERROR
          ================================================== */}

          {error ? (
            <View
              style={
                styles.errorBox
              }
            >

              <View
                style={
                  styles.errorIconBox
                }
              >
                <Icon
                  symbol="!"
                  size={15}
                  color={
                    COLORS.red
                  }
                />
              </View>

              <Text
                style={
                  styles.errorText
                }
              >
                {error}
              </Text>

            </View>
          ) : null}


          {/* ==================================================
              ADMIN OVERVIEW
          ================================================== */}

          <SectionHeader
            title="Admin overview"
          />

          <View
            style={
              styles.statsGrid
            }
          >

            <StatCard
              title="Total Users"
              value={
                String(
                  summary?.totalUsers ?? 0,
                )
              }
              subtitle="All team members"
              icon="♙"
              iconColor={
                COLORS.primary
              }
              iconBackground={
                COLORS.primaryLight
              }
              width={width}
            />


            <StatCard
              title="Active Users"
              value={
                String(
                  summary?.activeUsers ?? 0,
                )
              }
              subtitle="Currently active"
              icon="✓"
              iconColor={
                COLORS.green
              }
              iconBackground={
                COLORS.greenLight
              }
              width={width}
            />


            <StatCard
              title="Sales Team"
              value={
                String(
                  summary?.salesUsers ?? 0,
                )
              }
              subtitle="Sales members"
              icon="↗"
              iconColor={
                COLORS.purple
              }
              iconBackground={
                COLORS.purpleLight
              }
              width={width}
            />


            <StatCard
              title="Managers"
              value={
                String(
                  summary?.managerUsers ?? 0,
                )
              }
              subtitle="Team managers"
              icon="★"
              iconColor={
                COLORS.orange
              }
              iconBackground={
                COLORS.orangeLight
              }
              width={width}
            />

          </View>


          {/* ==================================================
              BUSINESS OVERVIEW
          ================================================== */}

          <SectionHeader
            title="CRM overview"
          />

          <View
            style={
              styles.statsGrid
            }
          >

            <StatCard
              title="Open Leads"
              value={
                String(
                  summary?.openLeads ?? 0,
                )
              }
              subtitle="Need follow-up"
              icon="↗"
              iconColor={
                COLORS.primary
              }
              iconBackground={
                COLORS.primaryLight
              }
              width={width}
            />


            <StatCard
              title="Open Deals"
              value={
                String(
                  summary?.openDeals ?? 0,
                )
              }
              subtitle="Active opportunities"
              icon="◆"
              iconColor={
                COLORS.purple
              }
              iconBackground={
                COLORS.purpleLight
              }
              width={width}
            />


            <StatCard
              title="Pipeline"
              value={
                `₹${Number(
                  summary?.pipelineRevenue ?? 0,
                ).toLocaleString(
                  'en-IN',
                  {
                    maximumFractionDigits: 0,
                  },
                )}`
              }
              subtitle="Expected revenue"
              icon="₹"
              iconColor={
                COLORS.green
              }
              iconBackground={
                COLORS.greenLight
              }
              width={width}
            />


            <StatCard
              title="Pending Tasks"
              value={
                String(
                  summary?.pendingTasks ?? 0,
                )
              }
              subtitle="Need attention"
              icon="✓"
              iconColor={
                COLORS.orange
              }
              iconBackground={
                COLORS.orangeLight
              }
              width={width}
            />

          </View>


          {/* ==================================================
              QUICK ACTIONS
          ================================================== */}

          <SectionHeader
            title="Quick actions"
          />

          <View
            style={
              styles.quickGrid
            }
          >

            <QuickAction
              title="Users"
              subtitle="Manage team"
              icon="♙"
              background={
                COLORS.primaryLight
              }
              color={
                COLORS.primary
              }
              width={width}
              onPress={() =>
                navigation.navigate(
                  'UserManagement',
                )
              }
            />


            <QuickAction
              title="Customers"
              subtitle="CRM clients"
              icon="♙"
              background={
                COLORS.greenLight
              }
              color={
                COLORS.green
              }
              width={width}
              onPress={() =>
                navigation.navigate(
                  'CustomerList',
                )
              }
            />


            <QuickAction
              title="Leads"
              subtitle="Manage leads"
              icon="↗"
              background={
                COLORS.primaryLight
              }
              color={
                COLORS.primary
              }
              width={width}
              onPress={() =>
                navigation.navigate(
                  'LeadList',
                )
              }
            />


            <QuickAction
              title="Deals"
              subtitle="Opportunities"
              icon="◆"
              background={
                COLORS.purpleLight
              }
              color={
                COLORS.purple
              }
              width={width}
              onPress={() =>
                navigation.navigate(
                  'OpportunitiesBoard',
                )
              }
            />


            <QuickAction
              title="Tasks"
              subtitle="Activities"
              icon="✓"
              background={
                COLORS.orangeLight
              }
              color={
                COLORS.orange
              }
              width={width}
              onPress={() =>
                navigation.navigate(
                  'Activities',
                )
              }
            />


            <QuickAction
              title="Reports"
              subtitle="Analytics"
              icon="▥"
              background={
                COLORS.purpleLight
              }
              color={
                COLORS.purple
              }
              width={width}
              onPress={() =>
                navigation.navigate(
                  'Reports',
                )
              }
            />

          </View>


          {/* ==================================================
              MANAGEMENT
          ================================================== */}

          <SectionHeader
            title="Administration"
          />

          <View
            style={
              styles.managementCard
            }
          >

            <Pressable
              onPress={() =>
                navigation.navigate(
                  'UserManagement',
                )
              }
              style={({ pressed }) => [
                styles.managementItem,
                pressed &&
                  styles.rowPressed,
              ]}
            >

              <View
                style={[
                  styles.managementIcon,
                  {
                    backgroundColor:
                      COLORS.primaryLight,
                  },
                ]}
              >
                <Icon
                  symbol="♙"
                  size={19}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View
                style={
                  styles.managementText
                }
              >

                <Text
                  style={
                    styles.managementTitle
                  }
                >
                  User Management
                </Text>

                <Text
                  style={
                    styles.managementSubtitle
                  }
                >
                  Create, update and manage team members
                </Text>

              </View>

              <Text
                style={
                  styles.managementArrow
                }
              >
                →
              </Text>

            </Pressable>


            <Pressable
              onPress={() =>
                navigation.navigate(
                  'Reports',
                )
              }
              style={({ pressed }) => [
                styles.managementItem,
                styles.rowBorder,
                pressed &&
                  styles.rowPressed,
              ]}
            >

              <View
                style={[
                  styles.managementIcon,
                  {
                    backgroundColor:
                      COLORS.purpleLight,
                  },
                ]}
              >
                <Icon
                  symbol="▥"
                  size={19}
                  color={
                    COLORS.purple
                  }
                />
              </View>

              <View
                style={
                  styles.managementText
                }
              >

                <Text
                  style={
                    styles.managementTitle
                  }
                >
                  Reports & Analytics
                </Text>

                <Text
                  style={
                    styles.managementSubtitle
                  }
                >
                  Monitor CRM and business performance
                </Text>

              </View>

              <Text
                style={
                  styles.managementArrow
                }
              >
                →
              </Text>

            </Pressable>


            <Pressable
              onPress={() =>
                navigation.navigate(
                  'AiCenter',
                )
              }
              style={({ pressed }) => [
                styles.managementItem,
                styles.rowBorder,
                pressed &&
                  styles.rowPressed,
              ]}
            >

              <View
                style={[
                  styles.managementIcon,
                  {
                    backgroundColor:
                      COLORS.greenLight,
                  },
                ]}
              >
                <Icon
                  symbol="✦"
                  size={19}
                  color={
                    COLORS.green
                  }
                />
              </View>

              <View
                style={
                  styles.managementText
                }
              >

                <Text
                  style={
                    styles.managementTitle
                  }
                >
                  AI Assistant
                </Text>

                <Text
                  style={
                    styles.managementSubtitle
                  }
                >
                  AI-powered CRM insights
                </Text>

              </View>

              <Text
                style={
                  styles.managementArrow
                }
              >
                →
              </Text>

            </Pressable>


            <Pressable
              onPress={() =>
                navigation.navigate(
                  'Profile',
                )
              }
              style={({ pressed }) => [
                styles.managementItem,
                styles.rowBorder,
                pressed &&
                  styles.rowPressed,
              ]}
            >

              <View
                style={[
                  styles.managementIcon,
                  {
                    backgroundColor:
                      COLORS.orangeLight,
                  },
                ]}
              >
                <Icon
                  symbol="⚙"
                  size={19}
                  color={
                    COLORS.orange
                  }
                />
              </View>

              <View
                style={
                  styles.managementText
                }
              >

                <Text
                  style={
                    styles.managementTitle
                  }
                >
                  Admin Profile
                </Text>

                <Text
                  style={
                    styles.managementSubtitle
                  }
                >
                  Account settings
                </Text>

              </View>

              <Text
                style={
                  styles.managementArrow
                }
              >
                →
              </Text>

            </Pressable>

          </View>


          {/* ==================================================
              FOOTER
          ================================================== */}

          <View
            style={
              styles.footer
            }
          >

            <Text
              style={
                styles.footerText
              }
            >
              CRM Admin Dashboard
            </Text>

            <Text
              style={
                styles.footerSubtext
              }
            >
              Manage your organization efficiently.
            </Text>

          </View>

        </ScrollView>

      </View>
    </>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles = createThemedStyles(() => StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  content: {
    paddingTop: 16,
  },


  /* ==========================================================
     LOADING
  ========================================================== */

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      COLORS.background,
  },

  loadingIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 10,
    color:
      COLORS.textSecondary,
    fontSize: 13,
  },


  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },

  roleLabel: {
    color:
      COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 5,
  },

  headerTitle: {
    color:
      COLORS.text,
    fontWeight: '700',
    letterSpacing: -0.8,
  },

  headerSubtitle: {
    color:
      COLORS.textSecondary,
    fontSize: 13,
    marginTop: 5,
    lineHeight: 19,
  },

  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor:
      COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor:
      COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },

  profileInitial: {
    color:
      COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },


  /* ==========================================================
     ERROR
  ========================================================== */

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      COLORS.redLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 18,
  },

  errorIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },


  /* ==========================================================
     SECTIONS
  ========================================================== */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginTop: 3,
    marginBottom: 11,
  },

  sectionTitle: {
    color:
      COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  sectionAction: {
    color:
      COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },


  /* ==========================================================
     STATS
  ========================================================== */

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent:
      'space-between',
    marginBottom: 22,
  },

  statCard: {
    width: '48.4%',
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 17,
    marginBottom: 10,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },

  statIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  statTitle: {
    color:
      COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 3,
  },

  statValue: {
    color:
      COLORS.text,
    fontWeight: '700',
    letterSpacing: -0.4,
  },

  statSubtitle: {
    color:
      COLORS.textMuted,
    marginTop: 3,
  },


  /* ==========================================================
     QUICK ACTIONS
  ========================================================== */

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent:
      'space-between',
    marginBottom: 22,
  },

  quickAction: {
    minHeight: 88,
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
    paddingHorizontal: 5,
  },

  quickIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  quickTitle: {
    color:
      COLORS.text,
    fontWeight: '600',
  },

  quickSubtitle: {
    color:
      COLORS.textMuted,
    marginTop: 2,
  },


  /* ==========================================================
     MANAGEMENT
  ========================================================== */

  managementCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 1,
  },

  managementItem: {
    minHeight: 73,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  managementIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  managementText: {
    flex: 1,
  },

  managementTitle: {
    color:
      COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },

  managementSubtitle: {
    color:
      COLORS.textMuted,
    fontSize: 10,
    marginTop: 3,
  },

  managementArrow: {
    color:
      COLORS.primary,
    fontSize: 20,
    marginLeft: 8,
  },


  /* ==========================================================
     DIVIDERS
  ========================================================== */

  rowBorder: {
    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
  },


  /* ==========================================================
     PRESS
  ========================================================== */

  pressed: {
    opacity: 0.75,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  rowPressed: {
    backgroundColor:
      colors.background,
  },


  /* ==========================================================
     FOOTER
  ========================================================== */

  footer: {
    alignItems: 'center',
    paddingVertical: 5,
  },

  footerText: {
    color:
      COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  footerSubtext: {
    color:
      '#B0B8C5',
    fontSize: 9,
    marginTop: 3,
  },

}));