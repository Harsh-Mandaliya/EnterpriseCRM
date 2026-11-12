import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { getApiErrorMessage } from '@/api/client';
import { listLeads } from '@/api/leads.api';
import { Fab } from '@/components/common/Fab';
import { Kpi, KpiRow } from '@/components/common/Panel';
import { ResponsiveGrid } from '@/components/common/ResponsiveGrid';
import { ScreenState } from '@/components/common/ScreenState';
import { StatusBadge, type BadgeTone } from '@/components/common/StatusBadge';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { SkeletonCard } from '@/components/motion/Skeleton';
import { useAppSelector } from '@/hooks/useRedux';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useResponsive } from '@/hooks/useResponsive';
import type { AppStackParamList } from '@/navigation/types';
import { leadSourceOptions } from '@/screens/forms/options';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { Lead, LeadStatus } from '@/types';
import { useCan } from '@/utils/permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'LeadList'>;
type Filter = 'ALL' | LeadStatus;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const LEAD_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'UNQUALIFIED', 'LOST'];

export const leadStatusLabel = (s: LeadStatus) => s.charAt(0) + s.slice(1).toLowerCase();

export function leadStatusTone(s: LeadStatus): BadgeTone {
  switch (s) {
    case 'NEW':
      return 'primary';
    case 'CONTACTED':
      return 'accent';
    case 'QUALIFIED':
      return 'warning';
    case 'CONVERTED':
      return 'success';
    case 'LOST':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function leadStatusColor(theme: Theme, s: LeadStatus): string {
  switch (s) {
    case 'NEW':
      return theme.colors.status.new;
    case 'CONTACTED':
      return theme.colors.status.contacted;
    case 'QUALIFIED':
      return theme.colors.status.qualified;
    case 'CONVERTED':
      return theme.colors.success;
    case 'LOST':
      return theme.colors.status.lost;
    default:
      return theme.colors.textMuted;
  }
}

export function sourceMeta(source: string): { label: string; icon: IconName } {
  const o = leadSourceOptions.find(x => x.value === source);
  return { label: o?.label ?? source, icon: (o?.icon as IconName) ?? 'ellipsis-horizontal' };
}

export function ageLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

/** Filters by status and a search over name, e-mail and phone. */
export function filterLeads(leads: Lead[], filter: Filter, query: string): Lead[] {
  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  return leads
    .filter(l => filter === 'ALL' || l.status === filter)
    .filter(
      l =>
        !q ||
        l.name.toLowerCase().includes(q) ||
        (l.email ?? '').toLowerCase().includes(q) ||
        (digits.length >= 3 && (l.phone ?? '').replace(/\D/g, '').includes(digits)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function LeadListScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const r = useResponsive();
  const role = useAppSelector(state => state.auth.user?.role);
  const canCreate = useCan('lead.create');

  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLeads(await listLeads());
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load leads.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: leads?.length ?? 0 };
    for (const l of leads ?? []) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  const visible = useMemo(() => filterLeads(leads ?? [], filter, query), [leads, filter, query]);
  const closed = (counts.CONVERTED ?? 0) + (counts.LOST ?? 0) + (counts.UNQUALIFIED ?? 0);
  const conversion = closed > 0 ? Math.round(((counts.CONVERTED ?? 0) / closed) * 100) : 0;

  const header = (
    <HeroHeader
      title={role === 'SALES' ? 'My leads' : 'Leads'}
      subtitle={leads ? `${counts.ALL} leads · ${(counts.NEW ?? 0) + (counts.CONTACTED ?? 0) + (counts.QUALIFIED ?? 0)} open` : 'Prospects to follow up'}
      icon="person-add-outline"
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
    />
  );

  if (leads === null) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={[styles.content, { paddingHorizontal: r.gutter, maxWidth: r.maxWidth }]}>
          {error ? <ScreenState kind="error" message={error} onRetry={load} /> : [0, 1, 2].map(i => <SkeletonCard key={i} lines={2} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: r.gutter, maxWidth: r.maxWidth }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <KpiRow>
          <Kpi label="New" value={counts.NEW ?? 0} icon="add-circle-outline" color={theme.colors.status.new} hint="not contacted yet" />
          <Kpi label="In progress" value={(counts.CONTACTED ?? 0) + (counts.QUALIFIED ?? 0)} icon="chatbubbles-outline" color={theme.colors.status.contacted} hint={`${counts.QUALIFIED ?? 0} qualified`} />
          <Kpi label="Converted" value={counts.CONVERTED ?? 0} icon="checkmark-done-outline" color={theme.colors.success} hint={closed ? `${conversion}% of closed leads` : undefined} />
          <Kpi label="Lost" value={(counts.LOST ?? 0) + (counts.UNQUALIFIED ?? 0)} icon="close-circle-outline" color={theme.colors.danger} />
        </KpiRow>

        <View style={styles.search}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, e-mail or phone"
            placeholderTextColor={theme.colors.textFaint}
            style={styles.searchInput}
            autoCapitalize="none"
            accessibilityLabel="Search leads"
          />
          {query ? (
            <PressableScale onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </PressableScale>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(['ALL', ...LEAD_STATUSES] as Filter[]).map(f => {
            const active = filter === f;
            const color = f === 'ALL' ? theme.colors.primary : leadStatusColor(theme, f);
            return (
              <PressableScale
                key={f}
                onPress={() => setFilter(f)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.chip, active ? { backgroundColor: color, borderColor: color } : null]}
              >
                {f !== 'ALL' ? <View style={[styles.chipDot, { backgroundColor: active ? theme.colors.onPrimary : color }]} /> : null}
                <Text style={[styles.chipText, active ? { color: theme.colors.onPrimary } : null]}>
                  {f === 'ALL' ? 'All' : leadStatusLabel(f)} · {counts[f] ?? 0}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        {visible.length === 0 ? (
          <ScreenState
            kind="empty"
            title={query || filter !== 'ALL' ? 'No matching leads' : 'No leads yet'}
            message={query || filter !== 'ALL' ? 'Try another status or search.' : canCreate ? 'Tap “New lead” to add your first prospect.' : 'Leads assigned to you will appear here.'}
          />
        ) : (
          <ResponsiveGrid>
            {visible.map((lead, i) => (
              <FadeInView key={lead.id} index={Math.min(i, 8)}>
                <LeadCard lead={lead} onPress={() => navigation.navigate('LeadDetail', { leadId: lead.id, leadName: lead.name })} />
              </FadeInView>
            ))}
          </ResponsiveGrid>
        )}
      </ScrollView>

      {canCreate ? <Fab label="New lead" icon="add" onPress={() => navigation.navigate('LeadForm')} /> : null}
    </View>
  );
}

function LeadCard({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const color = leadStatusColor(theme, lead.status);
  const src = sourceMeta(lead.source);
  const initials = lead.name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${lead.name}, ${leadStatusLabel(lead.status)}`} style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: `${color}22` }]}>
          <Text style={[styles.avatarText, { color }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>
            {lead.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name={src.icon} size={12} color={theme.colors.textMuted} />
            <Text style={styles.meta} numberOfLines={1}>
              {src.label} · {ageLabel(lead.createdAt)}
            </Text>
          </View>
        </View>
        <StatusBadge label={leadStatusLabel(lead.status)} tone={leadStatusTone(lead.status)} />
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.owner}>
          <Ionicons name="person-circle-outline" size={15} color={theme.colors.textMuted} />
          <Text style={styles.meta} numberOfLines={1}>
            {lead.assignedTo?.name ?? 'Unassigned'}
          </Text>
        </View>
        {lead.phone ? (
          <PressableScale onPress={() => Linking.openURL(`tel:${lead.phone}`).catch(() => undefined)} accessibilityRole="button" accessibilityLabel={`Call ${lead.name}`} style={styles.callBtn}>
            <Ionicons name="call" size={14} color={theme.colors.success} />
            <Text style={[styles.callText, { color: theme.colors.success }]} numberOfLines={1}>
              {lead.phone}
            </Text>
          </PressableScale>
        ) : lead.email ? (
          <Text style={styles.meta} numberOfLines={1}>
            {lead.email}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingTop: 16, paddingBottom: 110, width: '100%', alignSelf: 'center' },
    search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: 12, minHeight: 46 },
    searchInput: { flex: 1, color: theme.colors.text, fontSize: 15, paddingVertical: 10 },
    chips: { gap: 8, paddingVertical: 14 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: 99, paddingHorizontal: 13, paddingVertical: 8, minHeight: 36 },
    chipDot: { width: 8, height: 8, borderRadius: 4 },
    chipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
    card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 4, padding: 14, marginBottom: 12 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontWeight: '800', fontSize: 16 },
    name: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    meta: { color: theme.colors.textMuted, fontSize: 12, flexShrink: 1 },
    cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
    owner: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
    callBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: theme.colors.successSoft, flexShrink: 1 },
    callText: { fontSize: 12, fontWeight: '700' },
  });
}
