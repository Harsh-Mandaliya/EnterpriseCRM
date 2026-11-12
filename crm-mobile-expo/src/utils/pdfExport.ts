import { Alert, Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';

/* ============================================================
   PDF export — phone (iOS / Android).
   The web build uses pdfExport.web.ts instead (Metro picks the
   .web.ts file automatically).

   expo-print writes its PDF into a folder this app is NOT allowed to
   read with the SDK 58 file API inside Expo Go ("Missing 'READ'
   permission"), which left 0-byte files and "Could not create the
   PDF". So the printer now returns the PDF as base64 data and the app
   writes that data itself:

   1. expo-print renders the PDF and returns its bytes (base64).
   2. The bytes are written to the app's own cache as INV-0004.pdf.
   3. Android: the bytes are also written into the folder the user
      picked once (e.g. Downloads), remembered for next time.
   4. Otherwise (iOS, no folder) the share sheet opens with the file.
============================================================ */

export type PdfResult = 'downloaded' | 'saved' | 'shared';

const DIR_KEY = 'crm.pdfDownloadDir';

export function safePdfName(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, '').replace(/[^\w.\- ]+/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${base || 'document'}.pdf`;
}

function warn(step: string, err: unknown) {
  // Visible in the Expo terminal.
  console.warn(`[PDF] ${step} failed:`, err instanceof Error ? err.message : err);
}

/** Writes the PDF bytes to the app's own cache so it can be shared. */
async function writeToCache(base64: string, name: string): Promise<File | null> {
  try {
    const file = new File(Paths.cache, name);
    file.create({ overwrite: true });
    await file.write(base64, { encoding: 'base64' });
    return file;
  } catch (err) {
    warn('write to app cache', err);
    return null;
  }
}

async function chosenFolder(): Promise<Directory | null> {
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
    warn('pick folder', err); // cancelled or not supported
    return null;
  }
}

/** Android: writes the PDF bytes into the chosen folder (e.g. Downloads). */
async function saveToFolder(base64: string, name: string): Promise<boolean> {
  const dir = await chosenFolder();
  if (!dir) return false;
  let out: File | null = null;
  try {
    out = dir.createFile(name.replace(/\.pdf$/i, ''), 'application/pdf');
    await out.write(base64, { encoding: 'base64' });
    return true;
  } catch (err) {
    warn('save to folder', err);
    // Never leave an empty 0-byte PDF behind.
    try {
      out?.delete();
    } catch {
      /* ignore */
    }
    await SecureStore.deleteItemAsync(DIR_KEY).catch(() => undefined);
    return false;
  }
}

async function share(uri: string, name: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: name, UTI: 'com.adobe.pdf' });
}

export async function exportPdf(html: string, fileName: string): Promise<PdfResult> {
  const name = safePdfName(fileName);

  const printed = await Print.printToFileAsync({ html, base64: true });
  const base64 = printed.base64;
  if (!base64) throw new Error('The PDF could not be generated.');

  const local = await writeToCache(base64, name);

  if (Platform.OS === 'android' && (await saveToFolder(base64, name))) {
    Alert.alert('PDF downloaded', `${name} is saved in the folder you chose.`, [
      ...(local ? [{ text: 'Share', onPress: () => void share(local.uri, name).catch(err => warn('share', err)) }] : []),
      { text: 'OK', style: 'cancel' as const },
    ]);
    return 'saved';
  }

  // iOS, or no folder: hand the file to the share sheet ("Save to Files", WhatsApp…).
  await share(local?.uri ?? printed.uri, name);
  return 'shared';
}
