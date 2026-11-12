import { Alert, Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';

/* ============================================================
   PDF export — phone (iOS / Android).
   The web build uses pdfExport.web.ts instead (Metro picks the
   .web.ts file automatically).

   Uses the SDK 58 File / Directory API. The previous version used
   "expo-file-system/legacy", whose native module can be missing at
   runtime, so moving the file threw and the user only saw
   "Could not create the PDF".

   1. expo-print renders the HTML into a real PDF file (the only step
      allowed to fail the export).
   2. Best effort: copy it to a readable name (INV-0004.pdf).
   3. Android: save into the folder the user picked once (Downloads),
      remembered for next time.
   4. If saving isn't possible (iOS, folder not chosen, permission
      gone), open the share sheet ("Save to Files", WhatsApp, Mail…).
============================================================ */

export type PdfResult = 'downloaded' | 'saved' | 'shared';

const DIR_KEY = 'crm.pdfDownloadDir';

export function safePdfName(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, '').replace(/[^\w.\- ]+/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${base || 'document'}.pdf`;
}

function warn(step: string, err: unknown) {
  // Visible in the Expo terminal; never shown as a failure to the user.
  console.warn(`[PDF] ${step} failed:`, err instanceof Error ? err.message : err);
}

/** Copies the generated file to a readable name; returns the original on failure. */
async function withReadableName(source: File, name: string): Promise<File> {
  try {
    const target = new File(Paths.cache, name);
    if (target.exists) target.delete();
    await source.copy(target);
    return target;
  } catch (err) {
    warn('rename', err);
    return source;
  }
}

async function share(file: File, name: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: name, UTI: 'com.adobe.pdf' });
  } else {
    Alert.alert('PDF ready', `${name} was created, but sharing is not available on this device.`);
  }
}

async function pickDownloadsFolder(): Promise<Directory | null> {
  const saved = await SecureStore.getItemAsync(DIR_KEY).catch(() => null);
  if (saved) {
    try {
      return new Directory(saved);
    } catch (err) {
      warn('open saved folder', err);
      await SecureStore.deleteItemAsync(DIR_KEY).catch(() => undefined);
    }
  }
  try {
    const dir = await Directory.pickDirectoryAsync();
    if (!dir?.uri) return null;
    await SecureStore.setItemAsync(DIR_KEY, dir.uri).catch(() => undefined);
    return dir;
  } catch (err) {
    warn('pick folder', err); // user cancelled or not supported
    return null;
  }
}

/** Android: writes the PDF into the chosen folder. */
async function saveToFolder(file: File, name: string): Promise<boolean> {
  const dir = await pickDownloadsFolder();
  if (!dir) return false;
  try {
    const out = dir.createFile(name.replace(/\.pdf$/i, ''), 'application/pdf');
    await out.write(await file.bytes());
    return true;
  } catch (err) {
    warn('save to folder', err);
    // Permission revoked or folder gone: ask again next time.
    await SecureStore.deleteItemAsync(DIR_KEY).catch(() => undefined);
    return false;
  }
}

export async function exportPdf(html: string, fileName: string): Promise<PdfResult> {
  const name = safePdfName(fileName);

  // The only step that can make the export fail.
  const { uri } = await Print.printToFileAsync({ html });
  const file = await withReadableName(new File(uri), name);

  if (Platform.OS === 'android' && (await saveToFolder(file, name))) {
    Alert.alert('PDF downloaded', `${name} is saved in the folder you chose (Downloads).`, [
      { text: 'Share', onPress: () => void share(file, name).catch(err => warn('share', err)) },
      { text: 'OK', style: 'cancel' },
    ]);
    return 'saved';
  }

  await share(file, name);
  return 'shared';
}
