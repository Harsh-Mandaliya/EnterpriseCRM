import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { listCustomers } from '@/api/customer.api';
import { TextField } from '@/components/common/TextField';

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
  'CustomerList'
>;

/* ============================================================
   CUSTOMER LIST SCREEN
============================================================ */

export function CustomerListScreen({
  navigation,
}: Props) {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [search, setSearch] =
    useState('');

  const [page, setPage] =
    useState(1);

  const [totalPages, setTotalPages] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* ==========================================================
     LOAD CUSTOMERS
  ========================================================== */

  const load = useCallback(
    async (
      pageToLoad: number,
      searchTerm: string,
      append: boolean,
    ) => {
      try {
        setError(null);

        const data = await listCustomers({
          page: pageToLoad,
          pageSize: 20,
          search:
            searchTerm.trim() ||
            undefined,
        });

        setCustomers(prev =>
          append
            ? [
                ...prev,
                ...data.items,
              ]
            : data.items,
        );

        setTotalPages(
          data.pagination.totalPages,
        );

        setPage(
          data.pagination.page,
        );
      } catch (err: any) {
        setError(
          err?.response?.data?.error ??
            "Couldn't load customers.",
        );
      }
    },
    [],
  );

  /* ==========================================================
     SEARCH
  ========================================================== */

  // Reload after returning from the customer form.
  useRefreshOnFocus(() => load(1, search, false));

  useEffect(() => {
    setLoading(true);

    const timeout = setTimeout(() => {
      load(
        1,
        search,
        false,
      ).finally(() =>
        setLoading(false),
      );
    }, 300);

    return () =>
      clearTimeout(timeout);
  }, [search, load]);

  /* ==========================================================
     REFRESH
  ========================================================== */

  function handleRefresh() {
    setRefreshing(true);

    load(
      1,
      search,
      false,
    ).finally(() =>
      setRefreshing(false),
    );
  }

  /* ==========================================================
     LOAD MORE
  ========================================================== */

  function handleLoadMore() {
    if (
      loadingMore ||
      page >= totalPages
    ) {
      return;
    }

    setLoadingMore(true);

    load(
      page + 1,
      search,
      true,
    ).finally(() =>
      setLoadingMore(false),
    );
  }

  /* ==========================================================
     OPEN CUSTOMER
  ========================================================== */

  function openCustomer(
    customer: Customer,
  ) {
    navigation.navigate(
      'CustomerDetail',
      {
        customerId:
          customer.id,
        customerName:
          customer.name,
      },
    );
  }

  /* ==========================================================
     EMPTY / ERROR
  ========================================================== */

  function renderEmpty() {
    if (loading) {
      return null;
    }

    if (error) {
      return (
        <View
          style={
            styles.emptyContainer
          }
        >
          <View
            style={styles.emptyIcon}
          >
            <Text
              style={
                styles.emptyIconText
              }
            >
              !
            </Text>
          </View>

          <Text
            style={
              styles.emptyTitle
            }
          >
            Couldn't load customers
          </Text>

          <Text
            style={
              styles.emptySubtitle
            }
          >
            {error}
          </Text>

          <Pressable
            onPress={() => {
              setLoading(true);

              load(
                1,
                search,
                false,
              ).finally(() =>
                setLoading(false),
              );
            }}
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

    return (
      <View
        style={
          styles.emptyContainer
        }
      >
        <View
          style={styles.emptyIcon}
        >
          <Text
            style={
              styles.emptyIconText
            }
          >
            +
          </Text>
        </View>

        <Text
          style={
            styles.emptyTitle
          }
        >
          No customers found
        </Text>

        <Text
          style={
            styles.emptySubtitle
          }
        >
          {search.trim()
            ? 'Try a different search.'
            : 'Add your first customer to get started.'}
        </Text>

        {!search.trim() && (
          <Pressable
            onPress={() =>
              navigation.navigate(
                'CustomerForm',
                {},
              )
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
              Add customer
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  /* ==========================================================
     CUSTOMER ROW
  ========================================================== */

  function renderCustomer({
    item,
  }: {
    item: Customer;
  }) {
    const initial =
      item.name
        ?.charAt(0)
        .toUpperCase() || '?';

    const secondary =
      item.phone ??
      item.email ??
      'No contact information';

    return (
      <Pressable
        onPress={() =>
          openCustomer(item)
        }
        style={({ pressed }) => [
          styles.customerRow,
          pressed &&
            styles.customerRowPressed,
        ]}
      >
        {/* Avatar */}

        <View
          style={styles.avatar}
        >
          <Text
            style={
              styles.avatarText
            }
          >
            {initial}
          </Text>
        </View>

        {/* Customer information */}

        <View
          style={
            styles.customerContent
          }
        >
          <Text
            style={
              styles.customerName
            }
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <Text
            style={
              styles.customerContact
            }
            numberOfLines={1}
          >
            {secondary}
          </Text>

          {item.gstin ? (
            <Text
              style={
                styles.customerMeta
              }
              numberOfLines={1}
            >
              GSTIN: {item.gstin}
            </Text>
          ) : null}
        </View>

        {/* Arrow */}

        <View
          style={
            styles.arrowContainer
          }
        >
          <Text
            style={
              styles.arrow
            }
          >
            ›
          </Text>
        </View>
      </Pressable>
    );
  }

  /* ==========================================================
     HEADER
  ========================================================== */

  function renderHeader() {
    return (
      <View>
        <View
          style={styles.pageHeader}
        >
          <View
            style={styles.headerIcon}
          >
            <Text
              style={
                styles.headerIconText
              }
            >
              C
            </Text>
          </View>

          <View
            style={
              styles.headerContent
            }
          >
            <Text
              style={styles.eyebrow}
            >
              CRM
            </Text>

            <Text
              style={styles.pageTitle}
            >
              Customers
            </Text>

            <Text
              style={
                styles.pageSubtitle
              }
            >
              Manage your customer relationships
            </Text>
          </View>

          <View
            style={
              styles.countBadge
            }
          >
            <Text
              style={
                styles.countText
              }
            >
              {customers.length}
            </Text>
          </View>
        </View>

        {/* Search */}

        <View
          style={
            styles.searchCard
          }
        >
          <Text
            style={
              styles.searchIcon
            }
          >
            ⌕
          </Text>

          <View
            style={
              styles.searchField
            }
          >
            <TextField
              label=""
              value={search}
              onChangeText={
                setSearch
              }
              placeholder="Search customers..."
              style={
                styles.searchInput
              }
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {search.length > 0 && (
            <Pressable
              onPress={() =>
                setSearch('')
              }
              style={
                styles.clearButton
              }
              hitSlop={8}
            >
              <Text
                style={
                  styles.clearText
                }
              >
                ×
              </Text>
            </Pressable>
          )}
        </View>

        {/* Result information */}

        {!loading &&
          customers.length > 0 && (
            <View
              style={
                styles.resultRow
              }
            >
              <Text
                style={
                  styles.resultText
                }
              >
                {search.trim()
                  ? `Results for "${search.trim()}"`
                  : `${customers.length} customer${
                      customers.length ===
                      1
                        ? ''
                        : 's'
                    }`}
              </Text>

              {totalPages > 1 && (
                <Text
                  style={
                    styles.pageText
                  }
                >
                  Page {page} of{' '}
                  {totalPages}
                </Text>
              )}
            </View>
          )}
      </View>
    );
  }

  /* ==========================================================
     MAIN UI
  ========================================================== */

  return (
    <View
      style={styles.container}
    >
      {loading ? (
        <View
          style={
            styles.loadingContainer
          }
        >
          {renderHeader()}

          <ActivityIndicator
            style={
              styles.loader
            }
            color={
              colors.primary
            }
            size="small"
          />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={item =>
            item.id
          }
          renderItem={
            renderCustomer
          }
          ListHeaderComponent={
            renderHeader
          }
          ListEmptyComponent={
            renderEmpty
          }
          contentContainerStyle={
            styles.list
          }
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
            />
          }
          onEndReached={
            handleLoadMore
          }
          onEndReachedThreshold={
            0.4
          }
          ListFooterComponent={
            loadingMore ? (
              <View
                style={
                  styles.footerLoader
                }
              >
                <ActivityIndicator
                  color={
                    colors.primary
                }
                  size="small"
                />
                <Text
                  style={
                    styles.footerText
                  }
                >
                  Loading more...
                </Text>
              </View>
            ) : customers.length >
              0 &&
              page >=
                totalPages ? (
              <Text
                style={
                  styles.endText
                }
              >
                You've reached the end
              </Text>
            ) : undefined
          }
        />
      )}

      {/* ======================================================
          ADD CUSTOMER
      ====================================================== */}

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed &&
            styles.fabPressed,
        ]}
        onPress={() =>
          navigation.navigate(
            'CustomerForm',
            {},
          )
        }
        accessibilityLabel="Add customer"
      >
        <Text
          style={styles.fabText}
        >
          +
        </Text>
      </Pressable>
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

  loadingContainer: {
    flex: 1,
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal:
      spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor:
      colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  headerIconText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },

  headerContent: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 8,
    lineHeight: 11,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 1,
  },

  pageTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    lineHeight: 27,
  },

  pageSubtitle: {
    fontSize: 9,
    lineHeight: 13,
    color: colors.textMuted,
    marginTop: 1,
  },

  countBadge: {
    minWidth: 36,
    height: 36,
    paddingHorizontal:
      spacing.sm,
    borderRadius: 12,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },

  /* ==========================================================
     SEARCH
  ========================================================== */

  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal:
      spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal:
      spacing.sm,
    height: 48,
    borderRadius: 13,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
  },

  searchIcon: {
    fontSize: 21,
    color: colors.textMuted,
    width: 26,
    textAlign: 'center',
  },

  searchField: {
    flex: 1,
  },

  searchInput: {
    marginBottom: 0,
  },

  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor:
      colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearText: {
    fontSize: 19,
    lineHeight: 21,
    color: colors.textMuted,
  },

  /* ==========================================================
     RESULT INFO
  ========================================================== */

  resultRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    paddingHorizontal:
      spacing.md,
    marginBottom: spacing.xs,
  },

  resultText: {
    ...typography.small,
    color: colors.textMuted,
  },

  pageText: {
    ...typography.small,
    color: colors.textMuted,
  },

  /* ==========================================================
     LIST
  ========================================================== */

  list: {
    paddingBottom:
      spacing.xl * 2,
  },

  /* ==========================================================
     CUSTOMER ROW
  ========================================================== */

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal:
      spacing.md,
    marginBottom: 7,
    paddingHorizontal:
      spacing.sm,
    paddingVertical:
      spacing.sm,
    minHeight: 68,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 13,
  },

  customerRowPressed: {
    opacity: 0.75,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor:
      colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  avatarText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },

  customerContent: {
    flex: 1,
    minWidth: 0,
  },

  customerName: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 13,
  },

  customerContact: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 10,
  },

  customerMeta: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 8,
  },

  arrowContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrow: {
    fontSize: 25,
    lineHeight: 27,
    color: colors.textMuted,
  },

  /* ==========================================================
     LOADING
  ========================================================== */

  loader: {
    marginTop: spacing.lg,
  },

  footerLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },

  footerText: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 4,
  },

  endText: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical:
      spacing.md,
  },

  /* ==========================================================
     EMPTY
  ========================================================== */

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal:
      spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom:
      spacing.xl,
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor:
      colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  emptyIconText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },

  emptyTitle: {
    ...typography.bodyBold,
    color: colors.text,
    textAlign: 'center',
  },

  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal:
      spacing.md,
    paddingVertical:
      spacing.xs,
    borderRadius:
      radius.full,
    backgroundColor:
      colors.primary,
  },

  retryText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },

  /* ==========================================================
     FAB
  ========================================================== */

  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  fabPressed: {
    transform: [
      {
        scale: 0.94,
      },
    ],
    opacity: 0.9,
  },

  fabText: {
    color: colors.textInverse,
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '400',
  },
}));