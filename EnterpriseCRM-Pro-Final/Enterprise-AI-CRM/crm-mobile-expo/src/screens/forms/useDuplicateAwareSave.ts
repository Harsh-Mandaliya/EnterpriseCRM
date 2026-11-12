import { describeDuplicates, getDuplicateMatches } from '@/api/client';
import { confirmAction } from '@/utils/confirm';

/**
 * Runs `save(false)`; if the server reports an e-mail/phone
 * duplicate, asks the user and retries with allowDuplicate.
 * Resolves false when the user cancels.
 */
export async function saveWithDuplicateCheck(
  save: (allowDuplicate: boolean) => Promise<unknown>,
  what: string,
): Promise<boolean> {
  try {
    await save(false);
    return true;
  } catch (error) {
    const duplicates = getDuplicateMatches(error);
    if (!duplicates) throw error;
    const proceed = await confirmAction(
      'Possible duplicate',
      `${describeDuplicates(duplicates)}\n\nSave this ${what} anyway?`,
      'Save anyway',
    );
    if (!proceed) return false;
    await save(true);
    return true;
  }
}
