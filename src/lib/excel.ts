import * as XLSX from 'xlsx';

export type ExcelColumn = {
  header: string;
  width?: number; // width in characters
  key?: string; // optional key for mapping objects
  numFmt?: string; // Excel number format
};

export function exportToExcel(options: {
  sheetName: string;
  fileName: string; // without extension
  columns: ExcelColumn[];
  rows: Array<Array<any> | Record<string, any>>; // array of arrays or objects
  freezeHeader?: boolean;
}): void {
  const { sheetName, fileName, columns, rows, freezeHeader = true } = options;

  const header = columns.map(c => c.header);

  // Normalize rows to 2D array
  const asArrayRows: any[][] = rows.map(r => {
    if (Array.isArray(r)) return r;
    return columns.map(c => (c.key ? (r as any)[c.key!] : ''));
  });

  const aoa = [header, ...asArrayRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws['!cols'] = columns.map(c => ({ wch: c.width ?? 12 }));

  // Apply number formats per column if specified
  for (let rowIdx = 1; rowIdx < aoa.length; rowIdx++) {
    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      const fmt = columns[colIdx].numFmt;
      if (!fmt) continue;
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
      const cell = ws[cellRef];
      if (cell) {
        cell.t = typeof cell.v === 'number' ? 'n' : cell.t;
        (cell as any).z = fmt;
      }
    }
  }

  // Freeze header
  if (freezeHeader) {
    (ws as any)['!freeze'] = { rows: 1, columns: 0 };
  }

  // Build workbook and download
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
