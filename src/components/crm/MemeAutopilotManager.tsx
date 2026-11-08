import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, Send, RefreshCw, Clock, Users, Eye, Loader2,
  Bot, Image as ImageIcon, Sliders, CheckCircle2,
  AlertCircle, Edit3, Shield, FileText, ChevronDown,
  Settings, Moon, Sun, Play, Pause, Trash2, X,
  Plus, Calendar, Ban, Check, Mail, Zap, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import RealisticSmokeBackdrop from '@/components/RealisticSmokeBackdrop';

interface MemePost {
  id: string;
  target_audience: 'clients' | 'partners';
  title: string;
  subtitle?: string | null;
  text_rich: string;
  image_url: string | null;
  image_prompt: string | null;
  status: 'draft' | 'approved' | 'scheduled' | 'sent' | 'cancelled';
  scheduled_for: string | null;
  admin_test_sent_at: string | null;
  recipients_total: number;
  recipients_sent: number;
  recipients_blocked: number;
  recipients_failed: number;
  created_at: string;
  updated_at: string;
}

interface MemeAutopilotConfig {
  id: string;
  is_active: number;
  interval_days: number;
  generation_hour_msk: number;
  generation_minute_msk: number;
  send_window_start_hour_msk: number;
  send_window_end_hour_msk: number;
  admin_telegram_id: string;
  last_generation_at: string | null;
  last_dispatch_at: string | null;
  updated_at: string;
}

interface DeliveryQueueItem {
  id: string;
  post_id: string;
  post_title?: string;
  target_audience?: string;
  recipient_type: string;
  recipient_id: string;
  recipient_name: string;
  telegram_id: string;
  bot_type: string;
  scheduled_time: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'blocked' | 'failed' | 'disabled';
  error_message: string | null;
  next_send_at: string | null;
  channel?: 'telegram' | 'email';
  email?: string | null;
  created_at: string;
}

export const MemeAutopilotManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeAudience, setActiveAudience] = useState<'clients' | 'partners'>('clients');
  const [currentTab, setCurrentTab] = useState<'editor' | 'history' | 'queue' | 'prompts' | 'settings'>('editor');
  const [selectedPost, setSelectedPost] = useState<MemePost | null>(null);
  const [editText, setEditText] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isPausingNight, setIsPausingNight] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);

  // Manual Post Creation Modal State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createAudience, setCreateAudience] = useState<'clients' | 'partners'>('clients');
  const [createTitle, setCreateTitle] = useState('');
  const [createSubtitle, setCreateSubtitle] = useState('');
  const [createText, setCreateText] = useState('');
  const [createImageUrl, setCreateImageUrl] = useState('');
  const [createImagePrompt, setCreateImagePrompt] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  // Queue Item Edit Date State
  const [editQueueItem, setEditQueueItem] = useState<DeliveryQueueItem | null>(null);
  const [editQueueDialogOpen, setEditQueueDialogOpen] = useState(false);
  const [editQueueTime, setEditQueueTime] = useState('');
  const [isUpdatingQueue, setIsUpdatingQueue] = useState(false);

  // Queue Audience & Filter State
  const [queueAudience, setQueueAudience] = useState<'client' | 'partner' | 'all'>('client');
  const [queueStatusFilter, setQueueStatusFilter] = useState<'all' | 'pending' | 'sent' | 'blocked' | 'failed'>('all');
  const [queueChannelFilter, setQueueChannelFilter] = useState<'all' | 'telegram' | 'email'>('all');
  const [isReschedulingQueue, setIsReschedulingQueue] = useState(false);

  // Test Email Modal & State
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState('shishkarnem@gmail.com');
  const [testEmailAudience, setTestEmailAudience] = useState<'both' | 'clients' | 'partners'>('both');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [emailSendingStage, setEmailSendingStage] = useState<string>('');
  const [lastEmailTestResult, setLastEmailTestResult] = useState<{
    success: boolean;
    message?: string;
    messageId?: string;
    clientMessageId?: string;
    partnerMessageId?: string;
    clientHtmlPreview?: string;
    partnerHtmlPreview?: string;
    clientPostTitle?: string;
    partnerPostTitle?: string;
    clientSuccess?: boolean;
    partnerSuccess?: boolean;
    targetEmail?: string;
    audience?: string;
    postTitle?: string;
    htmlPreview?: string;
    results?: any[];
    sentAt?: string;
  } | null>(null);
  const [emailPreviewModalOpen, setEmailPreviewModalOpen] = useState(false);
  const [previewHtmlToDisplay, setPreviewHtmlToDisplay] = useState('');

  // Real-time Config Autosave State
  const [configSaveStatus, setConfigSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string>('');
  const saveTimeoutRef = useRef<any>(null);

  // Live Test Results and Progress State
  const [testResult, setTestResult] = useState<{ clientPost?: MemePost; partnerPost?: MemePost } | null>(null);
  const [elapsedTimer, setElapsedTimer] = useState<number>(0);
  const timerRef = useRef<any>(null);

  // Poll progress while isGenerating
  const { data: progressData } = useQuery<{
    success: boolean;
    progress: {
      isActive: boolean;
      step: number;
      totalSteps: number;
      stageName: string;
      detail: string;
      percent: number;
      currentAudience: string;
      lastClientPost?: MemePost;
      lastPartnerPost?: MemePost;
      error?: string;
    };
  }>({
    queryKey: ['meme-autopilot-progress'],
    queryFn: async () => {
      const res = await fetch('/api/meme-autopilot/progress');
      return res.json();
    },
    refetchInterval: isGenerating ? 750 : false
  });

  const liveProgress = progressData?.progress;

  // Track elapsed time during generation
  useEffect(() => {
    if (isGenerating) {
      setElapsedTimer(0);
      timerRef.current = setInterval(() => {
        setElapsedTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGenerating]);

  // Extract authentic meme hooks (H1 punchline, H2 subtitle) for crisp UI display without boilerplate
  const extractHooksForDisplay = (post: MemePost | null): { h1: string; h2: string; cleanText: string } => {
    if (!post) {
      return {
        h1: activeAudience === 'partners'
          ? 'Хроники партнерского спокойствия: когда за сделку платит алгоритм'
          : 'Утро доброе, бизнес непобедимый: ИИ на боевом дежурстве',
        h2: activeAudience === 'partners'
          ? 'Автоматизация продаж, которая работает на ваш баланс'
          : 'Легкость и прибыль от внедрения ИИ-продавца SAV AI',
        cleanText: ''
      };
    }

    let h1 = post.title || '';
    if (!h1 || h1.includes('Мем-напоминание') || h1.includes('предпросмотр')) {
      h1 = post.target_audience === 'partners'
        ? 'Хроники партнерского спокойствия: когда за сделку платит алгоритм'
        : 'Утро доброе, бизнес непобедимый: ИИ на боевом дежурстве';
    }

    let h2 = post.subtitle || '';
    if (!h2 || h2.includes('Мем-напоминание') || h2.includes('предпросмотр')) {
      h2 = post.target_audience === 'partners'
        ? 'Автоматизация продаж, которая работает на ваш баланс'
        : 'Легкость и прибыль от внедрения ИИ-продавца SAV AI';
    }

    let clean = (post.text_rich || '').trim();
    clean = clean.replace(/^#+\s+[^\n]+\n*/gm, '');
    clean = clean.replace(/^[☕🔔✨💼🚀🎯].*напоминание.*\n*/gim, '');
    clean = clean.replace(/^.*тестовый предпросмотр.*\n*/gim, '');
    clean = clean.replace(/^.*аудитория:.*\n*/gim, '');

    if (clean.toLowerCase().startsWith(h1.toLowerCase())) {
      clean = clean.slice(h1.length).trim();
    }

    return { h1, h2, cleanText: clean };
  };

  // Settings form local state
  const [adminIdInput, setAdminIdInput] = useState('169262990');
  const [windowStartHour, setWindowStartHour] = useState(10);
  const [windowEndHour, setWindowEndHour] = useState(17);
  const [genHour, setGenHour] = useState(7);
  const [intervalDays, setIntervalDays] = useState(2);

  // Auto-save settings to database in real-time
  const triggerRealtimeConfigSave = (partialUpdates: Partial<MemeAutopilotConfig>) => {
    setConfigSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/meme-autopilot/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(partialUpdates)
        });
        const data = await res.json();
        if (data.success) {
          setConfigSaveStatus('saved');
          const timeStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastSavedAt(timeStr);
          queryClient.invalidateQueries({ queryKey: ['meme-autopilot-config'] });
        }
      } catch {
        setConfigSaveStatus('idle');
      }
    }, 450);
  };

  // Sync tab from URL ?tab=
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'settings' || tabParam === 'editor' || tabParam === 'history' || tabParam === 'queue' || tabParam === 'prompts') {
      setCurrentTab(tabParam as any);
    }
  }, [searchParams]);

  // Fetch Config
  const { data: configData, refetch: refetchConfig } = useQuery<{ success: boolean; config: MemeAutopilotConfig }>({
    queryKey: ['meme-autopilot-config'],
    queryFn: async () => {
      const res = await fetch('/api/meme-autopilot/config');
      return res.json();
    }
  });
  const config = configData?.config;

  useEffect(() => {
    if (config) {
      setAdminIdInput(config.admin_telegram_id || '169262990');
      setWindowStartHour(config.send_window_start_hour_msk || 10);
      setWindowEndHour(config.send_window_end_hour_msk || 17);
      setGenHour(config.generation_hour_msk || 7);
      setIntervalDays(config.interval_days || 2);
    }
  }, [config]);

  // Fetch Posts
  const { data: postsData, refetch: refetchPosts, isLoading: isLoadingPosts } = useQuery<{ success: boolean; posts: MemePost[] }>({
    queryKey: ['meme-autopilot-posts', activeAudience],
    queryFn: async () => {
      const res = await fetch(`/api/meme-autopilot/posts?audience=${activeAudience}`);
      return res.json();
    }
  });
  const posts = postsData?.posts || [];

  // Fetch Queue with audience and status filters
  const { data: queueData, refetch: refetchQueue } = useQuery<{
    success: boolean;
    queue: DeliveryQueueItem[];
    stats: { status: string; count: number }[];
    audienceCounts?: { client: number; partner: number; all: number };
  }>({
    queryKey: ['meme-autopilot-queue', queueAudience, queueStatusFilter, queueChannelFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (queueAudience !== 'all') params.append('recipientType', queueAudience);
      if (queueStatusFilter !== 'all') params.append('status', queueStatusFilter);
      if (queueChannelFilter !== 'all') params.append('channel', queueChannelFilter);
      const res = await fetch(`/api/meme-autopilot/queue?${params.toString()}`);
      return res.json();
    },
    refetchInterval: 15000
  });
  const queueItems = queueData?.queue || [];
  const queueStats = queueData?.stats || [];
  const audienceCounts = queueData?.audienceCounts || { client: 0, partner: 0, all: 0 };

  // Fetch Prompts
  const { data: promptsData, refetch: refetchPrompts } = useQuery<{ success: boolean; prompts: any[] }>({
    queryKey: ['meme-autopilot-prompts'],
    queryFn: async () => {
      const res = await fetch('/api/meme-autopilot/prompts');
      return res.json();
    }
  });
  const prompts = promptsData?.prompts || [];

  // Set initial selected post when posts load
  useEffect(() => {
    if (posts.length > 0 && !selectedPost) {
      setSelectedPost(posts[0]);
    } else if (posts.length > 0 && selectedPost) {
      const updated = posts.find(p => p.id === selectedPost.id);
      if (updated) setSelectedPost(updated);
    }
  }, [posts]);

  // Handle Toggle Autopilot
  const handleToggleAutopilot = async (checked: boolean) => {
    try {
      await fetch('/api/meme-autopilot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: checked ? 1 : 0 })
      });
      refetchConfig();
      toast({
        title: checked ? 'Автопилот включен' : 'Автопилот на паузе',
        description: checked ? 'Генерация мемов запускается каждые 2 дня в 07:00 МСК' : 'Автоматические рассылки приостановлены'
      });
    } catch {
      toast({ title: 'Ошибка изменения настроек' });
    }
  };

  // Save Full Settings
  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/meme-autopilot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_telegram_id: adminIdInput.trim() || '169262990',
          send_window_start_hour_msk: Number(windowStartHour),
          send_window_end_hour_msk: Number(windowEndHour),
          generation_hour_msk: Number(genHour),
          interval_days: Number(intervalDays)
        })
      });
      const data = await res.json();
      if (data.success) {
        refetchConfig();
        toast({
          title: 'Настройки рассылок сохранены',
          description: `Окно: ${windowStartHour}:00-${windowEndHour}:00 МСК, тест: ${adminIdInput}`
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({ title: 'Ошибка сохранения настроек', description: err.message });
    }
  };

  // Pause and reschedule all pending items strictly to daytime window
  const handlePauseNightQueue = async () => {
    setIsPausingNight(true);
    try {
      const res = await fetch('/api/meme-autopilot/pause-night-queue', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        refetchConfig();
        refetchQueue();
        toast({
          title: 'Ночная отправка заблокирована',
          description: `Автопилот выключен. Перенесено ${data.rescheduledCount} сообщений на 10:00 - 17:00 МСК.`
        });
      }
    } catch {
      toast({ title: 'Ошибка переноса очереди' });
    } finally {
      setIsPausingNight(false);
    }
  };

  // Clear all pending items in queue
  const handleClearPendingQueue = async () => {
    setIsClearingQueue(true);
    try {
      const res = await fetch('/api/meme-autopilot/clear-pending-queue', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        refetchQueue();
        refetchPosts();
        toast({
          title: 'Очередь очищена',
          description: 'Все ожидающие отправки сообщения удалены из очереди.'
        });
      }
    } catch {
      toast({ title: 'Ошибка очистки очереди' });
    } finally {
      setIsClearingQueue(false);
    }
  };

  // Generate new post via ProTalk & Function 621
  const handleGeneratePost = async () => {
    setIsGenerating(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/meme-autopilot/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_audience: activeAudience,
          customTopic: customPrompt.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success && data.post) {
        setSelectedPost(data.post);
        setTestResult(prev => ({
          ...prev,
          [activeAudience === 'partners' ? 'partnerPost' : 'clientPost']: data.post
        }));
        setCustomPrompt('');
        refetchPosts();
        toast({
          title: 'Пост сгенерирован',
          description: 'Создан единый JSON (текст, хуки, промпт 16:9) и иллюстрация через функцию 621'
        });
      } else {
        throw new Error(data.error || 'Ошибка генерации');
      }
    } catch (err: any) {
      toast({ title: 'Ошибка генерации', description: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate image via Function 621
  const handleRegenerateImage = async () => {
    if (!selectedPost) return;
    setIsRegeneratingImage(true);
    try {
      const res = await fetch('/api/meme-autopilot/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: selectedPost.id })
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setSelectedPost(prev => prev ? { ...prev, image_url: data.imageUrl } : null);
        refetchPosts();
        toast({
          title: 'Мем перерисован',
          description: 'Функция 621 сгенерировала новое стимпанк-изображение формата 16:9'
        });
      } else {
        throw new Error(data.error || 'Не удалось получить картинку');
      }
    } catch (err: any) {
      toast({ title: 'Ошибка генерации картинки', description: err.message });
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  // Send Test Post to Admin (169262990)
  const handleSendTestToAdmin = async () => {
    if (!selectedPost) return;
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/meme-autopilot/send-test-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: selectedPost.id,
          adminTelegramId: config?.admin_telegram_id || '169262990'
        })
      });
      const data = await res.json();
      if (data.success) {
        refetchPosts();
        toast({
          title: 'Тест отправлен администратору',
          description: `Пост и мем 16:9 доставлены в Telegram на ID ${config?.admin_telegram_id || '169262990'}`
        });
      } else {
        throw new Error(data.error || 'Ошибка отправки в Telegram');
      }
    } catch (err: any) {
      toast({ title: 'Ошибка отправки теста', description: err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Schedule cascade delivery (10:00 - 17:00 MSK)
  const handleScheduleCascade = async () => {
    if (!selectedPost) return;
    setIsScheduling(true);
    try {
      const res = await fetch('/api/meme-autopilot/schedule-cascade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: selectedPost.id })
      });
      const data = await res.json();
      if (data.success) {
        refetchPosts();
        refetchQueue();
        toast({
          title: 'Каскадная доставка запланирована',
          description: `В очередь добавлено ${data.queuedCount} получателей на интервал 10:00-17:00 МСК`
        });
      } else {
        throw new Error(data.error || 'Ошибка планирования');
      }
    } catch (err: any) {
      toast({ title: 'Ошибка добавления в очередь', description: err.message });
    } finally {
      setIsScheduling(false);
    }
  };

  // Manual Trigger Morning Cycle
  const handleTriggerMorningCycle = async () => {
    setIsGenerating(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/meme-autopilot/trigger-morning-cycle', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          clientPost: data.clientPost,
          partnerPost: data.partnerPost
        });
        if (data.clientPost && activeAudience === 'clients') setSelectedPost(data.clientPost);
        else if (data.partnerPost && activeAudience === 'partners') setSelectedPost(data.partnerPost);
        else if (data.clientPost) setSelectedPost(data.clientPost);

        refetchPosts();
        refetchQueue();
        refetchConfig();
        toast({
          title: 'Утренний цикл выполнен',
          description: 'Сгенерированы оба поста через функцию 621, отправлены тесты на 169262990 и включена каскадная очередь'
        });
      } else {
        throw new Error(data.error || 'Ошибка запуска цикла');
      }
    } catch (err: any) {
      toast({ title: 'Ошибка выполнения цикла', description: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  // Flush Queue Batch
  const handleProcessQueueNow = async () => {
    setIsProcessingQueue(true);
    try {
      const res = await fetch('/api/meme-autopilot/process-queue', { method: 'POST' });
      const data = await res.json();
      refetchQueue();
      refetchPosts();
      toast({
        title: 'Очередь обработана',
        description: `Отправлено: ${data.sent}, заблокировано: ${data.blocked}, ошибок: ${data.failed}`
      });
    } catch {
      toast({ title: 'Ошибка отправки очереди' });
    } finally {
      setIsProcessingQueue(false);
    }
  };

  // Save Edit Post (H1, H2, Rich Text)
  const handleSaveEdit = async () => {
    if (!selectedPost) return;
    try {
      await fetch(`/api/meme-autopilot/posts/${selectedPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          subtitle: editSubtitle.trim(),
          text_rich: editText.trim()
        })
      });
      setSelectedPost(prev => prev ? {
        ...prev,
        title: editTitle.trim(),
        subtitle: editSubtitle.trim(),
        text_rich: editText.trim()
      } : null);
      setEditDialogOpen(false);
      refetchPosts();
      queryClient.invalidateQueries({ queryKey: ['meme-autopilot-posts'] });
      toast({ title: 'Пост сохранен', description: 'Заголовки-панчлайны и текст успешно обновлены' });
    } catch {
      toast({ title: 'Ошибка сохранения поста' });
    }
  };

  const openEditModal = () => {
    if (!selectedPost) return;
    const hooks = extractHooksForDisplay(selectedPost);
    setEditTitle(hooks.h1);
    setEditSubtitle(hooks.h2);
    setEditText(hooks.cleanText || selectedPost.text_rich || '');
    setEditDialogOpen(true);
  };

  // Create Post Manually
  const handleCreatePostManual = async () => {
    if (!createText.trim()) {
      toast({ title: 'Заполните текст мема' });
      return;
    }
    setIsCreatingPost(true);
    try {
      const res = await fetch('/api/meme-autopilot/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_audience: createAudience,
          title: createTitle.trim() || (createAudience === 'partners' ? 'Хроники партнерского спокойствия' : 'Утро доброе, бизнес непобедимый'),
          subtitle: createSubtitle.trim() || (createAudience === 'partners' ? 'Автоматизация продаж на ваш баланс' : 'Легкость и прибыль от внедрения ИИ-продавца SAV AI'),
          text_rich: createText.trim(),
          image_url: createImageUrl.trim() || null,
          image_prompt: createImagePrompt.trim() || null
        })
      });
      const data = await res.json();
      if (data.success && data.post) {
        setCreateDialogOpen(false);
        setCreateTitle('');
        setCreateSubtitle('');
        setCreateText('');
        setCreateImageUrl('');
        setCreateImagePrompt('');
        refetchPosts();
        setSelectedPost(data.post);
        setActiveAudience(createAudience);
        setCurrentTab('editor');
        toast({ title: 'Пост успешно создан', description: 'Пост сохранен в базе данных и открыт в предпросмотре' });
      } else {
        throw new Error(data.error || 'Ошибка создания поста');
      }
    } catch (err: any) {
      toast({ title: 'Ошибка создания', description: err.message });
    } finally {
      setIsCreatingPost(false);
    }
  };

  // Delete Post from history
  const handleDeletePost = async (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/meme-autopilot/posts/${postId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        refetchPosts();
        if (selectedPost?.id === postId) {
          setSelectedPost(null);
        }
        toast({ title: 'Пост удален из базы данных' });
      } else {
        throw new Error(data.error || 'Не удалось удалить пост');
      }
    } catch (err: any) {
      toast({ title: 'Ошибка удаления', description: err.message });
    }
  };

  // Open Edit Queue Date modal
  const handleOpenEditQueueModal = (item: DeliveryQueueItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditQueueItem(item);
    try {
      const d = new Date(item.next_send_at || item.scheduled_time || Date.now());
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditQueueTime(iso);
    } catch {
      setEditQueueTime('');
    }
    setEditQueueDialogOpen(true);
  };

  // Save new scheduled date for queue item
  const handleSaveQueueDate = async () => {
    if (!editQueueItem || !editQueueTime) return;
    setIsUpdatingQueue(true);
    try {
      const targetIso = new Date(editQueueTime).toISOString();
      const res = await fetch(`/api/meme-autopilot/queue/${editQueueItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_time: targetIso,
          next_send_at: targetIso,
          status: 'pending'
        })
      });
      const data = await res.json();
      if (data.success) {
        refetchQueue();
        setEditQueueDialogOpen(false);
        toast({ title: 'Дата напоминания обновлена', description: `Отправка запланирована на ${new Date(targetIso).toLocaleString('ru-RU')}` });
      } else {
        throw new Error(data.error || 'Ошибка обновления даты');
      }
    } catch (err: any) {
      toast({ title: 'Ошибка обновления даты', description: err.message });
    } finally {
      setIsUpdatingQueue(false);
    }
  };

  // Delete item from queue
  const handleDeleteQueueItem = async (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/meme-autopilot/queue/${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        refetchQueue();
        toast({ title: 'Сообщение удалено из очереди' });
      } else {
        throw new Error(data.error || 'Ошибка удаления');
      }
    } catch (err: any) {
      toast({ title: 'Ошибка удаления', description: err.message });
    }
  };

  // Disable recipient completely
  const handleDisableRecipient = async (itemId: string, recipientName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/meme-autopilot/queue/${itemId}/disable`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        refetchQueue();
        toast({ title: 'Получатель полностью отключен', description: data.message });
      } else {
        throw new Error(data.error || 'Ошибка отключения');
      }
    } catch (err: any) {
      toast({ title: 'Ошибка отключения', description: err.message });
    }
  };

  // 1-Click Reschedule All for selected audience
  const handleRescheduleAll = async (targetDay: 'today' | 'tomorrow') => {
    setIsReschedulingQueue(true);
    try {
      const res = await fetch('/api/meme-autopilot/queue/reschedule-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDay,
          recipientType: queueAudience
        })
      });
      const data = await res.json();
      if (data.success) {
        refetchQueue();
        toast({
          title: `Очередь перенесена на ${targetDay === 'today' ? 'сегодня' : 'завтра'}`,
          description: `Перенесено ${data.rescheduledCount} сообщений (10:00 - 17:00 МСК, случайное время, до 5 в минуту)`
        });
      } else {
        throw new Error(data.error || 'Ошибка переноса даты');
      }
    } catch (err: any) {
      toast({ title: 'Ошибка переноса', description: err.message });
    } finally {
      setIsReschedulingQueue(false);
    }
  };

  // Send Test Email via SMTP with full live stage visualization
  const handleSendTestEmail = async (overrideAudience?: 'both' | 'clients' | 'partners', overrideEmail?: string) => {
    const audienceToUse = overrideAudience || testEmailAudience;
    const emailToUse = (overrideEmail || testEmailInput || 'shishkarnem@gmail.com').trim();
    setIsSendingTestEmail(true);
    setTestEmailDialogOpen(false); // Close dialog immediately so visual HUD on page is front and center

    setEmailSendingStage(`Подключение к почтовому серверу SMTP (mail.hosting.reg.ru:465 SSL)...`);

    const timer1 = setTimeout(() => {
      setEmailSendingStage(`Сборка HTML-шаблона SAV AI и подготовка письма на ${emailToUse}...`);
    }, 1100);
    const timer2 = setTimeout(() => {
      setEmailSendingStage(`Отправка тестового письма (${audienceToUse === 'both' ? 'Клиенты + Партнеры' : audienceToUse}) на ${emailToUse}...`);
    }, 2200);

    try {
      const res = await fetch('/api/meme-autopilot/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: audienceToUse !== 'both' ? selectedPost?.id : undefined,
          email: emailToUse,
          audience: audienceToUse
        })
      });
      clearTimeout(timer1);
      clearTimeout(timer2);
      const data = await res.json();

      if (data.success || data.clientSuccess || data.partnerSuccess) {
        toast({
          title: data.success ? 'Тестовые письма отправлены' : 'Результат тестирования Email',
          description: data.message || `Доставлено на ${emailToUse}`
        });

        const chosenHtml = data.htmlPreview || data.clientHtmlPreview || data.partnerHtmlPreview || '';
        setLastEmailTestResult({
          success: Boolean(data.success),
          message: data.message || `Тестовые письма успешно доставлены на ${emailToUse}`,
          messageId: data.messageId || data.clientMessageId || data.partnerMessageId || 'SMTP_250_OK',
          clientMessageId: data.clientMessageId,
          partnerMessageId: data.partnerMessageId,
          clientHtmlPreview: data.clientHtmlPreview,
          partnerHtmlPreview: data.partnerHtmlPreview,
          clientPostTitle: data.clientPost?.title,
          partnerPostTitle: data.partnerPost?.title,
          clientSuccess: data.clientSuccess ?? true,
          partnerSuccess: data.partnerSuccess ?? true,
          targetEmail: emailToUse,
          audience: audienceToUse,
          postTitle: data.post?.title || data.clientPost?.title || data.partnerPost?.title || 'Тестовый мем SAV AI',
          htmlPreview: chosenHtml,
          results: data.results,
          sentAt: new Date().toLocaleTimeString('ru-RU')
        });

        if (chosenHtml) {
          setPreviewHtmlToDisplay(chosenHtml);
        }
      } else {
        throw new Error(data.error || 'Не удалось отправить тестовое письмо');
      }
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      toast({ title: 'Ошибка отправки email', description: err.message });
      setLastEmailTestResult({
        success: false,
        message: err.message || 'Ошибка отправки email',
        targetEmail: emailToUse,
        audience: audienceToUse,
        sentAt: new Date().toLocaleTimeString('ru-RU')
      });
    } finally {
      setIsSendingTestEmail(false);
      setEmailSendingStage('');
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Banner & Control Card (Liquid Glass Apple) */}
      <div className="rounded-2xl border border-amber-400/25 bg-zinc-950/70 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <RealisticSmokeBackdrop speed="slow" opacity={0.2} className="-top-3 -left-3 w-[calc(100%+24px)] h-[80px] pointer-events-none" />
        
        <div className="flex items-center justify-between gap-4 flex-wrap pb-5 border-b border-white/10 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                Автопилот сатирических мемов и напоминаний
              </h2>
            </div>
            <p className="text-sm text-zinc-300 max-w-2xl leading-relaxed">
              Автоматическая генерация через бота ProTalk (функция 621) каждые 2 дня в 07:00 по Москве, моментальный тестовый предпросмотр администратору (ID: 169262990) и каскадная отправка в случайное рабочее время с 10:00 до 17:00 по Москве.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-sm text-zinc-200 font-medium">Автопилот:</span>
              <Switch
                checked={config?.is_active === 1}
                onCheckedChange={handleToggleAutopilot}
                className="data-[state=checked]:bg-amber-400"
              />
              <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-md ${config?.is_active === 1 ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-zinc-800 text-zinc-400'}`}>
                {config?.is_active === 1 ? 'Активен' : 'Пауза'}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerMorningCycle}
              disabled={isGenerating}
              className="text-sm bg-gradient-to-r from-amber-500/20 to-amber-400/10 hover:from-amber-500/30 hover:to-amber-400/20 text-amber-300 border-amber-400/40 gap-2 h-10 shadow-sm"
              title="Запустить полный цикл 07:00 прямо сейчас: генерация постов для клиентов и партнеров, отправка тестов админу и добавление в очередь"
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Тест 07:00 (полный цикл)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendTestEmail('both', 'shishkarnem@gmail.com')}
              disabled={isSendingTestEmail}
              className="text-sm bg-gradient-to-r from-amber-500/25 to-amber-400/15 hover:from-amber-500/35 hover:to-amber-400/25 text-amber-200 border border-amber-400/50 gap-2 h-10 px-4 shadow-md font-medium"
              title="Отправить тестовые письма (Клиенты + Партнеры) на shishkarnem@gmail.com с живой визуализацией"
            >
              {isSendingTestEmail ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
              ) : (
                <Mail className="h-4 w-4 text-amber-400" />
              )}
              <span>{isSendingTestEmail ? 'Отправка...' : 'Тест Email (Клиенты + Партнеры)'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestEmailDialogOpen(true)}
              disabled={isSendingTestEmail}
              className="text-sm bg-white/5 hover:bg-white/10 text-zinc-200 border-white/20 gap-1.5 h-10 px-3"
              title="Выбрать адрес получателя или конкретную аудиторию для теста"
            >
              <Settings className="h-3.5 w-3.5 text-zinc-400" />
              <span>Настроить...</span>
            </Button>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5 text-sm relative z-10">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-sm text-zinc-400 flex items-center gap-2 mb-1.5">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>Расписание генерации</span>
            </div>
            <div className="font-semibold text-zinc-100 text-sm">
              Раз в {config?.interval_days || 2} дня в {config?.generation_hour_msk || 7}:00 МСК
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-sm text-zinc-400 flex items-center gap-2 mb-1.5">
              <Send className="h-4 w-4 text-amber-300" />
              <span>Окно отправки</span>
            </div>
            <div className="font-semibold text-zinc-100 text-sm">
              {config?.send_window_start_hour_msk || 10}:00 — {config?.send_window_end_hour_msk || 17}:00 МСК
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-sm text-zinc-400 flex items-center gap-2 mb-1.5">
              <Shield className="h-4 w-4 text-amber-300" />
              <span>Админ для превью</span>
            </div>
            <div className="font-semibold text-amber-300 font-mono text-sm">
              ID: {config?.admin_telegram_id || '169262990'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-sm text-zinc-400 flex items-center gap-2 mb-1.5">
              <Users className="h-4 w-4 text-amber-300" />
              <span>В очереди сегодня</span>
            </div>
            <div className="font-semibold text-zinc-100 text-sm">
              {queueItems.filter(i => i.status === 'pending').length} получателей
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Email Dispatch HUD / Result Card (Apple Liquid Glass) */}
      {(isSendingTestEmail || lastEmailTestResult) && (
        <div id="autopilot-email-test-card" className="rounded-2xl border border-amber-400/40 bg-zinc-950/90 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-4 animate-in fade-in duration-300">
          <RealisticSmokeBackdrop speed="slow" opacity={0.25} className="-top-3 -left-3 w-[calc(100%+24px)] h-[90px] pointer-events-none" />

          {/* Steampunk Corner Rivets */}
          <div className="absolute top-3 left-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 border border-amber-900/60 shadow-inner" />
          <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 border border-amber-900/60 shadow-inner" />

          <div className="flex items-center justify-between gap-3 flex-wrap relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl border border-amber-400/40 bg-amber-400/15 text-amber-300">
                {isSendingTestEmail ? (
                  <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
                ) : lastEmailTestResult?.success ? (
                  <CheckCircle2 className="h-5 w-5 text-amber-300" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                    {isSendingTestEmail
                      ? 'Выполняется тестирование рассылки на Email (SMTP:465)'
                      : lastEmailTestResult?.success
                      ? 'Тестовые письма на Email успешно отправлены'
                      : 'Ошибка отправки тестового письма'}
                  </h3>
                  <Badge variant="outline" className="border-amber-400/40 text-amber-300 bg-amber-400/10 text-sm">
                    {lastEmailTestResult?.audience === 'both'
                      ? 'Клиенты + Партнеры'
                      : lastEmailTestResult?.audience === 'partners'
                      ? 'Партнеры'
                      : 'Клиенты'}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-300 mt-0.5">
                  {isSendingTestEmail
                    ? (emailSendingStage || 'Отправка через защищенный почтовый шлюз mail.hosting.reg.ru:465...')
                    : (lastEmailTestResult?.message || 'Письма переданы почтовому шлюзу')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSendTestEmail(lastEmailTestResult?.audience as any || 'both', lastEmailTestResult?.targetEmail || 'shishkarnem@gmail.com')}
                disabled={isSendingTestEmail}
                className="bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/35 text-sm h-9 gap-1.5 font-medium"
              >
                <RefreshCw className={`h-4 w-4 ${isSendingTestEmail ? 'animate-spin' : ''}`} />
                <span>Отправить повторно</span>
              </Button>

              {!isSendingTestEmail && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLastEmailTestResult(null)}
                  className="text-zinc-400 hover:text-white h-9 w-9 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Details Row & Previews */}
          {!isSendingTestEmail && lastEmailTestResult?.success && (
            <div className="space-y-3 relative z-10">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-zinc-400">Получатель: </span>
                    <span className="text-amber-300 font-mono font-medium">{lastEmailTestResult.targetEmail}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Статус SMTP: </span>
                    <span className="text-zinc-200 font-medium">250 OK (Принято к доставке)</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Время отправки: </span>
                    <span className="text-zinc-200 font-mono">{lastEmailTestResult.sentAt}</span>
                  </div>
                </div>
              </div>

              {/* Per-Audience Cards with Independent Previews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Client Email Result */}
                {(lastEmailTestResult.clientHtmlPreview || lastEmailTestResult.audience === 'both' || lastEmailTestResult.audience === 'clients') && (
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 font-semibold">
                        👔 Письмо для Клиентов (кнопка «Хочу ИИ-бизнес»)
                      </span>
                      <span className="text-xs font-mono text-zinc-400">SMTP 250 OK</span>
                    </div>
                    <div className="text-sm font-medium text-zinc-200 line-clamp-1">
                      {lastEmailTestResult.clientPostTitle || 'Мем для клиентов SAV AI'}
                    </div>
                    {lastEmailTestResult.clientMessageId && (
                      <div className="text-xs font-mono text-zinc-400 truncate">
                        ID: <span className="text-zinc-300">{lastEmailTestResult.clientMessageId}</span>
                      </div>
                    )}
                    {lastEmailTestResult.clientHtmlPreview && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPreviewHtmlToDisplay(lastEmailTestResult.clientHtmlPreview || '');
                          setEmailPreviewModalOpen(true);
                        }}
                        className="w-full bg-white/10 hover:bg-white/15 text-zinc-100 border border-white/20 text-sm h-8 gap-1.5 mt-1 font-medium"
                      >
                        <Eye className="h-3.5 w-3.5 text-amber-300" />
                        <span>Предпросмотр письма Клиентам</span>
                      </Button>
                    )}
                  </div>
                )}

                {/* Partner Email Result */}
                {(lastEmailTestResult.partnerHtmlPreview || lastEmailTestResult.audience === 'both' || lastEmailTestResult.audience === 'partners') && (
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 font-semibold">
                        💼 Письмо для Партнеров (кнопка «✨ Твой ИИ-Партнер»)
                      </span>
                      <span className="text-xs font-mono text-zinc-400">SMTP 250 OK</span>
                    </div>
                    <div className="text-sm font-medium text-zinc-200 line-clamp-1">
                      {lastEmailTestResult.partnerPostTitle || 'Мем для партнеров SAV AI'}
                    </div>
                    {lastEmailTestResult.partnerMessageId && (
                      <div className="text-xs font-mono text-zinc-400 truncate">
                        ID: <span className="text-zinc-300">{lastEmailTestResult.partnerMessageId}</span>
                      </div>
                    )}
                    {lastEmailTestResult.partnerHtmlPreview && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPreviewHtmlToDisplay(lastEmailTestResult.partnerHtmlPreview || '');
                          setEmailPreviewModalOpen(true);
                        }}
                        className="w-full bg-white/10 hover:bg-white/15 text-zinc-100 border border-white/20 text-sm h-8 gap-1.5 mt-1 font-medium"
                      >
                        <Eye className="h-3.5 w-3.5 text-amber-300" />
                        <span>Предпросмотр письма Партнерам</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="absolute bottom-3 left-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 border border-amber-900/60 shadow-inner" />
          <div className="absolute bottom-3 right-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 border border-amber-900/60 shadow-inner" />
        </div>
      )}

      {/* Real-Time Autopilot Progress HUD (Apple Liquid Glass) */}
      {(isGenerating || liveProgress?.isActive) && (
        <div id="autopilot-live-progress-card" className="rounded-2xl border border-amber-400/40 bg-zinc-950/90 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-4 animate-in fade-in duration-300">
          <RealisticSmokeBackdrop speed="slow" opacity={0.25} className="-top-3 -left-3 w-[calc(100%+24px)] h-[90px] pointer-events-none" />
          
          <div className="flex items-center justify-between gap-3 flex-wrap relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl border border-amber-400/40 bg-amber-400/15 text-amber-300">
                <RefreshCw className="h-5 w-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                  Выполняется автосоздание сатирического бизнес-мема
                </h3>
                <p className="text-sm text-zinc-300">
                  {liveProgress?.detail || 'Инициализация запроса и единого JSON сценария...'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-xl">
                Время: {elapsedTimer}с
              </span>
              <span className="text-sm font-semibold text-white bg-white/10 px-3 py-1 rounded-xl border border-white/15">
                {liveProgress?.percent || 30}%
              </span>
            </div>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="w-full bg-zinc-900/90 h-3 rounded-full overflow-hidden border border-white/10 relative z-10">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-200 transition-all duration-500 shadow-lg shadow-amber-400/30"
              style={{ width: `${Math.max(15, liveProgress?.percent || (elapsedTimer > 0 ? Math.min(90, elapsedTimer * 4) : 25))}%` }}
            />
          </div>

          {/* 3 Step Visual Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 relative z-10 text-sm">
            <div className={`p-3 rounded-xl border transition-all ${
              (liveProgress?.step || 1) >= 1 ? 'border-amber-400/50 bg-amber-400/10 text-amber-200 font-semibold shadow-sm' : 'border-white/10 bg-white/[0.02] text-zinc-400'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>1. Текст и промпт мема</span>
              </div>
              <p className="text-sm text-zinc-300 font-normal">Единый JSON: хуки H1/H2, сатира, без дублей</p>
            </div>

            <div className={`p-3 rounded-xl border transition-all ${
              (liveProgress?.step || 1) >= 2 ? 'border-amber-400/50 bg-amber-400/10 text-amber-200 font-semibold shadow-sm' : 'border-white/10 bg-white/[0.02] text-zinc-400'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="h-4 w-4 text-amber-400" />
                <span>2. Функция 621 (16:9)</span>
              </div>
              <p className="text-sm text-zinc-300 font-normal">Стимпанк робот в красных гоглах (1 раз, без бота)</p>
            </div>

            <div className={`p-3 rounded-xl border transition-all ${
              (liveProgress?.step || 1) >= 3 ? 'border-amber-400/50 bg-amber-400/10 text-amber-200 font-semibold shadow-sm' : 'border-white/10 bg-white/[0.02] text-zinc-400'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-amber-400" />
                <span>3. Запись в базу BD ProTalk</span>
              </div>
              <p className="text-sm text-zinc-300 font-normal">Фиксация таблицы meme_posts, тест на 169262990</p>
            </div>
          </div>
        </div>
      )}

      {/* Live Test Results Card Showcase (Apple Liquid Glass) */}
      {testResult && !isGenerating && (
        <div id="autopilot-test-result-hub" className="rounded-2xl border border-amber-400/40 bg-zinc-950/90 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl border border-amber-400/40 bg-amber-400/20 text-amber-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                  Результат тестовой генерации мемов
                </h3>
                <p className="text-sm text-zinc-300">
                  Посты сгенерированы в едином JSON запросе, иллюстрации 16:9 созданы через функцию 621 ровно 1 раз и зафиксированы в базе данных.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTestResult(null)}
              className="text-zinc-400 hover:text-white text-sm"
            >
              <X className="h-4 w-4 mr-1" />
              <span>Скрыть результат</span>
            </Button>
          </div>

          {/* Render Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {testResult.clientPost && (
              <div className="rounded-2xl border border-white/15 bg-zinc-900/80 p-4 space-y-3.5 flex flex-col justify-between shadow-xl">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg border border-amber-400/40 bg-amber-400/15 text-amber-300 text-sm font-semibold">
                      🎯 Аудитория: Клиенты (@SAV_AI_Sales_Bot)
                    </span>
                    <span className="text-sm text-zinc-400 font-mono">16:9 ф. 621</span>
                  </div>

                  {testResult.clientPost.image_url && (
                    <div className="rounded-xl overflow-hidden aspect-video border border-white/10 relative group shadow-md">
                      <img src={testResult.clientPost.image_url} alt="Клиентский мем" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-sm font-mono text-amber-300 border border-amber-400/30">
                        Функция 621
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-base font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 bg-clip-text text-transparent">
                      {testResult.clientPost.title}
                    </h4>
                    <p className="text-sm text-zinc-300 mt-2 line-clamp-4 leading-relaxed whitespace-pre-line">
                      {testResult.clientPost.text_rich}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center gap-2.5">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedPost(testResult.clientPost!);
                      setActiveAudience('clients');
                      setCurrentTab('editor');
                    }}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm border border-white/15 h-9"
                  >
                    <Edit3 className="h-4 w-4 mr-1.5 text-amber-400" />
                    <span>В редактор</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSendTestToAdmin()}
                    disabled={isSendingTest}
                    className="flex-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-sm border border-amber-400/40 h-9 font-medium"
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    <span>Тест админу</span>
                  </Button>
                </div>
              </div>
            )}

            {testResult.partnerPost && (
              <div className="rounded-2xl border border-white/15 bg-zinc-900/80 p-4 space-y-3.5 flex flex-col justify-between shadow-xl">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg border border-amber-400/40 bg-amber-400/15 text-amber-300 text-sm font-semibold">
                      💼 Аудитория: Партнеры (@SAVPartnerBot)
                    </span>
                    <span className="text-sm text-zinc-400 font-mono">16:9 ф. 621</span>
                  </div>

                  {testResult.partnerPost.image_url && (
                    <div className="rounded-xl overflow-hidden aspect-video border border-white/10 relative group shadow-md">
                      <img src={testResult.partnerPost.image_url} alt="Партнерский мем" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-sm font-mono text-amber-300 border border-amber-400/30">
                        Функция 621
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-base font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 bg-clip-text text-transparent">
                      {testResult.partnerPost.title}
                    </h4>
                    <p className="text-sm text-zinc-300 mt-2 line-clamp-4 leading-relaxed whitespace-pre-line">
                      {testResult.partnerPost.text_rich}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center gap-2.5">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedPost(testResult.partnerPost!);
                      setActiveAudience('partners');
                      setCurrentTab('editor');
                    }}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm border border-white/15 h-9"
                  >
                    <Edit3 className="h-4 w-4 mr-1.5 text-amber-400" />
                    <span>В редактор</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSendTestToAdmin()}
                    disabled={isSendingTest}
                    className="flex-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-sm border border-amber-400/40 h-9 font-medium"
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    <span>Тест админу</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Responsive Navigation Tabs (Vertical bubble pills on mobile to avoid horizontal scrolling, flex-wrap on desktop) */}
      <div className="sm:hidden flex flex-col gap-2 p-2 rounded-2xl bg-zinc-950/80 border border-white/15">
        <button
          onClick={() => setCurrentTab('editor')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
            currentTab === 'editor'
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-md'
              : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Bot className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Конструктор и предпросмотр</span>
          </div>
        </button>

        <button
          onClick={() => setCurrentTab('history')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
            currentTab === 'history'
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-md'
              : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-amber-400 shrink-0" />
            <span>История постов</span>
          </div>
          <span className="text-sm px-2.5 py-0.5 rounded-full bg-white/10 text-amber-200 border border-white/10">
            {posts.length}
          </span>
        </button>

        <button
          onClick={() => setCurrentTab('queue')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
            currentTab === 'queue'
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-md'
              : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Send className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Очередь доставки</span>
          </div>
          <span className="text-sm px-2.5 py-0.5 rounded-full bg-white/10 text-amber-200 border border-white/10">
            {queueItems.length}
          </span>
        </button>

        <button
          onClick={() => setCurrentTab('prompts')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
            currentTab === 'prompts'
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-md'
              : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Промпты нейросети</span>
          </div>
        </button>

        <button
          id="autopilot-settings-tab-btn-mobile"
          onClick={() => setCurrentTab('settings')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
            currentTab === 'settings'
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-md font-semibold'
              : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Settings className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Настройки рассылок (10:00-17:00)</span>
          </div>
        </button>
      </div>

      {/* Desktop / Tablet View: Horizontal wrap */}
      <div className="hidden sm:flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-zinc-950/80 border border-white/15">
        <button
          onClick={() => setCurrentTab('editor')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            currentTab === 'editor'
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-md'
              : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Bot className="h-4 w-4 text-amber-400" />
          <span>Конструктор и предпросмотр</span>
        </button>

        <button
          onClick={() => setCurrentTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            currentTab === 'history'
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-md'
              : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <FileText className="h-4 w-4 text-amber-400" />
          <span>История постов ({posts.length})</span>
        </button>

        <button
          onClick={() => setCurrentTab('queue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            currentTab === 'queue'
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-md'
              : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Send className="h-4 w-4 text-amber-400" />
          <span>Очередь доставки ({queueItems.length})</span>
        </button>

        <button
          onClick={() => setCurrentTab('prompts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            currentTab === 'prompts'
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-md'
              : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Sliders className="h-4 w-4 text-amber-400" />
          <span>Промпты нейросети</span>
        </button>

        <button
          id="autopilot-settings-tab-btn"
          onClick={() => setCurrentTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            currentTab === 'settings'
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-md font-semibold'
              : 'text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Settings className="h-4 w-4 text-amber-400" />
          <span>Настройки рассылок (10:00-17:00)</span>
        </button>
      </div>

      {/* Tab 1: Live Editor & Telegram Preview */}
      {currentTab === 'editor' && (
        <div className="space-y-5">
          {/* Audience Selector & Custom prompt trigger */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-zinc-950/70 p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-sm text-zinc-300 font-medium">Аудитория:</span>
              <button
                onClick={() => { setActiveAudience('clients'); setSelectedPost(null); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  activeAudience === 'clients'
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-md'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                Клиенты (Бот @SAV_AI_Sales_Bot)
              </button>
              <button
                onClick={() => { setActiveAudience('partners'); setSelectedPost(null); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  activeAudience === 'partners'
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-md'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                Партнеры (Бот @SAVPartnerBot)
              </button>
            </div>

            <div className="flex items-center gap-2.5 flex-1 min-w-[280px] max-w-md">
              <Input
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Специфическая тема мема (опционально)..."
                className="bg-zinc-900/80 border-white/15 text-sm h-10 rounded-xl text-zinc-100"
              />
              <Button
                onClick={handleGeneratePost}
                disabled={isGenerating}
                className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-sm h-10 px-4 gap-2 shrink-0 font-medium"
              >
                <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Генерация...' : 'Сгенерировать'}</span>
              </Button>
            </div>
          </div>

          {/* Dual Panel: Left Post Controls, Right Live Telegram Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Controls & Info */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-white/15 bg-zinc-950/70 backdrop-blur-xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="font-bold text-base text-zinc-100">
                    Управление текущим постом
                  </h3>
                  <Badge variant="outline" className="border-amber-400/40 text-amber-300 bg-amber-400/10 text-sm py-0.5 px-2.5">
                    {selectedPost?.status === 'scheduled' ? 'В очереди' : selectedPost?.status === 'sent' ? 'Отправлен' : 'Черновик'}
                  </Badge>
                </div>

                {selectedPost ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-zinc-400">Заголовок темы (H1)</Label>
                      <div className="text-sm font-semibold text-zinc-200 mt-1">
                        {extractHooksForDisplay(selectedPost).h1}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-zinc-400">Подзаголовок темы (H2)</Label>
                      <div className="text-sm font-medium text-zinc-300 mt-1">
                        {extractHooksForDisplay(selectedPost).h2}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-zinc-400">Промпт стимпанк-робота (функция 621)</Label>
                      <p className="text-sm text-zinc-300 italic bg-white/[0.02] p-3 rounded-xl border border-white/5 line-clamp-3 mt-1" title={selectedPost.image_prompt || ''}>
                        {selectedPost.image_prompt || 'Стимпанк робот в гоглах из красного металла...'}
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openEditModal}
                          className="text-sm h-10 bg-white/5 hover:bg-white/10 border-white/15 text-zinc-200 gap-2 font-medium"
                        >
                          <Edit3 className="h-4 w-4 text-amber-400" />
                          <span>Правка текста</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRegenerateImage}
                          disabled={isRegeneratingImage}
                          className="text-sm h-10 bg-white/5 hover:bg-white/10 border-white/15 text-zinc-200 gap-2 font-medium"
                        >
                          <ImageIcon className={`h-4 w-4 text-amber-400 ${isRegeneratingImage ? 'animate-pulse' : ''}`} />
                          <span>{isRegeneratingImage ? 'Рисуем...' : 'Перерисовать 621'}</span>
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <Button
                          size="sm"
                          onClick={handleSendTestToAdmin}
                          disabled={isSendingTest}
                          className="w-full text-sm bg-gradient-to-r from-amber-500/25 to-amber-400/15 hover:from-amber-500/35 hover:to-amber-400/25 text-amber-200 border border-amber-400/40 gap-2 h-11 shadow-lg font-medium"
                        >
                          <Send className="h-4 w-4 text-amber-400" />
                          <span>{isSendingTest ? 'Отправка...' : 'Тест в Telegram (169262990)'}</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTestEmailDialogOpen(true)}
                          disabled={isSendingTestEmail}
                          className="w-full text-sm bg-white/5 hover:bg-white/10 text-zinc-100 border border-white/20 gap-2 h-11 font-medium"
                        >
                          <Mail className="h-4 w-4 text-amber-400" />
                          <span>{isSendingTestEmail ? 'Отправка...' : 'Тест на Email (SMTP)'}</span>
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleScheduleCascade}
                        disabled={isScheduling}
                        className="w-full text-sm bg-white/10 hover:bg-white/15 text-zinc-100 border border-white/20 gap-2 h-11 font-medium"
                      >
                        <Clock className="h-4 w-4 text-amber-400" />
                        <span>{isScheduling ? 'Планирование...' : 'Запланировать каскад (10:00-17:00)'}</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-zinc-400">
                    <p>Нет выбранного поста.</p>
                    <p className="text-sm text-zinc-500 mt-1">Нажмите кнопку «Сгенерировать» выше для создания нового поста.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Live Telegram Message Mockup (Apple Liquid Glass) */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-amber-400/30 bg-zinc-950/80 backdrop-blur-3xl p-5 sm:p-7 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-sm font-mono text-zinc-300">
                      Живой предпросмотр в Telegram ({activeAudience === 'partners' ? '@SAVPartnerBot' : '@SAV_AI_Sales_Bot'})
                    </span>
                  </div>
                  <span className="text-sm text-amber-300/80">Формат 16:9 • Rich Markdown</span>
                </div>

                {/* Simulated Telegram Message Bubble */}
                <div className="max-w-md mx-auto rounded-2xl bg-zinc-900/90 border border-white/15 p-4 shadow-xl space-y-3.5">
                  {(() => {
                    const hooksDisplay = extractHooksForDisplay(selectedPost);
                    return (
                      <>
                        {/* 1. Hook H1 Headline in gold gradient */}
                        <div>
                          <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 bg-clip-text text-transparent leading-snug">
                            {hooksDisplay.h1}
                          </h3>
                        </div>

                        {/* 2. Embedded 16:9 Steampunk Robot Meme (strictly between H1 and H2) */}
                        {selectedPost?.image_url ? (
                          <div className="relative rounded-xl overflow-hidden aspect-video border border-white/10 group shadow-md">
                            <img
                              src={selectedPost.image_url}
                              alt="Стимпанк робот мем"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-sm font-mono text-amber-300 border border-amber-400/30">
                              16:9 Функция 621
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl aspect-video bg-zinc-950/60 border border-dashed border-white/15 flex flex-col items-center justify-center text-zinc-400 text-sm">
                            <ImageIcon className="h-8 w-8 text-zinc-500 mb-1.5" />
                            <span>Генерация картинки стимпанк-робота...</span>
                          </div>
                        )}

                        {/* 3. Hook H2 Subtitle / Punchline 2 */}
                        <div>
                          <h4 className="text-sm font-semibold text-white/90 leading-tight">
                            {hooksDisplay.h2}
                          </h4>
                        </div>

                        {/* Rich Text Body */}
                        <div className="text-sm text-zinc-100 leading-relaxed whitespace-pre-line space-y-2">
                          {selectedPost ? (
                            hooksDisplay.cleanText || selectedPost.text_rich
                          ) : (
                            <span className="text-zinc-500 italic">Текст поста еще не сгенерирован...</span>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  {/* Inline Buttons */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    {activeAudience === 'clients' ? (
                      <>
                        <div className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/25 to-amber-400/20 border border-amber-400/40 text-amber-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm">
                          <span>🚀 Хочу ИИ-бизнес</span>
                        </div>
                        <div className="w-full py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-sm flex items-center justify-center">
                          <span>🌐 Открыть SAV AI</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/25 to-amber-400/20 border border-amber-400/40 text-amber-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm">
                          <span>✨ Твой ИИ-Партнер</span>
                        </div>
                        <div className="w-full py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-sm flex items-center justify-center">
                          <span>💼 Партнерский кабинет</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Posts History */}
      {currentTab === 'history' && (
        <div className="space-y-4">
          {/* Top Actions in History: Generate Post for today & Manual Create */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-950/70 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Архив и создание постов</h3>
                <p className="text-sm text-zinc-400">Управление готовыми сатирическими мемами и создание новых</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                size="sm"
                onClick={handleGeneratePost}
                disabled={isGenerating}
                className="text-sm bg-gradient-to-r from-amber-500/25 to-amber-400/15 hover:from-amber-500/35 hover:to-amber-400/25 text-amber-200 border border-amber-400/40 h-10 px-4 gap-2 font-medium"
                title="Сгенерировать единый пост на сегодня через ИИ ProTalk и функцию 621"
              >
                <Sparkles className={`h-4 w-4 text-amber-400 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Генерация...' : `Сгенерировать для ${activeAudience === 'partners' ? 'Партнеров' : 'Клиентов'}`}</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCreateAudience(activeAudience);
                  setCreateTitle('');
                  setCreateSubtitle('');
                  setCreateText('');
                  setCreateImageUrl('');
                  setCreateImagePrompt('');
                  setCreateDialogOpen(true);
                }}
                className="text-sm bg-white/10 hover:bg-white/15 text-white border border-white/20 h-10 px-4 gap-2 font-medium"
              >
                <Plus className="h-4 w-4 text-amber-300" />
                <span>Создать пост вручную</span>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-zinc-950/70 backdrop-blur-2xl p-4 sm:p-5 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300 min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-sm text-zinc-400">
                  <th className="py-3 px-3">Дата создания</th>
                  <th className="py-3 px-3">Аудитория</th>
                  <th className="py-3 px-3">Заголовок / Мем</th>
                  <th className="py-3 px-3 text-center">Картинка 16:9</th>
                  <th className="py-3 px-3 text-center">Статус</th>
                  <th className="py-3 px-3 text-center">Доставка</th>
                  <th className="py-3 px-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 text-sm">
                      Нет сохраненных постов в истории
                    </td>
                  </tr>
                ) : (
                  posts.map(post => (
                    <tr
                      key={post.id}
                      onClick={() => { setSelectedPost(post); setCurrentTab('editor'); }}
                      className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer ${selectedPost?.id === post.id ? 'bg-amber-400/10' : ''}`}
                    >
                      <td className="py-3 px-3 text-sm text-zinc-400 font-mono">
                        {new Date(post.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className={`text-sm ${post.target_audience === 'partners' ? 'border-amber-400/40 text-amber-300' : 'border-white/20 text-zinc-200'}`}>
                          {post.target_audience === 'partners' ? 'Партнеры' : 'Клиенты'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-medium text-zinc-200 max-w-[240px] truncate" title={post.title}>
                        {post.title}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {post.image_url ? (
                          <img src={post.image_url} alt="" className="w-14 h-8 object-cover rounded mx-auto border border-white/10" />
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-sm px-2.5 py-0.5 rounded-full border ${post.status === 'scheduled' ? 'border-amber-400/40 text-amber-300 bg-amber-400/10' : post.status === 'sent' ? 'border-amber-400/60 text-amber-200 bg-amber-400/15' : 'border-white/10 text-zinc-400'}`}>
                          {post.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-sm font-mono">
                        {post.recipients_sent > 0 && <span className="text-amber-300 font-bold">{post.recipients_sent}</span>}
                        {post.recipients_blocked > 0 && <span className="text-zinc-500 ml-1">({post.recipients_blocked} бл.)</span>}
                        {post.recipients_total === 0 && <span className="text-zinc-500">—</span>}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); setSelectedPost(post); setCurrentTab('editor'); }}
                            className="h-8 text-sm text-amber-300 hover:text-white px-2.5"
                          >
                            Выбрать
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDeletePost(post.id, e)}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded-lg"
                            title="Удалить пост из истории"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Delivery Queue & Statuses */}
      {currentTab === 'queue' && (
        <div className="space-y-5">
          {/* Top Audience & Channel Sub-navigation */}
          <div className="p-4 sm:p-5 rounded-2xl border border-white/15 bg-zinc-950/70 backdrop-blur-2xl shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Audience Selector: Clients vs Partners */}
              <div className="space-y-1.5">
                <div className="text-sm text-zinc-400 font-medium">База данных и очередь отправки:</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => { setQueueAudience('client'); setQueueStatusFilter('all'); }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
                      queueAudience === 'client'
                        ? 'bg-gradient-to-r from-amber-500/25 to-amber-400/15 border-amber-400/50 text-amber-200 shadow-lg shadow-amber-500/10'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                    }`}
                  >
                    <span>Очередь клиентов</span>
                    <span className="px-2 py-0.5 rounded-lg text-sm bg-black/40 font-mono text-amber-300 border border-white/10">
                      {audienceCounts.client || 0}
                    </span>
                    <span className="text-sm text-zinc-400 font-mono">(@SAV_AI_Sales_Bot)</span>
                  </button>

                  <button
                    onClick={() => { setQueueAudience('partner'); setQueueStatusFilter('all'); }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
                      queueAudience === 'partner'
                        ? 'bg-gradient-to-r from-amber-500/25 to-amber-400/15 border-amber-400/50 text-amber-200 shadow-lg shadow-amber-500/10'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                    }`}
                  >
                    <span>Очередь партнеров</span>
                    <span className="px-2 py-0.5 rounded-lg text-sm bg-black/40 font-mono text-amber-300 border border-white/10">
                      {audienceCounts.partner || 0}
                    </span>
                    <span className="text-sm text-zinc-400 font-mono">(@SAVPartnerBot)</span>
                  </button>

                  <button
                    onClick={() => { setQueueAudience('all'); setQueueStatusFilter('all'); }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
                      queueAudience === 'all'
                        ? 'bg-gradient-to-r from-amber-500/25 to-amber-400/15 border-amber-400/50 text-amber-200 shadow-lg shadow-amber-500/10'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                    }`}
                  >
                    <span>Все базы</span>
                    <span className="px-2 py-0.5 rounded-lg text-sm bg-black/40 font-mono text-amber-300 border border-white/10">
                      {audienceCounts.all || 0}
                    </span>
                  </button>
                </div>
              </div>

              {/* 1-Click Reschedule Controls */}
              <div className="space-y-1.5">
                <div className="text-sm text-zinc-400 font-medium">Перенос времени в 1 клик (10:00–17:00 МСК):</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => handleRescheduleAll('today')}
                    disabled={isReschedulingQueue}
                    className="text-sm bg-gradient-to-r from-amber-500/20 to-amber-400/10 hover:from-amber-500/30 hover:to-amber-400/20 text-amber-200 border border-amber-400/35 h-10 px-3.5 gap-2 shadow-sm font-medium"
                    title="Перенести все сообщения в очереди на сегодня в случайное время между 10:00 и 17:00 МСК"
                  >
                    <Calendar className={`h-4 w-4 text-amber-300 ${isReschedulingQueue ? 'animate-spin' : ''}`} />
                    <span>На сегодня (случайно)</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleRescheduleAll('tomorrow')}
                    disabled={isReschedulingQueue}
                    className="text-sm bg-white/10 hover:bg-white/15 text-white border border-white/20 h-10 px-3.5 gap-2 font-medium"
                    title="Перенести все сообщения в очереди на завтра в случайное время между 10:00 и 17:00 МСК"
                  >
                    <Calendar className={`h-4 w-4 text-amber-300 ${isReschedulingQueue ? 'animate-spin' : ''}`} />
                    <span>На завтра (случайно)</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Clickable Status Filters & Quick Dispatch */}
            <div className="pt-3 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-zinc-400 font-medium mr-1">Статистика очереди:</span>
                
                {/* Pending */}
                {(() => {
                  const item = queueStats.find(s => s.status === 'pending');
                  const count = item ? item.count : 0;
                  const isActive = queueStatusFilter === 'pending';
                  return (
                    <button
                      onClick={() => setQueueStatusFilter(isActive ? 'all' : 'pending')}
                      className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border cursor-pointer ${
                        isActive
                          ? 'bg-amber-400/25 border-amber-400/60 text-amber-200 shadow-md shadow-amber-400/10'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                      }`}
                      title="Кликните, чтобы показать только список ожидающих отправки"
                    >
                      <span>В ожидании:</span>
                      <strong className="text-amber-300 font-mono">{count}</strong>
                    </button>
                  );
                })()}

                {/* Sent */}
                {(() => {
                  const item = queueStats.find(s => s.status === 'sent');
                  const count = item ? item.count : 0;
                  const isActive = queueStatusFilter === 'sent';
                  return (
                    <button
                      onClick={() => setQueueStatusFilter(isActive ? 'all' : 'sent')}
                      className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border cursor-pointer ${
                        isActive
                          ? 'bg-amber-400/25 border-amber-400/60 text-amber-200 shadow-md shadow-amber-400/10'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                      }`}
                      title="Кликните, чтобы показать только доставленные"
                    >
                      <span>Доставлено:</span>
                      <strong className="text-amber-300 font-mono">{count}</strong>
                    </button>
                  );
                })()}

                {/* Blocked */}
                {(() => {
                  const item = queueStats.find(s => s.status === 'blocked');
                  const count = item ? item.count : 0;
                  const isActive = queueStatusFilter === 'blocked';
                  return (
                    <button
                      onClick={() => setQueueStatusFilter(isActive ? 'all' : 'blocked')}
                      className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border cursor-pointer ${
                        isActive
                          ? 'bg-zinc-800 border-amber-400/60 text-amber-200 shadow-md'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                      }`}
                      title="Кликните, чтобы показать получателей с заблокированным ботом"
                    >
                      <span>Заблокирован бот:</span>
                      <strong className="text-amber-300 font-mono">{count}</strong>
                    </button>
                  );
                })()}

                {/* Failed */}
                {(() => {
                  const item = queueStats.find(s => s.status === 'failed');
                  const count = item ? item.count : 0;
                  const isActive = queueStatusFilter === 'failed';
                  return (
                    <button
                      onClick={() => setQueueStatusFilter(isActive ? 'all' : 'failed')}
                      className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border cursor-pointer ${
                        isActive
                          ? 'bg-zinc-800 border-amber-400/60 text-amber-200 shadow-md'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                      }`}
                      title="Кликните, чтобы показать ошибки отправки"
                    >
                      <span>Ошибки:</span>
                      <strong className="text-amber-300 font-mono">{count}</strong>
                    </button>
                  );
                })()}

                {queueStatusFilter !== 'all' && (
                  <button
                    onClick={() => setQueueStatusFilter('all')}
                    className="text-sm text-amber-300 hover:text-white px-2 py-1 underline underline-offset-4 ml-1"
                  >
                    Показать все ({queueItems.length})
                  </button>
                )}
              </div>

              {/* Channel filter & trigger dispatch button */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setQueueChannelFilter('all')}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${queueChannelFilter === 'all' ? 'bg-white/15 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Все каналы
                  </button>
                  <button
                    onClick={() => setQueueChannelFilter('telegram')}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${queueChannelFilter === 'telegram' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30 font-medium' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Telegram
                  </button>
                  <button
                    onClick={() => setQueueChannelFilter('email')}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${queueChannelFilter === 'email' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30 font-medium' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Email (SMTP)
                  </button>
                </div>

                <Button
                  size="sm"
                  onClick={handleProcessQueueNow}
                  disabled={isProcessingQueue}
                  className="text-sm bg-white/10 hover:bg-white/15 text-zinc-200 border border-white/15 gap-2 h-10 px-4"
                  title="Отправить текущую пачку с соблюдением интервалов"
                >
                  <Send className={`h-4 w-4 ${isProcessingQueue ? 'animate-spin' : ''}`} />
                  <span>Отправить пачку (8 шт.)</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Queue Items Table */}
          <div className="rounded-2xl border border-white/15 bg-zinc-950/70 backdrop-blur-2xl p-4 sm:p-5 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300 min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10 text-sm text-zinc-400">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3">База</th>
                  <th className="py-3 px-3">Получатель</th>
                  <th className="py-3 px-3">Канал / Адрес</th>
                  <th className="py-3 px-3">Бот / Отправитель</th>
                  <th className="py-3 px-3">Запланировано (МСК)</th>
                  <th className="py-3 px-3">Статус</th>
                  <th className="py-3 px-3">След. напоминание</th>
                  <th className="py-3 px-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {queueItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-400 text-sm">
                      Очередь доставки пуста для выбранных фильтров
                    </td>
                  </tr>
                ) : (
                  queueItems.map((item, idx) => {
                    const isEmail = item.channel === 'email' || item.bot_type === 'smtp_email' || item.telegram_id?.startsWith('email:');
                    const nextDateStr = item.next_send_at || item.scheduled_time;
                    const formattedNextDate = nextDateStr 
                      ? new Date(nextDateStr).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' МСК'
                      : '—';

                    return (
                      <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-3 px-3 text-center text-sm font-mono text-zinc-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-sm px-2.5 py-0.5 rounded-lg border ${
                            item.recipient_type === 'partner'
                              ? 'border-amber-400/40 text-amber-300 bg-amber-400/10'
                              : 'border-white/15 text-zinc-300 bg-white/5'
                          }`}>
                            {item.recipient_type === 'partner' ? 'Партнеры' : 'Клиенты'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-zinc-200">
                          {item.recipient_name}
                        </td>
                        <td className="py-3 px-3 font-mono text-sm">
                          {isEmail ? (
                            <span className="text-amber-200" title={item.email || item.telegram_id}>
                              ✉️ {item.email || item.telegram_id.replace(/^email:/, '')}
                            </span>
                          ) : (
                            <span className="text-amber-300">
                              💬 {item.telegram_id}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-sm text-zinc-300 font-mono">
                          {isEmail
                            ? 'SMTP (info@arenda-ropa.com)'
                            : (item.bot_type === 'partner_bot' ? '@SAVPartnerBot' : '@SAV_AI_Sales_Bot')}
                        </td>
                        <td className="py-3 px-3 text-sm text-zinc-200 font-mono">
                          {new Date(item.scheduled_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ', ' + new Date(item.scheduled_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          {item.status === 'sent' && (
                            <span className="text-sm px-2.5 py-0.5 rounded-full border border-amber-400/40 text-amber-300 bg-amber-400/10">
                              Доставлено
                            </span>
                          )}
                          {item.status === 'blocked' && (
                            <span className="text-sm px-2.5 py-0.5 rounded-full border border-zinc-700 text-zinc-400 bg-zinc-900" title={item.error_message || 'Бот заблокирован пользователем'}>
                              Заблокирован
                            </span>
                          )}
                          {item.status === 'pending' && (
                            <span className="text-sm px-2.5 py-0.5 rounded-full border border-white/20 text-zinc-200 bg-white/5">
                              В ожидании
                            </span>
                          )}
                          {(item.status === 'disabled' || (item as any).status === 'cancelled') && (
                            <span className="text-sm px-2.5 py-0.5 rounded-full border border-zinc-700 text-zinc-400 bg-zinc-950" title="Получатель отключен">
                              Отключен
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="text-sm px-2.5 py-0.5 rounded-full border border-zinc-600 text-zinc-300" title={item.error_message || ''}>
                              Сбой
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-sm font-mono text-zinc-300">
                          <div className="flex items-center gap-2">
                            <span>{formattedNextDate}</span>
                            <button
                              onClick={(e) => handleOpenEditQueueModal(item, e)}
                              className="p-1 rounded hover:bg-white/10 text-amber-300 hover:text-white transition-colors"
                              title="Изменить дату и время напоминания"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleOpenEditQueueModal(item, e)}
                              className="h-8 px-2 text-sm text-amber-300 hover:text-white hover:bg-white/10"
                              title="Изменить дату отправки"
                            >
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              <span>Дата</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleDeleteQueueItem(item.id, e)}
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded-lg"
                              title="Удалить из очереди"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleDisableRecipient(item.id, item.recipient_name, e)}
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg"
                              title="Полное отключение получателя от рассылок"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Prompts Editor (Strictly 2 Unified JSON Prompts: Clients & Partners) */}
      {currentTab === 'prompts' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-amber-400/25 flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 shrink-0">
              <Sliders className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-amber-200">
                Единая генерация мема через JSON (без лишних вызовов)
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Генератор создает заголовок-хук H1, подзаголовок H2, текст мема и промпт 16:9 в <strong>одном едином запросе</strong>. Нейросети запрещено вызывать внутренние инструменты: иллюстрация рисуется строго 1 раз через внешнюю функцию 621 по переданному промпту.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {prompts
              .filter((p: any) => p.prompt_key === 'meme_reminder_clients' || p.prompt_key === 'meme_reminder_partners')
              .map((p: any) => (
                <div key={p.id} className="rounded-2xl border border-white/15 bg-zinc-950/70 p-5 space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                    <div>
                      <h4 className="font-bold text-base text-amber-300">{p.title}</h4>
                      <span className="text-sm text-zinc-400">
                        {p.prompt_key === 'meme_reminder_clients' ? 'Аудитория: Клиенты (@SAV_AI_Sales_Bot)' : 'Аудитория: Партнеры (@SAVPartnerBot)'}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-sm border-white/10 font-mono text-zinc-400">
                      {p.prompt_key}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-zinc-300">Системный промпт (единый JSON-формат)</Label>
                    <Textarea
                      defaultValue={p.system_prompt}
                      rows={14}
                      onBlur={async (e) => {
                        await fetch('/api/meme-autopilot/prompts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            prompt_key: p.prompt_key,
                            system_prompt: e.target.value
                          })
                        });
                        refetchPrompts();
                        toast({ title: 'Промпт сохранен в базе данных' });
                      }}
                      className="text-sm bg-zinc-900 border-white/15 text-zinc-200 rounded-xl resize-none focus:border-amber-400/50 leading-relaxed font-mono"
                    />
                    <p className="text-sm text-zinc-400">
                      Изменения сохраняются автоматически в БД при выходе из поля (onBlur).
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab 5: Settings & Delivery Schedule (Liquid Glass Apple Style) */}
      {currentTab === 'settings' && (
        <div id="autopilot-settings-panel" className="space-y-6">
          {/* Main Status & Night Guard Card */}
          <div className="rounded-2xl border border-amber-400/30 bg-zinc-950/70 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
            <RealisticSmokeBackdrop speed="slow" opacity={0.15} className="-top-3 -left-3 w-[calc(100%+24px)] h-[80px] pointer-events-none" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10 pb-6 border-b border-white/10">
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300">
                    <Settings className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                    Параметры отправки рассылок и защита от ночи
                  </h3>
                </div>
                <p className="text-sm text-zinc-300 max-w-2xl leading-relaxed">
                  Настройка часов генерации мемов, дневного окна каскадной отправки и строгого запрета рассылок в ночное время.
                </p>
              </div>

              {/* Status Switch & Mode Badge */}
              <div className="flex items-center gap-3 flex-wrap bg-white/5 p-3 rounded-2xl border border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-200 font-medium">Статус автопилота:</span>
                  <Switch
                    checked={config?.is_active === 1}
                    onCheckedChange={handleToggleAutopilot}
                    className="data-[state=checked]:bg-amber-400"
                  />
                  <span className={`text-sm font-semibold px-3 py-1 rounded-xl border ${
                    config?.is_active === 1
                      ? 'border-amber-400/40 bg-amber-400/20 text-amber-300 shadow-sm'
                      : 'border-white/10 bg-zinc-900 text-zinc-400'
                  }`}>
                    {config?.is_active === 1 ? 'Отправка активна' : 'Отправка отключена (на паузе)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Time & Night Mode Indicator */}
            {(() => {
              const mskDate = new Date(Date.now() + 3 * 3600000);
              const mskH = mskDate.getUTCHours();
              const mskM = mskDate.getUTCMinutes();
              const isNightNow = mskH < (config?.send_window_start_hour_msk ?? 10) || mskH >= (config?.send_window_end_hour_msk ?? 17);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6 text-sm relative z-10">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="text-sm text-zinc-400 flex items-center gap-2 mb-1.5">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <span>Текущее время в Москве</span>
                    </div>
                    <div className="text-lg font-bold text-amber-200 font-mono flex items-center gap-2">
                      <span>{String(mskH).padStart(2, '0')}:{String(mskM).padStart(2, '0')} МСК</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="text-sm text-zinc-400 flex items-center gap-2 mb-1.5">
                      {isNightNow ? <Moon className="h-4 w-4 text-amber-300" /> : <Sun className="h-4 w-4 text-amber-400" />}
                      <span>Текущий режим</span>
                    </div>
                    <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      {isNightNow ? (
                        <span className="px-2.5 py-1 rounded-lg border border-amber-300/40 text-amber-200 bg-amber-400/10">
                          Ночной режим (отправка строго заблокирована)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg border border-white/20 text-white bg-white/5">
                          Дневное окно (разрешена случайная отправка 10:00-17:00)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="text-sm text-zinc-400 flex items-center gap-2 mb-1.5">
                      <Shield className="h-4 w-4 text-amber-400" />
                      <span>Telegram ID для тестов</span>
                    </div>
                    <div className="text-base font-semibold text-amber-300 font-mono">
                      {config?.admin_telegram_id || '169262990'}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Quick Emergency Actions */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-3 relative z-10">
              <Button
                variant="outline"
                onClick={handlePauseNightQueue}
                disabled={isPausingNight}
                className="text-sm rounded-xl border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 gap-2 h-10"
                title="Отключить отправку и сдвинуть все ожидающие сообщения на дневное окно 10:00-17:00 МСК"
              >
                <Moon className={`h-4 w-4 ${isPausingNight ? 'animate-spin' : ''}`} />
                <span>Отключить отправку и перенести очередь на день</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleClearPendingQueue}
                disabled={isClearingQueue}
                className="text-sm rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white gap-2 h-10"
                title="Очистить все ожидающие отправки сообщения"
              >
                <Trash2 className={`h-4 w-4 ${isClearingQueue ? 'animate-spin' : ''}`} />
                <span>Очистить очередь ожидания</span>
              </Button>
            </div>
          </div>

          {/* Schedule Configuration Card */}
          <div className="rounded-2xl border border-white/15 bg-zinc-950/70 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Регламент генерации и дневного окна</h4>
                  <p className="text-sm text-zinc-400">Параметры запуска утреннего цикла и случайного распределения сообщений</p>
                </div>
              </div>

              {/* Real-time DB sync badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-200 text-sm self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>
                  {configSaveStatus === 'saving'
                    ? 'Сохранение в БД в реальном времени...'
                    : lastSavedAt
                      ? `Синхронизировано с БД (${lastSavedAt})`
                      : 'База данных: истина зафиксирована'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label className="text-sm text-zinc-300 font-medium">Начало дневного окна (час МСК)</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={windowStartHour}
                  onChange={e => {
                    const val = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10);
                    setWindowStartHour(val);
                    if (val !== '' && !isNaN(val)) {
                      triggerRealtimeConfigSave({ send_window_start_hour_msk: val });
                    }
                  }}
                  onBlur={() => {
                    const val = Number(windowStartHour) || 10;
                    setWindowStartHour(val);
                    triggerRealtimeConfigSave({ send_window_start_hour_msk: val });
                  }}
                  className="bg-zinc-900 border-white/15 text-sm h-11 rounded-xl font-mono text-zinc-100"
                />
                <p className="text-sm text-zinc-400">По умолчанию: 10:00 по Москве (автосохранение в БД)</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-zinc-300 font-medium">Конец дневного окна (час МСК)</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={windowEndHour}
                  onChange={e => {
                    const val = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10);
                    setWindowEndHour(val);
                    if (val !== '' && !isNaN(val)) {
                      triggerRealtimeConfigSave({ send_window_end_hour_msk: val });
                    }
                  }}
                  onBlur={() => {
                    const val = Number(windowEndHour) || 17;
                    setWindowEndHour(val);
                    triggerRealtimeConfigSave({ send_window_end_hour_msk: val });
                  }}
                  className="bg-zinc-900 border-white/15 text-sm h-11 rounded-xl font-mono text-zinc-100"
                />
                <p className="text-sm text-zinc-400">По умолчанию: 17:00 по Москве (автосохранение в БД)</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-zinc-300 font-medium">Час генерации мемов (МСК)</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={genHour}
                  onChange={e => {
                    const val = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10);
                    setGenHour(val);
                    if (val !== '' && !isNaN(val)) {
                      triggerRealtimeConfigSave({ generation_hour_msk: val });
                    }
                  }}
                  onBlur={() => {
                    const val = Number(genHour) || 7;
                    setGenHour(val);
                    triggerRealtimeConfigSave({ generation_hour_msk: val });
                  }}
                  className="bg-zinc-900 border-white/15 text-sm h-11 rounded-xl font-mono text-zinc-100"
                />
                <p className="text-sm text-zinc-400">По умолчанию: 07:00 по Москве (автосохранение в БД)</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-zinc-300 font-medium">Интервал рассылки (дней)</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={intervalDays}
                  onChange={e => {
                    const val = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10);
                    setIntervalDays(val);
                    if (val !== '' && !isNaN(val)) {
                      triggerRealtimeConfigSave({ interval_days: val });
                    }
                  }}
                  onBlur={() => {
                    const val = Number(intervalDays) || 2;
                    setIntervalDays(val);
                    triggerRealtimeConfigSave({ interval_days: val });
                  }}
                  className="bg-zinc-900 border-white/15 text-sm h-11 rounded-xl font-mono text-zinc-100"
                />
                <p className="text-sm text-zinc-400">По умолчанию: раз в 2 дня (автосохранение в БД)</p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-sm text-zinc-300 font-medium">Telegram ID администратора для предпросмотра</Label>
                <Input
                  type="text"
                  value={adminIdInput}
                  onChange={e => {
                    setAdminIdInput(e.target.value);
                    if (e.target.value.trim()) {
                      triggerRealtimeConfigSave({ admin_telegram_id: e.target.value.trim() });
                    }
                  }}
                  onBlur={() => triggerRealtimeConfigSave({ admin_telegram_id: adminIdInput.trim() || '169262990' })}
                  placeholder="169262990"
                  className="bg-zinc-900 border-white/15 text-sm h-11 rounded-xl font-mono text-zinc-100"
                />
                <p className="text-sm text-zinc-400">Сюда моментально доставляются тестовые посты для согласования перед дневной отправкой</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <span className="text-sm text-zinc-400">Все изменения фиксируются в БД в реальном времени</span>
              <Button
                onClick={handleSaveSettings}
                className="text-sm px-6 h-11 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 font-semibold shadow-md"
              >
                Сохранить параметры расписания
              </Button>
            </div>
          </div>

          {/* Quick Direct Tests Card */}
          <div className="rounded-2xl border border-white/15 bg-zinc-950/70 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Проверка доставки тестовых мемов</h4>
                <p className="text-sm text-zinc-400">
                  Мгновенный тест отправки мемов в новом формате с заголовками H1-2 и встроенной картинкой без лишних служебных плашек
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white mb-1">Мем для Клиентов (@SAV_AI_Sales_Bot)</div>
                  <p className="text-sm text-zinc-400">Будни бизнеса без ИИ против легкости с ИИ-продавцом, кнопка «Хочу ИИ-бизнес»</p>
                </div>
                <Button
                  onClick={async () => {
                    const cPost = posts.find(p => p.target_audience === 'clients') || posts[0];
                    if (!cPost) {
                      toast({ title: 'Нет сохраненных постов для клиентов' });
                      return;
                    }
                    try {
                      await fetch('/api/meme-autopilot/send-test-admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ postId: cPost.id, adminTelegramId: adminIdInput || '169262990' })
                      });
                      toast({ title: 'Тест для клиентов отправлен на ' + (adminIdInput || '169262990') });
                    } catch {
                      toast({ title: 'Ошибка отправки теста' });
                    }
                  }}
                  className="w-full text-sm rounded-xl border border-amber-400/40 bg-amber-400/15 hover:bg-amber-400/25 text-amber-300"
                >
                  <Send className="h-4 w-4 mr-2" />
                  <span>Отправить тест Клиентов</span>
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white mb-1">Мем для Партнеров (@SAVPartnerBot)</div>
                  <p className="text-sm text-zinc-400">Партнерские выплаты, пассивный доход и спокойствие, кнопка «Твой ИИ-Партнер»</p>
                </div>
                <Button
                  onClick={async () => {
                    const pPost = posts.find(p => p.target_audience === 'partners') || posts[0];
                    if (!pPost) {
                      toast({ title: 'Нет сохраненных постов для партнеров' });
                      return;
                    }
                    try {
                      await fetch('/api/meme-autopilot/send-test-admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ postId: pPost.id, adminTelegramId: adminIdInput || '169262990' })
                      });
                      toast({ title: 'Тест для партнеров отправлен на ' + (adminIdInput || '169262990') });
                    } catch {
                      toast({ title: 'Ошибка отправки теста' });
                    }
                  }}
                  className="w-full text-sm rounded-xl border border-amber-400/40 bg-amber-400/15 hover:bg-amber-400/25 text-amber-300"
                >
                  <Send className="h-4 w-4 mr-2" />
                  <span>Отправить тест Партнеров</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Text Modal (H1, H2, Rich Body) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950/90 backdrop-blur-3xl border border-white/20 text-zinc-100 shadow-2xl rounded-2xl p-5 sm:p-6">
          <DialogHeader className="pb-3 border-b border-white/10">
            <DialogTitle className="text-lg font-bold text-amber-300">
              Редактирование панчлайнов и текста мема
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Заголовок-панчлайн 1 (H1)</Label>
              <Input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Остроумный емкий заголовок-хук..."
                className="bg-zinc-900 border-white/15 text-sm h-10 rounded-xl text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Подзаголовок-панчлайн 2 (H2)</Label>
              <Input
                value={editSubtitle}
                onChange={e => setEditSubtitle(e.target.value)}
                placeholder="Ироничный вывод или контраст..."
                className="bg-zinc-900 border-white/15 text-sm h-10 rounded-xl text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Основной текст мема (Rich Markdown)</Label>
              <Textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={8}
                className="bg-zinc-900 border-white/15 text-sm rounded-xl resize-none leading-relaxed text-zinc-100"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-white/10 gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl border-white/15 text-sm">
              Отмена
            </Button>
            <Button onClick={handleSaveEdit} className="rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-sm font-medium">
              Сохранить изменения
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Manual Post Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950/90 backdrop-blur-3xl border border-white/20 text-zinc-100 shadow-2xl rounded-2xl p-5 sm:p-6">
          <DialogHeader className="pb-3 border-b border-white/10">
            <DialogTitle className="text-lg font-bold text-amber-300">
              Создать пост вручную
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Целевая аудитория</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCreateAudience('clients')}
                  className={`flex-1 h-10 rounded-xl text-sm ${createAudience === 'clients' ? 'bg-amber-400/20 text-amber-300 border-amber-400/50' : 'bg-white/5 border-white/10 text-zinc-400'}`}
                >
                  Клиенты (@SAV_AI_Sales_Bot)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCreateAudience('partners')}
                  className={`flex-1 h-10 rounded-xl text-sm ${createAudience === 'partners' ? 'bg-amber-400/20 text-amber-300 border-amber-400/50' : 'bg-white/5 border-white/10 text-zinc-400'}`}
                >
                  Партнеры (@SAVPartnerBot)
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-zinc-300">Заголовок-панчлайн 1 (H1)</Label>
                <Input
                  value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  placeholder="Заголовок мема..."
                  className="bg-zinc-900 border-white/15 text-sm h-10 rounded-xl text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-zinc-300">Подзаголовок-панчлайн 2 (H2)</Label>
                <Input
                  value={createSubtitle}
                  onChange={e => setCreateSubtitle(e.target.value)}
                  placeholder="Подзаголовок мема..."
                  className="bg-zinc-900 border-white/15 text-sm h-10 rounded-xl text-zinc-100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Текст мема (Rich Markdown)</Label>
              <Textarea
                value={createText}
                onChange={e => setCreateText(e.target.value)}
                rows={7}
                placeholder="Сатирический текст мема без капслока..."
                className="bg-zinc-900 border-white/15 text-sm rounded-xl resize-none leading-relaxed text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Ссылка на картинку 16:9 (необязательно)</Label>
              <Input
                value={createImageUrl}
                onChange={e => setCreateImageUrl(e.target.value)}
                placeholder="https://file.pro-talk.ru/tgf/..."
                className="bg-zinc-900 border-white/15 text-sm h-10 rounded-xl text-zinc-100 font-mono"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-white/10 gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="rounded-xl border-white/15 text-sm">
              Отмена
            </Button>
            <Button
              onClick={handleCreatePostManual}
              disabled={isCreatingPost}
              className="rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-sm font-medium"
            >
              {isCreatingPost ? 'Создание...' : 'Создать пост'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Modal (Strictly Centered on Current Screen/Viewport) */}
      {testEmailDialogOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSendingTestEmail) setTestEmailDialogOpen(false);
          }}
        >
          <div 
            className="relative w-full max-w-lg rounded-2xl border border-amber-400/40 bg-zinc-950/95 backdrop-blur-3xl p-5 sm:p-6 text-zinc-100 shadow-[0_20px_70px_rgba(0,0,0,0.85)] overflow-hidden m-auto"
            onClick={e => e.stopPropagation()}
          >
            <RealisticSmokeBackdrop speed="slow" opacity={0.2} className="-top-3 -left-3 w-[calc(100%+24px)] h-[80px] pointer-events-none" />

            {/* Steampunk 3D Corner Rivets */}
            <div className="absolute top-3 left-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 border border-amber-900/60 shadow-inner" />
            <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 border border-amber-900/60 shadow-inner" />

            <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
              <div className="text-lg font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent flex items-center gap-2">
                <Mail className="h-5 w-5 text-amber-400" />
                <span>Тестирование рассылки на Email (SMTP)</span>
              </div>
              <button
                type="button"
                onClick={() => setTestEmailDialogOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-3 relative z-10">
              <div className="space-y-2">
                <Label className="text-sm text-zinc-300 font-medium">Адрес электронной почты</Label>
                <Input
                  type="email"
                  value={testEmailInput}
                  onChange={e => setTestEmailInput(e.target.value)}
                  placeholder="shishkarnem@gmail.com"
                  className="bg-zinc-900 border-white/15 text-sm h-11 rounded-xl text-zinc-100 font-mono"
                />
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-sm text-zinc-400">Быстрый выбор:</span>
                  <button
                    type="button"
                    onClick={() => setTestEmailInput('shishkarnem@gmail.com')}
                    className="text-sm px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 transition-all font-mono"
                  >
                    shishkarnem@gmail.com (Администратор)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestEmailInput('rentropexpert@gmail.com')}
                    className="text-sm px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 transition-all font-mono"
                  >
                    rentropexpert@gmail.com (Эксперт)
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-zinc-300 font-medium">Какую аудиторию протестировать?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestEmailAudience('both')}
                    className={`p-2.5 rounded-xl border text-sm font-medium text-left transition-all ${
                      testEmailAudience === 'both'
                        ? 'bg-amber-400/20 border-amber-400/50 text-amber-200 shadow-md'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold">Оба поста</div>
                    <div className="text-sm text-zinc-400 mt-0.5">Клиенты + Партнеры</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestEmailAudience('clients')}
                    className={`p-2.5 rounded-xl border text-sm font-medium text-left transition-all ${
                      testEmailAudience === 'clients'
                        ? 'bg-amber-400/20 border-amber-400/50 text-amber-200 shadow-md'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold">Клиенты</div>
                    <div className="text-sm text-zinc-400 mt-0.5">Кнопка «Хочу ИИ-бизнес»</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestEmailAudience('partners')}
                    className={`p-2.5 rounded-xl border text-sm font-medium text-left transition-all ${
                      testEmailAudience === 'partners'
                        ? 'bg-amber-400/20 border-amber-400/50 text-amber-200 shadow-md'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold">Партнеры</div>
                    <div className="text-sm text-zinc-400 mt-0.5">Кнопка «ИИ-Партнер»</div>
                  </button>
                </div>
              </div>

              {/* Email Design Preview Specs */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm space-y-1.5">
                <div className="text-zinc-200 font-semibold flex items-center gap-2">
                  <span>⚙ Оформление шоколадного письма SAV AI:</span>
                </div>
                <ul className="text-zinc-400 space-y-1 text-sm list-disc list-inside">
                  <li>Прозрачный стеклянный фон без золотистого фона под заголовком SAV AI</li>
                  <li>Четкий белоснежный заголовок SAV AI с эффектом глубины и латунными шестернями</li>
                  <li>Выделение ключевых фраз («Хочу ИИ-бизнес», «✨ Твой ИИ-Партнер»)</li>
                  <li>Стеклянные кнопки в стиле Apple Liquid Glass</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-end gap-2 relative z-10">
              <Button
                variant="outline"
                onClick={() => setTestEmailDialogOpen(false)}
                disabled={isSendingTestEmail}
                className="rounded-xl border-white/15 text-sm"
              >
                Отмена
              </Button>
              <Button
                onClick={() => handleSendTestEmail()}
                disabled={isSendingTestEmail}
                className="rounded-xl bg-gradient-to-r from-amber-500/30 to-amber-400/20 hover:from-amber-500/40 hover:to-amber-400/30 text-amber-200 border border-amber-400/50 text-sm font-medium gap-2 shadow-lg shadow-amber-500/10"
              >
                {isSendingTestEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Отправка через SMTP...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Отправить тестовое письмо</span>
                  </>
                )}
              </Button>
            </div>

            <div className="absolute bottom-3 left-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 border border-amber-900/60 shadow-inner" />
            <div className="absolute bottom-3 right-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 border border-amber-900/60 shadow-inner" />
          </div>
        </div>
      )}

      {/* HTML Email Live Interactive Preview Modal */}
      <Dialog open={emailPreviewModalOpen} onOpenChange={setEmailPreviewModalOpen}>
        <DialogContent className="max-w-3xl bg-zinc-950/95 backdrop-blur-3xl border border-amber-400/35 text-zinc-100 shadow-2xl rounded-2xl p-5 sm:p-6 max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-3 border-b border-white/10">
            <DialogTitle className="text-lg font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-amber-400" />
                <span>Предпросмотр шоколадного стимпанк-письма</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto my-3 rounded-xl border border-white/15 bg-black/60 p-2">
            {previewHtmlToDisplay ? (
              <iframe
                title="Email Preview"
                srcDoc={previewHtmlToDisplay}
                className="w-full min-h-[580px] rounded-lg border-0 bg-transparent"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="p-8 text-center text-zinc-400 text-sm">
                Нет данных для предпросмотра
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setEmailPreviewModalOpen(false)}
              className="rounded-xl border-white/15 text-sm"
            >
              Закрыть предпросмотр
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Queue Scheduled Date Modal */}
      <Dialog open={editQueueDialogOpen} onOpenChange={setEditQueueDialogOpen}>
        <DialogContent className="max-w-md bg-zinc-950/90 backdrop-blur-3xl border border-white/20 text-zinc-100 shadow-2xl rounded-2xl p-5 sm:p-6">
          <DialogHeader className="pb-3 border-b border-white/10">
            <DialogTitle className="text-lg font-bold text-amber-300">
              Изменить дату напоминания
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {editQueueItem && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1 text-sm">
                <div className="text-zinc-400">
                  Получатель: <span className="text-zinc-100 font-medium">{editQueueItem.recipient_name}</span>
                </div>
                <div className="text-zinc-400 font-mono text-sm">
                  Telegram ID: <span className="text-amber-300">{editQueueItem.telegram_id}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300 font-medium">Новая дата и время отправки (МСК)</Label>
              <Input
                type="datetime-local"
                value={editQueueTime}
                onChange={e => setEditQueueTime(e.target.value)}
                className="bg-zinc-900 border-white/15 text-sm h-11 rounded-xl text-zinc-100 font-mono"
              />
              <p className="text-sm text-zinc-400">
                Случайная отправка происходит в рамках дневного окна 10:00-17:00 по Москве.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-white/10 gap-2">
            <Button variant="outline" onClick={() => setEditQueueDialogOpen(false)} className="rounded-xl border-white/15 text-sm">
              Отмена
            </Button>
            <Button
              onClick={handleSaveQueueDate}
              disabled={isUpdatingQueue}
              className="rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-sm font-medium"
            >
              {isUpdatingQueue ? 'Сохранение...' : 'Обновить дату'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemeAutopilotManager;
