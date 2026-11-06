import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Fab } from '@/components/common/Fab';
import { ScreenState } from '@/components/common/ScreenState';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { AnimatedNumber, formatCompactCurrency } from '@/components/motion/AnimatedNumber';
import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { SkeletonCard } from '@/components/motion/Skeleton';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { AppStackParamList } from '@/navigation/types';
import { changeOpportunityStage, fetchOpportunities } from '@/redux/slices/opportunitiesSlice';
import { DEAL_STAGES, STAGE_PROBABILITY, stageColor, stageLabel } from '@/screens/forms/options';
import { OPEN_STAGES, pipelineKpis, summarizeStages } from '@/screens/pipeline/pipelineMath';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { Opportunity, OpportunityStage } from '@/types';
import { relativeDay } from '@/utils/dates';
import { useCan } from '@/utils/permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'Pipeline' | 'OpportunitiesBoard'>;

/**
 * Visual sales pipeline: KPIs, stage distribution, a swipeable
 * kanban (or list) and a sheet to move deals between stages.
 * Deals come from the API already scoped to the user's role/team.
 */
export function PipelineScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { items: deals, status, error } = useAppSelector(state => state.opportunities);
  const canCreate = useCan('deal.create');

  const [view, setView] = useState<'board' | 'list'>('board');
  const [stageFilter, setStageFilter] = useState<OpportunityStage | 'OPEN'>('OPEN');
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => dispatch(fetchOpportunities()), [dispatch]);
  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load);

  const kpis = useMemo(() => pipelineKpis(deals), [deals]);
  const stages = useMemo(() => summarizeStages(deals), [deals]);
  const columnWidth = Math.min(300, Math.max(250, width * 0.78));

  async function move(deal: Opportunity, stage: OpportunityStage) {
    if (deal.stage === stage) return;
    setMoving(true);
    setMoveError(null);
    try {
      await dispatch(changeOpportunityStage({ id: deal.id, stage })).unwrap();
      setSelected(null);
    } catch (err) {
      setMoveError(String(err));
    } finally {
      setMoving(false);
    }
  }

  const listDeals = deals
    .filter(d => (stageFilter === 'OPEN' ? OPEN_STAGES.includes(d.stage) : d.stage === stageFilter))
    .sort((a, b) => b.amount - a.amount);

  const header = (
    <HeroHeader
      title="Pipeline"
      subtitle={`${kpis.openCount} open deals · ${formatCompactCurrency(kpis.openValue)}`}
      icon="git-branch-outline"
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
      right={
        <PressableScale
          onPress={() => navigation.navigate('Analytics')}
          accessibilityRole="button"
          accessibilityLabel="Open analytics"
          style={styles.headerButton}
        >
          <Ionicons name="stats-chart" size={16} color={theme.colors.onPrimary} />
          <Text style={[styles.headerButtonText, { color: theme.colors.onPrimary }]}>Analytics</Text>
        </PressableScale>
      }
    />
  );

  if (status !== 'loaded' && deals.length === 0) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.padded}>
          {status === 'error' ? (
            <ScreenState kind="error" message={error ?? undefined} onRetry={load} />
          ) : (
            [0, 1, 2].map(i => <SkeletonCard key={i} />)
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* ---------- KPIs ---------- */}
        <View style={[styles.padded, styles.kpis]}>
          <Kpi index={0} label="Weighted forecast" value={kpis.weightedForecast} money icon="trending-up" color={theme.colors.primary} />
          <Kpi index={1} label="Won" value={kpis.wonValue} money icon="trophy-outline" color={theme.colors.success} />
          <Kpi
            index={2}
            label="Win rate"
            value={kpis.winRate === null ? 0 : kpis.winRate * 100}
            suffix="%"
            icon="ribbon-outline"
            color={theme.colors.accent}
            empty={kpis.winRate === null}
          />
          <Kpi index={3} label="Overdue" value={kpis.overdueCount} icon="alarm-outline" color={kpis.overdueCount > 0 ? theme.colors.danger : theme.colors.textMuted} />
        </View>

        {/* ---------- stage distribution ---------- */}
        <FadeInView delay={120} style={styles.padded}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Open value by stage</Text>
            <View style={styles.stackBar} accessibilityLabel="Open value by stage">
              {stages
                .filter(s => OPEN_STAGES.includes(s.stage) && s.value > 0)
                .map(s => (
                  <View key={s.stage} style={{ flex: s.value, backgroundColor: stageColor(theme, s.stage) }} />
                ))}
              {kpis.openValue === 0 ? <View style={{ flex: 1, backgroundColor: theme.colors.surfaceAlt }} /> : null}
            </View>
            <View style={styles.legend}>
              {stages
                .filter(s => OPEN_STAGES.includes(s.stage))
                .map(s => (
                  <View key={s.stage} style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: stageColor(theme, s.stage) }]} />
                    <Text style={styles.legendText}>
                      {stageLabel(s.stage)} · {formatCompactCurrency(s.value)}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        </FadeInView>

        <View style={[styles.padded, { marginBottom: 12 }]}>
          <SegmentedControl
            accessibilityLabel="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'board', label: 'Board' },
              { value: 'list', label: 'List' },
            ]}
          />
        </View>

        {deals.length === 0 ? (
          <ScreenState
            kind="empty"
            title="No deals yet"
            message={canCreate ? 'Create your first deal or convert a qualified lead.' : 'Deals assigned to you will appear here.'}
          />
        ) : view === 'board' ? (
          /* ---------- kanban ---------- */
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={columnWidth + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {stages.map((column, columnIndex) => {
              const color = stageColor(theme, column.stage);
              const columnDeals = deals.filter(d => d.stage === column.stage);
              return (
                <FadeInView key={column.stage} index={columnIndex} style={[styles.column, { width: columnWidth }]}>
                  <View style={[styles.columnHeader, { borderTopColor: color }]}>
                    <Text style={styles.columnTitle}>{stageLabel(column.stage)}</Text>
                    <View style={[styles.countPill, { backgroundColor: theme.colors.surfaceAlt }]}>
                      <Text style={styles.countText}>{column.count}</Text>
                    </View>
                  </View>
                  <Text style={styles.columnValue}>
                    {formatCompactCurrency(column.value)}
                    {OPEN_STAGES.includes(column.stage) ? `  ·  ${Math.round(STAGE_PROBABILITY[column.stage] * 100)}%` : ''}
                  </Text>
                  {columnDeals.length === 0 ? (
                    <Text style={styles.columnEmpty}>No deals</Text>
                  ) : (
                    columnDeals.map((deal, i) => (
                      <DealCard key={deal.id} deal={deal} index={i} onPress={() => setSelected(deal)} />
                    ))
                  )}
                </FadeInView>
              );
            })}
          </ScrollView>
        ) : (
          /* ---------- list ---------- */
          <View style={styles.padded}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {(['OPEN', ...DEAL_STAGES] as const).map(stage => {
                const active = stageFilter === stage;
                const color = stage === 'OPEN' ? theme.colors.primary : stageColor(theme, stage);
                return (
                  <PressableScale
                    key={stage}
                    onPress={() => setStageFilter(stage)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.filterChip, active && { backgroundColor: color, borderColor: color }]}
                  >
                    <Text style={[styles.filterText, active && { color: theme.colors.onPrimary }]}>
                      {stage === 'OPEN' ? 'All open' : stageLabel(stage)}
                    </Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
            {listDeals.length === 0 ? (
              <Text style={styles.columnEmpty}>No deals in this stage</Text>
            ) : (
              listDeals.map((deal, i) => <DealCard key={deal.id} deal={deal} index={i} onPress={() => setSelected(deal)} wide />)
            )}
          </View>
        )}
      </ScrollView>

      {canCreate ? <Fab label="New deal" onPress={() => navigation.navigate('DealForm')} /> : null}

      {/* ---------- move / edit sheet ---------- */}
      <Modal visible={selected !== null} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)} accessibilityLabel="Close" />
        {selected ? (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {selected.title}
            </Text>
            <Text style={styles.sheetSub}>
              {formatCompactCurrency(selected.amount)}
              {selected.customer ? ` · ${selected.customer.name}` : ''}
              {selected.owner ? ` · ${selected.owner.name}` : ''}
            </Text>
            {canCreate ? (
              <>
                <Text style={styles.sheetLabel}>Move to stage</Text>
                <View style={styles.stageGrid}>
                  {DEAL_STAGES.map(stage => {
                    const current = selected.stage === stage;
                    const color = stageColor(theme, stage);
                    return (
                      <PressableScale
                        key={stage}
                        onPress={() => move(selected, stage)}
                        disabled={moving || current}
                        accessibilityRole="button"
                        accessibilityState={{ selected: current }}
                        style={[styles.stageButton, { borderColor: color }, current && { backgroundColor: color }]}
                      >
                        <Text style={[styles.stageButtonText, { color: current ? theme.colors.onPrimary : color }]}>
                          {stageLabel(stage)}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
                {moveError ? <Text style={styles.error}>{moveError}</Text> : null}
                <PressableScale
                  onPress={() => {
                    const deal = selected;
                    setSelected(null);
                    navigation.navigate('DealForm', { deal });
                  }}
                  accessibilityRole="button"
                  style={styles.editButton}
                >
                  <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.editText}>Edit deal details</Text>
                </PressableScale>
              </>
            ) : (
              <Text style={styles.sheetSub}>Your role can view deals but not change them.</Text>
            )}
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

/* ============================================================
   PIECES
============================================================ */

function Kpi({
  label,
  value,
  icon,
  color,
  money,
  suffix,
  index,
  empty,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  money?: boolean;
  suffix?: string;
  index: number;
  empty?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <FadeInView index={index} style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      {empty ? (
        <Text style={styles.kpiValue}>—</Text>
      ) : (
        <AnimatedNumber
          value={value}
          format={v => (money ? formatCompactCurrency(v) : `${Math.round(v)}${suffix ?? ''}`)}
          style={styles.kpiValue}
        />
      )}
      <Text style={styles.kpiLabel}>{label}</Text>
    </FadeInView>
  );
}

function DealCard({ deal, index, onPress, wide }: { deal: Opportunity; index: number; onPress: () => void; wide?: boolean }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const color = stageColor(theme, deal.stage);
  const close = deal.closeDate ? new Date(deal.closeDate) : null;
  const overdue = close && OPEN_STAGES.includes(deal.stage) && close < new Date();

  return (
    <FadeInView index={index}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${deal.title}, ${formatCompactCurrency(deal.amount)}, ${stageLabel(deal.stage)}`}
        style={[styles.deal, { borderLeftColor: color }, wide && { marginBottom: 10 }]}
      >
        <View style={styles.dealTop}>
          <Text style={styles.dealTitle} numberOfLines={2}>
            {deal.title}
          </Text>
          <Text style={[styles.dealAmount, { color }]}>{formatCompactCurrency(deal.amount)}</Text>
        </View>
        {deal.customer ? (
          <Text style={styles.dealMeta} numberOfLines={1}>
            <Ionicons name="business-outline" size={12} /> {deal.customer.name}
          </Text>
        ) : null}
        <View style={styles.dealBottom}>
          {close ? (
            <Text style={[styles.dealMeta, overdue && { color: theme.colors.danger, fontWeight: '700' }]}>
              <Ionicons name="calendar-outline" size={12} /> {relativeDay(close)}
            </Text>
          ) : (
            <Text style={styles.dealMeta}>No close date</Text>
          )}
          {deal.owner ? (
            <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
              <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{deal.owner.name.slice(0, 1).toUpperCase()}</Text>
            </View>
          ) : null}
        </View>
      </PressableScale>
    </FadeInView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    padded: { paddingHorizontal: 16, width: '100%', maxWidth: 1100, alignSelf: 'center' },
    headerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    headerButtonText: { fontSize: 12, fontWeight: '800' },
    kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, marginBottom: 12 },
    kpi: {
      flexGrow: 1,
      flexBasis: '45%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    kpiIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    kpiValue: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
    kpiLabel: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      marginBottom: 14,
    },
    cardTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800', marginBottom: 12 },
    stackBar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendText: { color: theme.colors.textSecondary, fontSize: 12 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    column: {
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.lg,
      padding: 10,
      alignSelf: 'flex-start',
    },
    columnHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 3, paddingTop: 8 },
    columnTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
    countPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    countText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '800' },
    columnValue: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: 10 },
    columnEmpty: { color: theme.colors.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 20 },
    deal: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderLeftWidth: 4,
      padding: 12,
      marginBottom: 8,
      gap: 6,
    },
    dealTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    dealTitle: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '700' },
    dealAmount: { fontSize: 14, fontWeight: '800' },
    dealMeta: { color: theme.colors.textMuted, fontSize: 12 },
    dealBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 11, fontWeight: '800' },
    filters: { gap: 8, paddingBottom: 12 },
    filterChip: {
      paddingHorizontal: 14,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    filterText: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 13 },
    backdrop: { flex: 1, backgroundColor: theme.colors.overlay },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderStrong, marginBottom: 14 },
    sheetTitle: { color: theme.colors.text, fontSize: 19, fontWeight: '800' },
    sheetSub: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4 },
    sheetLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 18, marginBottom: 10 },
    stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    stageButton: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, height: 38, justifyContent: 'center' },
    stageButtonText: { fontWeight: '800', fontSize: 13 },
    error: { color: theme.colors.danger, marginTop: 10 },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 18,
      height: 46,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primaryLight,
    },
    editText: { color: theme.colors.primary, fontWeight: '800' },
  });
}
