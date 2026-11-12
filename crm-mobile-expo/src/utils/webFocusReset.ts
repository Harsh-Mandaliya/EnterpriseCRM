import { Platform } from 'react-native';

/**
 * Web build only: browsers draw their own focus ring (a coloured box)
 * around every text field. The app shows no focus box at all, so it is
 * removed once for all inputs, text areas and selects.
 */
export function installWebFocusReset(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('crm-focus-reset')) return;
  const style = document.createElement('style');
  style.id = 'crm-focus-reset';
  style.textContent =
    'input, textarea, select, input:focus, textarea:focus, select:focus, input:focus-visible, textarea:focus-visible { outline: none !important; box-shadow: none !important; }';
  document.head.appendChild(style);
}
