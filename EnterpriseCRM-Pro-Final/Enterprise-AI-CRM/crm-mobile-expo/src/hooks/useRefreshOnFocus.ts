import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

/**
 * Re-runs `refresh` whenever the screen regains focus (e.g. after
 * returning from a create/edit form). The first focus is skipped
 * because screens already load on mount.
 */
export function useRefreshOnFocus(refresh: () => unknown) {
  const navigation = useNavigation();
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const firstFocus = useRef(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refreshRef.current();
    });
    return unsubscribe;
  }, [navigation]);
}
