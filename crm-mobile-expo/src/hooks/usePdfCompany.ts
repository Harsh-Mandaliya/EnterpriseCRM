import { useCallback } from 'react';

import { getBranding } from '@/api/company.api';
import { useAppSelector } from '@/hooks/useRedux';
import { useTheme } from '@/theme/ThemeProvider';
import type { PdfCompany } from '@/utils/pdf';

/**
 * Company details for printed documents: name, billing block
 * (address, GSTIN, bank) and the brand colour. Billing is fetched
 * fresh so a just-edited address is used.
 */
export function usePdfCompany(): () => Promise<PdfCompany> {
  const branding = useAppSelector(state => state.branding.data);
  const theme = useTheme();
  return useCallback(async () => {
    let billing = branding?.company?.billing ?? null;
    let name = branding?.company?.name ?? 'Company';
    try {
      const fresh = await getBranding();
      billing = fresh.company.billing ?? billing;
      name = fresh.company.name ?? name;
    } catch {
      /* offline: use what we have */
    }
    return { name, billing, primaryColor: theme.colors.primary };
  }, [branding, theme.colors.primary]);
}
