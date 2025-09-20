import { saveAs } from 'file-saver';

export const downloadFile = (blob: Blob, filename: string): void => {
  saveAs(blob, filename);
};

export const downloadText = (text: string, filename: string): void => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadFile(blob, filename);
};

export const downloadJSON = (data: any, filename: string): void => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadFile(blob, filename);
};

export const downloadCSV = (
  data: Array<Record<string, any>>,
  filename: string
): void => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (
            typeof value === 'string' &&
            (value.includes(',') || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  downloadFile(blob, filename);
};

export const generateFilename = (
  prefix: string,
  extension: string,
  timestamp?: Date
): string => {
  const now = timestamp || new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `${prefix}_${dateStr}_${timeStr}.${extension}`;
};

export const downloadCanvasAsImage = (
  canvas: HTMLCanvasElement,
  filename: string,
  quality: number = 0.9
): void => {
  canvas.toBlob(
    (blob) => {
      if (blob) {
        downloadFile(blob, filename);
      }
    },
    'image/png',
    quality
  );
};
