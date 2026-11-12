import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
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
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';

import {
  listProducts,
  createProduct,
} from '@/api/products.api';

import {
  TextField,
} from '@/components/common/TextField';

import {
  Button,
} from '@/components/common/Button';

import {
  colors,
} from '@/theme/colors';

import {
  typography,
  spacing,
  radius,
} from '@/theme/typography';

import type {
  Product,
} from '@/types';

import { createThemedStyles } from '@/theme/themeStore';
import { useCan } from '@/utils/permissions';
/* ============================================================
   SCREEN
============================================================ */

export function ProductListScreen() {
  // EMPLOYEE can view the catalogue but not change it (server returns 403).
  const canManage = useCan('product.manage');
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [items, setItems] = useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [modalVisible, setModalVisible] =
    useState(false);

  const [search, setSearch] =
    useState('');

  /* ==========================================================
     FORM
  ========================================================== */

  const [name, setName] =
    useState('');

  const [price, setPrice] =
    useState('');

  const [category, setCategory] =
    useState('');

  const [stockQty, setStockQty] =
    useState('');

  const [creating, setCreating] =
    useState(false);

  const [formError, setFormError] =
    useState<string | null>(null);

  /* ==========================================================
     LOAD PRODUCTS
  ========================================================== */

  const load = useCallback(
    async () => {
      try {
        setLoading(true);

        const data =
          await listProducts();

        setItems(data);
      } catch {
        // Keep the existing list if refresh fails.
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Reload after returning from a create/edit form.
  useRefreshOnFocus(() => load());

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh =
    useCallback(async () => {
      try {
        setRefreshing(true);

        const data =
          await listProducts();

        setItems(data);
      } finally {
        setRefreshing(false);
      }
    }, []);

  /* ==========================================================
     SEARCH
  ========================================================== */

  const filteredItems =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return items;
      }

      return items.filter(
        product =>
          product.name
            .toLowerCase()
            .includes(query) ||
          product.category
            ?.toLowerCase()
            .includes(query),
      );
    }, [
      items,
      search,
    ]);

  /* ==========================================================
     FORM RESET
  ========================================================== */

/* ==========================================================
     OPEN MODAL
  ========================================================== */

  function openCreateModal() {
    navigation.navigate('ProductForm');
  }

  /* ==========================================================
     CLOSE MODAL
  ========================================================== */

/* ==========================================================
     CREATE PRODUCT
  ========================================================== */

/* ==========================================================
     STOCK STATUS
  ========================================================== */

  function getStockStatus(
    quantity: number,
  ) {
    if (quantity <= 0) {
      return {
        label: 'Out of stock',
        color: colors.danger,
        background:
          colors.danger + '12',
      };
    }

    if (quantity <= 10) {
      return {
        label: 'Low stock',
        color:
          colors.status.contacted,
        background:
          colors.status.contacted +
          '12',
      };
    }

    return {
      label: 'In stock',
      color: colors.success,
      background:
        colors.success + '12',
    };
  }

  /* ==========================================================
     RENDER PRODUCT
  ========================================================== */

  function renderProduct({
    item,
  }: {
    item: Product;
  }) {
    const stock =
      getStockStatus(
        Number(item.stockQty || 0),
      );

    return (
      <View
        style={
          styles.productCard
        }
      >
        {/* ====================================================
            PRODUCT ICON
        ==================================================== */}

        <View
          style={
            styles.productIcon
          }
        >
          <Text
            style={
              styles.productIconText
            }
          >
            P
          </Text>
        </View>

        {/* ====================================================
            PRODUCT INFORMATION
        ==================================================== */}

        <View
          style={
            styles.productContent
          }
        >
          <Text
            style={
              styles.productName
            }
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <Text
            style={
              styles.productCategory
            }
            numberOfLines={1}
          >
            {item.category ??
              'Uncategorized'}
          </Text>

          <View
            style={
              styles.productBottom
            }
          >
            <Text
              style={
                styles.stockText
              }
            >
              Stock: {item.stockQty}
            </Text>

            <View
              style={[
                styles.stockBadge,
                {
                  backgroundColor:
                    stock.background,
                },
              ]}
            >
              <Text
                style={[
                  styles.stockBadgeText,
                  {
                    color:
                      stock.color,
                  },
                ]}
              >
                {stock.label}
              </Text>
            </View>
          </View>
        </View>

        {/* ====================================================
            PRICE
        ==================================================== */}

        <View
          style={
            styles.priceContainer
          }
        >
          <Text
            style={
              styles.price
            }
          >
            ₹
            {Number(
              item.price || 0,
            ).toLocaleString(
              'en-IN',
              {
                maximumFractionDigits: 0,
              },
            )}
          </Text>

          <Text
            style={
              styles.priceLabel
            }
          >
            Price
          </Text>
        </View>
      </View>
    );
  }

  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    loading &&
    items.length === 0
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
          Loading products...
        </Text>
      </View>
    );
  }

  /* ==========================================================
     MAIN UI
  ========================================================== */

  return (
    <View
      style={
        styles.container
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
              styles.headerTitle
            }
          >
            Products
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Manage your products and inventory
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
            {items.length}
          </Text>
        </View>
      </View>

      {/* ======================================================
          SEARCH
      ====================================================== */}

      <View
        style={
          styles.searchContainer
        }
      >
        <Text
          style={
            styles.searchIcon
          }
        >
          ⌕
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search products..."
          placeholderTextColor={
            colors.textMuted
          }
          style={
            styles.searchInput
          }
          returnKeyType="search"
        />

        {search.length > 0 ? (
          <Pressable
            onPress={() =>
              setSearch('')
            }
            style={
              styles.clearButton
            }
          >
            <Text
              style={
                styles.clearText
              }
            >
              ×
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <View
        style={
          styles.summaryRow
        }
      >
        <View
          style={
            styles.summaryCard
          }
        >
          <View
            style={[
              styles.summaryIcon,
              {
                backgroundColor:
                  colors.primary +
                  '12',
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
              P
            </Text>
          </View>

          <View>
            <Text
              style={
                styles.summaryLabel
              }
            >
              Products
            </Text>

            <Text
              style={
                styles.summaryValue
              }
            >
              {items.length}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.summaryCard
          }
        >
          <View
            style={[
              styles.summaryIcon,
              {
                backgroundColor:
                  colors.success +
                  '12',
              },
            ]}
          >
            <Text
              style={[
                styles.summaryIconText,
                {
                  color:
                    colors.success,
                },
              ]}
            >
              ✓
            </Text>
          </View>

          <View>
            <Text
              style={
                styles.summaryLabel
              }
            >
              In stock
            </Text>

            <Text
              style={
                styles.summaryValue
              }
            >
              {
                items.filter(
                  product =>
                    Number(
                      product.stockQty ||
                        0,
                    ) > 0,
                ).length
              }
            </Text>
          </View>
        </View>
      </View>

      {/* ======================================================
          LIST
      ====================================================== */}

      <FlatList
        data={filteredItems}
        keyExtractor={
          item => item.id
        }
        renderItem={
          renderProduct
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.list
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
        ListHeaderComponent={
          filteredItems.length > 0 ? (
            <View
              style={
                styles.listHeader
              }
            >
              <Text
                style={
                  styles.listTitle
                }
              >
                Product list
              </Text>

              <Text
                style={
                  styles.listCount
                }
              >
                {filteredItems.length}
              </Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <View
            style={
              styles.emptyContainer
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Text
                style={
                  styles.emptyIconText
                }
              >
                P
              </Text>
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              {search
                ? 'No products found'
                : 'No products yet'}
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              {search
                ? 'Try a different product or category.'
                : canManage
                  ? 'Add your first product to start managing inventory.'
                  : 'Products added by your team will appear here.'}
            </Text>

            {!search && canManage ? (
              <Pressable
                onPress={
                  openCreateModal
                }
                style={({ pressed }) => [
                  styles.emptyButton,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={
                    styles.emptyButtonText
                  }
                >
                  Add product
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
      />

      {/* ======================================================
          FAB
      ====================================================== */}

      {canManage ? (
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed &&
            styles.fabPressed,
        ]}
        onPress={
          openCreateModal
        }
        accessibilityLabel="Add product"
      >
        <Text
          style={
            styles.fabText
          }
        >
          +
        </Text>
      </Pressable>
      ) : null}

      {/* ======================================================
          CREATE PRODUCT MODAL
      ====================================================== */}

      {/* Creation moved to its own screen (TaskForm / ProductForm). */}
    </View>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = createThemedStyles(() => StyleSheet.create({
  /* ==========================================================
     BASE
  ========================================================== */

  container: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent:
      'center',
    backgroundColor:
      colors.background,
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
    minHeight: 76,
    paddingHorizontal:
      spacing.md,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
  },

  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  countBadge: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent:
      'center',
    marginLeft: 10,
  },

  countText: {
    color: colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
  },

  /* ==========================================================
     SEARCH
  ========================================================== */

  searchContainer: {
    height: 46,
    marginHorizontal:
      spacing.md,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  searchIcon: {
    color: colors.textMuted,
    fontSize: 23,
    marginRight: 7,
  },

  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },

  clearButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  clearText: {
    color: colors.textMuted,
    fontSize: 24,
    lineHeight: 24,
  },

  /* ==========================================================
     SUMMARY
  ========================================================== */

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal:
      spacing.md,
    gap: spacing.sm,
    marginBottom: 4,
  },

  summaryCard: {
    flex: 1,
    minHeight: 68,
    borderRadius: 15,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent:
      'center',
    marginRight: 9,
  },

  summaryIconText: {
    fontSize: 16,
    fontWeight: '700',
  },

  summaryLabel: {
    ...typography.small,
    color: colors.textMuted,
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },

  /* ==========================================================
     LIST
  ========================================================== */

  list: {
    paddingHorizontal:
      spacing.md,
    paddingTop: 9,
    paddingBottom:
      spacing.xl * 3,
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 8,
  },

  listTitle: {
    ...typography.h3,
    color: colors.text,
  },

  listCount: {
    ...typography.small,
    color: colors.textMuted,
  },

  /* ==========================================================
     PRODUCT CARD
  ========================================================== */

  productCard: {
    minHeight: 83,
    backgroundColor:
      colors.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor:
      colors.border,
    padding: 11,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  productIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor:
      colors.primary + '12',
    alignItems: 'center',
    justifyContent:
      'center',
    marginRight: 10,
  },

  productIconText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },

  productContent: {
    flex: 1,
    minWidth: 0,
  },

  productName: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 15,
  },

  productCategory: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },

  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  stockText: {
    ...typography.small,
    color: colors.textMuted,
  },

  stockBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius:
      radius.full,
    marginLeft: 7,
  },

  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* ==========================================================
     PRICE
  ========================================================== */

  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },

  price: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 16,
  },

  priceLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 1,
  },

  /* ==========================================================
     EMPTY
  ========================================================== */

  emptyContainer: {
    alignItems: 'center',
    justifyContent:
      'center',
    paddingHorizontal: 35,
    paddingTop: 45,
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 19,
    backgroundColor:
      colors.primary + '12',
    alignItems: 'center',
    justifyContent:
      'center',
    marginBottom: 12,
  },

  emptyIconText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },

  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },

  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 19,
  },

  emptyButton: {
    marginTop: 15,
    backgroundColor:
      colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius:
      radius.full,
  },

  emptyButtonText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },

  /* ==========================================================
     FAB
  ========================================================== */

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent:
      'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  fabPressed: {
    opacity: 0.75,
    transform: [
      {
        scale: 0.96,
      },
    ],
  },

  fabText: {
    color: colors.textInverse,
    fontSize: 27,
    lineHeight: 29,
    fontWeight: '400',
  },

  /* ==========================================================
     MODAL
  ========================================================== */

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor:
      'rgba(15, 23, 42, 0.4)',
  },

  modalCard: {
    maxHeight: '90%',
    backgroundColor:
      colors.surface,
    borderTopLeftRadius:
      radius.lg,
    borderTopRightRadius:
      radius.lg,
    paddingHorizontal:
      spacing.lg,
    paddingTop:
      spacing.lg,
    paddingBottom:
      spacing.md,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom:
      spacing.md,
  },

  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },

  modalSubtitle: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor:
      colors.background,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  modalCloseText: {
    color: colors.textMuted,
    fontSize: 25,
    lineHeight: 27,
  },

  formContent: {
    paddingBottom: 5,
  },

  /* ==========================================================
     FORM ERROR
  ========================================================== */

  formErrorBox: {
    backgroundColor:
      colors.danger + '10',
    borderWidth: 1,
    borderColor:
      colors.danger + '25',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },

  formError: {
    ...typography.caption,
    color: colors.danger,
  },

  /* ==========================================================
     MODAL BUTTONS
  ========================================================== */

  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },

  modalButton: {
    flex: 1,
  },

  /* ==========================================================
     PRESSED
  ========================================================== */

  pressed: {
    opacity: 0.72,
  },
}));