import { useWindowDimensions } from 'react-native';

/**
 * Breakpoints shared by the screens (v1.4.1).
 *   phone   < 600   one column, compact paddings
 *   tablet  600–1023 two columns
 *   desktop ≥ 1024  two or three columns, wider max content width
 */
export function breakpointsFor(width: number) {
  const isSmallPhone = width < 360;
  const isTablet = width >= 600;
  const isDesktop = width >= 1024;
  return {
    width,
    isSmallPhone,
    isTablet,
    isDesktop,
    /** Columns for card grids. */
    columns: isDesktop ? (width >= 1360 ? 3 : 2) : isTablet ? 2 : 1,
    /** KPI tiles per row. */
    kpiColumns: width >= 900 ? 4 : 2,
    /** Horizontal page padding. */
    gutter: isSmallPhone ? 12 : isTablet ? 24 : 16,
    /** Max width for page content. */
    maxWidth: isDesktop ? 1200 : 900,
  };
}

export function useResponsive() {
  const { width } = useWindowDimensions();
  return breakpointsFor(width);
}
