import { useId } from 'react';

/**
 * A unique, url()-safe id for SVG gradients/defs. Fixed ids such as
 * "hero" collide when two screens are mounted at once (the stack
 * keeps the previous screen alive), and on web the browser may then
 * resolve url(#hero) to the hidden screen's copy and paint nothing.
 */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
}
