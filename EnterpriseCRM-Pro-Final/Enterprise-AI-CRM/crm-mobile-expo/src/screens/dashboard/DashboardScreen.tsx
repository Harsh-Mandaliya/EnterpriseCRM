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
  getDashboardSummary,
} from '@/api/dashboard.api';

import type {
  DashboardSummary,
} from '@/types';

import type {
  MainStackParamList,
} from '@/navigation/OwnerNavigator';

import { createThemedStyles, createThemedValue } from '@/theme/themeStore';
import { colors } from '@/theme/colors';
/* ============================================================
   TYPES
============================================================ */

type Props =
  NativeStackScreenProps<
    MainStackParamList,
    'Dashboard'
  >;

/* ============================================================
   COLORS
============================================================ */

const COLORS = createThemedValue(() => ({
  background: colors.background,
  surface: colors.surface,
  white: colors.textInverse,

  primary: colors.primary,
  primaryDark: colors.primaryDark,
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

  blueLight: colors.primaryLight,
}));

/* ============================================================
   RESPONSIVE HELPERS
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

function formatCurrency(
  amount: number,
): string {
  return `₹${Number(amount || 0).toLocaleString(
    'en-IN',
    {
      maximumFractionDigits: 0,
    },
  )}`;
}

/* ============================================================
   SIMPLE ICON
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
          padding: compact ? 13 : 16,
        },
      ]}
    >
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor:
              iconBackground,
            width: compact ? 38 : 42,
            height: compact ? 38 : 42,
            borderRadius: compact ? 11 : 12,
          },
        ]}
      >
        <Icon
          symbol={icon}
          size={compact ? 19 : 21}
          color={iconColor}
        />
      </View>

      <Text
        style={[
          styles.statTitle,
          {
            fontSize: compact ? 12 : 13,
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
            fontSize: compact ? 19 : 22,
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
              fontSize: compact ? 10 : 11,
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
  icon,
  background,
  color,
  onPress,
  width,
}: {
  title: string;
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
          width: compact ? '31%' : '31.5%',
          minHeight: compact ? 76 : 82,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.quickIcon,
          {
            backgroundColor: background,
            width: compact ? 36 : 40,
            height: compact ? 36 : 40,
            borderRadius: compact ? 10 : 11,
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
   DASHBOARD SCREEN
============================================================ */

export function DashboardScreen({
  navigation,
}: Props) {
  const { width } =
    useWindowDimensions();

  const [summary, setSummary] =
    useState<DashboardSummary | null>(
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
     LOAD DASHBOARD
  ========================================================== */

  const loadDashboard =
    useCallback(async () => {
      try {
        setError(null);

        const data =
          await getDashboardSummary();

        setSummary(data);
      } catch {
        setError(
          "Couldn't load your dashboard. Pull down to try again.",
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

  if (loading && !summary) {
    return (
      <View style={styles.loadingScreen}>

        <View style={styles.loadingIcon}>
          <Icon
            symbol="⌂"
            size={28}
            color={COLORS.primary}
          />
        </View>

        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={{
            marginTop: 16,
          }}
        />

        <Text style={styles.loadingText}>
          Loading your dashboard...
        </Text>
      </View>
    );
  }

  return (
    <>

      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
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
                compact ? 28 : 40,
            },
          ]}
        >
          {/* ==================================================
              HEADER
          ================================================== */}

          <View style={styles.header}>
            <View
              style={styles.headerLeft}
            >
              <Text
                style={[
                  styles.smallGreeting,
                  {
                    fontSize:
                      compact
                        ? 12
                        : 13,
                  },
                ]}
              >
                OWNER DASHBOARD
              </Text>

              <Text
                style={[
                  styles.headerTitle,
                  {
                    fontSize:
                      scaleSize(
                        width,
                        27,
                        23,
                        31,
                      ),
                  },
                ]}
              >
                Today's overview
              </Text>

              <Text
                style={[
                  styles.headerSubtitle,
                  {
                    fontSize:
                      compact
                        ? 12
                        : 13,
                  },
                ]}
              >
                Manage your business
                from one place
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
                style={styles.profileInitial}
              >
                O
              </Text>
            </Pressable>
          </View>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error ? (
            <View
              style={styles.errorBox}
            >
              <View
                style={
                  styles.errorIconBox
                }
              >
                <Icon
                  symbol="!"
                  size={15}
                  color={COLORS.red}
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
              SALES OVERVIEW
          ================================================== */}

          <SectionHeader
            title="Business overview"
          />

          <View style={styles.statsGrid}>
            <StatCard
              title="Today's Sales"
              value={
                summary
                  ? formatCurrency(
                      summary
                        .todaysSales
                        .total,
                    )
                  : '₹0'
              }
              subtitle={
                summary
                  ? `${summary.todaysSales.orderCount} orders`
                  : undefined
              }
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
              title="This Month"
              value={
                summary
                  ? formatCurrency(
                      summary
                        .monthlySales
                        .total,
                    )
                  : '₹0'
              }
              subtitle={
                summary
                  ? `${summary.monthlySales.orderCount} orders`
                  : undefined
              }
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
              title="Pending Tasks"
              value={
                summary
                  ? String(
                      summary.pendingTasks,
                    )
                  : '0'
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

            <StatCard
              title="Today's Visits"
              value={
                summary
                  ? String(
                      summary.todaysVisits,
                    )
                  : '0'
              }
              subtitle="Scheduled visits"
              icon="⌖"
              iconColor={
                COLORS.purple
              }
              iconBackground={
                COLORS.purpleLight
              }
              width={width}
            />
          </View>

          {/* ==================================================
              QUICK ACTIONS
          ================================================== */}

          <SectionHeader
            title="Quick access"
          />

          <View style={styles.quickGrid}>
            <QuickAction
              title="Leads"
              icon="↗"
              background={
                COLORS.primaryLight
              }
              color={COLORS.primary}
              width={width}
              onPress={() =>
                navigation.navigate(
                  'LeadList',
                )
              }
            />

            <QuickAction
              title="Deals"
              icon="◆"
              background={
                COLORS.purpleLight
              }
              color={COLORS.purple}
              width={width}
              onPress={() =>
                navigation.navigate(
                  'OpportunitiesBoard',
                )
              }
            />

            <QuickAction
              title="Tasks"
              icon="✓"
              background={
                COLORS.orangeLight
              }
              color={COLORS.orange}
              width={width}
              onPress={() =>
                navigation.navigate(
                  'Activities',
                )
              }
            />

            <QuickAction
              title="Customers"
              icon="♙"
              background={
                COLORS.greenLight
              }
              color={COLORS.green}
              width={width}
              onPress={() =>
                navigation.navigate(
                  'CustomerList',
                )
              }
            />

            <QuickAction
              title="Products"
              icon="▣"
              background={
                COLORS.blueLight
              }
              color={COLORS.primary}
              width={width}
              onPress={() =>
                navigation.navigate(
                  'ProductList',
                )
              }
            />

            <QuickAction
              title="Invoices"
              icon="▤"
              background={
                COLORS.orangeLight
              }
              color={COLORS.orange}
              width={width}
              onPress={() =>
                navigation.navigate(
                  'InvoiceList',
                )
              }
            />

            <QuickAction
              title="Payments"
              icon="₹"
              background={
                COLORS.greenLight
              }
              color={COLORS.green}
              width={width}
              onPress={() =>
                navigation.navigate(
                  'PaymentList',
                )
              }
            />

            <QuickAction
              title="Calendar"
              icon="□"
              background={
                COLORS.purpleLight
              }
              color={COLORS.purple}
              width={width}
              onPress={() =>
                navigation.navigate(
                  'Calendar',
                )
              }
            />

            <QuickAction
              title="Alerts"
              icon="!"
              background={
                COLORS.redLight
              }
              color={COLORS.red}
              width={width}
              onPress={() =>
                navigation.navigate(
                  'NotificationList',
                )
              }
            />
          </View>

          {/* ==================================================
              PIPELINE
          ================================================== */}

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
              pressed &&
                styles.pressed,
            ]}
          >
            <View
              style={
                styles.pipelineTop
              }
            >
              <View>
                <Text
                  style={
                    styles.pipelineLabel
                  }
                >
                  Expected revenue
                </Text>

                <Text
                  style={[
                    styles.pipelineValue,
                    {
                      fontSize:
                        scaleSize(
                          width,
                          30,
                          26,
                          34,
                        ),
                    },
                  ]}
                >
                  {summary
                    ? formatCurrency(
                        summary
                          .pipeline
                          .expectedRevenue,
                      )
                    : '₹0'}
                </Text>
              </View>

              <View
                style={
                  styles.pipelineIcon
                }
              >
                <Icon
                  symbol="↗"
                  size={24}
                  color={
                    COLORS.primary
                  }
                />
              </View>
            </View>

            <View
              style={
                styles.pipelineBottom
              }
            >
              <Text
                style={
                  styles.pipelineCount
                }
              >
                {summary
                  ? summary.pipeline
                      .openOpportunityCount
                  : 0}{' '}
                open opportunities
              </Text>

              <Text
                style={
                  styles.pipelineArrow
                }
              >
                →
              </Text>
            </View>
          </Pressable>

          {/* ==================================================
              TOP CUSTOMERS
          ================================================== */}

          <SectionHeader
            title="Top customers"
            action="View all"
            onPress={() =>
              navigation.navigate(
                'CustomerList',
              )
            }
          />

          <View
            style={
              styles.whiteCard
            }
          >
            {summary &&
            summary.topCustomers
              .length > 0 ? (
              summary.topCustomers
                .slice(0, 5)
                .map((customer, index) => (
                  <Pressable
                    key={
                      customer.customerId
                    }
                    onPress={() =>
                      navigation.navigate(
                        'CustomerList',
                      )
                    }
                    style={({ pressed }) => [
                      styles.customerRow,
                      index > 0 &&
                        styles.rowBorder,
                      pressed &&
                        styles.rowPressed,
                    ]}
                  >
                    <View
                      style={
                        styles.customerLeft
                      }
                    >
                      <View
                        style={
                          styles.customerAvatar
                        }
                      >
                        <Text
                          style={
                            styles.customerAvatarText
                          }
                        >
                          {customer.customerName
                            .charAt(
                              0,
                            )
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.customerInfo
                        }
                      >
                        <Text
                          style={
                            styles.customerName
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {
                            customer.customerName
                          }
                        </Text>

                        <Text
                          style={
                            styles.customerRank
                          }
                        >
                          #{index + 1}{' '}
                          customer
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={
                        styles.customerRevenue
                      }
                    >
                      {formatCurrency(
                        customer.totalRevenue,
                      )}
                    </Text>
                  </Pressable>
                ))
            ) : (
              <View
                style={
                  styles.emptyState
                }
              >
                <View
                  style={
                    styles.emptyIcon
                  }
                >
                  <Icon
                    symbol="♙"
                    size={23}
                    color={
                      COLORS.primary
                    }
                  />
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No customers yet
                </Text>

                <Text
                  style={
                    styles.emptySubtitle
                  }
                >
                  Customer revenue will
                  appear here.
                </Text>
              </View>
            )}
          </View>

          {/* ==================================================
              RECENT ACTIVITY
          ================================================== */}

          <SectionHeader
            title="Recent activity"
            action="View tasks"
            onPress={() =>
              navigation.navigate(
                'Activities',
              )
            }
          />

          <View
            style={
              styles.whiteCard
            }
          >
            {summary &&
            summary.recentActivities
              .length > 0 ? (
              summary.recentActivities
                .slice(0, 5)
                .map(
                  (
                    activity,
                    index,
                  ) => (
                    <View
                      key={
                        activity.id
                      }
                      style={[
                        styles.activityRow,
                        index > 0 &&
                          styles.rowBorder,
                      ]}
                    >
                      <View
                        style={
                          styles.activityDot
                        }
                      />

                      <View
                        style={
                          styles.activityContent
                        }
                      >
                        <Text
                          style={
                            styles.activitySummary
                          }
                          numberOfLines={
                            2
                          }
                        >
                          {
                            activity.summary
                          }
                        </Text>

                        <Text
                          style={
                            styles.activityMeta
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {
                            activity
                              .createdBy
                              ?.name ?? 'Unknown'
                          }{' '}
                          ·{' '}
                          {new Date(
                            activity.createdAt,
                          ).toLocaleDateString(
                            'en-IN',
                          )}
                        </Text>
                      </View>
                    </View>
                  ),
                )
            ) : (
              <View
                style={
                  styles.emptyState
                }
              >
                <View
                  style={
                    styles.emptyIcon
                  }
                >
                  <Icon
                    symbol="✓"
                    size={22}
                    color={
                      COLORS.primary
                    }
                  />
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  Nothing logged yet
                </Text>

                <Text
                  style={
                    styles.emptySubtitle
                  }
                >
                  Your recent CRM activity
                  will appear here.
                </Text>
              </View>
            )}
          </View>

          {/* ==================================================
              MANAGEMENT
          ================================================== */}

          <SectionHeader
            title="Management"
          />

          <View
            style={
              styles.managementCard
            }
          >
            <Pressable
              onPress={() =>
                navigation.navigate(
                  'Reports',
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
                  symbol="▥"
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
                  Reports & Analytics
                </Text>

                <Text
                  style={
                    styles.managementSubtitle
                  }
                >
                  Track your business
                  performance
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
                      COLORS.purpleLight,
                  },
                ]}
              >
                <Icon
                  symbol="✦"
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
                  AI Center
                </Text>

                <Text
                  style={
                    styles.managementSubtitle
                  }
                >
                  AI-powered CRM
                  insights
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
                      COLORS.greenLight,
                  },
                ]}
              >
                <Icon
                  symbol="⚙"
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
                  Owner Profile
                </Text>

                <Text
                  style={
                    styles.managementSubtitle
                  }
                >
                  Account & company
                  settings
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
              CRM Owner Dashboard
            </Text>

            <Text
              style={
                styles.footerSubtext
              }
            >
              Your business. One place.
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
    color: COLORS.textSecondary,
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
    marginBottom: 18,
  },

  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },

  smallGreeting: {
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 5,
  },

  headerTitle: {
    color: COLORS.text,
    fontWeight: '700',
    letterSpacing: -0.6,
  },

  headerSubtitle: {
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
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
    color: COLORS.white,
    fontSize: 19,
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
    backgroundColor:
      colors.dangerSoft,
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
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  sectionAction: {
    color: COLORS.primary,
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
    marginBottom: 11,
  },

  statTitle: {
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 3,
  },

  statValue: {
    color: COLORS.text,
    fontWeight: '700',
    letterSpacing: -0.4,
  },

  statSubtitle: {
    color: COLORS.textMuted,
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
    color: COLORS.text,
    fontWeight: '600',
  },

  /* ==========================================================
     PIPELINE
  ========================================================== */

  pipelineCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 1,
  },

  pipelineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  pipelineLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },

  pipelineValue: {
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: -0.7,
  },

  pipelineIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pipelineBottom: {
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  pipelineCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },

  pipelineArrow: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '500',
  },

  /* ==========================================================
     WHITE CARDS
  ========================================================== */

  whiteCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 22,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 1,
  },

  /* ==========================================================
     CUSTOMER
  ========================================================== */

  customerRow: {
    minHeight: 66,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  customerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },

  customerAvatar: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  customerAvatarText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },

  customerInfo: {
    flex: 1,
    minWidth: 0,
  },

  customerName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },

  customerRank: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },

  customerRevenue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },

  /* ==========================================================
     ACTIVITY
  ========================================================== */

  activityRow: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 14,
  },

  activityDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor:
      COLORS.primary,
    marginTop: 5,
    marginRight: 11,
  },

  activityContent: {
    flex: 1,
  },

  activitySummary: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },

  activityMeta: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
  },

  /* ==========================================================
     EMPTY
  ========================================================== */

  emptyState: {
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
  },

  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },

  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 3,
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
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },

  managementSubtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 3,
  },

  managementArrow: {
    color: COLORS.primary,
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
    backgroundColor: colors.background,
  },

  /* ==========================================================
     FOOTER
  ========================================================== */

  footer: {
    alignItems: 'center',
    paddingVertical: 5,
  },

  footerText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  footerSubtext: {
    color: '#B0B8C5',
    fontSize: 9,
    marginTop: 3,
  },
}));