import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

/* Phone PDF export (v1.4.3): every step after the PDF exists falls
   back to the share sheet instead of failing the whole export. */

const mockPrint = jest.fn<(o: { html: string }) => Promise<{ uri: string }>>();
const mockShare = jest.fn<(uri: string, o?: unknown) => Promise<void>>();
const mockStore = new Map<string, string>();
const mockFs = { copyFails: false, pickResult: 'content://downloads' as string | null, writeFails: false };
const mockWritten: string[] = [];

jest.mock('expo-print', () => ({ printToFileAsync: (o: { html: string }) => mockPrint(o) }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: () => Promise.resolve(true), shareAsync: (u: string, o?: unknown) => mockShare(u, o) }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: (k: string) => Promise.resolve(mockStore.get(k) ?? null),
  setItemAsync: (k: string, v: string) => Promise.resolve(void mockStore.set(k, v)),
  deleteItemAsync: (k: string) => Promise.resolve(void mockStore.delete(k)),
}));
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    exists = false;
    constructor(...parts: unknown[]) {
      this.uri = parts.map(p => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/');
    }
    delete() {}
    async copy() {
      if (mockFs.copyFails) throw new Error('copy not available');
    }
    async bytes() {
      return new Uint8Array([37, 80, 68, 70]);
    }
    async write() {
      if (mockFs.writeFails) throw new Error('permission revoked');
      mockWritten.push(this.uri);
    }
  }
  class Directory {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    static async pickDirectoryAsync() {
      if (!mockFs.pickResult) throw new Error('cancelled');
      return new Directory(mockFs.pickResult);
    }
    createFile(name: string) {
      return new File(this.uri, `${name}.pdf`);
    }
  }
  return { File, Directory, Paths: { cache: { uri: 'file:///cache' } } };
});

import { Alert } from 'react-native';
import { exportPdf } from '@/utils/pdfExport';

const setOS = (os: 'ios' | 'android') => Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

beforeEach(() => {
  mockPrint.mockReset().mockResolvedValue({ uri: 'file:///cache/Print/abc123.pdf' });
  mockShare.mockReset().mockResolvedValue(undefined);
  mockStore.clear();
  mockWritten.length = 0;
  Object.assign(mockFs, { copyFails: false, pickResult: 'content://downloads', writeFails: false });
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

describe('phone PDF export', () => {
  it('iPhone: shares a readable file name', async () => {
    setOS('ios');
    await expect(exportPdf('<p>x</p>', 'INV-0004.pdf')).resolves.toBe('shared');
    expect(mockShare).toHaveBeenCalledWith('file:///cache/INV-0004.pdf', expect.objectContaining({ mimeType: 'application/pdf' }));
  });

  it('a failing rename no longer breaks the export (the old bug)', async () => {
    setOS('ios');
    mockFs.copyFails = true;
    await expect(exportPdf('<p>x</p>', 'INV-0004.pdf')).resolves.toBe('shared');
    expect(mockShare).toHaveBeenCalledWith('file:///cache/Print/abc123.pdf', expect.anything());
  });

  it('Android: saves into the chosen folder and remembers it', async () => {
    setOS('android');
    await expect(exportPdf('<p>x</p>', 'Receipt INV-0004')).resolves.toBe('saved');
    expect(mockWritten).toEqual(['content://downloads/Receipt-INV-0004.pdf']);
    expect(mockStore.get('crm.pdfDownloadDir')).toBe('content://downloads');
    expect(Alert.alert).toHaveBeenCalledWith('PDF downloaded', expect.stringContaining('Receipt-INV-0004.pdf'), expect.anything());
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('Android: no folder chosen or write refused → share sheet instead of an error', async () => {
    setOS('android');
    mockFs.pickResult = null;
    await expect(exportPdf('<p>x</p>', 'report')).resolves.toBe('shared');
    mockFs.pickResult = 'content://downloads';
    mockFs.writeFails = true;
    await expect(exportPdf('<p>x</p>', 'report')).resolves.toBe('shared');
    expect(mockStore.has('crm.pdfDownloadDir')).toBe(false); // asks again next time
    expect(mockShare).toHaveBeenCalledTimes(2);
  });

  it('only a failure to create the PDF itself is reported', async () => {
    setOS('ios');
    mockPrint.mockRejectedValueOnce(new Error('print failed'));
    await expect(exportPdf('<p>x</p>', 'x')).rejects.toThrow('print failed');
  });
});
