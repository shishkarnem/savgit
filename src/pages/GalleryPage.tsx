import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Layers, 
  Sparkles, 
  Settings, 
  Check, 
  ExternalLink,
  RefreshCw,
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
  getUploadService, 
  DEFAULT_TOKEN, 
  STORAGE_KEY 
} from '@/services/FileUploadService';
import { toast } from 'sonner';
import Header from '@/components/Header';

export const GalleryPage: React.FC = () => {
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

  // Placeholder tester
  const [testText, setTestText] = useState('Пример текста с ИИ-логотипом: <img src="{{savLogo1}}" alt="SAV AI" />');
  const [convertedText, setConvertedText] = useState('');

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

  // Actions
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch('/api/admin/file-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), color: newFolderColor })
      });

      if (res.ok) {
        toast.success('Папка успешно создана');
        setNewFolderName('');
        setShowFolderModal(false);
        loadFolders();
      }
    } catch (err) {
      toast.error('Ошибка создания папки');
    }
  };

  const handleDeleteFolder = async (folderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Удалить папку? Файлы останутся в общем хранилище.')) return;

    try {
      const res = await fetch(`/api/admin/file-folders/${folderId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Папка удалена');
        if (selectedFolder === String(folderId)) {
          setSelectedFolder('all');
        }
        loadFolders();
        loadFiles();
      }
    } catch (err) {
      toast.error('Ошибка удаления папки');
    }
  };

  const handleUploadFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setUrlUploading(true);
    try {
      const service = getUploadService();
      const directUrl = await service.uploadFromUrl(urlInput.trim());

      // Register file
      const fileName = urlInput.split('/').pop()?.split('?')[0] || 'url_imported_file';
      const res = await fetch('/api/admin/files/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fileName,
          original_url: directUrl,
          mime_type: 'image/png',
          file_size: 0,
          folder_id: selectedFolder !== 'all' && selectedFolder !== 'null' ? Number(selectedFolder) : null
        })
      });

      if (res.ok) {
        toast.success('Файл успешно импортирован по ссылке');
        setUrlInput('');
        setShowUrlUploadModal(false);
        loadFiles();
        loadFolders();
      }
    } catch (err) {
      toast.error('Ошибка импорта по ссылке');
    } finally {
      setUrlUploading(false);
    }
  };

  const handleDeleteFile = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/files/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Файл удален из базы данных');
        loadFiles();
        loadFolders();
      }
    } catch (err) {
      toast.error('Ошибка удаления файла');
    }
  };

  const handleMoveFile = async (id: number, folderId: number | null) => {
    try {
      const res = await fetch(`/api/admin/files/${id}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId })
      });
      if (res.ok) {
        toast.success('Файл перемещен');
        loadFiles();
        loadFolders();
        if (previewFile && previewFile.id === id) {
          setPreviewFile({ ...previewFile, folder_id: folderId });
        }
      }
    } catch (err) {
      toast.error('Ошибка перемещения файла');
    }
  };

  const handleSaveToken = () => {
    const service = getUploadService();
    service.setToken(tokenInput.trim() || DEFAULT_TOKEN);
    toast.success('Токен доступа к хранилищу сохранен в локальном хранилище');
    setShowTokenSettings(false);
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопировано в буфер`);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 байт';
    const k = 1024;
    const sizes = ['байт', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Test placeholders
  const runPlaceholderTest = () => {
    const fileMap: Record<string, string> = {};
    files.forEach(f => {
      fileMap[f.file_key] = `${window.location.origin}/file/${f.id}`;
    });
    const service = getUploadService();
    const result = service.replaceKeysWithUrls(testText, fileMap);
    setConvertedText(result);
    toast.success('Ссылки подставлены вместо плейсхолдеров');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-7xl space-y-8">
        
        {/* Заголовок страницы */}
        <div className="rounded-3xl backdrop-blur-2xl bg-black/40 border border-white/20 p-6 md:p-10 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-amber-400/40 backdrop-blur-xl bg-black/20 text-amber-300 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>Медиа-галерея и хранилище файлов</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
                Галерея файлов и облачный загрузчик
              </h1>
              <p className="text-sm md:text-base text-white/70 max-w-2xl leading-relaxed">
                Загрузка изображений с сохранением альфа-канала PNG, короткие локальные ссылки <code className="text-amber-300">/file/:id</code>, структура папок и авто-подстановка плейсхолдеров в материалы.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowUrlUploadModal(true)}
                className="px-4 py-3 rounded-2xl border border-white/20 hover:border-amber-400/40 text-white font-medium text-sm flex items-center gap-2 backdrop-blur-xl bg-black/30 transition-all"
              >
                <LinkIcon className="w-4 h-4 text-amber-300" />
                <span>Загрузить по URL</span>
              </button>

              <button
                onClick={() => setShowTokenSettings(true)}
                className="px-4 py-3 rounded-2xl border border-white/20 hover:border-amber-400/40 text-white font-medium text-sm flex items-center gap-2 backdrop-blur-xl bg-black/30 transition-all"
              >
                <Settings className="w-4 h-4 text-amber-300" />
                <span>Настройки токена</span>
              </button>
            </div>
          </div>
        </div>

        {/* Область массовой загрузки (Dropzone) */}
        <DropzoneUploader 
          folderId={selectedFolder !== 'all' && selectedFolder !== 'null' ? Number(selectedFolder) : null}
          onUploadSuccess={() => {
            loadFiles();
            loadFolders();
          }}
        />

        {/* Основной интерфейс галереи: Папки + Список файлов */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Левая колонка: Папки и категории */}
          <div className="lg:col-span-1 rounded-3xl backdrop-blur-2xl bg-black/40 border border-white/20 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-amber-300" />
                <span>Папки</span>
              </h2>
              <button
                onClick={() => setShowFolderModal(true)}
                className="p-1.5 rounded-xl border border-white/20 hover:border-amber-400/40 text-amber-300 hover:text-white backdrop-blur-xl bg-black/20 transition-all"
                title="Создать новую папку"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={() => setSelectedFolder('all')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                  selectedFolder === 'all'
                    ? 'border border-amber-400 text-white bg-black/40 shadow-md shadow-amber-500/10'
                    : 'border border-transparent hover:border-white/10 text-white/70 hover:text-white bg-black/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-amber-300" />
                  <span>Все файлы</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-lg border border-white/10 text-white/60">
                  {files.length}
                </span>
              </button>

              <button
                onClick={() => setSelectedFolder('null')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                  selectedFolder === 'null'
                    ? 'border border-amber-400 text-white bg-black/40 shadow-md shadow-amber-500/10'
                    : 'border border-transparent hover:border-white/10 text-white/70 hover:text-white bg-black/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Folder className="w-4 h-4 text-white/50" />
                  <span>Без папки</span>
                </div>
              </button>

              {folders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolder(String(folder.id))}
                  className={`group w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium cursor-pointer transition-all ${
                    selectedFolder === String(folder.id)
                      ? 'border border-amber-400 text-white bg-black/40 shadow-md shadow-amber-500/10'
                      : 'border border-transparent hover:border-white/10 text-white/70 hover:text-white bg-black/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Folder className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-lg border border-white/10 text-white/60">
                      {folder.file_count || 0}
                    </span>
                    <button
                      onClick={(e) => handleDeleteFolder(folder.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-white transition-opacity"
                      title="Удалить папку"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Правая колонка: Поиск и Сетка файлов */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Панель поиска и фильтрации */}
            <div className="rounded-3xl backdrop-blur-2xl bg-black/40 border border-white/20 p-4 shadow-2xl flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Поиск файла по названию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-white/20 backdrop-blur-xl bg-black/30 text-white text-sm placeholder:text-white/40 outline-none focus:border-amber-400 transition-all"
                />
              </div>

              <button
                onClick={loadFiles}
                className="px-4 py-2.5 rounded-2xl border border-white/20 hover:border-amber-400/40 text-white font-medium text-sm flex items-center gap-2 backdrop-blur-xl bg-black/30 transition-all shrink-0"
              >
                <RefreshCw className={`w-4 h-4 text-amber-300 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Обновить</span>
              </button>
            </div>

            {/* Сетка файлов */}
            {isLoading ? (
              <div className="rounded-3xl backdrop-blur-2xl bg-black/40 border border-white/20 p-12 text-center shadow-2xl">
                <RefreshCw className="w-8 h-8 text-amber-300 animate-spin mx-auto mb-3" />
                <p className="text-base text-white/70">Загрузка файлов из базы данных...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="rounded-3xl backdrop-blur-2xl bg-black/40 border border-white/20 p-12 text-center shadow-2xl space-y-3">
                <Folder className="w-12 h-12 text-white/30 mx-auto" />
                <p className="text-base font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
                  Файлы не найдены
                </p>
                <p className="text-sm text-white/60">
                  Загрузите файлы через область перетаскивания выше или добавьте по прямой ссылке.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Скрытый input для замены файла с карточки */}
                <input 
                  type="file" 
                  ref={cardReplaceInputRef} 
                  className="hidden" 
                  onChange={handleCardFileSelected} 
                />

                {files.map((file) => {
                  const isGlb = file.name.toLowerCase().endsWith('.glb') || 
                                file.mime_type?.includes('gltf') || 
                                file.mime_type?.includes('model');
                  const isImage = !isGlb && (file.mime_type?.startsWith('image/') || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(file.name));
                  const isPng = file.name.toLowerCase().endsWith('.png') || file.mime_type === 'image/png';
                  const slug = file.slug || file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
                  const shortRelUrl = file.short_url || `/file/${file.id}/${slug}`;
                  const shortUrl = file.full_url || `${window.location.origin}${shortRelUrl}`;

                  return (
                    <div
                      key={file.id}
                      className="group rounded-3xl backdrop-blur-2xl bg-black/40 border border-white/20 hover:border-amber-400/50 p-4 shadow-xl transition-all duration-300 flex flex-col justify-between space-y-3"
                    >
                      {/* Превью контейнер с поддержкой 3D GLB и прозрачности PNG */}
                      <div 
                        onClick={() => setPreviewFile(file)}
                        className="relative w-full h-44 rounded-2xl overflow-hidden cursor-pointer border border-white/10 bg-black/60 flex items-center justify-center"
                        style={isImage ? {
                          backgroundImage: `
                            linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%), 
                            linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%), 
                            linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.05) 75%), 
                            linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.05) 75%)
                          `,
                          backgroundSize: '16px 16px',
                          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
                        } : {}}
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
                            src={shortRelUrl}
                            alt={file.name}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-white/50">
                            <FileText className="w-10 h-10 text-amber-300/70" />
                            <span className="text-sm font-mono">{file.name.split('.').pop() || 'файл'}</span>
                          </div>
                        )}

                        {/* Формат бейдж */}
                        <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-lg bg-black/80 border border-white/20 text-white font-mono text-sm">
                          {isGlb ? '3D GLB' : isPng ? 'PNG' : (file.name.split('.').pop() || 'файл')}
                        </span>

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewFile(file);
                            }}
                            className="p-2.5 rounded-xl border border-white/30 backdrop-blur-xl bg-black/60 text-white hover:border-amber-400 transition-all"
                            title="Открыть просмотр"
                          >
                            <Eye className="w-4 h-4 text-amber-300" />
                          </button>
                        </div>
                      </div>

                      {/* Информация о файле */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 
                            onClick={() => setPreviewFile(file)}
                            className="text-sm font-bold text-white hover:text-amber-300 cursor-pointer truncate"
                            title={file.name}
                          >
                            {file.name}
                          </h4>
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
                                copyText(file.original_url, 'Ссылка на оригинал');
                              }}
                              className="p-1.5 rounded-lg border border-amber-400/30 hover:border-amber-400 text-amber-300 hover:text-white transition-all flex-shrink-0"
                              title="Скопировать прямую ссылку на оригинал"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm text-white/50">
                          <span>{formatBytes(file.file_size)}</span>
                          <span className="font-mono text-amber-300/80">#{file.file_key}</span>
                        </div>
                      </div>

                      {/* Кнопки копирования и быстрых действий */}
                      <div className="pt-2 border-t border-amber-400/20 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => copyText(shortUrl, 'Короткая ссылка')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl liquid-bubble-secondary text-white text-sm font-medium transition-all"
                          title="Скопировать ссылку /file/:id"
                        >
                          <Copy className="w-3.5 h-3.5 text-amber-300" />
                          <span>Копировать URL</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => copyText(`{{${file.file_key}}}`, 'Плейсхолдер')}
                          className="p-2 rounded-xl liquid-bubble-secondary text-amber-300 hover:text-white transition-all"
                          title="Скопировать плейсхолдер {{key}}"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>

                        {/* Кнопка быстрой замены / повторной загрузки файла */}
                        <button
                          type="button"
                          disabled={replacingFileId === file.id}
                          onClick={() => handleTriggerCardReplace(file.id)}
                          className="p-2 rounded-xl liquid-bubble-secondary text-amber-300 hover:text-white transition-all"
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
                          onClick={() => {
                            if (confirm(`Удалить "${file.name}"?`)) {
                              handleDeleteFile(file.id);
                            }
                          }}
                          className="p-2 rounded-xl liquid-bubble-secondary text-white/70 hover:text-white transition-all"
                          title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-amber-300" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        {/* Блок тестирования и работы с плейсхолдерами {{key}} */}
        <div className="rounded-3xl backdrop-blur-2xl bg-black/40 border border-white/20 p-6 md:p-8 shadow-2xl space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-300" />
              <span>Генератор и подстановка плейсхолдеров {`{{key}}`}</span>
            </h3>
            <p className="text-sm text-white/70">
              Позволяет сохранять разметку страниц и описания товаров с компактными ключами вида <code className="text-amber-300">{`{{file_key}}`}</code> вместо длинных прямых ссылок.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-white/60 font-medium">Исходный текст с плейсхолдерами:</label>
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full h-28 p-3 rounded-2xl border border-white/20 backdrop-blur-xl bg-black/30 text-white font-mono text-sm outline-none focus:border-amber-400 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/60 font-medium">Результат с реальными ссылками:</label>
              <textarea
                readOnly
                value={convertedText || 'Нажмите кнопку ниже для выполнения авто-подстановки...'}
                className="w-full h-28 p-3 rounded-2xl border border-white/20 backdrop-blur-xl bg-black/30 text-amber-300 font-mono text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={runPlaceholderTest}
              className="py-3 px-6 rounded-2xl border border-amber-400 text-white hover:border-amber-300 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/10 backdrop-blur-xl bg-black/40 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Выполнить авто-подстановку ссылок</span>
            </button>

            {convertedText && (
              <button
                onClick={() => copyText(convertedText, 'Результат')}
                className="py-3 px-5 rounded-2xl border border-white/20 hover:border-amber-400/40 text-white font-medium text-sm flex items-center gap-2 backdrop-blur-xl bg-black/20 transition-all"
              >
                <Copy className="w-4 h-4 text-amber-300" />
                <span>Скопировать итоговый HTML</span>
              </button>
            )}
          </div>
        </div>

      </main>

      {/* Модальное окно предпросмотра файла */}
      <FilePreviewModal
        file={previewFile}
        folders={folders}
        onClose={() => setPreviewFile(null)}
        onDelete={handleDeleteFile}
        onMove={handleMoveFile}
        onFileUpdated={(updated) => {
          setFiles(prev => prev.map(f => f.id === updated.id ? updated : f));
          setPreviewFile(updated);
        }}
      />

      {/* Модальное окно создания папки */}
      <GlassModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        maxWidth="md"
        title="Новая папка"
        subtitle="Создание категории для группировки файлов"
        showLogo
      >
        <form onSubmit={handleCreateFolder} className="space-y-4 pt-1 font-sans">
          <div className="space-y-2">
            <label className="text-sm text-white/80 font-medium">Название папки</label>
            <input
              type="text"
              required
              placeholder="Например: Баннеры акций"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-amber-400/30 text-white text-sm outline-none focus:border-amber-300 transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-amber-400/20">
            <button
              type="button"
              onClick={() => setShowFolderModal(false)}
              className="px-5 py-2.5 rounded-2xl liquid-bubble-secondary text-white text-sm transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl liquid-bubble-gold text-stone-950 font-bold text-sm transition-all"
            >
              Создать папку
            </button>
          </div>
        </form>
      </GlassModal>

      {/* Модальное окно загрузки по URL */}
      <GlassModal
        isOpen={showUrlUploadModal}
        onClose={() => setShowUrlUploadModal(false)}
        maxWidth="md"
        title="Импорт файла по ссылке"
        subtitle="Загрузка изображения или файла из интернета в хранилище"
        showLogo
      >
        <form onSubmit={handleUploadFromUrl} className="space-y-4 pt-1 font-sans">
          <div className="space-y-2">
            <label className="text-sm text-white/80 font-medium">Прямой URL адрес файла</label>
            <input
              type="url"
              required
              placeholder="https://example.com/image.png"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-amber-400/30 text-white text-sm outline-none focus:border-amber-300 transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-amber-400/20">
            <button
              type="button"
              onClick={() => setShowUrlUploadModal(false)}
              className="px-5 py-2.5 rounded-2xl liquid-bubble-secondary text-white text-sm transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={urlUploading}
              className="px-6 py-2.5 rounded-2xl liquid-bubble-gold text-stone-950 font-bold text-sm transition-all flex items-center gap-2"
            >
              {urlUploading && <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />}
              <span>{urlUploading ? 'Импорт...' : 'Загрузить файл'}</span>
            </button>
          </div>
        </form>
      </GlassModal>

      {/* Модальное окно настроек токена хранилища */}
      <GlassModal
        isOpen={showTokenSettings}
        onClose={() => setShowTokenSettings(false)}
        maxWidth="lg"
        title="Настройки токена хранилища"
        subtitle="Токен авторизации для удалённой загрузки на сервера FileStore"
        showLogo
      >
        <div className="space-y-4 pt-1 font-sans">
          <div className="space-y-2">
            <label className="text-sm text-white/80 font-medium">Ключ X-Upload-Token</label>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-amber-400/30 text-white font-mono text-xs outline-none focus:border-amber-300 transition-all"
            />
          </div>

          <div className="p-3.5 rounded-2xl border border-amber-400/20 bg-black/60 text-xs text-white/70 space-y-1">
            <p>• По умолчанию используется сервисный токен SAV AI.</p>
            <p>• Сохраняется локально в памяти вашего браузера.</p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-amber-400/20">
            <button
              type="button"
              onClick={() => setTokenInput(DEFAULT_TOKEN)}
              className="px-4 py-2.5 rounded-2xl liquid-bubble-secondary text-white/80 hover:text-white text-xs transition-all"
            >
              Сбросить по умолчанию
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTokenSettings(false)}
                className="px-5 py-2.5 rounded-2xl liquid-bubble-secondary text-white text-sm transition-all"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={handleSaveToken}
                className="px-6 py-2.5 rounded-2xl liquid-bubble-gold text-stone-950 font-bold text-sm transition-all"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </GlassModal>

      {/* Футер */}
      <footer className="w-full py-8 border-t border-white/10 mt-12 text-center text-sm text-white/50">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} SAV AI • Медиа-хранилище и галерея файлов</p>
        </div>
      </footer>
    </div>
  );
};

export default GalleryPage;
