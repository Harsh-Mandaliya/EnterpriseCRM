import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { Fab } from '@/components/common/Fab';
import { useCan } from '@/utils/permissions';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  useAppDispatch,
  useAppSelector,
} from '@/hooks/useRedux';

import {
  fetchLeads,
} from '@/redux/slices/leadsSlice';

import {
  colors,
} from '@/theme/colors';

import {
  typography,
  spacing,
  radius,
} from '@/theme/typography';

import type {
  Lead,
  LeadStatus,
} from '@/types';

import type {
  MainStackParamList,
} from '@/navigation/OwnerNavigator';


import { createThemedStyles } from '@/theme/themeStore';
type Props = NativeStackScreenProps<
  MainStackParamList,
  'LeadList'
>;


/* ============================================================
   FILTERS
============================================================ */

const FILTERS: {
  label: string;
  value: LeadStatus | undefined;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    label: 'All',
    value: undefined,
    icon: 'grid-outline',
  },
  {
    label: 'New',
    value: 'NEW',
    icon: 'add-circle-outline',
  },
  {
    label: 'Contacted',
    value: 'CONTACTED',
    icon: 'call-outline',
  },
  {
    label: 'Qualified',
    value: 'QUALIFIED',
    icon: 'checkmark-circle-outline',
  },
  {
    label: 'Converted',
    value: 'CONVERTED',
    icon: 'trophy-outline',
  },
  {
    label: 'Lost',
    value: 'LOST',
    icon: 'close-circle-outline',
  },
];


/* ============================================================
   HELPERS
============================================================ */

function statusColor(status: LeadStatus): string {
  switch (status) {
    case 'NEW':
      return colors.status.new;

    case 'CONTACTED':
      return colors.status.contacted;

    case 'QUALIFIED':
      return colors.status.qualified;

    case 'CONVERTED':
      return colors.success;

    case 'LOST':
      return colors.status.lost;

    default:
      return colors.textMuted;
  }
}


function formatSource(source: string): string {
  return source
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}


function formatStatus(status: LeadStatus): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}


/* ============================================================
   AVATAR
============================================================ */

function LeadAvatar({
  name,
  status,
}: {
  name: string;
  status: LeadStatus;
}) {
  const color = statusColor(status);

  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: `${color}16`,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          {
            color,
          },
        ]}
      >
        {name?.charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}


/* ============================================================
   MAIN SCREEN
============================================================ */

export function LeadListScreen({
  navigation,
}: Props) {
  const canCreateLead = useCan('lead.create');
  const dispatch = useAppDispatch();

  const {
    items,
    status,
    error,
  } = useAppSelector(
    state => state.leads,
  );

  const { width } = useWindowDimensions();

  const [
    filter,
    setFilter,
  ] = useState<LeadStatus | undefined>(
    undefined,
  );

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState('');

  const isTablet = width >= 768;
  const isDesktop = width >= 1100;

  const horizontalPadding = isDesktop
    ? 32
    : isTablet
      ? 24
      : 20;


  /* ============================================================
     LOAD LEADS
  ============================================================ */

  const load = useCallback(
    (selectedStatus?: LeadStatus) => {
      if (selectedStatus) {
        return dispatch(
          fetchLeads({
            status: selectedStatus,
          }),
        );
      }

      return dispatch(
        fetchLeads(),
      );
    },
    [dispatch],
  );


  useEffect(() => {
    load(filter);
  }, [filter, load]);

  // Reload after returning from a create/edit form.
  useRefreshOnFocus(() => load(filter));


  /* ============================================================
     REFRESH
  ============================================================ */

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    load(filter).finally(() => {
      setRefreshing(false);
    });
  }, [filter, load]);


  /* ============================================================
     FILTER
  ============================================================ */

  const handleFilterChange = (
    value: LeadStatus | undefined,
  ) => {
    setFilter(value);
    setSearch('');
  };


  /* ============================================================
     SEARCH
  ============================================================ */

  const filteredItems = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter(lead => {
      const name =
        lead.name?.toLowerCase() ?? '';

      const email =
        lead.email?.toLowerCase() ?? '';

      const phone =
        lead.phone?.toLowerCase() ?? '';

      const source =
        lead.source?.toLowerCase() ?? '';

      return (
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        source.includes(query)
      );
    });
  }, [items, search]);


  const totalLeads =
    filteredItems.length;


  /* ============================================================
     LEAD CARD
  ============================================================ */

  const renderLead = ({
    item,
  }: {
    item: Lead;
  }) => {
    const color =
      statusColor(item.status);

    return (
      <Pressable
        onPress={() =>
          navigation.navigate(
            'LeadDetail',
            {
              leadId: item.id,
              leadName: item.name,
            },
          )
        }
        style={({ pressed }) => [
          styles.leadCard,
          isTablet && styles.leadCardTablet,
          pressed && styles.cardPressed,
        ]}
      >

        {/* TOP ROW */}

        <View style={styles.cardTop}>

          <View style={styles.leadIdentity}>

            <LeadAvatar
              name={item.name}
              status={item.status}
            />

            <View style={styles.nameContainer}>

              <Text
                style={styles.leadName}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              <View style={styles.sourceRow}>

                <Ionicons
                  name="globe-outline"
                  size={13}
                  color={colors.textMuted}
                />

                <Text
                  style={styles.sourceText}
                  numberOfLines={1}
                >
                  {formatSource(item.source)}
                </Text>

              </View>

            </View>

          </View>


          {/* STATUS */}

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: `${color}12`,
              },
            ]}
          >

            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: color,
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color,
                },
              ]}
              numberOfLines={1}
            >
              {formatStatus(item.status)}
            </Text>

          </View>

        </View>


        {/* CONTACT INFORMATION */}

        <View style={styles.contactArea}>

          {item.phone ? (
            <View style={styles.contactItem}>

              <View style={styles.contactIcon}>
                <Ionicons
                  name="call-outline"
                  size={14}
                  color={colors.primary}
                />
              </View>

              <Text
                style={styles.contactText}
                numberOfLines={1}
              >
                {item.phone}
              </Text>

            </View>
          ) : null}


          {!item.phone && item.email ? (
            <View style={styles.contactItem}>

              <View style={styles.contactIcon}>
                <Ionicons
                  name="mail-outline"
                  size={14}
                  color={colors.primary}
                />
              </View>

              <Text
                style={styles.contactText}
                numberOfLines={1}
              >
                {item.email}
              </Text>

            </View>
          ) : null}


          {!item.phone && !item.email ? (
            <View style={styles.contactItem}>

              <View
                style={[
                  styles.contactIcon,
                  styles.mutedContactIcon,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={colors.textMuted}
                />
              </View>

              <Text style={styles.noContactText}>
                No contact information
              </Text>

            </View>
          ) : null}


          {/* ARROW */}

          <View style={styles.arrowButton}>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={colors.primary}
            />

          </View>

        </View>

      </Pressable>
    );
  };


  /* ============================================================
     EMPTY STATE
  ============================================================ */

  function EmptyComponent() {
    const hasSearch =
      search.trim().length > 0;

    return (
      <View style={styles.emptyContainer}>

        <View style={styles.emptyIconContainer}>

          <Ionicons
            name={
              hasSearch
                ? 'search-outline'
                : 'people-outline'
            }
            size={30}
            color={colors.primary}
          />

        </View>

        <Text style={styles.emptyTitle}>

          {hasSearch
            ? 'No leads found'
            : 'No leads yet'}

        </Text>

        <Text style={styles.emptyMessage}>

          {hasSearch
            ? 'Try a different name, phone number or email.'
            : filter
              ? `There are no ${formatStatus(
                  filter,
                ).toLowerCase()} leads.`
              : 'Your leads will appear here once they are created.'}

        </Text>

        {!hasSearch && !filter ? (
          <View style={styles.emptyHint}>

            <Ionicons
              name="information-circle-outline"
              size={15}
              color={colors.textMuted}
            />

            <Text style={styles.emptyHintText}>
              Create your first lead to get started
            </Text>

          </View>
        ) : null}

      </View>
    );
  }


  /* ============================================================
     LOADING
  ============================================================ */

  if (
    status === 'loading' &&
    !refreshing
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>

          <View style={styles.loadingIcon}>

            <Ionicons
              name="people-outline"
              size={26}
              color={colors.primary}
            />

          </View>

          <ActivityIndicator
            size="small"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            Loading leads...
          </Text>

        </View>
      </SafeAreaView>
    );
  }


  /* ============================================================
     ERROR
  ============================================================ */

  if (
    error &&
    !items.length
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['top']}
      >

        <View style={styles.errorContainer}>

          <View style={styles.errorIcon}>

            <Ionicons
              name="alert-circle-outline"
              size={30}
              color={colors.danger}
            />

          </View>

          <Text style={styles.errorTitle}>
            Couldn't load leads
          </Text>

          <Text style={styles.errorMessage}>
            {error}
          </Text>

          <Pressable
            onPress={() => load(filter)}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.buttonPressed,
            ]}
          >

            <Ionicons
              name="refresh-outline"
              size={17}
              color={colors.textInverse}
            />

            <Text style={styles.retryText}>
              Try again
            </Text>

          </Pressable>

        </View>

      </SafeAreaView>
    );
  }


  /* ============================================================
     MAIN UI
  ============================================================ */

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >

      <View style={styles.container}>

        {/* =====================================================
            TOP NAVIGATION
        ===================================================== */}

        <View
          style={[
            styles.topBar,
            {
              paddingHorizontal:
                horizontalPadding,
            },
          ]}
        >

          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
          >

            <Ionicons
              name="arrow-back"
              size={23}
              color={colors.text}
            />

          </Pressable>


          <Text style={styles.topBarTitle}>
            Leads
          </Text>


          <View style={styles.topBarSpacer} />

        </View>


        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <View
          style={[
            styles.pageHeader,
            {
              paddingHorizontal:
                horizontalPadding,
            },
          ]}
        >

          <View style={styles.pageHeaderText}>

            <Text style={styles.pageTitle}>
              Leads
            </Text>

            <Text style={styles.pageSubtitle}>
              Manage and track your sales leads
            </Text>

          </View>


          <View style={styles.countBadge}>

            <Text style={styles.countNumber}>
              {totalLeads}
            </Text>

            <Text style={styles.countLabel}>
              TOTAL
            </Text>

          </View>

        </View>


        {/* =====================================================
            SEARCH
        ===================================================== */}

        <View
          style={[
            styles.searchContainer,
            {
              marginHorizontal:
                horizontalPadding,
            },
          ]}
        >

          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textMuted}
          />

          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search leads..."
            placeholderTextColor={
              colors.textMuted
            }
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />

          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={10}
            >

              <View style={styles.clearButton}>

                <Ionicons
                  name="close"
                  size={15}
                  color={colors.textMuted}
                />

              </View>

            </Pressable>
          ) : null}

        </View>


        {/* =====================================================
            FILTERS
        ===================================================== */}

        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={item => item.label}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal:
              horizontalPadding,
            paddingVertical: 4,
          }}
          style={styles.filterList}
          renderItem={({ item }) => {

            const active =
              filter === item.value;

            return (
              <Pressable
                onPress={() =>
                  handleFilterChange(
                    item.value,
                  )
                }
                style={({ pressed }) => [
                  styles.filterChip,
                  active &&
                    styles.filterChipActive,
                  pressed &&
                    styles.filterPressed,
                ]}
              >

                <Ionicons
                  name={item.icon}
                  size={15}
                  color={
                    active
                      ? '#FFFFFF'
                      : colors.textMuted
                  }
                />

                <Text
                  style={[
                    styles.filterText,
                    active &&
                      styles.filterTextActive,
                  ]}
                >
                  {item.label}
                </Text>

              </Pressable>
            );
          }}
        />


        {/* =====================================================
            ERROR BANNER
        ===================================================== */}

        {error && items.length > 0 ? (
          <View
            style={[
              styles.errorBanner,
              {
                marginHorizontal:
                  horizontalPadding,
              },
            ]}
          >

            <Ionicons
              name="warning-outline"
              size={16}
              color={colors.danger}
            />

            <Text
              style={styles.errorBannerText}
              numberOfLines={2}
            >
              {error}
            </Text>

          </View>
        ) : null}


        {/* =====================================================
            LEAD LIST
        ===================================================== */}

        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          renderItem={renderLead}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"

          contentContainerStyle={[
            styles.list,
            {
              paddingHorizontal:
                horizontalPadding,
            },
            filteredItems.length === 0 &&
              styles.emptyList,
          ]}

          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }

          ListEmptyComponent={
            EmptyComponent
          }

          ListHeaderComponent={
            filteredItems.length > 0 ? (
              <View style={styles.resultHeader}>

                <Text style={styles.resultTitle}>
                  {filter
                    ? formatStatus(filter)
                    : 'All Leads'}
                </Text>

                <Text style={styles.resultCount}>
                  {totalLeads}{' '}
                  {totalLeads === 1
                    ? 'lead'
                    : 'leads'}
                </Text>

              </View>
            ) : undefined
          }
        />

      </View>


      {canCreateLead ? <Fab label="New lead" onPress={() => navigation.navigate('LeadForm')} /> : null}
    </SafeAreaView>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles = createThemedStyles(() => StyleSheet.create({

  /* ==========================================================
     ROOT
  ========================================================== */

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },


  /* ==========================================================
     TOP BAR
  ========================================================== */

  topBar: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  topBarTitle: {
    marginLeft: 14,
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },

  topBarSpacer: {
    flex: 1,
  },


  /* ==========================================================
     PAGE HEADER
  ========================================================== */

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingTop: 24,
    paddingBottom: 18,

    backgroundColor: colors.background,
  },

  pageHeaderText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 18,
  },

  pageTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.8,
  },

  pageSubtitle: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },


  /* ==========================================================
     COUNT BADGE
  ========================================================== */

  countBadge: {
    width: 62,
    height: 62,
    borderRadius: 18,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.primary,

    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },

  countNumber: {
    color: colors.textInverse,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '800',
  },

  countLabel: {
    marginTop: 2,
    color: '#DBEAFE',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1,
  },


  /* ==========================================================
     SEARCH
  ========================================================== */

  searchContainer: {
    height: 54,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 16,

    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,

    backgroundColor: colors.surface,

    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 8,
    elevation: 1,

    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,

    marginLeft: 11,

    color: colors.text,
    fontSize: 15,

    paddingVertical: 0,
  },

  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.surfaceAlt,
  },


  /* ==========================================================
     FILTERS
  ========================================================== */

  filterList: {
    flexGrow: 0,
    maxHeight: 48,
  },

  filterChip: {
    height: 38,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 14,

    borderRadius: 999,

    borderWidth: 1,
    borderColor: colors.border,

    backgroundColor: colors.surface,

    marginRight: 8,
  },

  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,

    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 3,
  },

  filterText: {
    marginLeft: 6,

    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },

  filterTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },

  filterPressed: {
    opacity: 0.72,
    transform: [
      {
        scale: 0.97,
      },
    ],
  },


  /* ==========================================================
     ERROR BANNER
  ========================================================== */

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 10,

    paddingHorizontal: 12,
    paddingVertical: 10,

    borderRadius: 12,

    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  errorBannerText: {
    flex: 1,
    marginLeft: 8,

    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },


  /* ==========================================================
     LIST
  ========================================================== */

  list: {
    paddingTop: 14,
    paddingBottom: 30,
  },

  emptyList: {
    flexGrow: 1,
  },


  /* ==========================================================
     RESULT HEADER
  ========================================================== */

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginBottom: 10,
    paddingHorizontal: 2,
  },

  resultTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  resultCount: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
  },


  /* ==========================================================
     LEAD CARD
  ========================================================== */

  leadCard: {
    backgroundColor: colors.surface,

    borderWidth: 1,
    borderColor: '#E8EDF3',

    borderRadius: 18,

    padding: 15,

    marginBottom: 10,

    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.045,
    shadowRadius: 9,
    elevation: 2,
  },

  leadCardTablet: {
    maxWidth: 850,
    alignSelf: 'center',
    width: '100%',
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  leadIdentity: {
    flex: 1,
    minWidth: 0,

    flexDirection: 'row',
    alignItems: 'center',

    marginRight: 10,
  },

  avatar: {
    width: 46,
    height: 46,

    borderRadius: 15,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 11,
  },

  avatarText: {
    fontSize: 17,
    fontWeight: '800',
  },

  nameContainer: {
    flex: 1,
    minWidth: 0,
  },

  leadName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.15,
  },

  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 4,
  },

  sourceText: {
    flexShrink: 1,

    marginLeft: 5,

    color: colors.textFaint,
    fontSize: 11.5,
    fontWeight: '500',
  },


  /* ==========================================================
     STATUS
  ========================================================== */

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 9,
    paddingVertical: 6,

    borderRadius: 999,

    maxWidth: 120,
  },

  statusDot: {
    width: 6,
    height: 6,

    borderRadius: 3,

    marginRight: 5,
  },

  statusText: {
    flexShrink: 1,

    fontSize: 10.5,
    fontWeight: '800',
  },


  /* ==========================================================
     CONTACT
  ========================================================== */

  contactArea: {
    minHeight: 40,

    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 13,
    paddingTop: 11,

    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  contactItem: {
    flex: 1,
    minWidth: 0,

    flexDirection: 'row',
    alignItems: 'center',
  },

  contactIcon: {
    width: 29,
    height: 29,

    borderRadius: 9,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.primaryLight,

    marginRight: 8,
  },

  mutedContactIcon: {
    backgroundColor: colors.surfaceAlt,
  },

  contactText: {
    flex: 1,

    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: '500',
  },

  noContactText: {
    flex: 1,

    color: colors.textFaint,
    fontSize: 12.5,
    fontWeight: '500',
  },

  arrowButton: {
    width: 30,
    height: 30,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.background,

    marginLeft: 8,
  },

  cardPressed: {
    opacity: 0.92,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },


  /* ==========================================================
     EMPTY STATE
  ========================================================== */

  emptyContainer: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 30,
    paddingBottom: 40,
  },

  emptyIconContainer: {
    width: 72,
    height: 72,

    borderRadius: 22,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.primaryLight,

    borderWidth: 1,
    borderColor: colors.primaryLight,

    marginBottom: 18,
  },

  emptyTitle: {
    color: colors.text,

    fontSize: 21,
    lineHeight: 27,

    fontWeight: '500',

    textAlign: 'center',
    letterSpacing: -0.3,
  },

  emptyMessage: {
    maxWidth: 310,

    marginTop: 7,

    color: colors.textMuted,

    fontSize: 14,
    lineHeight: 21,

    fontWeight: '400',

    textAlign: 'center',
  },

  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 20,

    paddingHorizontal: 13,
    paddingVertical: 9,

    borderRadius: 999,

    backgroundColor: colors.surfaceAlt,
  },

  emptyHintText: {
    marginLeft: 6,

    color: colors.textMuted,

    fontSize: 11.5,
    fontWeight: '600',
  },


  /* ==========================================================
     LOADING
  ========================================================== */

  loadingContainer: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.background,
  },

  loadingIcon: {
    width: 60,
    height: 60,

    borderRadius: 20,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.primaryLight,

    marginBottom: 18,
  },

  loadingText: {
    marginTop: 10,

    color: colors.textMuted,

    fontSize: 13,
    fontWeight: '500',
  },


  /* ==========================================================
     ERROR SCREEN
  ========================================================== */

  errorContainer: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 30,

    backgroundColor: colors.background,
  },

  errorIcon: {
    width: 68,
    height: 68,

    borderRadius: 22,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.dangerSoft,

    borderWidth: 1,
    borderColor: '#FECACA',

    marginBottom: 18,
  },

  errorTitle: {
    color: colors.text,

    fontSize: 20,
    fontWeight: '500',

    textAlign: 'center',
  },

  errorMessage: {
    maxWidth: 320,

    marginTop: 7,

    color: colors.textMuted,

    fontSize: 13,
    lineHeight: 20,

    textAlign: 'center',
  },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 20,

    paddingHorizontal: 18,
    paddingVertical: 11,

    borderRadius: 12,

    backgroundColor: colors.primary,
  },

  retryText: {
    marginLeft: 7,

    color: colors.textInverse,

    fontSize: 13,
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.72,
  },

}));