import React, { useState, useEffect, useRef } from 'react';
import { 
  Copy, 
  ExternalLink, 
  HardDrive, 
  FileText, 
  Calendar, 
  Check, 
  Trash2, 
  Sparkles, 
  Link as LinkIcon, 
  Globe, 
  Box, 
  RefreshCw, 
  Loader2,
  UploadCloud
} from 'lucide-react';
import { FileRecord, FileFolder, getUploadService } from '@/services/FileUploadService';
import { GlassModal } from '@/components/ui/GlassModal';
import { toast } from 'sonner';

interface FilePreviewModalProps {
  file: FileRecord | null;
  folders?: FileFolder[];
  onClose: () => void;
  onDelete?: (id: number) => void;
  onMove?: (id: number, folderId: number | null) => void;
  onFileUpdated?: (updatedFile: FileRecord) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ 
  file, 
  folders = [],
  onClose,
  onDelete,
  onMove,
  onFileUpdated
}) => {
  const [currentFile, setCurrentFile] = useState<FileRecord | null>(file);
  const [versionKey, setVersionKey] = useState<number>(() => Date.now());
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentFile(file);
    if (file) {
      setVersionKey((file as any)._v || (file.updated_at ? new Date(file.updated_at).getTime() : Date.now()));
    }
  }, [file]);

  if (!currentFile) return null;

  const slug = currentFile.slug || currentFile.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const shortRelativeUrl = currentFile.short_url || `/file/${currentFile.id}/${slug}`;
  const previewUrl = `${shortRelativeUrl}?v=${versionKey}`;
  const shortFullUrl = `${window.location.origin}${shortRelativeUrl}`;
  const protalkUrl = currentFile.original_url || '';
  const placeholderKey = `{{${currentFile.file_key}}}`;

  const isGlb = currentFile.name.toLowerCase().endsWith('.glb') || 
                currentFile.mime_type?.includes('gltf') || 
                currentFile.mime_type?.includes('model');
  const isImage = !isGlb && (currentFile.mime_type?.startsWith('image/') || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(currentFile.name));
  const isPng = currentFile.name.toLowerCase().endsWith('.png') || currentFile.mime_type === 'image/png';
  const isVideo = currentFile.mime_type?.startsWith('video/') || /\.(mp4|webm)$/i.test(currentFile.name);
  const isAudio = currentFile.mime_type?.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(currentFile.name);
  const isPdf = currentFile.mime_type?.includes('pdf') || /\.pdf$/i.test(currentFile.name);

  const copyToClipboard = (text: string, type: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
    toast.success(`${label} скопирован в буфер обмена`);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelectedForReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsReplacing(true);
    const toastId = toast.loading('Загрузка нового файла в ProTalk и обновление базы данных...');

    try {
      const uploadService = getUploadService();
      const updated = await uploadService.replaceFile(currentFile.id, selectedFile);
      const newV = Date.now();
      const enrichedUpdated = { ...updated, _v: newV };

      setCurrentFile(enrichedUpdated);
      setVersionKey(newV);
      if (onFileUpdated) {
        onFileUpdated(enrichedUpdated);
      }

      toast.success(
        `Файл успешно заменен! Название "${currentFile.name}" и прямой адрес сохранены, ссылка ProTalk обновлена.`,
        { id: toastId }
      );
    } catch (err: any) {
      console.error('File replacement error:', err);
      toast.error(err.message || 'Не удалось заменить файл', { id: toastId });
    } finally {
      setIsReplacing(false);
      if (replaceFileInputRef.current) {
        replaceFileInputRef.current.value = '';
      }
    }
  };

  return (
    <GlassModal
      isOpen={!!currentFile}
      onClose={onClose}
      maxWidth="3xl"
      title={currentFile.name}
      subtitle={`ID: #${currentFile.id} • Ключ: ${currentFile.file_key} • Slug: ${slug}`}
      showLogo
    >
      <div className="space-y-5 font-sans">
        {/* Скрытый input для замены файла */}
        <input 
          type="file" 
          ref={replaceFileInputRef} 
          className="hidden" 
          onChange={handleFileSelectedForReplace}
        />

        {/* Область предпросмотра: поддержка GLB (3D) и PNG (прозрачность) */}
        <div className="relative w-full h-80 md:h-96 rounded-2xl overflow-hidden flex items-center justify-center border border-amber-400/30 backdrop-blur-xl bg-black/60 shadow-inner">
          {isGlb ? (
            /* 3D Просмотрщик GLB моделей */
            <div className="w-full h-full relative flex items-center justify-center bg-black/80">
              <model-viewer
                key={`model-${currentFile.id}-${versionKey}`}
                src={previewUrl}
                alt={currentFile.name}
                auto-rotate
                camera-controls
                touch-action="pan-y"
                shadow-intensity="1"
                exposure="1"
                style={{ width: '100%', height: '100%', outline: 'none' }}
              />
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl backdrop-blur-md bg-black/70 border border-amber-400/50 text-amber-200 text-sm font-medium flex items-center gap-2 shadow-lg pointer-events-none">
                <Box className="w-4 h-4 text-amber-300" />
                <span>3D модель GLB • Вращайте и приближайте модель</span>
              </div>
            </div>
          ) : isImage ? (
            /* Шахматная сетка прозрачности для PNG и картинок */
            <div 
              className="w-full h-full relative flex items-center justify-center p-4"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #1c1c1e 25%, transparent 25%), 
                  linear-gradient(-45deg, #1c1c1e 25%, transparent 25%), 
                  linear-gradient(45deg, transparent 75%, #1c1c1e 75%), 
                  linear-gradient(-45deg, transparent 75%, #1c1c1e 75%)
                `,
                backgroundColor: '#121214',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
              }}
            >
              <img 
                key={`img-${currentFile.id}-${versionKey}`}
                src={previewUrl} 
                alt={currentFile.name} 
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain drop-shadow-2xl transition-all"
              />
              {isPng && (
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl backdrop-blur-md bg-black/70 border border-amber-400/50 text-amber-200 text-sm font-medium flex items-center gap-2 shadow-lg pointer-events-none">
                  <span>PNG с прозрачным фоном</span>
                </div>
              )}
            </div>
          ) : isVideo ? (
            <video key={`vid-${currentFile.id}-${versionKey}`} src={previewUrl} controls className="max-h-full max-w-full rounded-xl" />
          ) : isAudio ? (
            <div className="w-full px-8 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-lg">
                <FileText className="w-8 h-8" />
              </div>
              <audio key={`aud-${currentFile.id}-${versionKey}`} src={previewUrl} controls className="w-full max-w-md" />
            </div>
          ) : isPdf ? (
            <div className="flex flex-col items-center gap-3 text-white/80 p-6 text-center">
              <FileText className="w-16 h-16 text-amber-300" />
              <p className="text-base font-semibold">Документ PDF</p>
              <a 
                href={shortRelativeUrl} 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2 rounded-xl liquid-bubble-secondary text-amber-300 hover:text-white text-sm transition-all"
              >
                Открыть документ
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/60 p-6 text-center">
              <FileText className="w-16 h-16 text-amber-300/80" />
              <span className="text-sm">Предпросмотр формата доступен по прямой ссылке</span>
            </div>
          )}
        </div>

        {/* Панель быстрой замены файла */}
        <div className="p-4 rounded-2xl border border-amber-400/30 backdrop-blur-xl bg-black/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <RefreshCw className="w-4 h-4 text-amber-300" />
              <span>Замена файла и повторная загрузка</span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Прямой адрес и название останутся неизменными, ссылка ProTalk обновится в базе данных.
            </p>
          </div>

          <button
            type="button"
            onClick={() => replaceFileInputRef.current?.click()}
            disabled={isReplacing}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/25 via-amber-400/10 to-transparent hover:from-amber-500/35 text-white font-medium text-sm transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            {isReplacing ? (
              <>
                <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                <span>Загрузка...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 text-amber-300" />
                <span>Заменить файл</span>
              </>
            )}
          </button>
        </div>

        {/* Метаданные файла */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-amber-400/25 bg-black/60">
            <HardDrive className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <div className="text-white/60 text-sm">Размер файла</div>
              <div className="font-medium text-white">{formatBytes(currentFile.file_size)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-amber-400/25 bg-black/60">
            <FileText className="w-5 h-5 text-amber-300 shrink-0" />
            <div className="truncate">
              <div className="text-white/60 text-sm">Тип файла</div>
              <div className="font-medium text-white truncate">{currentFile.mime_type || (isGlb ? 'model/gltf-binary' : 'image/png')}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-amber-400/25 bg-black/60">
            <Calendar className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <div className="text-white/60 text-sm">Дата добавления</div>
              <div className="font-medium text-white">{currentFile.created_at ? new Date(currentFile.created_at).toLocaleDateString() : 'Сегодня'}</div>
            </div>
          </div>
        </div>

        {/* Ссылки на файл */}
        <div className="space-y-3 pt-1">
          {/* Прямая ссылка ProTalk */}
          <div>
            <div className="text-sm text-white/80 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Globe className="w-4 h-4 text-amber-300" />
                Прямая ссылка на файл (ProTalk):
              </span>
            </div>
            <div className="flex items-center rounded-2xl border border-amber-400/30 bg-black/60 p-2 gap-2">
              <input 
                readOnly 
                value={protalkUrl} 
                className="bg-transparent text-sm font-mono text-amber-200 w-full focus:outline-none px-2 select-all truncate" 
              />
              <button 
                type="button"
                onClick={() => copyToClipboard(protalkUrl, 'protalk', 'Прямая ссылка')}
                className="px-3.5 py-1.5 liquid-bubble-gold text-stone-950 rounded-xl transition-all flex items-center gap-1.5 text-sm font-bold shrink-0"
                title="Копировать прямую ссылку"
              >
                {copiedType === 'protalk' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedType === 'protalk' ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
          </div>

          {/* Короткая ссылка с транслитерацией */}
          <div>
            <div className="text-sm text-white/80 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <LinkIcon className="w-4 h-4 text-amber-300" />
                Постоянная короткая ссылка (/file/:id/:name):
              </span>
              <span className="text-amber-300/80 font-mono text-sm">{shortRelativeUrl}</span>
            </div>
            <div className="flex items-center rounded-2xl border border-amber-400/30 bg-black/60 p-2 gap-2">
              <input 
                readOnly 
                value={shortFullUrl} 
                className="bg-transparent text-sm font-mono text-amber-300 w-full focus:outline-none px-2 select-all truncate" 
              />
              <button 
                type="button"
                onClick={() => copyToClipboard(shortRelativeUrl, 'rel', 'Относительный путь')}
                className="px-3.5 py-1.5 liquid-bubble-secondary text-white rounded-xl transition-all flex items-center gap-1.5 text-sm shrink-0"
                title="Копировать относительный путь /file/:id/:name"
              >
                {copiedType === 'rel' ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4 text-amber-300" />}
                <span>{copiedType === 'rel' ? 'Скопировано' : 'Путь'}</span>
              </button>
              <button 
                type="button"
                onClick={() => copyToClipboard(shortFullUrl, 'full', 'Полный URL')}
                className="px-3.5 py-1.5 liquid-bubble-secondary text-white rounded-xl transition-all flex items-center gap-1.5 text-sm font-semibold shrink-0"
                title="Копировать полный URL"
              >
                {copiedType === 'full' ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4 text-amber-300" />}
                <span>{copiedType === 'full' ? 'Скопировано' : 'Полный URL'}</span>
              </button>
            </div>
          </div>

          {/* Плейсхолдер {{key}} */}
          <div>
            <div className="text-sm text-white/80 mb-1 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Плейсхолдер для страниц и шаблонов:</span>
            </div>
            <div className="flex items-center rounded-2xl border border-amber-400/30 bg-black/60 p-2 gap-2">
              <input 
                readOnly 
                value={placeholderKey} 
                className="bg-transparent text-sm font-mono text-amber-300 w-full focus:outline-none px-2 select-all" 
              />
              <button 
                type="button"
                onClick={() => copyToClipboard(placeholderKey, 'key', 'Плейсхолдер {{key}}')}
                className="px-3.5 py-1.5 liquid-bubble-secondary text-white rounded-xl transition-all flex items-center gap-1.5 text-sm shrink-0"
                title="Копировать плейсхолдер {{key}}"
              >
                {copiedType === 'key' ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4 text-amber-300" />}
                <span>{copiedType === 'key' ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Ссылки и кнопки действий */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-amber-400/20">
          <a 
            href={protalkUrl} 
            target="_blank" 
            rel="noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl liquid-bubble-secondary text-white font-medium text-sm transition-all"
          >
            <span>Открыть оригинал</span>
            <ExternalLink className="w-4 h-4 text-amber-300" />
          </a>

          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(currentFile.id);
                onClose();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl liquid-bubble-secondary text-white/80 hover:text-white text-sm transition-all"
            >
              <Trash2 className="w-4 h-4 text-amber-300" />
              <span>Удалить файл</span>
            </button>
          )}
        </div>
      </div>
    </GlassModal>
  );
};

export default FilePreviewModal;
