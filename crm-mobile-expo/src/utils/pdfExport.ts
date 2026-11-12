import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';

/* ============================================================
   PDF export — phone (iOS / Android).
   The web build uses pdfExport.web.ts instead (Metro picks the
   .web.ts file automatically).

   1. expo-print renders the HTML into a real PDF file.
   2. The file gets a readable name (INV-0004.pdf).
   3. Android: saved into the Downloads folder the user picked once
      (remembered); then they can also share it.
      iOS / no folder: the share sheet opens ("Save to Files",
      WhatsApp, Mail…).
============================================================ */

export type PdfResult = 'downloaded' | 'saved' | 'shared';

const DIR_KEY = 'crm.pdfDownloadDir';

export function safePdfName(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, '').replace(/[^\w.\- ]+/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${base || 'document'}.pdf`;
}

async function shareFile(uri: string, name: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: name, UTI: 'com.adobe.pdf' });
  } else {
    Alert.alert('PDF ready', `${name} was created, but sharing is not available on this device.`);
  }
}

async function androidDownloadsDir(): Promise<string | null> {
  const saved = await SecureStore.getItemAsync(DIR_KEY).catch(() => null);
  if (saved) return saved;
  const SAF = FileSystem.StorageAccessFramework;
  const permission = await SAF.requestDirectoryPermissionsAsync(SAF.getUriForDirectoryInRoot('Download'));
  if (!permission.granted) return null;
  await SecureStore.setItemAsync(DIR_KEY, permission.directoryUri).catch(() => undefined);
  return permission.directoryUri;
}

async function saveToAndroidDownloads(localUri: string, name: string): Promise<boolean> {
  const SAF = FileSystem.StorageAccessFramework;
  const dir = await androidDownloadsDir();
  if (!dir) return false;
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  let target: string;
  try {
    target = await SAF.createFileAsync(dir, name.replace(/\.pdf$/i, ''), 'application/pdf');
  } catch {
    // Folder permission was revoked: forget it and ask again next time.
    await SecureStore.deleteItemAsync(DIR_KEY).catch(() => undefined);
    return false;
  }
  await FileSystem.writeAsStringAsync(target, base64, { encoding: FileSystem.EncodingType.Base64 });
  return true;
}

export async function exportPdf(html: string, fileName: string): Promise<PdfResult> {
  const name = safePdfName(fileName);
  const { uri } = await Print.printToFileAsync({ html });

  // Give the file a readable name before saving or sharing it.
  let file = uri;
  if (FileSystem.cacheDirectory) {
    file = `${FileSystem.cacheDirectory}${name}`;
    await FileSystem.deleteAsync(file, { idempotent: true });
    await FileSystem.moveAsync({ from: uri, to: file });
  }

  if (Platform.OS === 'android') {
    const saved = await saveToAndroidDownloads(file, name).catch(() => false);
    if (saved) {
      Alert.alert('PDF downloaded', `${name} is saved in your Downloads folder.`, [
        { text: 'Share', onPress: () => void shareFile(file, name) },
        { text: 'OK', style: 'cancel' },
      ]);
      return 'saved';
    }
  }

  await shareFile(file, name);
  return 'shared';
}
