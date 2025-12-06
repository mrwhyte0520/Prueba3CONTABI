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
  mergeTopRows?: number; // how many initial data rows (after header) to merge across all columns
}): void {
  const { sheetName, fileName, columns, rows, freezeHeader = true, mergeTopRows } = options;

  const header = columns.map(c => c.header);

  // Normalize rows to 2D array
  const asArrayRows: any[][] = rows.map(r => {
    if (Array.isArray(r)) return r;
    return columns.map(c => (c.key ? (r as any)[c.key!] : ''));
  });

  const aoa = [header, ...asArrayRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Optionally merge the first N data rows (after the header row) across all columns.
  // This is useful for centered titles/headers that span the full width of the report.
  if (mergeTopRows && mergeTopRows > 0) {
    const merges: any[] = (ws as any)['!merges'] || [];
    for (let i = 0; i < mergeTopRows; i++) {
      const rowIndex = 1 + i; // skip header row at index 0

      merges.push({
        s: { r: rowIndex, c: 0 },
        e: { r: rowIndex, c: columns.length - 1 },
      });

      const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
      const cell = (ws as any)[cellRef];
      if (cell) {
        const existingStyle = (cell as any).s || {};
        (cell as any).s = {
          ...existingStyle,
          alignment: {
            ...(existingStyle.alignment || {}),
            horizontal: 'center',
            vertical: 'center',
          },
          font: {
            ...(existingStyle.font || {}),
            bold: true,
          },
        };
      }
    }
    (ws as any)['!merges'] = merges;
  }

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
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true as any });
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
