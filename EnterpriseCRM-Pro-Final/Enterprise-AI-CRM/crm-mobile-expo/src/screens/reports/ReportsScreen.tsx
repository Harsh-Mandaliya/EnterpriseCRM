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
  Pressable,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';

import {
  getSalesReport,
  getLeadConversionReport,
  getDealsReport,
  getTopCustomersReport,
} from '@/api/reports.api';

import { Card } from '@/components/common/Card';

import { colors } from '@/theme/colors';

import {
  typography,
  spacing,
  radius,
} from '@/theme/typography';

import type {
  SalesReportRow,
  LeadConversionRow,
  DealsReport,
  TopCustomerRow,
} from '@/types';

import { createThemedStyles } from '@/theme/themeStore';
/* ============================================================
   CONSTANTS
============================================================ */

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/* ============================================================
   HELPERS
============================================================ */

function formatCurrency(
  amount: number,
): string {
  return `₹${amount.toLocaleString(
    'en-IN',
    {
      maximumFractionDigits: 0,
    },
  )}`;
}

function formatCompactCurrency(
  amount: number,
): string {
  if (amount >= 10000000) {
    return `₹${(
      amount / 10000000
    ).toFixed(1)}Cr`;
  }

  if (amount >= 100000) {
    return `₹${(
      amount / 100000
    ).toFixed(1)}L`;
  }

  if (amount >= 1000) {
    return `₹${(
      amount / 1000
    ).toFixed(1)}k`;
  }

  return `₹${amount}`;
}

function formatSource(
  source: string,
): string {
  return source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char =>
      char.toUpperCase(),
    );
}

/* ============================================================
   REPORTS SCREEN
============================================================ */

export function ReportsScreen() {
  const {
    width,
  } = useWindowDimensions();

  const [
    sales,
    setSales,
  ] = useState<SalesReportRow[]>(
    [],
  );

  const [
    leadConversion,
    setLeadConversion,
  ] = useState<
    LeadConversionRow[]
  >([]);

  const [
    deals,
    setDeals,
  ] = useState<DealsReport | null>(
    null,
  );

  const [
    topCustomers,
    setTopCustomers,
  ] = useState<
    TopCustomerRow[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const isSmallPhone =
    width < 360;

  /* ==========================================================
     LOAD REPORTS
  ========================================================== */

  const loadReports =
    useCallback(
      async (
        showLoader = true,
      ) => {
        if (showLoader) {
          setLoading(true);
        }

        setError(null);

        try {
          const [
            salesData,
            conversionData,
            dealsData,
            customersData,
          ] = await Promise.all([
            getSalesReport(6),
            getLeadConversionReport(),
            getDealsReport(),
            getTopCustomersReport(5),
          ]);

          setSales(
            salesData,
          );

          setLeadConversion(
            conversionData,
          );

          setDeals(
            dealsData,
          );

          setTopCustomers(
            customersData,
          );
        } catch (err: any) {
          setError(
            err?.response?.data
              ?.error ??
              "Couldn't load reports. Please try again.",
          );
        } finally {
          if (showLoader) {
            setLoading(false);
          }
        }
      },
      [],
    );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  /* ==========================================================
     REFRESH
  ========================================================== */

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await loadReports(false);
    } finally {
      setRefreshing(false);
    }
  }

  /* ==========================================================
     CALCULATIONS
  ========================================================== */

  const totalRevenue =
    useMemo(
      () =>
        sales.reduce(
          (sum, item) =>
            sum + item.revenue,
          0,
        ),
      [sales],
    );

  const maxRevenue =
    useMemo(
      () =>
        Math.max(
          1,
          ...sales.map(
            item =>
              item.revenue,
          ),
        ),
      [sales],
    );

  const bestMonth =
    useMemo(() => {
      if (!sales.length) {
        return null;
      }

      return sales.reduce(
        (best, current) =>
          current.revenue >
          best.revenue
            ? current
            : best,
      );
    }, [sales]);

  const totalCustomerRevenue =
    useMemo(
      () =>
        topCustomers.reduce(
          (sum, customer) =>
            sum +
            customer.revenue,
          0,
        ),
      [topCustomers],
    );

  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    loading &&
    sales.length === 0
  ) {
    return (
      <View
        style={
          styles.centered
        }
      >
        <ActivityIndicator
          size="large"
          color={
            colors.primary
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading reports...
        </Text>
      </View>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (
    error &&
    sales.length === 0 &&
    !deals
  ) {
    return (
      <View
        style={
          styles.centered
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          Couldn't load reports
        </Text>

        <Text
          style={
            styles.errorText
          }
        >
          {error}
        </Text>

        <Pressable
          onPress={() =>
            loadReports()
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
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }

  /* ==========================================================
     MAIN
  ========================================================== */

  return (
    <ScrollView
      style={
        styles.container
      }
      contentContainerStyle={[
        styles.content,
        isSmallPhone &&
          styles.smallContent,
      ]}
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
            colors.primary
          }
          colors={[
            colors.primary,
          ]}
        />
      }
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <View
        style={
          styles.header
        }
      >
        <View
          style={
            styles.headerContent
          }
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            BUSINESS REPORTS
          </Text>

          <Text
            style={
              styles.title
            }
          >
            Performance
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Track revenue, deals and customers
          </Text>
        </View>

        <View
          style={
            styles.reportIcon
          }
        >
          <Text
            style={
              styles.reportIconText
            }
          >
            %
          </Text>
        </View>
      </View>

      {/* ======================================================
          ERROR BANNER
      ====================================================== */}

      {error ? (
        <View
          style={
            styles.warningBox
          }
        >
          <Text
            style={
              styles.warningText
            }
          >
            {error}
          </Text>
        </View>
      ) : null}

      {/* ======================================================
          QUICK SUMMARY
      ====================================================== */}

      <View
        style={
          styles.summaryGrid
        }
      >
        <View
          style={
            styles.summaryCard
          }
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            Revenue
          </Text>

          <Text
            style={
              styles.summaryValue
            }
          >
            {formatCompactCurrency(
              totalRevenue,
            )}
          </Text>

          <Text
            style={
              styles.summaryHint
            }
          >
            Last {sales.length || 6}{' '}
            months
          </Text>
        </View>

        <View
          style={
            styles.summaryCard
          }
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            Win rate
          </Text>

          <Text
            style={
              styles.summaryValue
            }
          >
            {deals
              ? `${deals.winRate}%`
              : '0%'}
          </Text>

          <Text
            style={
              styles.summaryHint
            }
          >
            Deal performance
          </Text>
        </View>
      </View>

      {/* ======================================================
          REVENUE
      ====================================================== */}

      <Card
        style={
          styles.sectionCard
        }
      >
        <View
          style={
            styles.cardHeader
          }
        >
          <View>
            <Text
              style={
                styles.cardTitle
              }
            >
              Revenue
            </Text>

            <Text
              style={
                styles.cardSubtitle
              }
            >
              Last {sales.length || 6}{' '}
              months
            </Text>
          </View>

          {bestMonth ? (
            <View
              style={
                styles.bestBadge
              }
            >
              <Text
                style={
                  styles.bestBadgeText
                }
              >
                Best{' '}
                {
                  MONTH_NAMES[
                    bestMonth.month -
                      1
                  ]
                }
              </Text>
            </View>
          ) : null}
        </View>

        {sales.length === 0 ? (
          <View
            style={
              styles.emptyChart
            }
          >
            <Text
              style={
                styles.emptyText
              }
            >
              No paid invoices yet
            </Text>

            <Text
              style={
                styles.emptySubtext
              }
            >
              Revenue will appear here once invoices are paid.
            </Text>
          </View>
        ) : (
          <View
            style={
              styles.chart
            }
          >
            {sales.map(
              (item, index) => {
                const barHeight =
                  Math.max(
                    8,
                    (item.revenue /
                      maxRevenue) *
                      92,
                  );

                return (
                  <View
                    key={`${item.month}-${index}`}
                    style={
                      styles.barColumn
                    }
                  >
                    <Text
                      style={
                        styles.barValue
                      }
                    >
                      {formatCompactCurrency(
                        item.revenue,
                      )}
                    </Text>

                    <View
                      style={
                        styles.barTrack
                      }
                    >
                      <View
                        style={[
                          styles.bar,
                          {
                            height:
                              barHeight,
                          },
                        ]}
                      />
                    </View>

                    <Text
                      style={
                        styles.barLabel
                      }
                    >
                      {
                        MONTH_NAMES[
                          item.month -
                            1
                        ]
                      }
                    </Text>
                  </View>
                );
              },
            )}
          </View>
        )}

        {sales.length > 0 ? (
          <View
            style={
              styles.chartFooter
            }
          >
            <Text
              style={
                styles.chartFooterLabel
              }
            >
              Total revenue
            </Text>

            <Text
              style={
                styles.chartFooterValue
              }
            >
              {formatCurrency(
                totalRevenue,
              )}
            </Text>
          </View>
        ) : null}
      </Card>

      {/* ======================================================
          DEAL PERFORMANCE
      ====================================================== */}

      <Card
        style={
          styles.sectionCard
        }
      >
        <View
          style={
            styles.cardHeader
          }
        >
          <View>
            <Text
              style={
                styles.cardTitle
              }
            >
              Deal performance
            </Text>

            <Text
              style={
                styles.cardSubtitle
              }
            >
              Sales pipeline results
            </Text>
          </View>
        </View>

        {deals ? (
          <View
            style={
              styles.dealStats
            }
          >
            <View
              style={
                styles.dealStat
              }
            >
              <Text
                style={
                  styles.dealStatValue
                }
              >
                {deals.winRate}%
              </Text>

              <Text
                style={
                  styles.dealStatLabel
                }
              >
                Win rate
              </Text>
            </View>

            <View
              style={
                styles.verticalDivider
              }
            />

            <View
              style={
                styles.dealStat
              }
            >
              <Text
                style={[
                  styles.dealStatValue,
                  styles.dealStatValueSmall,
                ]}
                numberOfLines={1}
              >
                {formatCompactCurrency(
                  deals.averageWonDealSize,
                )}
              </Text>

              <Text
                style={
                  styles.dealStatLabel
                }
              >
                Avg. won
              </Text>
            </View>

            <View
              style={
                styles.verticalDivider
              }
            />

            <View
              style={
                styles.dealStat
              }
            >
              <Text
                style={
                  styles.dealStatValue
                }
              >
                {deals.totalWon}
              </Text>

              <Text
                style={
                  styles.dealStatLabel
                }
              >
                Won
              </Text>
            </View>
          </View>
        ) : (
          <Text
            style={
              styles.emptyText
            }
          >
            No deal data available.
          </Text>
        )}
      </Card>

      {/* ======================================================
          LEAD CONVERSION
      ====================================================== */}

      <Card
        style={
          styles.sectionCard
        }
      >
        <View
          style={
            styles.cardHeader
          }
        >
          <View>
            <Text
              style={
                styles.cardTitle
              }
            >
              Lead conversion
            </Text>

            <Text
              style={
                styles.cardSubtitle
              }
            >
              Conversion by source
            </Text>
          </View>
        </View>

        {leadConversion.length ===
        0 ? (
          <View
            style={
              styles.emptyBlock
            }
          >
            <Text
              style={
                styles.emptyText
              }
            >
              Not enough closed leads yet
            </Text>

            <Text
              style={
                styles.emptySubtext
              }
            >
              Conversion data will appear after leads are closed.
            </Text>
          </View>
        ) : (
          leadConversion.map(
            (row, index) => (
              <View
                key={`${row.source}-${index}`}
                style={
                  styles.metricRow
                }
              >
                <View
                  style={
                    styles.metricLeft
                  }
                >
                  <View
                    style={
                      styles.sourceDot
                    }
                  />

                  <Text
                    style={
                      styles.metricName
                    }
                    numberOfLines={1}
                  >
                    {formatSource(
                      row.source,
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.metricRight
                  }
                >
                  <Text
                    style={
                      styles.metricValue
                    }
                  >
                    {
                      row.conversionRate
                    }
                    %
                  </Text>

                  <View
                    style={
                      styles.progressTrack
                    }
                  >
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              row.conversionRate,
                            ),
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ),
          )
        )}
      </Card>

      {/* ======================================================
          TOP CUSTOMERS
      ====================================================== */}

      <Card
        style={
          styles.sectionCard
        }
      >
        <View
          style={
            styles.cardHeader
          }
        >
          <View>
            <Text
              style={
                styles.cardTitle
              }
            >
              Top customers
            </Text>

            <Text
              style={
                styles.cardSubtitle
              }
            >
              By paid revenue
            </Text>
          </View>

          {topCustomers.length >
          0 ? (
            <Text
              style={
                styles.customerTotal
              }
            >
              {formatCompactCurrency(
                totalCustomerRevenue,
              )}
            </Text>
          ) : null}
        </View>

        {topCustomers.length ===
        0 ? (
          <View
            style={
              styles.emptyBlock
            }
          >
            <Text
              style={
                styles.emptyText
              }
            >
              No paid invoices yet
            </Text>

            <Text
              style={
                styles.emptySubtext
              }
            >
              Your highest-value customers will appear here.
            </Text>
          </View>
        ) : (
          topCustomers.map(
            (
              customer,
              index,
            ) => (
              <View
                key={
                  customer.customerId
                }
                style={
                  styles.customerRow
                }
              >
                <View
                  style={
                    styles.customerRank
                  }
                >
                  <Text
                    style={
                      styles.customerRankText
                    }
                  >
                    {index + 1}
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
                      styles.customerCaption
                    }
                  >
                    Customer #{index + 1}
                  </Text>
                </View>

                <Text
                  style={
                    styles.customerRevenue
                  }
                >
                  {formatCompactCurrency(
                    customer.revenue,
                  )}
                </Text>
              </View>
            ),
          )
        )}
      </Card>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <Text
        style={
          styles.footerText
        }
      >
        Pull down to refresh your reports
      </Text>
    </ScrollView>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles =
  createThemedStyles(() => StyleSheet.create({
    /* ========================================================
       CONTAINER
    ======================================================== */

    container: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    content: {
      padding:
        spacing.md,
      paddingBottom:
        spacing.xl * 2,
    },

    smallContent: {
      paddingHorizontal: 14,
    },

    centered: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.background,
      paddingHorizontal: 30,
    },

    loadingText: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },

    /* ========================================================
       HEADER
    ======================================================== */

    header: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom:
        spacing.md,
    },

    headerContent: {
      flex: 1,
      minWidth: 0,
    },

    eyebrow: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: colors.primary,
      marginBottom: 3,
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

    reportIcon: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor:
        colors.primary,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginLeft: spacing.sm,
    },

    reportIconText: {
      color: colors.textInverse,
      fontSize: 24,
      fontWeight: '600',
    },

    /* ========================================================
       WARNING
    ======================================================== */

    warningBox: {
      backgroundColor:
        colors.danger + '08',
      borderWidth: 1,
      borderColor:
        colors.danger + '25',
      borderRadius: 10,
      paddingHorizontal: 11,
      paddingVertical: 8,
      marginBottom:
        spacing.md,
    },

    warningText: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.danger,
    },

    /* ========================================================
       SUMMARY
    ======================================================== */

    summaryGrid: {
      flexDirection:
        'row',
      gap: 9,
      marginBottom:
        spacing.sm,
    },

    summaryCard: {
      flex: 1,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 15,
      padding: 13,
    },

    summaryLabel: {
      ...typography.small,
      color: colors.textMuted,
    },

    summaryValue: {
      ...typography.h2,
      color: colors.text,
      marginTop: 4,
      fontWeight: '700',
    },

    summaryHint: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 2,
    },

    /* ========================================================
       CARDS
    ======================================================== */

    sectionCard: {
      marginTop:
        spacing.sm,
    },

    cardHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom:
        spacing.sm,
    },

    cardTitle: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '700',
    },

    cardSubtitle: {
      ...typography.small,
      color: colors.textMuted,
      marginTop: 2,
    },

    bestBadge: {
      backgroundColor:
        colors.primaryLight,
      borderRadius:
        radius.full,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },

    bestBadgeText: {
      fontSize: 10,
      color: colors.primary,
      fontWeight: '700',
    },

    /* ========================================================
       REVENUE CHART
    ======================================================== */

    chart: {
      height: 145,
      flexDirection:
        'row',
      alignItems:
        'flex-end',
      justifyContent:
        'space-between',
      paddingTop: 10,
    },

    barColumn: {
      flex: 1,
      height: 140,
      alignItems:
        'center',
      justifyContent:
        'flex-end',
      marginHorizontal: 2,
    },

    barValue: {
      fontSize: 8,
      color: colors.textMuted,
      marginBottom: 3,
    },

    barTrack: {
      height: 98,
      width: 25,
      justifyContent:
        'flex-end',
      backgroundColor:
        colors.background,
      borderRadius: 7,
      overflow: 'hidden',
    },

    bar: {
      width: '100%',
      backgroundColor:
        colors.primary,
      borderRadius: 7,
    },

    barLabel: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 5,
    },

    emptyChart: {
      height: 110,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    emptyText: {
      ...typography.caption,
      color: colors.textMuted,
    },

    emptySubtext: {
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 3,
    },

    chartFooter: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
      marginTop: 10,
      paddingTop: 9,
    },

    chartFooterLabel: {
      ...typography.small,
      color: colors.textMuted,
    },

    chartFooterValue: {
      ...typography.bodyBold,
      color: colors.primary,
    },

    /* ========================================================
       DEAL STATS
    ======================================================== */

    dealStats: {
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingVertical: 6,
    },

    dealStat: {
      flex: 1,
      alignItems:
        'center',
      minWidth: 0,
    },

    dealStatValue: {
      ...typography.h3,
      color: colors.primary,
      fontWeight: '700',
    },

    dealStatValueSmall: {
      fontSize: 16,
    },

    dealStatLabel: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 3,
    },

    verticalDivider: {
      width: 1,
      height: 35,
      backgroundColor:
        colors.border,
    },

    /* ========================================================
       METRICS
    ======================================================== */

    metricRow: {
      minHeight: 48,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
    },

    metricLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection:
        'row',
      alignItems:
        'center',
      marginRight: 10,
    },

    sourceDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        colors.primary,
      marginRight: 8,
    },

    metricName: {
      ...typography.caption,
      color: colors.text,
      fontWeight: '600',
    },

    metricRight: {
      width: 100,
      alignItems:
        'flex-end',
    },

    metricValue: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '700',
      marginBottom: 4,
    },

    progressTrack: {
      width: 75,
      height: 4,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor:
        colors.background,
    },

    progressBar: {
      height: 4,
      borderRadius: 3,
      backgroundColor:
        colors.primary,
    },

    /* ========================================================
       CUSTOMERS
    ======================================================== */

    customerTotal: {
      ...typography.bodyBold,
      color: colors.primary,
    },

    customerRow: {
      minHeight: 55,
      flexDirection:
        'row',
      alignItems:
        'center',
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
    },

    customerRank: {
      width: 29,
      height: 29,
      borderRadius: 10,
      backgroundColor:
        colors.primaryLight,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 9,
    },

    customerRankText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '700',
    },

    customerInfo: {
      flex: 1,
      minWidth: 0,
    },

    customerName: {
      ...typography.caption,
      color: colors.text,
      fontWeight: '600',
    },

    customerCaption: {
      fontSize: 9,
      color: colors.textMuted,
      marginTop: 2,
    },

    customerRevenue: {
      ...typography.caption,
      color: colors.text,
      fontWeight: '700',
      marginLeft: 8,
    },

    emptyBlock: {
      paddingVertical: 12,
      alignItems:
        'center',
    },

    /* ========================================================
       ERROR
    ======================================================== */

    errorTitle: {
      ...typography.h3,
      color: colors.text,
      textAlign: 'center',
    },

    errorText: {
      ...typography.caption,
      color: colors.danger,
      textAlign: 'center',
      marginTop: 5,
    },

    retryButton: {
      marginTop: 14,
      paddingHorizontal: 17,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor:
        colors.primaryLight,
    },

    retryText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '600',
    },

    /* ========================================================
       FOOTER
    ======================================================== */

    footerText: {
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.md,
    },
  }));