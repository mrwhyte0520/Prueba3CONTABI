import { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  title: string;
  filename?: string;
  url?: string;
  onClose: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
  downloadLabel?: string;
};

export default function DocumentPreviewModal({
  open,
  title,
  filename,
  url,
  onClose,
  onDownload,
  onPrint,
  downloadLabel,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const iframe = iframeRef.current;
    const win = iframe?.contentWindow;
    if (!win) return;
  }, [open, url]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[92vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{title}</h3>
            {filename ? <p className="text-xs text-gray-500 truncate">{filename}</p> : null}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {onDownload ? (
              <button
                onClick={onDownload}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                type="button"
              >
                {downloadLabel || 'Descargar'}
              </button>
            ) : null}
            {onPrint ? (
              <button
                onClick={() => {
                  const win = iframeRef.current?.contentWindow;
                  if (!win) return;
                  win.focus();
                  win.print();
                  onPrint();
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                type="button"
              >
                Imprimir
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors whitespace-nowrap"
              type="button"
            >
              Cerrar
            </button>
          </div>
        </div>
        <div className="flex-1 bg-gray-50">
          {url ? (
            <iframe
              ref={iframeRef}
              title={title}
              src={url}
              className="w-full h-[80vh] bg-white"
            />
          ) : (
            <div className="p-6 text-sm text-gray-600">No hay documento para previsualizar.</div>
          )}
        </div>
      </div>
    </div>
  );
}
