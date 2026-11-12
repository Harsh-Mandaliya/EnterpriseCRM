import React from 'react';
import { View } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';

/**
 * Lays children out in 1 column on phones and 2–3 on tablets / web.
 * Pass `columns` to force a count (e.g. 1 for full-width sections).
 */
export function ResponsiveGrid({ children, gap = 12, columns }: { children: React.ReactNode; gap?: number; columns?: number }) {
  const r = useResponsive();
  const cols = columns ?? r.columns;
  const items = React.Children.toArray(children).filter(Boolean);
  if (cols <= 1) return <View>{items}</View>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2 }}>
      {items.map((child, i) => (
        <View key={(child as { key?: string }).key ?? i} style={{ width: `${100 / cols}%`, paddingHorizontal: gap / 2 }}>
          {child}
        </View>
      ))}
    </View>
  );
}
