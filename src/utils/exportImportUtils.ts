import { read, utils, writeFile } from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const exportToExcel = (data: any[], fileName: string) => {
  try {
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Datos');
    writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    throw error;
  }
};

// Styled Excel export using ExcelJS (supports header styles, widths, number formats, autofilter, freeze)
export const exportToExcelStyled = async (
  rows: any[],
  columns: Array<{ key: string; title: string; width?: number; numFmt?: string }>,
  fileBaseName: string,
  sheetName: string = 'Datos'
) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  // Header row
  ws.columns = columns.map(col => ({ key: col.key, header: col.title, width: col.width || 14 }));
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  header.alignment = { vertical: 'middle' };

  // Data rows
  rows.forEach(row => {
    const values: Record<string, any> = {};
    columns.forEach(col => {
      values[col.key] = row[col.key];
    });
    ws.addRow(values);
  });

  // Number formats per column
  columns.forEach((col, idx) => {
    if (col.numFmt) {
      const colIndex = idx + 1;
      for (let r = 2; r <= ws.rowCount; r++) {
        const cell = ws.getRow(r).getCell(colIndex);
        if (typeof cell.value === 'number') {
          cell.numFmt = col.numFmt;
        }
      }
    }
  });

  // Autofilter across header range
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length }
  } as any;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${fileBaseName}.xlsx`);
};

export const exportToExcelWithHeaders = (
  rows: any[],
  headers: { key: string; title: string }[],
  fileName: string,
  sheetName: string = 'Datos',
  columnWidths?: number[]
) => {
  try {
    const aoa: any[][] = [];
    // Header row
    aoa.push(headers.map(h => h.title));
    // Data rows in the exact header key order
    for (const row of rows) {
      aoa.push(headers.map(h => row[h.key]));
    }
    const ws = utils.aoa_to_sheet(aoa);
    // Optional: set column widths
    if (columnWidths && columnWidths.length) {
      ws['!cols'] = columnWidths.map(w => ({ wch: w }));
    } else {
      // Autosize roughly based on header length
      ws['!cols'] = headers.map(h => ({ wch: Math.max(12, h.title.length + 2) }));
    }
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, sheetName);
    writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Error al exportar a Excel con cabeceras:', error);
    throw error;
  }
};

// Función para cargar una imagen como base64
const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.height = img.naturalHeight;
        canvas.width = img.naturalWidth;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('No se pudo obtener el contexto 2D del canvas');
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (error) {
        console.error('Error al procesar la imagen:', error);
        // Si hay un error, continuar sin el logo
        resolve('');
      }
    };
    
    img.onerror = () => {
      console.warn('No se pudo cargar el logo, se generará el PDF sin él');
      resolve('');
    };
    
    img.src = url;
  });
};

export const exportToPdf = async (data: any[], columns: any[], fileName: string, companyName: string = 'ContaBi') => {
  try {
    // Verificar si hay datos
    if (!data || data.length === 0) {
      console.error('No hay datos para exportar');
      throw new Error('No hay datos para exportar');
    }

    // Verificar las columnas
    if (!columns || columns.length === 0) {
      console.error('No se definieron columnas para la exportación');
      throw new Error('No se definieron columnas para la exportación');
    }

    const doc = new jsPDF();
    let startY = 20; // Posición Y inicial para el contenido
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Omitir el logo por ahora para simplificar
    console.log('Iniciando generación de PDF...');
    
    // Configurar estilos para el título
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    
    // Posicionar el título centrado
    const title = companyName || 'Reporte de Cotizaciones';
    doc.text(title, 14, 20);
    
    // Línea divisoria
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 25, pageWidth - 14, 25);
    
    // Fecha de generación
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    const date = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generado el: ${date}`, 14, 35);
    
    startY = 45; // Posición inicial para la tabla

    // Preparar datos para la tabla
    console.log('Preparando datos para la tabla...');
    console.log('Columnas:', columns);
    console.log('Datos de ejemplo:', data[0]);
    
    const tableData = data.map(item => 
      columns.map(col => {
        const value = item[col.key];
        // Manejar valores undefined o null
        if (value === undefined || value === null) return '';
        // Formatear números con separadores de miles
        if (typeof value === 'number') {
          return value.toLocaleString('es-ES');
        }
        return String(value);
      })
    );

    console.log('Datos de la tabla preparados:', tableData.slice(0, 2));

    // Agregar tabla
    console.log('Agregando tabla al PDF...');
    (doc as any).autoTable({
      head: [columns.map(col => col.label || col.key)],
      body: tableData,
      startY: startY,
      margin: { top: startY, right: 10, bottom: 20, left: 10 },
      styles: { 
        fontSize: 8,
        cellPadding: 3,
        lineColor: [220, 220, 220],
        textColor: [40, 40, 40],
        overflow: 'linebreak',
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        textPadding: { top: 2, right: 2, bottom: 2, left: 2 }
      },
      bodyStyles: {
        textPadding: { top: 2, right: 2, bottom: 2, left: 2 }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didDrawPage: function(data: any) {
        // Pie de página
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        
        // Solo mostrar número de página si hay más de una página
        if (data.pageCount > 1) {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Página ${data.pageNumber} de ${data.pageCount}`, 
            pageSize.width / 2, 
            pageHeight - 10,
            { align: 'center' }
          );
        }
        
        // Marca de agua sutil solo en la primera página y si hay espacio suficiente
        if (data.pageNumber === 1 && pageHeight > 400) {
          doc.setFontSize(60);
          doc.setTextColor(245, 245, 245);
          doc.text(
            companyName || 'Confidencial', 
            pageSize.width / 2, 
            pageHeight / 2, 
            { 
              align: 'center', 
              angle: 45
            }
          );
        }
        
        // Restaurar color de texto
        doc.setTextColor(0, 0, 0);
      }
    });

    // Generar nombre de archivo con fecha
    const formattedDate = new Date().toISOString().split('T')[0];
    const pdfFileName = `${fileName}_${formattedDate}.pdf`;
    
    console.log('Guardando PDF como:', pdfFileName);
    
    // Guardar el PDF
    doc.save(pdfFileName);
    
    console.log('PDF generado exitosamente');
    return true;
  } catch (error) {
    console.error('Error al exportar a PDF:', error);
    // Crear un PDF de error como respaldo
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Error al generar el informe', 20, 20);
      doc.setFontSize(12);
      doc.text('Ocurrió un error al generar el PDF. Por favor, intente nuevamente.', 20, 40);
      doc.text(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`, 20, 50);
      doc.save(`error_${new Date().getTime()}.pdf`);
    } catch (e) {
      console.error('Error al generar PDF de error:', e);
    }
    
    throw error;
  }
};

export const importFromExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Error al procesar el archivo Excel'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };
      
      reader.readAsBinaryString(file);
    } catch (error) {
      reject(error);
    }
  });
};
