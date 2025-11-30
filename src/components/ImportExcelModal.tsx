import { useState } from 'react';
import { importFromExcel } from '../utils/exportImportUtils';
import { toast } from 'sonner';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => Promise<void>;
  templateHeaders: { key: string; title: string }[];
  moduleName: string;
  onDownloadTemplate?: () => void;
}

export default function ImportExcelModal({
  isOpen,
  onClose,
  onImport,
  templateHeaders,
  moduleName,
  onDownloadTemplate
}: ImportExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('Por favor seleccione un archivo Excel (.xlsx o .xls)');
      return;
    }

    setFile(selectedFile);
    
    try {
      toast.loading('Procesando archivo...');
      const data = await importFromExcel(selectedFile);
      
      if (!data || data.length === 0) {
        toast.dismiss();
        toast.error('El archivo está vacío o no contiene datos válidos');
        return;
      }

      setPreviewData(data);
      setStep('preview');
      toast.dismiss();
      toast.success(`${data.length} registros cargados para revisión`);
    } catch (error) {
      toast.dismiss();
      toast.error('Error al leer el archivo Excel');
      console.error(error);
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    setIsProcessing(true);
    try {
      await onImport(previewData);
      toast.success(`${previewData.length} registros importados exitosamente`);
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al importar los datos');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setStep('upload');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Importar {moduleName} desde Excel
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        {step === 'upload' ? (
          <div className="space-y-6">
            {/* Instrucciones */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                <i className="ri-information-line mr-2"></i>
                Instrucciones
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Descargue la plantilla de Excel haciendo clic en el botón de abajo</li>
                <li>Complete los datos en la plantilla sin modificar los encabezados</li>
                <li>Guarde el archivo y súbalo usando el botón "Seleccionar Archivo"</li>
                <li>Revise los datos en la vista previa antes de importar</li>
              </ul>
            </div>

            {/* Botón descargar plantilla */}
            {onDownloadTemplate && (
              <button
                onClick={onDownloadTemplate}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <i className="ri-file-excel-line text-xl"></i>
                <span>Descargar Plantilla de Excel</span>
              </button>
            )}

            {/* Selector de archivo */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <i className="ri-upload-cloud-2-line text-6xl text-gray-400 mb-4"></i>
              <p className="text-gray-600 mb-4">
                Arrastra un archivo Excel aquí o haz clic para seleccionar
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer inline-block"
              >
                Seleccionar Archivo Excel
              </label>
            </div>

            {/* Columnas esperadas */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">
                Columnas esperadas en la plantilla:
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {templateHeaders.map((header, idx) => (
                  <div
                    key={idx}
                    className="bg-white px-3 py-2 rounded border border-gray-200 text-sm text-gray-700"
                  >
                    <i className="ri-checkbox-circle-line text-green-500 mr-1"></i>
                    {header.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Vista previa */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2 flex items-center">
                <i className="ri-eye-line mr-2"></i>
                Vista Previa de Datos ({previewData.length} registros)
              </h4>
              <p className="text-sm text-yellow-800">
                Revise los datos antes de importar. Los campos vacíos o inválidos pueden causar errores.
              </p>
            </div>

            {/* Tabla de vista previa */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      {Object.keys(previewData[0] || {}).map((key, idx) => (
                        <th
                          key={idx}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        {Object.values(row).map((value: any, valIdx) => (
                          <td
                            key={valIdx}
                            className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap"
                          >
                            {value !== null && value !== undefined ? String(value) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.length > 10 && (
                <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 text-center border-t">
                  Mostrando 10 de {previewData.length} registros
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex space-x-3">
              <button
                onClick={() => setStep('upload')}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={isProcessing}
              >
                <i className="ri-arrow-left-line mr-2"></i>
                Volver
              </button>
              <button
                onClick={handleImport}
                disabled={isProcessing}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Importando...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line mr-2"></i>
                    Importar {previewData.length} Registros
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
