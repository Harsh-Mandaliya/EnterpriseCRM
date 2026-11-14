import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { useSvgId } from '@/hooks/useSvgId';

/** Small trend line with a soft gradient fill. */
export function Sparkline({
  values,
  width = 120,
  height = 36,
  color,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const theme = useTheme();
  const stroke = color ?? theme.colors.primary;
  const id = useSvgId('spark');

  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((v, i) => [i * step, height - 3 - ((v - min) / span) * (height - 6)] as const);

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <Svg width={width} height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
          <Stop offset="1" stopColor={stroke} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${id})`} />
      <Path d={line} stroke={stroke} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
