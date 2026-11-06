import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Pressable,
  Alert,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getCustomer } from '@/api/customer.api';

import { Card } from '@/components/common/Card';

import { colors } from '@/theme/colors';

import {
  typography,
  spacing,
  radius,
} from '@/theme/typography';

import type { Customer } from '@/types';

import type { MainStackParamList } from '@/navigation/OwnerNavigator';

import { createThemedStyles } from '@/theme/themeStore';
type Props = NativeStackScreenProps<
  MainStackParamList,
  'CustomerDetail'
>;

/* ============================================================
   HELPERS
============================================================ */

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

/* ============================================================
   SCREEN
============================================================ */

export function CustomerDetailScreen({
  route,
  navigation,
}: Props) {
  const { customerId } = route.params;

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /* ==========================================================
     LOAD CUSTOMER
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    getCustomer(customerId)
      .then(data => {
        if (!cancelled) {
          setCustomer(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Couldn't load this customer.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  /* ==========================================================
     HEADER ACTIONS
  ========================================================== */

  useEffect(() => {
    if (!customer) {
      return;
    }

    navigation.setOptions({
      title: 'Customer',

      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() =>
              navigation.navigate(
                'InvoiceForm',
                {
                  customerId:
                    customer.id,
                  customerName:
                    customer.name,
                },
              )
            }
            hitSlop={8}
            style={styles.headerButton}
          >
            <Text
              style={styles.headerButtonText}
            >
              Invoice
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              navigation.navigate(
                'CustomerForm',
                {
                  customer,
                },
              )
            }
            hitSlop={8}
            style={styles.headerButton}
          >
            <Text
              style={styles.headerButtonText}
            >
              Edit
            </Text>
          </Pressable>
        </View>
      ),
    });
  }, [customer, navigation]);

  /* ==========================================================
     ACTIONS
  ========================================================== */

  async function handleCall() {
    if (!customer?.phone) {
      return;
    }

    try {
      await Linking.openURL(
        `tel:${customer.phone}`,
      );
    } catch {
      Alert.alert(
        'Unable to call',
        'This device cannot make phone calls.',
      );
    }
  }

  async function handleEmail() {
    if (!customer?.email) {
      return;
    }

    try {
      await Linking.openURL(
        `mailto:${customer.email}`,
      );
    } catch {
      Alert.alert(
        'Unable to email',
        'No email application is available.',
      );
    }
  }

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.loadingBox}>
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />
          <Text
            style={styles.loadingText}
          >
            Loading customer...
          </Text>
        </View>
      </View>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (error || !customer) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorIcon}>
          <Text
            style={styles.errorIconText}
          >
            !
          </Text>
        </View>

        <Text
          style={styles.errorTitle}
        >
          Customer unavailable
        </Text>

        <Text
          style={styles.errorText}
        >
          {error ??
            'Customer not found.'}
        </Text>

        <Pressable
          onPress={() =>
            navigation.goBack()
          }
          style={styles.backButton}
        >
          <Text
            style={styles.backButtonText}
          >
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  const initials = getInitials(
    customer.name,
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.content
        }
      >
        {/* ====================================================
            CUSTOMER HEADER
        ==================================================== */}

        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text
                style={styles.avatarText}
              >
                {initials}
              </Text>
            </View>

            <View
              style={styles.profileInfo}
            >
              <Text
                style={styles.profileLabel}
              >
                CUSTOMER
              </Text>

              <Text
                style={styles.name}
                numberOfLines={2}
              >
                {customer.name}
              </Text>

              <Text
                style={styles.customerId}
                numberOfLines={1}
              >
                Customer ID · {customer.id}
              </Text>
            </View>
          </View>

          {/* ==================================================
              QUICK CONTACT
          ================================================== */}

          {(customer.phone ||
            customer.email) && (
            <View
              style={styles.quickActions}
            >
              {customer.phone && (
                <Pressable
                  onPress={handleCall}
                  style={styles.quickAction}
                >
                  <View
                    style={[
                      styles.quickIcon,
                      {
                        backgroundColor:
                          colors.success +
                          '12',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickIconText,
                        {
                          color:
                            colors.success,
                        },
                      ]}
                    >
                      ☎
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.quickLabel
                    }
                  >
                    Call
                  </Text>
                </Pressable>
              )}

              {customer.email && (
                <Pressable
                  onPress={handleEmail}
                  style={styles.quickAction}
                >
                  <View
                    style={[
                      styles.quickIcon,
                      {
                        backgroundColor:
                          colors.primaryLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickIconText,
                        {
                          color:
                            colors.primary,
                        },
                      ]}
                    >
                      @
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.quickLabel
                    }
                  >
                    Email
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() =>
                  navigation.navigate(
                    'InvoiceForm',
                    {
                      customerId:
                        customer.id,
                      customerName:
                        customer.name,
                    },
                  )
                }
                style={styles.quickAction}
              >
                <View
                  style={[
                    styles.quickIcon,
                    {
                      backgroundColor:
                        colors.warning +
                        '12',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickIconText,
                      {
                        color:
                          colors.warning,
                      },
                    ]}
                  >
                    ₹
                  </Text>
                </View>

                <Text
                  style={
                    styles.quickLabel
                  }
                >
                  Invoice
                </Text>
              </Pressable>
            </View>
          )}
        </Card>

        {/* ====================================================
            CONTACT INFORMATION
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
                CONTACT
              </Text>

              <Text
                style={styles.sectionTitle}
              >
                Contact information
              </Text>
            </View>
          </View>

          {customer.phone && (
            <Pressable
              onPress={handleCall}
              style={styles.infoRow}
            >
              <View
                style={[
                  styles.infoIcon,
                  {
                    backgroundColor:
                      colors.success +
                      '12',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.infoIconText,
                    {
                      color:
                        colors.success,
                    },
                  ]}
                >
                  ☎
                </Text>
              </View>

              <View
                style={styles.infoContent}
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Phone
                </Text>

                <Text
                  style={
                    styles.infoValueLink
                  }
                >
                  {customer.phone}
                </Text>
              </View>

              <Text
                style={styles.chevron}
              >
                ›
              </Text>
            </Pressable>
          )}

          {customer.email && (
            <Pressable
              onPress={handleEmail}
              style={[
                styles.infoRow,
                customer.phone &&
                  styles.infoRowBorder,
              ]}
            >
              <View
                style={[
                  styles.infoIcon,
                  {
                    backgroundColor:
                      colors.primaryLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.infoIconText,
                    {
                      color:
                        colors.primary,
                    },
                  ]}
                >
                  @
                </Text>
              </View>

              <View
                style={styles.infoContent}
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Email
                </Text>

                <Text
                  style={
                    styles.infoValueLink
                  }
                  numberOfLines={1}
                >
                  {customer.email}
                </Text>
              </View>

              <Text
                style={styles.chevron}
              >
                ›
              </Text>
            </Pressable>
          )}

          {!customer.phone &&
            !customer.email && (
              <Text
                style={styles.emptyText}
              >
                No contact information
                available.
              </Text>
            )}
        </Card>

        {/* ====================================================
            BUSINESS INFORMATION
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
                BUSINESS
              </Text>

              <Text
                style={styles.sectionTitle}
              >
                Customer details
              </Text>
            </View>
          </View>

          {customer.address && (
            <View style={styles.detailRow}>
              <View
                style={[
                  styles.detailIcon,
                  {
                    backgroundColor:
                      colors.primaryLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.detailIconText,
                    {
                      color:
                        colors.primary,
                    },
                  ]}
                >
                  ◆
                </Text>
              </View>

              <View
                style={styles.detailContent}
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Address
                </Text>

                <Text
                  style={
                    styles.detailValue
                  }
                >
                  {customer.address}
                </Text>
              </View>
            </View>
          )}

          {customer.gstin && (
            <View
              style={[
                styles.detailRow,
                customer.address &&
                  styles.infoRowBorder,
              ]}
            >
              <View
                style={[
                  styles.detailIcon,
                  {
                    backgroundColor:
                      colors.warning +
                      '12',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.detailIconText,
                    {
                      color:
                        colors.warning,
                    },
                  ]}
                >
                  #
                </Text>
              </View>

              <View
                style={styles.detailContent}
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  GSTIN
                </Text>

                <Text
                  style={
                    styles.detailValue
                  }
                >
                  {customer.gstin}
                </Text>
              </View>
            </View>
          )}

          {!customer.address &&
            !customer.gstin && (
              <Text
                style={styles.emptyText}
              >
                No additional business
                details available.
              </Text>
            )}
        </Card>

        {/* ====================================================
            NOTES
        ==================================================== */}

        {customer.notes && (
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
                  INTERNAL
                </Text>

                <Text
                  style={styles.sectionTitle}
                >
                  Notes
                </Text>
              </View>
            </View>

            <View
              style={styles.notesBox}
            >
              <Text
                style={styles.notes}
              >
                {customer.notes}
              </Text>
            </View>
          </Card>
        )}

        {/* ====================================================
            MAIN ACTIONS
        ==================================================== */}

        <View
          style={styles.actionSection}
        >
          <Pressable
            onPress={() =>
              navigation.navigate(
                'InvoiceForm',
                {
                  customerId:
                    customer.id,
                  customerName:
                    customer.name,
                },
              )
            }
            style={styles.primaryAction}
          >
            <Text
              style={
                styles.primaryActionIcon
              }
            >
              +
            </Text>

            <View
              style={styles.actionTextBox}
            >
              <Text
                style={
                  styles.primaryActionTitle
                }
              >
                Create invoice
              </Text>

              <Text
                style={
                  styles.primaryActionSubtitle
                }
              >
                Create a new invoice for
                this customer
              </Text>
            </View>

            <Text
              style={
                styles.primaryActionChevron
              }
            >
              ›
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              navigation.navigate(
                'CustomerForm',
                {
                  customer,
                },
              )
            }
            style={styles.secondaryAction}
          >
            <Text
              style={
                styles.secondaryActionIcon
              }
            >
              ✎
            </Text>

            <Text
              style={
                styles.secondaryActionText
              }
            >
              Edit customer
            </Text>

            <Text
              style={
                styles.secondaryActionChevron
              }
            >
              ›
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text
            style={styles.footerText}
          >
            Customer profile
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
    paddingHorizontal:
      spacing.lg,
  },

  /* ==========================================================
     LOADING
  ========================================================== */

  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  /* ==========================================================
     ERROR
  ========================================================== */

  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor:
      colors.danger + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  errorIconText: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: '800',
  },

  errorTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },

  errorText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  backButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor:
      colors.primary,
  },

  backButtonText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  headerButton: {
    paddingHorizontal: 2,
    paddingVertical: 4,
  },

  headerButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },

  /* ==========================================================
     PROFILE
  ========================================================== */

  profileCard: {
    padding: spacing.md,
  },

  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor:
      colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },

  profileInfo: {
    flex: 1,
  },

  profileLabel: {
    fontSize: 8,
    lineHeight: 11,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },

  name: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },

  customerId: {
    fontSize: 8,
    lineHeight: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* ==========================================================
     QUICK ACTIONS
  ========================================================== */

  quickActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor:
      colors.border,
  },

  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  quickIconText: {
    fontSize: 14,
    fontWeight: '800',
  },

  quickLabel: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.text,
    fontWeight: '600',
  },

  /* ==========================================================
     SECTIONS
  ========================================================== */

  section: {
    marginTop: spacing.sm,
  },

  sectionHeader: {
    marginBottom: spacing.xs,
  },

  sectionEyebrow: {
    fontSize: 8,
    lineHeight: 11,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 2,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },

  /* ==========================================================
     INFO ROWS
  ========================================================== */

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor:
      colors.border,
  },

  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  infoIconText: {
    fontSize: 13,
    fontWeight: '800',
  },

  infoContent: {
    flex: 1,
    marginRight: spacing.sm,
  },

  infoLabel: {
    fontSize: 8,
    lineHeight: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },

  infoValueLink: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },

  chevron: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.textMuted,
  },

  /* ==========================================================
     BUSINESS DETAILS
  ========================================================== */

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },

  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  detailIconText: {
    fontSize: 11,
    fontWeight: '800',
  },

  detailContent: {
    flex: 1,
  },

  detailValue: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
  },

  /* ==========================================================
     NOTES
  ========================================================== */

  notesBox: {
    backgroundColor:
      colors.background,
    borderRadius: 10,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },

  notes: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 18,
  },

  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },

  /* ==========================================================
     ACTIONS
  ========================================================== */

  actionSection: {
    marginTop: spacing.md,
  },

  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      colors.primary,
    borderRadius: 13,
    padding: spacing.sm,
  },

  primaryActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor:
      'rgba(255,255,255,0.18)',
    color: colors.textInverse,
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 9,
  },

  actionTextBox: {
    flex: 1,
  },

  primaryActionTitle: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textInverse,
    fontWeight: '800',
  },

  primaryActionSubtitle: {
    fontSize: 8,
    lineHeight: 12,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 1,
  },

  primaryActionChevron: {
    color: colors.textInverse,
    fontSize: 23,
    marginLeft: 5,
  },

  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      colors.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor:
      colors.border,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },

  secondaryActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor:
      colors.primaryLight,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 31,
    fontSize: 14,
    fontWeight: '800',
    marginRight: 9,
  },

  secondaryActionText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },

  secondaryActionChevron: {
    fontSize: 22,
    color: colors.textMuted,
  },

  /* ==========================================================
     FOOTER
  ========================================================== */

  footer: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },

  footerText: {
    fontSize: 8,
    color: colors.textMuted,
  },
}));