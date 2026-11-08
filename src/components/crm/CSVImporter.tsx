import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { protalkDb } from '@/integrations/protalk/client';
import { useToast } from '@/hooks/use-toast';

const ALLOWED_TABLES = [
  { value: 'sav_clients', label: 'Клиенты (sav_clients)' },
  { value: 'sav_client_messages', label: 'Сообщения (sav_client_messages)' },
  { value: 'sav_experts', label: 'Эксперты (sav_experts)' },
  { value: 'sav_tariff_notifications', label: 'Уведомления тарифов (sav_tariff_notifications)' },
  { value: 'sav_price_tariffs', label: 'Тарифы прайса (sav_price_tariffs)' },
  { value: 'sav_price_base', label: 'Базовые цены (sav_price_base)' },
  { value: 'sav_price_coefficients', label: 'Коэффициенты (sav_price_coefficients)' },
  { value: 'sav_click_tariff', label: 'Клики тарифов (sav_click_tariff)' },
  { value: 'sav_click_expert', label: 'Клики экспертов (sav_click_expert)' },
];

interface ImportResult {
  success: boolean;
  table: string;
  total_rows: number;
  inserted: number;
  errors: number;
  error_messages: string[];
}

export const CSVImporter: React.FC = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
      // Auto-detect table from filename
      for (const t of ALLOWED_TABLES) {
        if (f.name.includes(t.value)) {
          setTable(t.value);
          break;
        }
      }
    }
  };

  const handleImport = useCallback(async () => {
    if (!file || !table) return;
    setImporting(true);
    setResult(null);

    try {
      const csvText = await file.text();
      
      // Use specialized function for price tariffs (comma-delimited)
      const functionName = table === 'sav_price_tariffs' ? 'sav-import-price-csv' : 'sav-import-csv';
      const body = table === 'sav_price_tariffs' 
        ? { csv_text: csvText }
        : { csv_text: csvText, table_name: table };
      
      const { data, error } = await protalkDb.functions.invoke(functionName, { body });

      if (error) throw new Error(error.message);

      setResult(data);
      if (data.errors === 0) {
        toast({ title: 'Импорт завершён', description: `Загружено ${data.inserted} записей в ${table}` });
      } else {
        toast({ title: 'Импорт частично завершён', description: `Загружено: ${data.inserted}, ошибок: ${data.errors}`, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Ошибка импорта', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  }, [file, table, toast]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Импорт CSV</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Импорт CSV в базу данных</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Таблица</label>
            <Select value={table} onValueChange={setTable}>
              <SelectTrigger><SelectValue placeholder="Выберите таблицу" /></SelectTrigger>
              <SelectContent>
                {ALLOWED_TABLES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">CSV файл (разделитель — точка с запятой)</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {file && <p className="text-xs text-muted-foreground mt-1">{file.name} ({(file.size / 1024).toFixed(1)} КБ)</p>}
          </div>

          <Button onClick={handleImport} disabled={!file || !table || importing} className="w-full gap-2">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? 'Импорт...' : 'Загрузить'}
          </Button>

          {result && (
            <div className={`rounded-lg p-3 text-sm ${result.errors === 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
              <div className="flex items-center gap-2 mb-1">
                {result.errors === 0 ? <CheckCircle className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-yellow-400" />}
                <span className="font-medium">{result.errors === 0 ? 'Успешно' : 'Частично'}</span>
              </div>
              <p>Всего строк: {result.total_rows}</p>
              <p>Загружено: {result.inserted}</p>
              {result.errors > 0 && <p>Ошибок: {result.errors}</p>}
              {result.error_messages?.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {result.error_messages.map((m, i) => <p key={i}>{m}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
