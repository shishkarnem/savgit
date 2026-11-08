import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, Image, FileText, CheckCircle2 } from 'lucide-react';
import { getUploadService, FileRecord } from '@/services/FileUploadService';
import { toast } from 'sonner';

interface DropzoneUploaderProps {
  folderId?: number | null;
  onUploadSuccess: (files?: FileRecord[]) => void;
}

export const DropzoneUploader: React.FC<DropzoneUploaderProps> = ({ folderId, onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadService = getUploadService();

    try {
      const results = await uploadService.uploadBatch(Array.from(files), folderId, (loaded, total) => {
        setProgress({ loaded, total });
      });
      toast.success(`Успешно загружено файлов: ${results.length}`);
      onUploadSuccess(results);
    } catch (err: any) {
      toast.error('Ошибка при загрузке файлов в хранилище');
      console.error('Upload batch error:', err);
    } finally {
      setUploading(false);
      setProgress({ loaded: 0, total: 0 });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => {
        if (!uploading) fileInputRef.current?.click();
      }}
      className={`relative w-full p-8 md:p-10 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all duration-300 backdrop-blur-2xl ${
        isDragging 
          ? 'border-amber-400 bg-black/50 scale-[1.01] shadow-2xl shadow-amber-500/10' 
          : 'border-white/20 hover:border-amber-400/40 bg-black/30 hover:bg-black/40'
      }`}
    >
      <input 
        ref={fileInputRef} 
        type="file" 
        multiple 
        className="hidden" 
        onChange={(e) => handleFiles(e.target.files)} 
      />

      <div className="flex flex-col items-center justify-center gap-4 text-white">
        {uploading ? (
          <div className="space-y-3 py-4">
            <Loader2 className="w-12 h-12 text-amber-300 animate-spin mx-auto" />
            <p className="text-base md:text-lg font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
              Загрузка {progress.loaded} из {progress.total} файлов...
            </p>
            <p className="text-sm text-white/60">
              Сохранение прозрачности PNG и регистрация в базе данных
            </p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl border border-amber-400/40 flex items-center justify-center text-amber-300 backdrop-blur-xl bg-black/40 shadow-lg shadow-amber-500/10">
              <UploadCloud className="w-8 h-8" />
            </div>
            
            <div className="space-y-1.5">
              <p className="text-base md:text-lg font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
                Перетащите файлы сюда или нажмите для выбора
              </p>
              <p className="text-sm text-white/70">
                Поддержка PNG (с сохранением альфа-канала), JPG, WEBP, PDF, MP3, MP4
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs md:text-sm text-white/60">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-xl bg-black/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                Альфа-канал PNG
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-xl bg-black/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                Короткие ссылки /file/:id
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-xl bg-black/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                Авто-подстановка {`{{key}}`}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default DropzoneUploader;
