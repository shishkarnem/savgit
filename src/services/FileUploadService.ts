// FileUploadService.ts

export const STORAGE_KEY = "protalk_upload_token";
export const FILES_MAP_KEY = "protalk_files_map";
export const DEFAULT_TOKEN = "b2RdUnRrWlFha1h3GHMhU2Y5GCsuGxAULisQKl0tNCo3BTJ4FSNQGCwLFxRuPRQYaGtdWGtjUgVvAH9YAmk";

export interface FileRecord {
  id: number;
  file_key: string;
  name: string;
  slug?: string;
  original_url: string;
  short_url?: string;
  short_key_url?: string;
  mime_type: string;
  file_size: number;
  folder_id: number | null;
  folder_name?: string;
  folder_color?: string;
  created_at: string;
}

export interface FileFolder {
  id: number;
  name: string;
  color: string;
  file_count?: number;
  created_at: string;
}

export interface FileMap {
  [key: string]: string; // key -> полный URL или короткий URL
}

export class FileUploadService {
  private token: string;

  constructor(token?: string) {
    this.token = token || this.getToken();
  }

  public getToken(): string {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || DEFAULT_TOKEN;
  }

  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem(STORAGE_KEY, token);
  }

  // Загрузка одного файла через серверный бэкенд с сохранением альфа-канала
  async uploadFile(
    file: File,
    folderId?: number | string | null,
    customName?: string
  ): Promise<FileRecord> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("token", this.getToken());
    if (folderId && folderId !== 'all') {
      formData.append("folder_id", String(folderId));
    }
    formData.append("custom_name", customName || file.name);

    const response = await fetch("/api/admin/files/upload", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.error || `Ошибка загрузки файла (${response.status})`);
    }

    const data = await response.json();
    return data.file;
  }

  // Загрузка по внешнему URL через серверный прокси
  async uploadFromUrl(
    url: string,
    folderId?: number | string | null,
    customName?: string
  ): Promise<FileRecord> {
    const response = await fetch("/api/admin/files/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        folder_id: folderId && folderId !== 'all' ? folderId : null,
        token: this.getToken(),
        name: customName
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.error || `Ошибка загрузки по URL (${response.status})`);
    }

    const data = await response.json();
    return data.file;
  }

  // Пакетная загрузка файлов
  async uploadBatch(
    files: File[],
    folderId?: number | string | null,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<FileRecord[]> {
    const results: FileRecord[] = [];
    let completed = 0;

    for (const file of files) {
      try {
        const record = await this.uploadFile(file, folderId);
        results.push(record);
      } catch (err: any) {
        console.error(`Ошибка при загрузке ${file.name}:`, err);
        throw err;
      }
      completed++;
      if (onProgress) onProgress(completed, files.length);
    }

    return results;
  }

  // Удаление файла
  async deleteFile(id: number | string): Promise<void> {
    const res = await fetch(`/api/admin/files/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      throw new Error("Не удалось удалить файл");
    }
  }

  // Перемещение файла в папку
  async moveFile(fileId: number | string, folderId: number | string | null): Promise<void> {
    const res = await fetch(`/api/admin/files/${fileId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_id: folderId === 'all' ? null : folderId })
    });
    if (!res.ok) {
      throw new Error("Не удалось переместить файл в папку");
    }
  }

  // Замена / повторная загрузка файла с сохранением имени и slug, но с обновлением original_url ProTalk
  async replaceFile(fileId: number | string, file: File): Promise<FileRecord> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("token", this.getToken());

    const response = await fetch(`/api/admin/files/${fileId}/replace`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.error || `Ошибка замены файла (${response.status})`);
    }

    const data = await response.json();
    return data.file;
  }

  // Замена плейсхолдеров {{key}} в тексте на URL файлов
  replacePlaceholders(text: string, fileMap: FileMap): string {
    if (!text) return "";
    return text.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (match, key) => {
      return fileMap[key] || match;
    });
  }
}

let uploadServiceInstance: FileUploadService | null = null;

export function getUploadService(): FileUploadService {
  if (!uploadServiceInstance) {
    uploadServiceInstance = new FileUploadService();
  }
  return uploadServiceInstance;
}
