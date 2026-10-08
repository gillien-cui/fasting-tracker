import { format } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { csvToFasts, fastsToCsv, type CsvImport } from './csv';
import type { Fast } from './fasts';

/** Writes every fast to a CSV file and opens the share sheet (or downloads it on the web). */
export async function exportCsv(fasts: Fast[]): Promise<void> {
  const csv = fastsToCsv(fasts);
  const name = `fasting-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(csv);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export fasting history' });
}

/** Lets the person pick a CSV backup and parses it. Resolves null if they back out. */
export async function pickCsv(): Promise<CsvImport | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  const uri = result.assets[0].uri;
  const text = Platform.OS === 'web' ? await (await fetch(uri)).text() : await new File(uri).text();
  return csvToFasts(text);
}
