import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { getApiErrorMessage } from '@/api/client';
import { listCustomers } from '@/api/customer.api';
import { Fab } from '@/components/common/Fab';
import { ActionButton } from '@/components/common/Panel';
import { ResponsiveGrid } from '@/components/common/ResponsiveGrid';
import { ScreenState } from '@/components/common/ScreenState';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { SkeletonCard } from '@/components/motion/Skeleton';
import { useAppSelector } from '@/hooks/useRedux';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useResponsive } from '@/hooks/useResponsive';
import type { AppStackParamList } from '@/navigation/types';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { Customer } from '@/types';
import { useCan } from '@/utils/permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'CustomerList'>;

const PAGE_SIZE = 20;
export const SEARCH_DELAY_MS = 300;

/** City-ish last part of an address: "Ring Road, Surat, Gujarat 395002" → "Surat, Gujarat". */
export function shortAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const parts = address.split(',').map(p => p.trim().replace(/\s*\d{6}$/, '')).filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join(', ') : parts[0] ?? null;
}

/**
 * Customers. The search box lives outside the list and is never
 * unmounted, so typing keeps focus (it used to lose focus after one
 * letter because each keystroke replaced the whole screen with a
 * loading state). The server search runs 300 ms after typing stops
 * and covers name, e-mail, phone, GSTIN and address.
 */
export function CustomerListScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const layout = useResponsive();
  const role = useAppSelector(state => state.auth.user?.role);
  const canCreate = useCan('customer.create');

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<Customer[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Wait until typing pauses before asking the server.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async (search: string, nextPage = 1) => {
    const id = ++requestId.current;
    if (nextPage === 1) setSearching(true);
    else setLoadingMore(true);
    try {
      const res = await listCustomers({ page: nextPage, pageSize: PAGE_SIZE, search });
      if (id !== requestId.current) return; // a newer search already started
      setItems(prev => (nextPage === 1 ? res.items : [...(prev ?? []), ...res.items]));
      setTotal(res.pagination?.total ?? res.items.length);
      setPage(res.pagination?.page ?? nextPage);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setError(null);
    } catch (err) {
      if (id === requestId.current) setError(getApiErrorMessage(err, "Couldn't load customers."));
    } finally {
      if (id === requestId.current) {
        setSearching(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    load(debounced, 1);
  }, [debounced, load]);
  useRefreshOnFocus(() => load(debounced, 1));

  const header = (
    <HeroHeader
      title={role === 'SALES' || role === 'EMPLOYEE' ? 'My customers' : 'Customers'}
      subtitle={items ? `${total} customer${total === 1 ? '' : 's'}${debounced ? ` matching “${debounced}”` : ''}` : 'Accounts you sell to'}
      icon="business-outline"
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
    />
  );

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: layout.gutter, maxWidth: layout.maxWidth }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await load(debounced, 1);
              setRefreshing(false);
            }}
          />
        }
      >
        {/* search — always mounted so it keeps focus */}
        <View style={styles.search}>
          <Ionicons name="search" size={19} color={theme.colors.textMuted} />
          <TextInput underlineColorAndroid="transparent"
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, phone, e-mail, GSTIN or city"
            placeholderTextColor={theme.colors.textFaint}
            style={[styles.searchInput, WEB_NO_OUTLINE]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => setDebounced(query.trim())}
            accessibilityLabel="Search customers"
          />
          {searching && items ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
          {query ? (
            <PressableScale onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}>
              <Ionicons name="close-circle" size={19} color={theme.colors.textMuted} />
            </PressableScale>
          ) : null}
        </View>
        <Text style={styles.resultLine}>
          {items === null
            ? ' '
            : debounced
              ? `${total} result${total === 1 ? '' : 's'} for “${debounced}”`
              : `Showing ${items.length} of ${total}`}
        </Text>

        {items === null ? (
          error ? (
            <ScreenState kind="error" message={error} onRetry={() => load(debounced, 1)} />
          ) : (
            [0, 1, 2].map(i => <SkeletonCard key={i} lines={2} />)
          )
        ) : items.length === 0 ? (
          <ScreenState
            kind="empty"
            title={debounced ? 'No matching customers' : 'No customers yet'}
            message={
              debounced
                ? 'Check the spelling or search by phone, GSTIN or city.'
                : canCreate
                  ? 'Tap “New customer” to add your first account.'
                  : 'Customers shared with you will appear here.'
            }
          />
        ) : (
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <ResponsiveGrid>
              {items.map((c, i) => (
                <FadeInView key={c.id} index={Math.min(i, 8)}>
                  <CustomerCard customer={c} onPress={() => navigation.navigate('CustomerDetail', { customerId: c.id, customerName: c.name })} />
                </FadeInView>
              ))}
            </ResponsiveGrid>
            {page < totalPages ? (
              <ActionButton label={`Load more (${total - items.length} left)`} icon="chevron-down" variant="outline" onPress={() => load(debounced, page + 1)} busy={loadingMore} />
            ) : null}
          </>
        )}
      </ScrollView>

      {canCreate ? <Fab label="New customer" icon="add" onPress={() => navigation.navigate('CustomerForm', {})} /> : null}
    </View>
  );
}

function CustomerCard({ customer: c, onPress }: { customer: Customer; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const initials = c.name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
  const place = shortAddress(c.address);
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open ${c.name}`} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>
            {c.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.meta} numberOfLines={1}>
              {place ?? 'No address'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textFaint} />
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.owner}>
          <Ionicons name="person-circle-outline" size={15} color={theme.colors.textMuted} />
          <Text style={styles.meta} numberOfLines={1}>
            {c.owner?.name ?? 'Unassigned'}
          </Text>
          {c.gstin ? (
            <View style={[styles.gst, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Text style={styles.gstText}>GST</Text>
            </View>
          ) : null}
        </View>
        {c.phone ? (
          <PressableScale onPress={() => Linking.openURL(`tel:${c.phone}`).catch(() => undefined)} accessibilityRole="button" accessibilityLabel={`Call ${c.name}`} style={styles.callBtn}>
            <Ionicons name="call" size={14} color={theme.colors.success} />
            <Text style={[styles.callText, { color: theme.colors.success }]} numberOfLines={1}>
              {c.phone}
            </Text>
          </PressableScale>
        ) : c.email ? (
          <Text style={styles.meta} numberOfLines={1}>
            {c.email}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

/** Hide the browser focus ring inside the box; the border shows focus. */
const WEB_NO_OUTLINE = (Platform.OS === 'web' ? { outlineWidth: 0 } : null) as object | null;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingTop: 16, paddingBottom: 110, width: '100%', alignSelf: 'center' },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      paddingHorizontal: 14,
      minHeight: 50,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    searchInput: { flex: 1, color: theme.colors.text, fontSize: 15, paddingVertical: 12, minWidth: 0 },
    resultLine: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 12, marginLeft: 4 },
    error: { color: theme.colors.danger, fontSize: 13, marginBottom: 10 },
    card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 12 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontWeight: '800', fontSize: 16 },
    name: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    meta: { color: theme.colors.textMuted, fontSize: 12, flexShrink: 1 },
    cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
    owner: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
    gst: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    gstText: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: '800' },
    callBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: theme.colors.successSoft, flexShrink: 1 },
    callText: { fontSize: 12, fontWeight: '700' },
  });
}
