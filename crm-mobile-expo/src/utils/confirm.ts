import { Alert, Platform } from 'react-native';

/**
 * Asks the user to confirm a destructive action.
 * Uses the native alert on iOS/Android and window.confirm on web
 * (react-native-web does not implement Alert buttons).
 */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel = 'Confirm',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    const confirmFn = (globalThis as { confirm?: (text: string) => boolean }).confirm;
    return Promise.resolve(confirmFn ? confirmFn(`${title}\n\n${message}`) : true);
  }

  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
