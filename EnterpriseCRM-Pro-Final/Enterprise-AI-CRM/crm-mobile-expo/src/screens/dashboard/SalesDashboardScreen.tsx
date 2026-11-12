import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getSalesDashboardSummary,
  SalesDashboardSummary,
} from '@/api/dashboard.api';

import { useAppSelector } from '@/hooks/useRedux';


import { createThemedStyles, createThemedValue } from '@/theme/themeStore';
import { colors } from '@/theme/colors';
/* ============================================================
   NAVIGATION TYPE
============================================================ */

type Navigation = {
  navigate: (
    screen: string,
    params?: any,
  ) => void;
};


/* ============================================================
   COLORS
============================================================ */

const COLORS = createThemedValue(() => ({
  background: colors.background,
  surface: colors.surface,

  primary: colors.primary,
  primaryDark: colors.primaryDark,
  primarySoft: colors.primaryLight,

  text: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textFaint,

  border: colors.border,

  green: colors.success,
  greenSoft: colors.successSoft,

  orange: colors.warning,
  orangeSoft: colors.warningSoft,

  purple: colors.accent,
  purpleSoft: colors.accentSoft,

  red: colors.danger,
  redSoft: colors.dangerSoft,

  white: colors.textInverse,
}));


/* ============================================================
   FORMAT CURRENCY
============================================================ */

function formatCurrency(
  value: number,
): string {
  const amount = Number(value) || 0;

  if (amount >= 10000000) {
    return `₹${(
      amount / 10000000
    ).toFixed(1)} Cr`;
  }

  if (amount >= 100000) {
    return `₹${(
      amount / 100000
    ).toFixed(1)} L`;
  }

  if (amount >= 1000) {
    return `₹${(
      amount / 1000
    ).toFixed(1)} K`;
  }

  return `₹${amount.toLocaleString(
    'en-IN',
  )}`;
}


/* ============================================================
   STAT CARD
   FIXED:
   The outer wrapper now owns the 48.5% width.
   This prevents the cards from becoming vertical strips.
============================================================ */

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  iconBackground,
  onPress,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  iconBackground: string;
  onPress?: () => void;
}) {
  const card = (
    <View style={styles.statCard}>

      <View
        style={[
          styles.statIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Text
          style={[
            styles.statIconText,
            {
              color: iconColor,
            },
          ]}
        >
          {icon}
        </Text>
      </View>

      <View style={styles.statInfo}>

        <Text
          style={styles.statTitle}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Text
          style={styles.statValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {value}
        </Text>

        <Text
          style={styles.statSubtitle}
          numberOfLines={1}
        >
          {subtitle}
        </Text>

      </View>

    </View>
  );

  /*
   * IMPORTANT:
   * Width belongs here, on the wrapper.
   */
  if (!onPress) {
    return (
      <View style={styles.statCardWrapper}>
        {card}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCardWrapper,
        pressed && styles.pressed,
      ]}
    >
      {card}
    </Pressable>
  );
}


/* ============================================================
   QUICK ACTION
============================================================ */

function QuickAction({
  title,
  subtitle,
  icon,
  color,
  background,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
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
            backgroundColor:
              background,
          },
        ]}
      >
        <Text
          style={[
            styles.quickIconText,
            {
              color,
            },
          ]}
        >
          {icon}
        </Text>
      </View>

      <Text
        style={styles.quickTitle}
        numberOfLines={1}
      >
        {title}
      </Text>

      <Text
        style={styles.quickSubtitle}
        numberOfLines={1}
      >
        {subtitle}
      </Text>

    </Pressable>
  );
}


/* ============================================================
   SALES DASHBOARD
============================================================ */

export function SalesDashboardScreen({
  navigation,
}: {
  navigation: Navigation;
}) {

  /* ==========================================================
     SCREEN SIZE
  ========================================================== */

  const { width } =
    useWindowDimensions();

  const isSmallScreen =
    width < 380;

  const horizontalPadding =
    isSmallScreen ? 14 : 18;


  /* ==========================================================
     AUTH USER
  ========================================================== */

  const user = useAppSelector(
    state => state.auth.user,
  );


  /* ==========================================================
     STATE
  ========================================================== */

  const [summary, setSummary] =
    useState<SalesDashboardSummary | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);


  /* ==========================================================
     USER NAME
  ========================================================== */

  const firstName = useMemo(() => {

    const name =
      user?.name?.trim();

    if (!name) {
      return 'there';
    }

    return name.split(' ')[0];

  }, [user?.name]);


  const initials = useMemo(() => {

    const name =
      user?.name?.trim();

    if (!name) {
      return 'S';
    }

    return name
      .charAt(0)
      .toUpperCase();

  }, [user?.name]);


  /* ==========================================================
     LOAD DASHBOARD
  ========================================================== */

  const loadDashboard =
    useCallback(async () => {

      try {

        setError(null);

        const data =
          await getSalesDashboardSummary();

        console.log(
          '[SALES DASHBOARD]',
          data,
        );

        setSummary(data);

      } catch (err: any) {

        console.error(
          '[SALES DASHBOARD ERROR]',
          err,
        );

        setError(
          err?.response?.data?.error ??
            err?.message ??
            'Unable to load dashboard.',
        );

      } finally {

        setLoading(false);
        setRefreshing(false);

      }

    }, []);


  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);


  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh = () => {

    setRefreshing(true);

    loadDashboard();

  };


  /* ==========================================================
     DASHBOARD VALUES
  ========================================================== */

  const myLeads =
    Number(
      summary?.myLeads ?? 0,
    );

  const openDeals =
    Number(
      summary?.openDeals ?? 0,
    );

  const pipelineRevenue =
    Number(
      summary?.pipelineRevenue ?? 0,
    );

  const pendingTasks =
    Number(
      summary?.pendingTasks ?? 0,
    );

  const todaysActivities =
    Number(
      summary?.todaysActivities ?? 0,
    );

  const totalWonRevenue =
    Number(
      summary?.totalWonRevenue ?? 0,
    );

  const wonDeals =
    Number(
      summary?.wonDeals ?? 0,
    );


  /* ==========================================================
     SHARE
  ========================================================== */

  const shareUpdate =
    async () => {

      const message = [
        'SALES PERFORMANCE UPDATE',
        '',
        `Salesperson: ${
          user?.name ?? 'Sales'
        }`,
        '',
        `My Leads: ${myLeads}`,
        `Open Deals: ${openDeals}`,
        `Pipeline: ${formatCurrency(
          pipelineRevenue,
        )}`,
        `Pending Tasks: ${pendingTasks}`,
        `Today's Activities: ${todaysActivities}`,
        `Won Deals: ${wonDeals}`,
        `Won Revenue: ${formatCurrency(
          totalWonRevenue,
        )}`,
      ].join('\n');

      try {

        await Share.share({
          title:
            'Sales Performance',
          message,
        });

      } catch (err) {

        console.log(
          'Share cancelled',
        );

      }
    };


  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    loading &&
    !summary
  ) {

    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
        edges={[
          'top',
          'bottom',
        ]}
      >


        <ActivityIndicator
          size="small"
          color={
            COLORS.primary
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading dashboard...
        </Text>

      </SafeAreaView>
    );
  }


  /* ==========================================================
     MAIN UI
  ========================================================== */

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        'top',
        'bottom',
      ]}
    >


      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal:
              horizontalPadding,
          },
        ]}
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
      >

        {/* ====================================================
            HEADER
        ==================================================== */}

        <View
          style={styles.header}
        >

          <View
            style={
              styles.headerContent
            }
          >

            <Text
              style={
                styles.roleLabel
              }
            >
              SALES
            </Text>

            <Text
              style={
                styles.greeting
              }
            >
              Hello, {firstName} 👋
            </Text>

            <Text
              style={
                styles.pageTitle
              }
            >
              My Sales Dashboard
            </Text>

            <Text
              style={
                styles.pageSubtitle
              }
              numberOfLines={2}
            >
              Manage leads, customers,
              deals and follow-ups.
            </Text>

          </View>

          <Pressable
            style={
              styles.profileButton
            }
            onPress={() =>
              navigation.navigate(
                'Profile',
              )
            }
          >
            <Text
              style={
                styles.profileInitial
              }
            >
              {initials}
            </Text>
          </Pressable>

        </View>


        {/* ====================================================
            ERROR
        ==================================================== */}

        {error ? (
          <View
            style={
              styles.errorCard
            }
          >

            <View
              style={
                styles.errorTextArea
              }
            >

              <Text
                style={
                  styles.errorTitle
                }
              >
                Dashboard unavailable
              </Text>

              <Text
                style={
                  styles.errorMessage
                }
                numberOfLines={2}
              >
                {error}
              </Text>

            </View>

            <Pressable
              onPress={
                loadDashboard
              }
              style={
                styles.retryButton
              }
            >
              <Text
                style={
                  styles.retryText
                }
              >
                Retry
              </Text>
            </Pressable>

          </View>
        ) : null}


        {/* ====================================================
            TODAY'S FOCUS
        ==================================================== */}

        <View
          style={
            styles.focusCard
          }
        >

          <View
            style={
              styles.focusIcon
            }
          >
            <Text
              style={
                styles.focusIconText
              }
            >
              ✓
            </Text>
          </View>

          <View
            style={
              styles.focusContent
            }
          >

            <Text
              style={
                styles.focusTitle
              }
            >
              Today's Focus
            </Text>

            <Text
              style={
                styles.focusDescription
              }
              numberOfLines={2}
            >
              Follow up with leads, complete
              tasks and move deals forward.
            </Text>

          </View>

          <View
            style={
              styles.focusArrow
            }
          >
            <Text
              style={
                styles.focusArrowText
              }
            >
              →
            </Text>
          </View>

        </View>


        {/* ====================================================
            MY PERFORMANCE
        ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            My Performance
          </Text>

          <Text
            style={
              styles.sectionHint
            }
          >
            Overview
          </Text>

        </View>


        {/* ====================================================
            FIXED 2 × 2 PERFORMANCE GRID
        ==================================================== */}

        <View
          style={styles.statsGrid}
        >

          <StatCard
            title="My Leads"
            value={String(
              myLeads,
            )}
            subtitle="Active leads"
            icon="↗"
            iconColor={
              COLORS.primary
            }
            iconBackground={
              COLORS.primarySoft
            }
            onPress={() =>
              navigation.navigate(
                'LeadList',
              )
            }
          />

          <StatCard
            title="Open Deals"
            value={String(
              openDeals,
            )}
            subtitle="Active opportunities"
            icon="◆"
            iconColor={
              COLORS.purple
            }
            iconBackground={
              COLORS.purpleSoft
            }
            onPress={() =>
              navigation.navigate(
                'OpportunitiesBoard',
              )
            }
          />

          <StatCard
            title="Pipeline"
            value={formatCurrency(
              pipelineRevenue,
            )}
            subtitle="Expected revenue"
            icon="₹"
            iconColor={
              COLORS.green
            }
            iconBackground={
              COLORS.greenSoft
            }
            onPress={() =>
              navigation.navigate(
                'OpportunitiesBoard',
              )
            }
          />

          <StatCard
            title="Pending Tasks"
            value={String(
              pendingTasks,
            )}
            subtitle="Need attention"
            icon="✓"
            iconColor={
              COLORS.orange
            }
            iconBackground={
              COLORS.orangeSoft
            }
            onPress={() =>
              navigation.navigate(
                'Activities',
              )
            }
          />

        </View>


        {/* ====================================================
            TODAY
        ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Today
          </Text>

        </View>

        <View
          style={
            styles.todayCard
          }
        >

          <View
            style={
              styles.todayItem
            }
          >

            <Text
              style={
                styles.todayValue
              }
            >
              {todaysActivities}
            </Text>

            <Text
              style={
                styles.todayLabel
              }
            >
              Activities
            </Text>

          </View>

          <View
            style={
              styles.todayDivider
            }
          />

          <View
            style={
              styles.todayItem
            }
          >

            <Text
              style={[
                styles.todayValue,
                {
                  color:
                    COLORS.orange,
                },
              ]}
            >
              {pendingTasks}
            </Text>

            <Text
              style={
                styles.todayLabel
              }
            >
              Pending
            </Text>

          </View>

          <View
            style={
              styles.todayDivider
            }
          />

          <View
            style={
              styles.todayItem
            }
          >

            <Text
              style={[
                styles.todayValue,
                {
                  color:
                    COLORS.green,
                },
              ]}
            >
              {wonDeals}
            </Text>

            <Text
              style={
                styles.todayLabel
              }
            >
              Won Deals
            </Text>

          </View>

        </View>


        {/* ====================================================
            QUICK ACTIONS
        ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Quick Actions
          </Text>

        </View>

        <View
          style={
            styles.quickGrid
          }
        >

          <QuickAction
            title="Leads"
            subtitle="Follow up"
            icon="↗"
            color={
              COLORS.primary
            }
            background={
              COLORS.primarySoft
            }
            onPress={() =>
              navigation.navigate(
                'LeadList',
              )
            }
          />

          <QuickAction
            title="Deals"
            subtitle="Close deals"
            icon="◆"
            color={
              COLORS.purple
            }
            background={
              COLORS.purpleSoft
            }
            onPress={() =>
              navigation.navigate(
                'OpportunitiesBoard',
              )
            }
          />

          <QuickAction
            title="Tasks"
            subtitle="My work"
            icon="✓"
            color={
              COLORS.orange
            }
            background={
              COLORS.orangeSoft
            }
            onPress={() =>
              navigation.navigate(
                'Activities',
              )
            }
          />

          <QuickAction
            title="Customers"
            subtitle="My clients"
            icon="♙"
            color={
              COLORS.green
            }
            background={
              COLORS.greenSoft
            }
            onPress={() =>
              navigation.navigate(
                'CustomerList',
              )
            }
          />

          <QuickAction
            title="Calendar"
            subtitle="Meetings"
            icon="□"
            color={
              COLORS.primary
            }
            background={
              COLORS.primarySoft
            }
            onPress={() =>
              navigation.navigate(
                'Calendar',
              )
            }
          />

          <QuickAction
            title="AI Assistant"
            subtitle="Sales help"
            icon="✦"
            color={
              COLORS.purple
            }
            background={
              COLORS.purpleSoft
            }
            onPress={() =>
              navigation.navigate(
                'AiCenter',
              )
            }
          />

        </View>


        {/* ====================================================
            SALES RESULTS
        ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Sales Results
          </Text>

        </View>

        <View
          style={
            styles.resultsCard
          }
        >

          <View
            style={
              styles.resultMain
            }
          >

            <Text
              style={
                styles.resultLabel
              }
            >
              Won Revenue
            </Text>

            <Text
              style={
                styles.resultRevenue
              }
            >
              {formatCurrency(
                totalWonRevenue,
              )}
            </Text>

            <Text
              style={
                styles.resultHint
              }
            >
              Revenue from your won deals
            </Text>

          </View>

          <View
            style={
              styles.resultDivider
            }
          />

          <View
            style={
              styles.resultDeals
            }
          >

            <Text
              style={
                styles.resultDealsValue
              }
            >
              {wonDeals}
            </Text>

            <Text
              style={
                styles.resultDealsLabel
              }
            >
              Won Deals
            </Text>

          </View>

        </View>


        {/* ====================================================
            NEEDS ATTENTION
        ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Needs Attention
          </Text>

        </View>

        <View
          style={
            styles.attentionCard
          }
        >

          {/* PENDING FOLLOW UPS */}

          <Pressable
            style={
              styles.attentionRow
            }
            onPress={() =>
              navigation.navigate(
                'Activities',
              )
            }
          >

            <View
              style={[
                styles.attentionIcon,
                {
                  backgroundColor:
                    COLORS.orangeSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.attentionIconText,
                  {
                    color:
                      COLORS.orange,
                  },
                ]}
              >
                !
              </Text>
            </View>

            <View
              style={
                styles.attentionContent
              }
            >

              <Text
                style={
                  styles.attentionTitle
                }
              >
                Pending follow-ups
              </Text>

              <Text
                style={
                  styles.attentionSubtitle
                }
              >
                {pendingTasks}{' '}
                task
                {pendingTasks === 1
                  ? ''
                  : 's'} need
                attention
              </Text>

            </View>

            <Text
              style={
                styles.attentionArrow
              }
            >
              →
            </Text>

          </Pressable>


          <View
            style={
              styles.rowDivider
            }
          />


          {/* OPEN OPPORTUNITIES */}

          <Pressable
            style={
              styles.attentionRow
            }
            onPress={() =>
              navigation.navigate(
                'OpportunitiesBoard',
              )
            }
          >

            <View
              style={[
                styles.attentionIcon,
                {
                  backgroundColor:
                    COLORS.purpleSoft,
                },
              ]}
            >

              <Text
                style={[
                  styles.attentionIconText,
                  {
                    color:
                      COLORS.purple,
                  },
                ]}
              >
                ◆
              </Text>

            </View>

            <View
              style={
                styles.attentionContent
              }
            >

              <Text
                style={
                  styles.attentionTitle
                }
              >
                Open opportunities
              </Text>

              <Text
                style={
                  styles.attentionSubtitle
                }
              >
                {openDeals} active deal
                {openDeals === 1
                  ? ''
                  : 's'} ·{' '}
                {formatCurrency(
                  pipelineRevenue,
                )}{' '}
                pipeline
              </Text>

            </View>

            <Text
              style={
                styles.attentionArrow
              }
            >
              →
            </Text>

          </Pressable>


          <View
            style={
              styles.rowDivider
            }
          />


          {/* ACTIVE LEADS */}

          <Pressable
            style={
              styles.attentionRow
            }
            onPress={() =>
              navigation.navigate(
                'LeadList',
              )
            }
          >

            <View
              style={[
                styles.attentionIcon,
                {
                  backgroundColor:
                    COLORS.primarySoft,
                },
              ]}
            >

              <Text
                style={[
                  styles.attentionIconText,
                  {
                    color:
                      COLORS.primary,
                  },
                ]}
              >
                ↗
              </Text>

            </View>

            <View
              style={
                styles.attentionContent
              }
            >

              <Text
                style={
                  styles.attentionTitle
                }
              >
                Active leads
              </Text>

              <Text
                style={
                  styles.attentionSubtitle
                }
              >
                Review your {myLeads}{' '}
                active lead
                {myLeads === 1
                  ? ''
                  : 's'}
              </Text>

            </View>

            <Text
              style={
                styles.attentionArrow
              }
            >
              →
            </Text>

          </Pressable>

        </View>


        {/* ====================================================
            MANAGER UPDATE
        ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Manager Update
          </Text>

        </View>

        <View
          style={
            styles.managerCard
          }
        >

          <View
            style={
              styles.managerHeader
            }
          >

            <View
              style={
                styles.managerHeaderIcon
              }
            >
              <Text
                style={
                  styles.managerHeaderIconText
                }
              >
                ↑
              </Text>
            </View>

            <View
              style={
                styles.managerHeaderContent
              }
            >

              <Text
                style={
                  styles.managerTitle
                }
              >
                Share performance
              </Text>

              <Text
                style={
                  styles.managerSubtitle
                }
              >
                Send today's sales update.
              </Text>

            </View>

          </View>


          <View
            style={
              styles.managerStats
            }
          >

            <View
              style={
                styles.managerStat
              }
            >

              <Text
                style={
                  styles.managerValue
                }
              >
                {myLeads}
              </Text>

              <Text
                style={
                  styles.managerLabel
                }
              >
                Leads
              </Text>

            </View>


            <View
              style={
                styles.managerStat
              }
            >

              <Text
                style={[
                  styles.managerValue,
                  {
                    color:
                      COLORS.purple,
                  },
                ]}
              >
                {openDeals}
              </Text>

              <Text
                style={
                  styles.managerLabel
                }
              >
                Deals
              </Text>

            </View>


            <View
              style={
                styles.managerStat
              }
            >

              <Text
                style={[
                  styles.managerValue,
                  {
                    color:
                      COLORS.green,
                  },
                ]}
              >
                {wonDeals}
              </Text>

              <Text
                style={
                  styles.managerLabel
                }
              >
                Won
              </Text>

            </View>


            <View
              style={
                styles.managerStat
              }
            >

              <Text
                style={[
                  styles.managerValue,
                  {
                    color:
                      COLORS.orange,
                  },
                ]}
              >
                {pendingTasks}
              </Text>

              <Text
                style={
                  styles.managerLabel
                }
              >
                Tasks
              </Text>

            </View>

          </View>


          <Pressable
            style={({ pressed }) => [
              styles.shareButton,
              pressed &&
                styles.shareButtonPressed,
            ]}
            onPress={
              shareUpdate
            }
          >

            <Text
              style={
                styles.shareButtonText
              }
            >
              Share Update
            </Text>

            <Text
              style={
                styles.shareButtonArrow
              }
            >
              →
            </Text>

          </Pressable>

        </View>


        {/* ====================================================
            FOOTER
        ==================================================== */}

        <View
          style={
            styles.footer
          }
        >

          <Text
            style={
              styles.footerTitle
            }
          >
            Enterprise AI CRM
          </Text>

          <Text
            style={
              styles.footerSubtitle
            }
          >
            Sales Workspace
          </Text>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles =
  createThemedStyles(() => StyleSheet.create({

    /* ========================================================
       BASE
    ======================================================== */

    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    content: {
      paddingTop: 12,
      paddingBottom: 30,
    },

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        COLORS.background,
    },

    loadingText: {
      marginTop: 8,
      color: COLORS.secondary,
      fontSize: 12,
      fontWeight: '500',
    },


    /* ========================================================
       HEADER
    ======================================================== */

    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      marginBottom: 16,
    },

    headerContent: {
      flex: 1,
      paddingRight: 12,
    },

    roleLabel: {
      color: COLORS.primary,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '800',
      letterSpacing: 1.2,
      marginBottom: 3,
    },

    greeting: {
      color: COLORS.secondary,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '500',
      marginBottom: 2,
    },

    pageTitle: {
      color: COLORS.text,
      fontSize: 25,
      lineHeight: 30,
      fontWeight: '800',
      letterSpacing: -0.5,
    },

    pageSubtitle: {
      color: COLORS.secondary,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '400',
      marginTop: 4,
      maxWidth: 330,
    },

    profileButton: {
      width: 44,
      height: 44,
      borderRadius: 13,
      backgroundColor:
        COLORS.primary,
      alignItems: 'center',
      justifyContent:
        'center',
      marginTop: 2,
    },

    profileInitial: {
      color: COLORS.white,
      fontSize: 19,
      lineHeight: 23,
      fontWeight: '800',
    },


    /* ========================================================
       ERROR
    ======================================================== */

    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.redSoft,
      borderWidth: 1,
      borderColor: '#FECACA',
      borderRadius: 12,
      padding: 11,
      marginBottom: 14,
    },

    errorTextArea: {
      flex: 1,
      paddingRight: 8,
    },

    errorTitle: {
      color: '#991B1B',
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '800',
    },

    errorMessage: {
      color: colors.danger,
      fontSize: 9,
      lineHeight: 13,
      marginTop: 2,
    },

    retryButton: {
      backgroundColor:
        COLORS.red,
      borderRadius: 8,
      paddingVertical: 7,
      paddingHorizontal: 10,
    },

    retryText: {
      color: COLORS.white,
      fontSize: 10,
      fontWeight: '700',
    },


    /* ========================================================
       TODAY'S FOCUS
    ======================================================== */

    focusCard: {
      minHeight: 82,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.primarySoft,
      borderWidth: 1,
      borderColor: '#D4E3FF',
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 11,
      marginBottom: 19,
    },

    focusIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        COLORS.primary,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 11,
    },

    focusIconText: {
      color: COLORS.white,
      fontSize: 23,
      lineHeight: 27,
      fontWeight: '500',
    },

    focusContent: {
      flex: 1,
      paddingRight: 7,
    },

    focusTitle: {
      color: COLORS.text,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '800',
    },

    focusDescription: {
      color: COLORS.secondary,
      fontSize: 10,
      lineHeight: 14,
      marginTop: 2,
    },

    focusArrow: {
      width: 26,
      height: 26,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.primaryLight,
    },

    focusArrowText: {
      color: COLORS.primary,
      fontSize: 16,
      fontWeight: '700',
    },


    /* ========================================================
       SECTION HEADER
    ======================================================== */

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 9,
    },

    sectionTitle: {
      color: COLORS.text,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '800',
    },

    sectionHint: {
      color: COLORS.muted,
      fontSize: 9,
      fontWeight: '600',
    },


    /* ========================================================
       PERFORMANCE GRID
       
       THIS IS THE IMPORTANT FIX.
       
       The wrapper is now:
           width: '48.5%'
       
       The actual card is:
           width: '100%'
       
       Therefore React Native gets:
       
       ┌──────────────┐ ┌──────────────┐
       │ My Leads     │ │ Open Deals   │
       │ 0            │ │ 0            │
       └──────────────┘ └──────────────┘
       
       ┌──────────────┐ ┌──────────────┐
       │ Pipeline     │ │ Pending Task │
       │ ₹0           │ │ 0            │
       └──────────────┘ └──────────────┘
    ======================================================== */

    statsGrid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent:
        'space-between',
      marginBottom: 17,
    },

    statCardWrapper: {
      width: '48.5%',
      marginBottom: 9,
    },

    statCard: {
      width: '100%',
      minHeight: 108,

      backgroundColor:
        COLORS.surface,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      borderRadius: 14,

      padding: 11,

      flexDirection: 'row',
      alignItems: 'center',

      elevation: 1,

      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.035,
      shadowRadius: 3,
    },

    statIcon: {
      width: 38,
      height: 38,

      borderRadius: 11,

      alignItems: 'center',
      justifyContent:
        'center',

      marginRight: 10,

      flexShrink: 0,
    },

    statIconText: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '800',
    },

    statInfo: {
      flex: 1,
      minWidth: 0,
    },

    statTitle: {
      color: COLORS.secondary,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '600',
    },

    statValue: {
      color: COLORS.text,
      fontSize: 21,
      lineHeight: 26,
      fontWeight: '800',
      marginTop: 2,
    },

    statSubtitle: {
      color: COLORS.muted,
      fontSize: 8,
      lineHeight: 11,
      marginTop: 1,
    },


    /* ========================================================
       TODAY
    ======================================================== */

    todayCard: {
      minHeight: 78,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.surface,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 14,
      paddingVertical: 12,
      marginBottom: 18,
    },

    todayItem: {
      flex: 1,
      alignItems: 'center',
    },

    todayValue: {
      color: COLORS.primary,
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '800',
    },

    todayLabel: {
      color: COLORS.muted,
      fontSize: 9,
      lineHeight: 13,
      fontWeight: '500',
      marginTop: 2,
    },

    todayDivider: {
      width: 1,
      height: 35,
      backgroundColor:
        COLORS.border,
    },


    /* ========================================================
       QUICK ACTIONS
    ======================================================== */

    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent:
        'space-between',
      marginBottom: 18,
    },

    quickAction: {
      width: '31.5%',
      minHeight: 82,
      backgroundColor:
        COLORS.surface,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 4,
      marginBottom: 8,
    },

    quickIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 5,
    },

    quickIconText: {
      fontSize: 15,
      lineHeight: 19,
      fontWeight: '800',
    },

    quickTitle: {
      maxWidth: '90%',
      color: COLORS.text,
      fontSize: 9,
      lineHeight: 12,
      fontWeight: '700',
      textAlign: 'center',
    },

    quickSubtitle: {
      maxWidth: '90%',
      color: COLORS.muted,
      fontSize: 7,
      lineHeight: 10,
      marginTop: 1,
      textAlign: 'center',
    },


    /* ========================================================
       RESULTS
    ======================================================== */

    resultsCard: {
      minHeight: 100,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        COLORS.surface,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      marginBottom: 18,
    },

    resultMain: {
      flex: 1,
      paddingVertical: 14,
    },

    resultLabel: {
      color: COLORS.secondary,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '600',
    },

    resultRevenue: {
      color: COLORS.green,
      fontSize: 23,
      lineHeight: 28,
      fontWeight: '800',
      marginTop: 2,
    },

    resultHint: {
      color: COLORS.muted,
      fontSize: 8,
      lineHeight: 11,
      marginTop: 2,
    },

    resultDivider: {
      width: 1,
      height: 47,
      backgroundColor:
        COLORS.border,
      marginHorizontal: 15,
    },

    resultDeals: {
      minWidth: 70,
      alignItems: 'center',
    },

    resultDealsValue: {
      color: COLORS.green,
      fontSize: 21,
      lineHeight: 25,
      fontWeight: '800',
    },

    resultDealsLabel: {
      color: COLORS.muted,
      fontSize: 8,
      lineHeight: 12,
      marginTop: 2,
    },


    /* ========================================================
       ATTENTION
    ======================================================== */

    attentionCard: {
      backgroundColor:
        COLORS.surface,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 18,
    },

    attentionRow: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 11,
    },

    attentionIcon: {
      width: 34,
      height: 34,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 10,
    },

    attentionIconText: {
      fontSize: 15,
      lineHeight: 19,
      fontWeight: '800',
    },

    attentionContent: {
      flex: 1,
      minWidth: 0,
    },

    attentionTitle: {
      color: COLORS.text,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '700',
    },

    attentionSubtitle: {
      color: COLORS.muted,
      fontSize: 8,
      lineHeight: 12,
      marginTop: 1,
    },

    attentionArrow: {
      color: COLORS.primary,
      fontSize: 17,
      lineHeight: 21,
      fontWeight: '700',
      marginLeft: 7,
    },

    rowDivider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginLeft: 55,
    },


    /* ========================================================
       MANAGER UPDATE
    ======================================================== */

    managerCard: {
      backgroundColor:
        COLORS.surface,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 14,
      padding: 13,
      marginBottom: 18,
    },

    managerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    managerHeaderIcon: {
      width: 34,
      height: 34,
      borderRadius: 9,
      backgroundColor:
        COLORS.primarySoft,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 9,
    },

    managerHeaderIconText: {
      color: COLORS.primary,
      fontSize: 17,
      fontWeight: '800',
    },

    managerHeaderContent: {
      flex: 1,
    },

    managerTitle: {
      color: COLORS.text,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '800',
    },

    managerSubtitle: {
      color: COLORS.muted,
      fontSize: 8,
      lineHeight: 12,
      marginTop: 1,
    },

    managerStats: {
      flexDirection: 'row',
      marginTop: 13,
      paddingTop: 11,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
    },

    managerStat: {
      flex: 1,
      alignItems: 'center',
    },

    managerValue: {
      color: COLORS.primary,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '800',
    },

    managerLabel: {
      color: COLORS.muted,
      fontSize: 8,
      lineHeight: 11,
      marginTop: 1,
    },

    shareButton: {
      height: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.primary,
      borderRadius: 10,
      marginTop: 13,
    },

    shareButtonPressed: {
      backgroundColor:
        COLORS.primaryDark,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    shareButtonText: {
      color: COLORS.white,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '800',
    },

    shareButtonArrow: {
      color: COLORS.white,
      fontSize: 14,
      marginLeft: 6,
      fontWeight: '700',
    },


    /* ========================================================
       PRESS
    ======================================================== */

    pressed: {
      opacity: 0.72,
      transform: [
        {
          scale: 0.985,
        },
      ],
    },


    /* ========================================================
       FOOTER
    ======================================================== */

    footer: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 8,
    },

    footerTitle: {
      color: COLORS.muted,
      fontSize: 9,
      lineHeight: 12,
      fontWeight: '700',
    },

    footerSubtitle: {
      color: '#B8C0CC',
      fontSize: 8,
      lineHeight: 11,
      marginTop: 2,
    },

  }));