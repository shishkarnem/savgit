import React, { useState, useEffect } from 'react';
import {
  Link2,
  X,
  FileSpreadsheet,
  FileText,
  Loader2,
  Globe,
  SlidersHorizontal,
  Info,
  AlertCircle
} from 'lucide-react';
import { RealisticSmokeBackdrop } from '../RealisticSmokeBackdrop';

interface GoogleDocLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    url: string;
    file_type: string;
    sheet_number: number;
    sheet_name: string;
  }) => void;
  isLoading?: boolean;
}

const SUPPORTED_FORMATS = [
  { id: 'pdf', label: '.pdf', name: 'PDF документ' },
  { id: 'doc', label: '.doc', name: 'Word документ' },
  { id: 'docx', label: '.docx', name: 'Word DOCX' },
  { id: 'xls', label: '.xls', name: 'Excel таблица' },
  { id: 'xlsx', label: '.xlsx', name: 'Excel XLSX' },
  { id: 'ppt', label: '.ppt', name: 'Презентация PPT' },
  { id: 'pptx', label: '.pptx', name: 'Презентация PPTX' },
];

export const GoogleDocLinkModal: React.FC<GoogleDocLinkModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [url, setUrl] = useState('');
  const [fileType, setFileType] = useState('pdf');
  const [sheetNumber, setSheetNumber] = useState<number>(0);
  const [sheetName, setSheetName] = useState('');
  const [isManualType, setIsManualType] = useState(false);
  const [unsupportedWarning, setUnsupportedWarning] = useState<string | null>(null);

  // Detect unsupported cloud links or auto-detect format
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      setUnsupportedWarning(null);
      return;
    }

    const lower = trimmed.toLowerCase();
    if (lower.includes('disk.yandex') || lower.includes('yadi.sk')) {
      setUnsupportedWarning('Ссылки на Яндекс Диск не поддерживаются для прямого чтения. Скачайте файл на устройство и загрузите его напрямую через кнопку загрузки файла, либо используйте Google Docs, Sheets, Slides или прямую ссылку на файл.');
      return;
    } else if (lower.includes('cloud.mail.ru')) {
      setUnsupportedWarning('Ссылки на Облако Mail.ru не поддерживаются для прямого чтения. Скачайте файл и прикрепите его напрямую через кнопку загрузки файла.');
      return;
    } else {
      setUnsupportedWarning(null);
    }

    if (isManualType) return;
    if (lower.includes('docs.google.com/spreadsheets') || lower.endsWith('.xlsx')) {
      setFileType('xlsx');
    } else if (lower.endsWith('.xls')) {
      setFileType('xls');
    } else if (lower.includes('docs.google.com/presentation') || lower.endsWith('.pptx')) {
      setFileType('pptx');
    } else if (lower.endsWith('.ppt')) {
      setFileType('ppt');
    } else if (lower.includes('docs.google.com/document') || lower.endsWith('.docx')) {
      setFileType('docx');
    } else if (lower.endsWith('.doc')) {
      setFileType('doc');
    } else if (lower.endsWith('.pdf')) {
      setFileType('pdf');
    }
  }, [url, isManualType]);

  if (!isOpen) return null;

  const isSpreadsheet = fileType === 'xls' || fileType === 'xlsx' || url.includes('spreadsheets');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    const lower = cleanUrl.toLowerCase();
    if (lower.includes('disk.yandex') || lower.includes('yadi.sk')) {
      setUnsupportedWarning('Ссылки на Яндекс Диск не поддерживаются для прямого чтения. Скачайте файл на устройство и загрузите его напрямую через кнопку загрузки файла, либо используйте Google Docs, Sheets, Slides или прямую ссылку на файл.');
      return;
    }
    if (lower.includes('cloud.mail.ru')) {
      setUnsupportedWarning('Ссылки на Облако Mail.ru не поддерживаются для прямого чтения. Скачайте файл и прикрепите его напрямую через кнопку загрузки файла.');
      return;
    }

    onSubmit({
      url: cleanUrl,
      file_type: fileType,
      sheet_number: isSpreadsheet ? Number(sheetNumber) || 0 : 0,
      sheet_name: isSpreadsheet ? sheetName.trim() : '',
    });
  };

  return (
    <div
      id="google-doc-link-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-md transition-all duration-300"
    >
      {/* Centered Modal Container with Liquid Glass Apple styling */}
      <div
        id="google-doc-link-modal-container"
        className="relative w-full max-w-xl rounded-2xl bg-black/85 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(231,199,104,0.15)] p-5 sm:p-7 overflow-hidden text-white transition-all"
      >
        {/* Subtle animated smoke backdrop inside container */}
        <RealisticSmokeBackdrop
          speed="normal"
          opacity={0.35}
          className="-top-6 -left-6 w-[calc(100%+48px)] h-[110px] pointer-events-none"
        />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/20 flex items-center justify-center text-amber-300 shrink-0 backdrop-blur-md shadow-sm">
              <Globe className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent text-smoke-anim">
                Подключение документа по ссылке
              </h3>
              <p className="text-sm text-zinc-300 mt-0.5">
                Чтение Google документов и офисных файлов с автоанализом
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/20 text-zinc-300 hover:text-white transition-all backdrop-blur-md cursor-pointer disabled:opacity-50"
            title="Закрыть окно"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="relative z-10 mt-5 space-y-4">
          {/* URL Input */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-amber-200/90 flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-amber-400" />
              <span>Ссылка на Google Docs или файл документа</span>
            </label>
            <div className="relative">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/... или прямая ссылка"
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white placeholder:text-zinc-400 text-sm focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/40 backdrop-blur-md transition-all font-mono"
              />
            </div>
            <p className="text-sm text-zinc-300 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Поддерживаются Google Docs, Sheets, Slides и прямые ссылки</span>
            </p>

            {/* Notification if link is unsupported (e.g. Yandex Disk) */}
            {unsupportedWarning && (
              <div
                id="unsupported-link-alert"
                className="mt-2.5 p-3.5 rounded-xl bg-black/75 border border-amber-400/40 text-amber-200 text-sm flex items-start gap-3 backdrop-blur-xl shadow-[0_0_20px_rgba(231,199,104,0.12)]"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-amber-300" />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-amber-300">
                    Ссылка не поддерживается
                  </div>
                  <div className="text-zinc-200 leading-relaxed font-sans">
                    {unsupportedWarning}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Format selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-amber-200/90 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <span>Формат файла документа</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {SUPPORTED_FORMATS.map((fmt) => {
                const isSelected = fileType === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => {
                      setFileType(fmt.id);
                      setIsManualType(true);
                    }}
                    disabled={isLoading}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5 backdrop-blur-md cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/20 border-amber-400/50 text-amber-200 shadow-[0_0_12px_rgba(231,199,104,0.25)]'
                        : 'bg-white/5 border-white/15 text-zinc-300 hover:text-white hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    <span>{fmt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spreadsheet options: sheet number and sheet name */}
          {isSpreadsheet && (
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/15 backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
                <FileSpreadsheet className="w-4 h-4 text-amber-300" />
                <span>Параметры таблицы Excel / Google Sheets</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-sm text-zinc-300">
                    Номер листа (начиная с 0)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={sheetNumber}
                    onChange={(e) => setSheetNumber(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={isLoading}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-white text-sm focus:outline-none focus:border-amber-400/80 backdrop-blur-md"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-zinc-300">
                    Имя листа (опционально)
                  </label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Лист 1 или оставить пустым"
                    disabled={isLoading}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-white placeholder:text-zinc-400 text-sm focus:outline-none focus:border-amber-400/80 backdrop-blur-md"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-zinc-300 hover:text-white text-sm font-medium transition-all backdrop-blur-md cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={isLoading || !url.trim() || Boolean(unsupportedWarning)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400/25 via-yellow-300/35 to-amber-500/25 hover:from-amber-400/35 hover:to-amber-500/45 border border-amber-400/45 text-amber-200 text-sm font-semibold shadow-[0_0_14px_rgba(231,199,104,0.25)] active:scale-95 transition-all flex items-center gap-2 backdrop-blur-md cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
              ) : (
                <FileText className="w-4 h-4 text-amber-300" />
              )}
              <span>{isLoading ? 'Запуск распознавания...' : 'Распознать документ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
