import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert, Platform } from 'react-native';

/* Phone PDF export (v1.4.3). In Expo Go the app may not READ the file
   expo-print writes, so the PDF bytes come back as base64 and the app
   writes them itself — never a 0-byte file, never reading the print
   file. */

const mockPrint = jest.fn<(o: { html: string; base64?: boolean }) => Promise<{ uri: string; base64?: string }>>();
const mockShare = jest.fn<(uri: string, o?: unknown) => Promise<void>>();
const mockStore = new Map<string, string>();
const mockFs = { pickResult: 'content://downloads' as string | null, folderWriteFails: false, cacheWriteFails: false };
const mockWrites: { uri: string; data: string; encoding?: string }[] = [];
const mockDeleted: string[] = [];

jest.mock('expo-print', () => ({ printToFileAsync: (o: { html: string; base64?: boolean }) => mockPrint(o) }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: () => Promise.resolve(true), shareAsync: (u: string, o?: unknown) => mockShare(u, o) }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: (k: string) => Promise.resolve(mockStore.get(k) ?? null),
  setItemAsync: (k: string, v: string) => Promise.resolve(void mockStore.set(k, v)),
  deleteItemAsync: (k: string) => Promise.resolve(void mockStore.delete(k)),
}));
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = parts.map(p => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/');
    }
    create() {}
    delete() {
      mockDeleted.push(this.uri);
    }
    async copy() {
      throw new Error("Missing 'READ' permission for accessing the file.");
    }
    async bytes(): Promise<Uint8Array> {
      throw new Error("Missing 'READ' permission for accessing the file.");
    }
    async write(data: string, opts?: { encoding?: string }) {
      const isFolder = this.uri.startsWith('content://');
      if ((isFolder && mockFs.folderWriteFails) || (!isFolder && mockFs.cacheWriteFails)) throw new Error('write refused');
      mockWrites.push({ uri: this.uri, data, encoding: opts?.encoding });
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

import { exportPdf } from '@/utils/pdfExport';

const setOS = (os: 'ios' | 'android') => Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
const PDF = 'JVBERi0xLjQK'; // "%PDF-1.4\n"

beforeEach(() => {
  mockPrint.mockReset().mockResolvedValue({ uri: 'file:///expo-go-cache/Print/abc.pdf', base64: PDF });
  mockShare.mockReset().mockResolvedValue(undefined);
  mockStore.clear();
  mockWrites.length = 0;
  mockDeleted.length = 0;
  Object.assign(mockFs, { pickResult: 'content://downloads', folderWriteFails: false, cacheWriteFails: false });
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

describe('phone PDF export', () => {
  it('asks the printer for the bytes and never reads its file (the Expo Go READ-permission bug)', async () => {
    setOS('ios');
    await expect(exportPdf('<p>x</p>', 'INV-0003.pdf')).resolves.toBe('shared');
    expect(mockPrint).toHaveBeenCalledWith(expect.objectContaining({ base64: true }));
    expect(mockWrites).toEqual([{ uri: 'file:///cache/INV-0003.pdf', data: PDF, encoding: 'base64' }]);
    expect(mockShare).toHaveBeenCalledWith('file:///cache/INV-0003.pdf', expect.objectContaining({ mimeType: 'application/pdf' }));
  });

  it('Android: writes the real bytes into the chosen folder (no 0-byte file) and remembers it', async () => {
    setOS('android');
    await expect(exportPdf('<p>x</p>', 'INV-0003')).resolves.toBe('saved');
    expect(mockWrites).toContainEqual({ uri: 'content://downloads/INV-0003.pdf', data: PDF, encoding: 'base64' });
    expect(mockStore.get('crm.pdfDownloadDir')).toBe('content://downloads');
    expect(Alert.alert).toHaveBeenCalledWith('PDF downloaded', expect.stringContaining('INV-0003.pdf'), expect.anything());
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('Android: a failed folder write deletes the empty file and falls back to sharing', async () => {
    setOS('android');
    mockFs.folderWriteFails = true;
    await expect(exportPdf('<p>x</p>', 'report')).resolves.toBe('shared');
    expect(mockDeleted).toContain('content://downloads/report.pdf');
    expect(mockStore.has('crm.pdfDownloadDir')).toBe(false);
    expect(mockShare).toHaveBeenCalledWith('file:///cache/report.pdf', expect.anything());
  });

  it('Android: folder picker cancelled → share sheet', async () => {
    setOS('android');
    mockFs.pickResult = null;
    await expect(exportPdf('<p>x</p>', 'report')).resolves.toBe('shared');
    expect(mockShare).toHaveBeenCalledTimes(1);
  });

  it('if even the app cache write fails, the printed file is shared directly', async () => {
    setOS('ios');
    mockFs.cacheWriteFails = true;
    await expect(exportPdf('<p>x</p>', 'x')).resolves.toBe('shared');
    expect(mockShare).toHaveBeenCalledWith('file:///expo-go-cache/Print/abc.pdf', expect.anything());
  });

  it('reports only a real failure to create the PDF', async () => {
    setOS('ios');
    mockPrint.mockRejectedValueOnce(new Error('print failed'));
    await expect(exportPdf('<p>x</p>', 'x')).rejects.toThrow('print failed');
    mockPrint.mockResolvedValueOnce({ uri: 'file:///x.pdf' });
    await expect(exportPdf('<p>x</p>', 'x')).rejects.toThrow('could not be generated');
  });
});
