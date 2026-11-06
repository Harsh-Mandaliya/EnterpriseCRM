import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import {
  getLeadScores,
  getSalesForecast,
  getNextBestActions,
  getCustomerInsights,
} from '@/api/ai.api';

import { Card } from '@/components/common/Card';

import { colors } from '@/theme/colors';

import {
  typography,
  spacing,
  radius,
} from '@/theme/typography';

import type {
  LeadScore,
  SalesForecast,
  NextBestAction,
  CustomerInsight,
} from '@/types';

import { createThemedStyles } from '@/theme/themeStore';
/* ============================================================
   TYPES
============================================================ */

type TrendState = 'UP' | 'DOWN' | 'FLAT';

/* ============================================================
   HELPERS
============================================================ */

function normalizeTrend(
  value: SalesForecast['trendDirection'] | null | undefined,
): TrendState {
  const trend = String(value ?? '')
    .trim()
    .toUpperCase();

  if (
    trend === 'UP' ||
    trend === 'UPWARD' ||
    trend === 'INCREASING' ||
    trend === 'GROWING'
  ) {
    return 'UP';
  }

  if (
    trend === 'DOWN' ||
    trend === 'DOWNWARD' ||
    trend === 'DECREASING' ||
    trend === 'DECLINING'
  ) {
    return 'DOWN';
  }

  return 'FLAT';
}

function priorityColor(
  priority: NextBestAction['priority'],
): string {
  if (priority === 'high') {
    return colors.danger;
  }

  if (priority === 'medium') {
    return colors.warning;
  }

  return colors.textMuted;
}

function priorityLabel(
  priority: NextBestAction['priority'],
): string {
  if (priority === 'high') {
    return 'HIGH';
  }

  if (priority === 'medium') {
    return 'MEDIUM';
  }

  return 'LOW';
}

function scoreColor(score: number): string {
  if (score >= 80) {
    return colors.success;
  }

  if (score >= 60) {
    return colors.primary;
  }

  if (score >= 40) {
    return colors.warning;
  }

  return colors.danger;
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

/* ============================================================
   SCREEN
============================================================ */

export function AiCenterScreen() {
  const [leadScores, setLeadScores] =
    useState<LeadScore[]>([]);

  const [forecast, setForecast] =
    useState<SalesForecast | null>(null);

  const [actions, setActions] =
    useState<NextBestAction[]>([]);

  const [atRisk, setAtRisk] =
    useState<CustomerInsight[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  /* ==========================================================
     LOAD
  ========================================================== */

  const load = useCallback(async () => {
    const [
      scores,
      forecastData,
      nextActions,
      insights,
    ] = await Promise.all([
      getLeadScores(),
      getSalesForecast(),
      getNextBestActions(),
      getCustomerInsights(),
    ]);

    setLeadScores(scores);
    setForecast(forecastData);
    setActions(nextActions);
    setAtRisk(
      insights.atRiskCustomers,
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const [
          scores,
          forecastData,
          nextActions,
          insights,
        ] = await Promise.all([
          getLeadScores(),
          getSalesForecast(),
          getNextBestActions(),
          getCustomerInsights(),
        ]);

        if (cancelled) {
          return;
        }

        setLeadScores(scores);
        setForecast(forecastData);
        setActions(nextActions);
        setAtRisk(
          insights.atRiskCustomers,
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ==========================================================
     REFRESH
  ========================================================== */

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await load();
    } catch (error) {
      console.error(
        'AI Center refresh error:',
        error,
      );
    } finally {
      setRefreshing(false);
    }
  }

  /* ==========================================================
     CALCULATED DATA
  ========================================================== */

  const highPriorityCount = useMemo(
    () =>
      actions.filter(
        action =>
          action.priority === 'high',
      ).length,
    [actions],
  );

  const averageLeadScore = useMemo(() => {
    if (leadScores.length === 0) {
      return 0;
    }

    const total = leadScores.reduce(
      (sum, lead) =>
        sum + lead.score,
      0,
    );

    return Math.round(
      total / leadScores.length,
    );
  }, [leadScores]);

  const trend = normalizeTrend(
    forecast?.trendDirection,
  );

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.loadingIcon}>
          <Text
            style={styles.loadingIconText}
          >
            AI
          </Text>
        </View>

        <ActivityIndicator
          size="small"
          color={colors.primary}
        />

        <Text style={styles.loadingText}>
          Analyzing your CRM data...
        </Text>
      </View>
    );
  }

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* ====================================================
            HEADER
        ==================================================== */}

        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.eyebrow}>
              INTELLIGENCE
            </Text>

            <Text style={styles.title}>
              AI Center
            </Text>

            <Text style={styles.subtitle}>
              Smart insights from your CRM
            </Text>
          </View>

          <View style={styles.aiIcon}>
            <Text style={styles.aiIconText}>
              AI
            </Text>

            <View
              style={styles.aiStatusDot}
            />
          </View>
        </View>

        {/* ====================================================
            SUMMARY
        ==================================================== */}

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor:
                    colors.primaryLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.summaryIconText,
                  {
                    color:
                      colors.primary,
                  },
                ]}
              >
                ◎
              </Text>
            </View>

            <Text
              style={styles.summaryLabel}
            >
              Avg. score
            </Text>

            <Text
              style={styles.summaryValue}
            >
              {averageLeadScore}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor:
                    colors.warning + '12',
                },
              ]}
            >
              <Text
                style={[
                  styles.summaryIconText,
                  {
                    color:
                      colors.warning,
                  },
                ]}
              >
                !
              </Text>
            </View>

            <Text
              style={styles.summaryLabel}
            >
              Actions
            </Text>

            <Text
              style={styles.summaryValue}
            >
              {actions.length}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor:
                    colors.danger + '10',
                },
              ]}
            >
              <Text
                style={[
                  styles.summaryIconText,
                  {
                    color:
                      colors.danger,
                  },
                ]}
              >
                !
              </Text>
            </View>

            <Text
              style={styles.summaryLabel}
            >
              At risk
            </Text>

            <Text
              style={[
                styles.summaryValue,
                atRisk.length > 0 && {
                  color:
                    colors.danger,
                },
              ]}
            >
              {atRisk.length}
            </Text>
          </View>
        </View>

        {/* ====================================================
            DATA NOTICE
        ==================================================== */}

        <View style={styles.dataNotice}>
          <View style={styles.noticeIcon}>
            <Text
              style={styles.noticeIconText}
            >
              ✓
            </Text>
          </View>

          <View
            style={styles.noticeContent}
          >
            <Text
              style={styles.noticeTitle}
            >
              Based on your CRM data
            </Text>

            <Text
              style={styles.noticeText}
            >
              Insights are calculated from
              your actual leads, revenue,
              customers and activities.
            </Text>
          </View>
        </View>

        {/* ====================================================
            SALES FORECAST
        ==================================================== */}

        <Card style={styles.section}>
          <View
            style={styles.sectionHeader}
          >
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                FORECAST
              </Text>

              <Text
                style={styles.cardTitle}
              >
                Sales forecast
              </Text>
            </View>

            <View
              style={styles.forecastBadge}
            >
              <Text
                style={
                  styles.forecastBadgeText
                }
              >
                NEXT MONTH
              </Text>
            </View>
          </View>

          {forecast?.forecastedRevenue ===
          null ? (
            <View
              style={styles.emptyBlock}
            >
              <Text
                style={styles.emptyTitle}
              >
                Not enough data
              </Text>

              <Text
                style={styles.emptyText}
              >
                {forecast?.monthsOfHistory ??
                  0}{' '}
                month
                {(forecast?.monthsOfHistory ??
                  0) === 1
                  ? ''
                  : 's'}{' '}
                of paid invoice history
                is available. More data is
                needed to project a trend.
              </Text>
            </View>
          ) : (
            <>
              <Text
                style={styles.forecastValue}
              >
                {formatCurrency(
                  forecast?.forecastedRevenue ??
                    0,
                )}
              </Text>

              {/* FIXED TREND SECTION */}

              <View
                style={
                  styles.forecastMetaRow
                }
              >
                <View
                  style={[
                    styles.trendBadge,
                    trend === 'UP' && {
                      backgroundColor:
                        colors.success +
                        '12',
                    },
                    trend === 'DOWN' && {
                      backgroundColor:
                        colors.danger +
                        '10',
                    },
                    trend === 'FLAT' && {
                      backgroundColor:
                        colors.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.trendText,
                      trend === 'UP' && {
                        color:
                          colors.success,
                      },
                      trend === 'DOWN' && {
                        color:
                          colors.danger,
                      },
                      trend === 'FLAT' && {
                        color:
                          colors.textMuted,
                      },
                    ]}
                  >
                    {trend === 'UP'
                      ? '↑ UP'
                      : trend === 'DOWN'
                        ? '↓ DOWN'
                        : '→ STABLE'}
                  </Text>
                </View>

                <Text
                  style={
                    styles.forecastMeta
                  }
                >
                  Based on{' '}
                  {
                    forecast?.monthsOfHistory
                  }{' '}
                  months of revenue
                </Text>
              </View>
            </>
          )}
        </Card>

        {/* ====================================================
            NEXT BEST ACTIONS
        ==================================================== */}

        <Card style={styles.section}>
          <View
            style={styles.sectionHeader}
          >
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                RECOMMENDATIONS
              </Text>

              <Text
                style={styles.cardTitle}
              >
                Next best actions
              </Text>
            </View>

            {highPriorityCount > 0 && (
              <View
                style={
                  styles.highPriorityBadge
                }
              >
                <Text
                  style={
                    styles.highPriorityText
                  }
                >
                  {highPriorityCount}{' '}
                  urgent
                </Text>
              </View>
            )}
          </View>

          {actions.length === 0 ? (
            <View
              style={styles.emptyBlock}
            >
              <Text
                style={styles.emptyTitle}
              >
                Everything looks good
              </Text>

              <Text
                style={styles.emptyText}
              >
                No urgent recommendations
                right now.
              </Text>
            </View>
          ) : (
            actions
              .slice(0, 6)
              .map((action, index) => {
                const color =
                  priorityColor(
                    action.priority,
                  );

                return (
                  <View
                    key={`${action.message}-${index}`}
                    style={[
                      styles.actionRow,
                      index > 0 &&
                        styles.rowBorder,
                    ]}
                  >
                    <View
                      style={[
                        styles.actionIcon,
                        {
                          backgroundColor:
                            color +
                            '10',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionIconText,
                          {
                            color,
                          },
                        ]}
                      >
                        !
                      </Text>
                    </View>

                    <View
                      style={
                        styles.actionContent
                      }
                    >
                      <View
                        style={
                          styles.actionTopRow
                        }
                      >
                        <View
                          style={[
                            styles.priorityBadge,
                            {
                              backgroundColor:
                                color +
                                '10',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.priorityText,
                              {
                                color,
                              },
                            ]}
                          >
                            {priorityLabel(
                              action.priority,
                            )}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.actionText
                        }
                      >
                        {action.message}
                      </Text>
                    </View>
                  </View>
                );
              })
          )}
        </Card>

        {/* ====================================================
            LEAD SCORES
        ==================================================== */}

        <Card style={styles.section}>
          <View
            style={styles.sectionHeader}
          >
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                LEAD INTELLIGENCE
              </Text>

              <Text
                style={styles.cardTitle}
              >
                Top scored leads
              </Text>
            </View>

            <Text
              style={styles.countText}
            >
              {leadScores.length}
            </Text>
          </View>

          {leadScores.length === 0 ? (
            <View
              style={styles.emptyBlock}
            >
              <Text
                style={styles.emptyTitle}
              >
                No open leads
              </Text>

              <Text
                style={styles.emptyText}
              >
                There are no open leads
                available for scoring.
              </Text>
            </View>
          ) : (
            leadScores
              .slice(0, 5)
              .map((lead, index) => {
                const color =
                  scoreColor(
                    lead.score,
                  );

                return (
                  <View
                    key={lead.leadId}
                    style={[
                      styles.leadRow,
                      index > 0 &&
                        styles.rowBorder,
                    ]}
                  >
                    <View
                      style={
                        styles.rankCircle
                      }
                    >
                      <Text
                        style={
                          styles.rankText
                        }
                      >
                        {index + 1}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.leadInfo
                      }
                    >
                      <Text
                        style={
                          styles.leadName
                        }
                        numberOfLines={1}
                      >
                        {lead.name}
                      </Text>

                      <Text
                        style={
                          styles.leadMeta
                        }
                      >
                        {lead.status} ·{' '}
                        {lead.source
                          .replace(
                            '_',
                            ' ',
                          )
                          .toLowerCase()}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.scoreCircle,
                        {
                          backgroundColor:
                            color +
                            '10',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scoreText,
                          {
                            color,
                          },
                        ]}
                      >
                        {lead.score}
                      </Text>
                    </View>
                  </View>
                );
              })
          )}
        </Card>

        {/* ====================================================
            AT RISK CUSTOMERS
        ==================================================== */}

        <Card style={styles.section}>
          <View
            style={styles.sectionHeader}
          >
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                CUSTOMER INTELLIGENCE
              </Text>

              <Text
                style={styles.cardTitle}
              >
                Customers at risk
              </Text>
            </View>

            {atRisk.length > 0 && (
              <View
                style={
                  styles.riskCountBadge
                }
              >
                <Text
                  style={
                    styles.riskCountText
                  }
                >
                  {atRisk.length}
                </Text>
              </View>
            )}
          </View>

          {atRisk.length === 0 ? (
            <View
              style={styles.emptyBlock}
            >
              <View
                style={styles.successIcon}
              >
                <Text
                  style={
                    styles.successIconText
                  }
                >
                  ✓
                </Text>
              </View>

              <Text
                style={styles.emptyTitle}
              >
                Customers look healthy
              </Text>

              <Text
                style={styles.emptyText}
              >
                No paying customers currently
                appear inactive.
              </Text>
            </View>
          ) : (
            atRisk.map(
              (customer, index) => (
                <View
                  key={
                    customer.customerId
                  }
                  style={[
                    styles.riskRow,
                    index > 0 &&
                      styles.rowBorder,
                  ]}
                >
                  <View
                    style={
                      styles.riskIcon
                    }
                  >
                    <Text
                      style={
                        styles.riskIconText
                      }
                    >
                      !
                    </Text>
                  </View>

                  <View
                    style={
                      styles.riskContent
                    }
                  >
                    <Text
                      style={
                        styles.riskName
                      }
                      numberOfLines={1}
                    >
                      {customer.name}
                    </Text>

                    <Text
                      style={
                        styles.riskReason
                      }
                      numberOfLines={2}
                    >
                      {customer.reason}
                    </Text>
                  </View>
                </View>
              ),
            )
          )}
        </Card>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <View style={styles.footer}>
          <View
            style={styles.footerIcon}
          >
            <Text
              style={
                styles.footerIconText
              }
            >
              AI
            </Text>
          </View>

          <Text
            style={styles.footerText}
          >
            CRM intelligence updates from
            your latest business data
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
    backgroundColor:
      colors.background,
  },

  content: {
    paddingHorizontal:
      spacing.md,
    paddingTop:
      spacing.sm,
    paddingBottom:
      spacing.xl,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      colors.background,
  },

  loadingIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor:
      colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom:
      spacing.md,
  },

  loadingIconText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
  },

  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },

  headerContent: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.primary,
    marginBottom: 2,
  },

  title: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
  },

  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    position: 'relative',
  },

  aiIconText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '900',
  },

  aiStatusDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    right: 4,
    top: 4,
    backgroundColor:
      colors.success,
    borderWidth: 2,
    borderColor:
      colors.primary,
  },

  /* ==========================================================
     SUMMARY
  ========================================================== */

  summaryRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: spacing.sm,
  },

  summaryCard: {
    flex: 1,
    minHeight: 72,
    backgroundColor:
      colors.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 9,
    justifyContent: 'center',
  },

  summaryIcon: {
    width: 27,
    height: 27,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },

  summaryIconText: {
    fontSize: 14,
    fontWeight: '800',
  },

  summaryLabel: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.textMuted,
  },

  summaryValue: {
    fontSize: 17,
    lineHeight: 20,
    color: colors.text,
    fontWeight: '800',
    marginTop: 1,
  },

  /* ==========================================================
     NOTICE
  ========================================================== */

  dataNotice: {
    flexDirection: 'row',
    backgroundColor:
      colors.primaryLight,
    borderRadius: 12,
    padding: 10,
    marginBottom: spacing.sm,
  },

  noticeIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  noticeIconText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },

  noticeContent: {
    flex: 1,
  },

  noticeTitle: {
    fontSize: 10,
    lineHeight: 13,
    color: colors.primary,
    fontWeight: '800',
  },

  noticeText: {
    fontSize: 9,
    lineHeight: 13,
    color: colors.textMuted,
    marginTop: 1,
  },

  /* ==========================================================
     SECTIONS
  ========================================================== */

  section: {
    marginTop: spacing.sm,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },

  sectionEyebrow: {
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 0.9,
    color: colors.primary,
    fontWeight: '800',
    marginBottom: 2,
  },

  cardTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },

  countText: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor:
      colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },

  /* ==========================================================
     FORECAST
  ========================================================== */

  forecastBadge: {
    backgroundColor:
      colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },

  forecastBadgeText: {
    fontSize: 7,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  forecastValue: {
    fontSize: 27,
    lineHeight: 32,
    color: colors.primary,
    fontWeight: '800',
    marginTop: 5,
  },

  forecastMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  trendBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 7,
  },

  trendText: {
    fontSize: 8,
    fontWeight: '800',
  },

  forecastMeta: {
    ...typography.small,
    color: colors.textMuted,
    flex: 1,
  },

  /* ==========================================================
     EMPTY
  ========================================================== */

  emptyBlock: {
    paddingVertical: spacing.sm,
  },

  emptyTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },

  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* ==========================================================
     ACTIONS
  ========================================================== */

  highPriorityBadge: {
    backgroundColor:
      colors.danger + '10',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },

  highPriorityText: {
    fontSize: 8,
    color: colors.danger,
    fontWeight: '800',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },

  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  actionIconText: {
    fontSize: 13,
    fontWeight: '900',
  },

  actionContent: {
    flex: 1,
  },

  actionTopRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },

  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },

  priorityText: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  actionText: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 17,
  },

  /* ==========================================================
     LEADS
  ========================================================== */

  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor:
      colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  rankText: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '800',
  },

  leadInfo: {
    flex: 1,
    marginRight: 8,
  },

  leadName: {
    ...typography.bodyBold,
    color: colors.text,
  },

  leadMeta: {
    fontSize: 9,
    lineHeight: 13,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'capitalize',
  },

  scoreCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreText: {
    fontSize: 13,
    fontWeight: '800',
  },

  /* ==========================================================
     CUSTOMER RISK
  ========================================================== */

  riskCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor:
      colors.danger + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },

  riskCountText: {
    fontSize: 9,
    color: colors.danger,
    fontWeight: '800',
  },

  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  riskIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor:
      colors.danger + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  riskIconText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '900',
  },

  riskContent: {
    flex: 1,
  },

  riskName: {
    ...typography.bodyBold,
    color: colors.text,
  },

  riskReason: {
    fontSize: 9,
    lineHeight: 14,
    color: colors.textMuted,
    marginTop: 2,
  },

  successIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor:
      colors.success + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },

  successIconText: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '800',
  },

  /* ==========================================================
     FOOTER
  ========================================================== */

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },

  footerIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor:
      colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },

  footerIconText: {
    fontSize: 8,
    color: colors.primary,
    fontWeight: '900',
  },

  footerText: {
    fontSize: 8,
    lineHeight: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
}));