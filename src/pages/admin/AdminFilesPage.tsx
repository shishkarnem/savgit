import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SystemAdminLayout } from './SystemAdminLayout';
import { 
  Folder, 
  FolderPlus, 
  Search, 
  Plus, 
  Link as LinkIcon, 
  Key, 
  HardDrive, 
  FileText, 
  Copy, 
  Eye, 
  Trash2, 
  Sparkles, 
  Check, 
  ExternalLink,
  RefreshCw,
  Image as ImageIcon,
  FolderOpen,
  Globe,
  Box,
  Loader2,
  UploadCloud
} from 'lucide-react';
import { DropzoneUploader } from '@/components/gallery/DropzoneUploader';
import { FilePreviewModal } from '@/components/gallery/FilePreviewModal';
import { GlassModal } from '@/components/ui/GlassModal';
import { 
  FileRecord, 
  FileFolder, 
  getUploadService 
} from '@/services/FileUploadService';
import { toast } from 'sonner';

export const AdminFilesPage: React.FC = () => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);

  // Modals & Panels
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#f59e0b');

  const [showUrlUploadModal, setShowUrlUploadModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlUploading, setUrlUploading] = useState(false);

  const [showTokenSettings, setShowTokenSettings] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  // Card file replacement
  const [replacingFileId, setReplacingFileId] = useState<number | null>(null);
  const cardReplaceInputRef = useRef<HTMLInputElement>(null);
  const [targetReplaceId, setTargetReplaceId] = useState<number | null>(null);

  const handleTriggerCardReplace = (fileId: number) => {
    setTargetReplaceId(fileId);
    if (cardReplaceInputRef.current) {
      cardReplaceInputRef.current.click();
    }
  };

  const handleCardFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || targetReplaceId === null) return;

    const fileId = targetReplaceId;
    setReplacingFileId(fileId);
    const toastId = toast.loading('Загрузка нового файла в ProTalk и замена...');
    try {
      const service = getUploadService();
      const updated = await service.replaceFile(fileId, file);
      setFiles(prev => prev.map(f => f.id === updated.id ? updated : f));
      if (previewFile?.id === updated.id) {
        setPreviewFile(updated);
      }
      toast.success(`Файл успешно заменен! Прямой адрес и название сохранены.`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Ошибка замены файла', { id: toastId });
    } finally {
      setReplacingFileId(null);
      setTargetReplaceId(null);
      if (cardReplaceInputRef.current) {
        cardReplaceInputRef.current.value = '';
      }
    }
  };

  // Load Data
  const loadFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/file-folders');
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch (err) {
      console.error('Error loading folders:', err);
    }
  }, []);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = '/api/admin/files?';
      if (selectedFolder !== 'all') {
        url += `folder_id=${selectedFolder}&`;
      }
      if (searchQuery.trim()) {
        url += `search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (err) {
      console.error('Error loading files:', err);
      toast.error('Не удалось загрузить список файлов');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, searchQuery]);

  useEffect(() => {
    loadFolders();
    const service = getUploadService();
    setTokenInput(service.getToken());
  }, [loadFolders]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch('/api/admin/file-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          color: newFolderColor
        })
      });

      if (res.ok) {
        toast.success(`Папка "${newFolderName}" создана`);
        setNewFolderName('');
        setShowFolderModal(false);
        loadFolders();
      } else {
        toast.error('Ошибка создания папки');
      }
    } catch (err) {
      console.error(err);
      toast.error('Ошибка соединения');
    }
  };

  const handleUploadFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setUrlUploading(true);
    const service = getUploadService();
    try {
      const record = await service.uploadFromUrl(
        urlInput.trim(),
        selectedFolder === 'all' ? undefined : selectedFolder
      );
      toast.success(`Файл ${record.name} успешно загружен!`);
      setUrlInput('');
      setShowUrlUploadModal(false);
      loadFiles();
      loadFolders();
    } catch (err: any) {
      console.error(err);
      toast.error(`Ошибка загрузки: ${err.message}`);
    } finally {
      setUrlUploading(false);
    }
  };

  const handleSaveToken = () => {
    const service = getUploadService();
    service.setToken(tokenInput.trim());
    toast.success('Токен хранилища сохранен');
    setShowTokenSettings(false);
  };

  const handleDeleteFile = async (id: number | string) => {
    try {
      const service = getUploadService();
      await service.deleteFile(id);
      toast.success('Файл успешно удален');
      setFiles(prev => prev.filter(f => f.id !== Number(id)));
      if (previewFile?.id === Number(id)) {
        setPreviewFile(null);
      }
      loadFolders();
    } catch (err: any) {
      console.error(err);
      toast.error(`Ошибка при удалении: ${err.message}`);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован в буфер обмена`);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalStorageBytes = files.reduce((acc, f) => acc + (f.file_size || 0), 0);

  return (
    <SystemAdminLayout
      title="Галерея файлов и хранилище"
      subtitle={`Облачное медиахранилище с альфа-прозрачностью и интеграцией в базу данных (${files.length} файлов)`}
      actions={
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowUrlUploadModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-amber-400/40 text-white text-sm font-medium transition-all"
          >
            <LinkIcon className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Загрузка по URL</span>
          </button>

          <button
            onClick={() => setShowFolderModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-amber-400/40 text-white text-sm font-medium transition-all"
          >
            <FolderPlus className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Создать папку</span>
          </button>

          <button
            onClick={() => setShowTokenSettings(!showTokenSettings)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-amber-400/40 text-white text-sm font-medium transition-all"
            title="Настройки токена хранилища"
          >
            <Key className="w-4 h-4 text-amber-300" />
          </button>

          <button
            onClick={() => {
              loadFolders();
              loadFiles();
            }}
            className="p-2.5 rounded-xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-amber-400/40 text-white text-sm font-medium transition-all"
            title="Обновить галерею"
          >
            <RefreshCw className={`w-4 h-4 text-amber-300 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      }
    >
      {/* Token Settings Expandable */}
      {showTokenSettings && (
        <div className="mb-6 p-5 rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10 shadow-xl">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-300" />
            <span>Конфигурация токена загрузки</span>
          </h3>
          <p className="text-white/70 text-sm mb-4">
            Используется токен для авторизованной загрузки медиа-файлов на удаленный сервер <code className="text-amber-300 font-mono">file.pro-talk.ru/tgf</code>.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Токен авторизации хранилища..."
              className="flex-1 p-2.5 rounded-xl backdrop-blur-xl bg-black/30 border border-white/15 text-white font-mono text-sm focus:outline-none focus:border-amber-400/50"
            />
            <button
              onClick={handleSaveToken}
              className="px-5 py-2.5 rounded-xl border border-amber-400/50 backdrop-blur-xl bg-black/40 hover:border-amber-300 text-white text-sm font-semibold transition-all shadow-md shadow-amber-500/10"
            >
              Сохранить токен
            </button>
          </div>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Folders & Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Dropzone Uploader */}
          <DropzoneUploader
            folderId={selectedFolder === 'all' ? undefined : Number(selectedFolder)}
            onUploadSuccess={() => {
              loadFiles();
              loadFolders();
            }}
          />

          {/* Folders List */}
          <div className="p-4 sm:p-5 rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-300" />
                <span>Папки</span>
              </h3>
              <button
                onClick={() => setShowFolderModal(true)}
                className="p-1 rounded-lg border border-white/10 hover:border-amber-400/40 text-white/70 hover:text-white"
                title="Добавить папку"
              >
                <Plus className="w-3.5 h-3.5 text-amber-300" />
              </button>
            </div>

            <div className="space-y-1">
              <button
                onClick={() => setSelectedFolder('all')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${
                  selectedFolder === 'all'
                    ? 'border border-amber-400/50 bg-black/40 text-amber-300 shadow-md shadow-amber-400/10'
                    : 'border border-transparent hover:border-white/10 bg-black/10 text-white/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FolderOpen className="w-4 h-4 text-amber-300" />
                  <span className="font-medium text-sm">Все файлы</span>
                </div>
                <span className="text-white/50 text-sm font-mono">{files.length}</span>
              </button>

              {folders.map((folder) => {
                const isSelected = selectedFolder === String(folder.id);
                return (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(String(folder.id))}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border border-amber-400/50 bg-black/40 text-amber-300 shadow-md shadow-amber-400/10'
                        : 'border border-transparent hover:border-white/10 bg-black/10 text-white/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate max-w-[170px]">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: folder.color || '#f59e0b' }}
                      />
                      <span className="font-medium text-sm truncate">{folder.name}</span>
                    </div>
                    <span className="text-white/50 text-sm font-mono">{folder.file_count || 0}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Storage Stats */}
          <div className="p-4 sm:p-5 rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10 shadow-xl text-sm space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold">
              <HardDrive className="w-4 h-4 text-amber-300" />
              <span>Статистика хранилища</span>
            </div>
            <div className="flex justify-between text-white/70 font-mono text-sm pt-2 border-t border-white/5">
              <span>Всего файлов:</span>
              <span className="text-white font-bold">{files.length}</span>
            </div>
            <div className="flex justify-between text-white/70 font-mono text-sm">
              <span>Общий объем:</span>
              <span className="text-amber-300 font-bold">{formatBytes(totalStorageBytes)}</span>
            </div>
          </div>
        </div>

        {/* Right Gallery Grid */}
        <div className="lg:col-span-3 p-5 sm:p-6 rounded-2xl backdrop-blur-2xl bg-black/25 border border-white/10 shadow-xl flex flex-col min-h-[700px]">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по имени, ключу {{key}} или ссылке..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl backdrop-blur-xl bg-black/30 border border-white/15 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-400/50"
              />
            </div>
            <span className="text-white/50 text-sm font-mono">
              Показано {files.length} файлов
            </span>
          </div>

          {/* Gallery Items Grid */}
          <div className="flex-1 overflow-y-auto">
            {/* Скрытый input для быстрой замены файла с карточки */}
            <input 
              type="file" 
              ref={cardReplaceInputRef} 
              className="hidden" 
              onChange={handleCardFileSelected} 
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {files.map((file) => {
                const isGlb = file.name.toLowerCase().endsWith('.glb') || 
                              file.mime_type?.includes('gltf') || 
                              file.mime_type?.includes('model');
                const isImage = !isGlb && (file.mime_type?.startsWith('image/') || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(file.name));
                const isPng = file.name.toLowerCase().endsWith('.png') || file.mime_type === 'image/png';
                const slug = file.slug || file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
                const shortUrl = file.short_url || `/file/${file.id}/${slug}`;
                const fullShortUrl = `${window.location.origin}${shortUrl}`;

                return (
                  <div
                    key={file.id}
                    className="group relative rounded-2xl border border-white/10 backdrop-blur-xl bg-black/20 hover:border-amber-400/40 transition-all flex flex-col overflow-hidden shadow-lg"
                  >
                    {/* Media Thumbnail with Alpha Transparency Checkerboard */}
                    <div 
                      onClick={() => setPreviewFile(file)}
                      className="w-full aspect-[4/3] relative flex items-center justify-center cursor-pointer overflow-hidden"
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
                      {isGlb ? (
                        <div className="flex flex-col items-center gap-2 text-amber-300 p-4 text-center">
                          <div className="w-12 h-12 rounded-2xl border border-amber-400/40 flex items-center justify-center bg-black/50 shadow-lg">
                            <Box className="w-7 h-7 text-amber-300" />
                          </div>
                          <span className="text-sm font-medium text-amber-200">3D модель (GLB)</span>
                        </div>
                      ) : isImage ? (
                        <img
                          src={shortUrl}
                          alt={file.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-amber-300">
                          <FileText className="w-12 h-12" />
                          <span className="text-sm font-mono">{file.name.split('.').pop() || 'файл'}</span>
                        </div>
                      )}

                      {/* Format Badge */}
                      <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-lg bg-black/80 border border-white/20 text-white font-mono text-sm">
                        {isGlb ? '3D GLB' : isPng ? 'PNG' : (file.name.split('.').pop() || 'файл')}
                      </span>
                    </div>

                    {/* Meta info & URLs display */}
                    <div className="p-3.5 flex flex-col justify-between flex-1 gap-2.5">
                      <div className="space-y-2">
                        <div className="font-semibold text-white text-sm truncate" title={file.name}>
                          {file.name}
                        </div>

                        {/* ProTalk Full URL */}
                        {file.original_url && (
                          <div className="p-1.5 rounded-xl border border-amber-400/25 bg-black/60 flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <Globe className="w-4 h-4 text-amber-300 shrink-0" />
                              <span className="text-amber-200/90 font-mono text-sm truncate select-all" title={file.original_url}>
                                {file.original_url}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(file.original_url, 'Прямая ссылка');
                              }}
                              className="p-1.5 rounded-lg border border-amber-400/30 hover:border-amber-400 text-amber-300 hover:text-white transition-all flex-shrink-0"
                              title="Скопировать прямую ссылку"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        
                        {/* Transliterated short link pill */}
                        <div className="p-1.5 rounded-xl border border-white/10 bg-black/40 flex items-center justify-between gap-1.5">
                          <span className="text-amber-300/90 font-mono text-sm truncate select-all">
                            {shortUrl}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(shortUrl, 'Относительный путь');
                            }}
                            className="p-1.5 rounded-lg border border-white/10 hover:border-amber-400/40 text-white/70 hover:text-amber-300 transition-all flex-shrink-0"
                            title="Скопировать путь /file/:id/:slug"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-amber-400/20">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(fullShortUrl, 'Полная ссылка')}
                          className="flex-1 py-1.5 px-2 rounded-xl liquid-bubble-secondary text-white/90 hover:text-amber-200 text-sm flex items-center justify-center gap-1 transition-all"
                          title="Скопировать полный URL"
                        >
                          <LinkIcon className="w-3.5 h-3.5 text-amber-300" />
                          <span>URL</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(`{{${file.file_key}}}`, 'Плейсхолдер {{key}}')}
                          className="flex-1 py-1.5 px-2 rounded-xl liquid-bubble-secondary text-white/90 hover:text-amber-200 text-sm flex items-center justify-center gap-1 transition-all"
                          title="Скопировать {{fileKey}}"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{`{{key}}`}</span>
                        </button>

                        {/* Кнопка быстрой замены / повторной загрузки */}
                        <button
                          type="button"
                          disabled={replacingFileId === file.id}
                          onClick={() => handleTriggerCardReplace(file.id)}
                          className="p-2 rounded-xl liquid-bubble-secondary text-white/90 hover:text-white text-sm"
                          title="Заменить файл (повторная загрузка)"
                        >
                          {replacingFileId === file.id ? (
                            <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 text-amber-300" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="p-2 rounded-xl liquid-bubble-secondary text-white/90 hover:text-white text-sm"
                          title="Предпросмотр"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-2 rounded-xl liquid-bubble-secondary text-white/90 hover:text-white text-sm"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4 text-amber-300" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {files.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <ImageIcon className="w-12 h-12 text-amber-300/40 mb-3" />
                <h4 className="text-base font-semibold text-white">В этой папке нет файлов</h4>
                <p className="text-white/60 text-sm max-w-sm mt-1">
                  Перетащите файлы в левую панель или воспользуйтесь кнопкой "Загрузка по URL".
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          folders={folders}
          onClose={() => setPreviewFile(null)}
          onDelete={handleDeleteFile}
          onFileUpdated={(updated) => {
            setFiles(prev => prev.map(f => f.id === updated.id ? updated : f));
            setPreviewFile(updated);
          }}
        />
      )}

      {/* New Folder Modal */}
      <GlassModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        maxWidth="md"
        title="Создать новую папку"
        subtitle="Категория для группировки медиафайлов"
        showLogo
      >
        <form onSubmit={handleCreateFolder} className="space-y-4 pt-1 font-sans">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Название папки</label>
            <input
              type="text"
              required
              placeholder="e.g. ИИ-логотипы, Документы, Баннеры"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full p-3 rounded-2xl bg-black/60 border border-amber-400/30 text-white text-sm focus:outline-none focus:border-amber-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Цветовая метка</label>
            <div className="flex items-center gap-3">
              {['#f59e0b', '#fbbf24', '#d97706', '#eab308', '#ffffff'].map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setNewFolderColor(color)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    newFolderColor === color ? 'border-amber-300 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-amber-400/20 mt-4">
            <button
              type="button"
              onClick={() => setShowFolderModal(false)}
              className="px-4 py-2.5 rounded-2xl liquid-bubble-secondary text-white/80 text-sm font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl liquid-bubble-gold text-stone-950 font-bold text-sm"
            >
              Создать
            </button>
          </div>
        </form>
      </GlassModal>

      {/* URL Upload Modal */}
      <GlassModal
        isOpen={showUrlUploadModal}
        onClose={() => setShowUrlUploadModal(false)}
        maxWidth="lg"
        title="Загрузка файла по ссылке"
        subtitle="Файл сохранится с прозрачностью в хранилище и базе данных"
        showLogo
      >
        <form onSubmit={handleUploadFromUrl} className="space-y-4 pt-1 font-sans">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Прямая ссылка на файл</label>
            <input
              type="url"
              required
              placeholder="https://example.com/image.png"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full p-3 rounded-2xl bg-black/60 border border-amber-400/30 text-white text-sm focus:outline-none focus:border-amber-300"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-amber-400/20 mt-4">
            <button
              type="button"
              onClick={() => setShowUrlUploadModal(false)}
              className="px-4 py-2.5 rounded-2xl liquid-bubble-secondary text-white/80 text-sm font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={urlUploading}
              className="px-5 py-2.5 rounded-2xl liquid-bubble-gold text-stone-950 font-bold text-sm"
            >
              {urlUploading ? 'Загрузка...' : 'Загрузить в хранилище'}
            </button>
          </div>
        </form>
      </GlassModal>
    </SystemAdminLayout>
  );
};
