import { useState, useEffect, useCallback } from 'react';
import { protalkDb } from '@/integrations/protalk/client';
import { useToast } from '@/hooks/use-toast';

export interface MessageField {
  key: string;
  label: string;
  enabled: boolean;
  format: string;
  category: string;
  buttonText?: string;
}

export interface MediaAttachment {
  id: string;
  type: 'photo' | 'video' | 'document' | 'album';
  url: string;
  caption?: string;
}

export interface TemplateSettings {
  fields: MessageField[];
  headerText: string;
  footerText: string;
  media: MediaAttachment[];
  useMediaCaption: boolean;
}

/**
 * Hook to load/save notification templates from/to the database.
 * Falls back to localStorage if DB operations fail.
 */
export function useNotificationTemplate(templateType: string, defaultHeaderText = '') {
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [settings, setSettings] = useState<TemplateSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load template from DB
  useEffect(() => {
    const loadTemplate = async () => {
      setIsLoading(true);
      try {
        // Use 'any' cast to bypass type checking if table is missing in types
        const { data, error } = await (protalkDb
          .from('sav_notification_templates' as any)
          .select('*')
          .eq('type', templateType)
          .eq('is_active', true)
          .maybeSingle() as any);

        if (error) {
          console.error('Error loading template:', error);
          // Fall back to localStorage
          const localKey = `sav-notification-template-${templateType}`;
          const saved = localStorage.getItem(localKey);
          if (saved) {
            setSettings(JSON.parse(saved));
          }
        } else if (data) {
          setTemplateId(data.id);
          setSettings({
            fields: (data.fields as any) || [],
            headerText: data.header_text || defaultHeaderText,
            footerText: data.footer_text || '',
            media: (data.media as any) || [],
            useMediaCaption: data.use_media_caption || false,
          });
        }
      } catch (err) {
        console.error('Error loading template:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [templateType, defaultHeaderText]);

  // Save template to DB
  const saveTemplate = useCallback(async (newSettings: TemplateSettings) => {
    setIsSaving(true);
    try {
      const templateData = {
        name: `${templateType} template`,
        type: templateType,
        header_text: newSettings.headerText,
        footer_text: newSettings.footerText,
        fields: newSettings.fields as any,
        media: newSettings.media as any,
        use_media_caption: newSettings.useMediaCaption,
        is_active: true,
      };

      if (templateId) {
        // Update existing
        const { error } = await protalkDb
          .from('sav_notification_templates' as any)
          .update(templateData)
          .eq('id', templateId);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await (protalkDb
          .from('sav_notification_templates' as any)
          .insert(templateData)
          .select('id')
          .single() as any);

        if (error) throw error;
        if (data) setTemplateId(data.id);
      }

      setSettings(newSettings);

      // Also save to localStorage as backup
      const localKey = `sav-notification-template-${templateType}`;
      localStorage.setItem(localKey, JSON.stringify(newSettings));

      toast({
        title: 'Настройки сохранены',
        description: 'Шаблон уведомления обновлён в базе данных',
      });
    } catch (err) {
      console.error('Error saving template:', err);
      // Fall back to localStorage
      const localKey = `sav-notification-template-${templateType}`;
      localStorage.setItem(localKey, JSON.stringify(newSettings));
      setSettings(newSettings);
      
      toast({
        title: 'Сохранено локально',
        description: 'Не удалось сохранить в базу данных, настройки сохранены локально',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [templateId, templateType, toast]);

  return { settings, isLoading, isSaving, saveTemplate, templateId };
}