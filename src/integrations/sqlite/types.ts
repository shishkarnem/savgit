export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      access_roles: {
        Row: {
          allowed_pages: string[]
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          allowed_pages?: string[]
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          allowed_pages?: string[]
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_configs: {
        Row: {
          active_model_override: string | null
          agent_key: string
          created_at: string
          extra_config: Json | null
          fallback_model: string | null
          fallback_provider: string
          gateway_url: string
          id: string
          is_active: boolean
          label: string
          last_fallback_at: string | null
          model: string
          provider: string
          system_prompt: string
          temperature: number | null
          updated_at: string
        }
        Insert: {
          active_model_override?: string | null
          agent_key: string
          created_at?: string
          extra_config?: Json | null
          fallback_model?: string | null
          fallback_provider?: string
          gateway_url?: string
          id?: string
          is_active?: boolean
          label?: string
          last_fallback_at?: string | null
          model?: string
          provider?: string
          system_prompt?: string
          temperature?: number | null
          updated_at?: string
        }
        Update: {
          active_model_override?: string | null
          agent_key?: string
          created_at?: string
          extra_config?: Json | null
          fallback_model?: string | null
          fallback_provider?: string
          gateway_url?: string
          id?: string
          is_active?: boolean
          label?: string
          last_fallback_at?: string | null
          model?: string
          provider?: string
          system_prompt?: string
          temperature?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      broadcast_logs: {
        Row: {
          broadcast_id: string | null
          chat_id: string
          created_at: string
          error_reason: string | null
          fio: string | null
          id: string
          message_text: string | null
          send_time_ms: number | null
          status: string
          telegram: string | null
          username: string | null
        }
        Insert: {
          broadcast_id?: string | null
          chat_id: string
          created_at?: string
          error_reason?: string | null
          fio?: string | null
          id?: string
          message_text?: string | null
          send_time_ms?: number | null
          status?: string
          telegram?: string | null
          username?: string | null
        }
        Update: {
          broadcast_id?: string | null
          chat_id?: string
          created_at?: string
          error_reason?: string | null
          fio?: string | null
          id?: string
          message_text?: string | null
          send_time_ms?: number | null
          status?: string
          telegram?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_logs_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          chat_ids: string | null
          created_at: string
          date_sent: string | null
          id: string
          message: string | null
          status: string | null
        }
        Insert: {
          chat_ids?: string | null
          created_at?: string
          date_sent?: string | null
          id?: string
          message?: string | null
          status?: string | null
        }
        Update: {
          chat_ids?: string | null
          created_at?: string
          date_sent?: string | null
          id?: string
          message?: string | null
          status?: string | null
        }
        Relationships: []
      }
      contract_urls: {
        Row: {
          contract_id: string
          created_at: string
          form_url: string
          id: string
          label: string
          script_url: string
          updated_at: string
          view_url: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          form_url: string
          id?: string
          label: string
          script_url: string
          updated_at?: string
          view_url?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          form_url?: string
          id?: string
          label?: string
          script_url?: string
          updated_at?: string
          view_url?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          address: string | null
          bank: string | null
          bik: string | null
          city: string | null
          code: string | null
          company_name: string | null
          contract_type: string
          contract_url: string | null
          created_at: string
          date_now: string | null
          email: string | null
          form_url: string | null
          full_name: string | null
          full_name_ai: string | null
          full_name_dr: string | null
          full_name_for: string | null
          id: string
          inn: string | null
          kpp: string | null
          ks: string | null
          ogrn: string | null
          passport: string | null
          passport_date: string | null
          passport_issued: string | null
          phone: string | null
          raw_json: Json | null
          rs: string | null
          status: string | null
          updated_at: string
          ur_address: string | null
        }
        Insert: {
          address?: string | null
          bank?: string | null
          bik?: string | null
          city?: string | null
          code?: string | null
          company_name?: string | null
          contract_type: string
          contract_url?: string | null
          created_at?: string
          date_now?: string | null
          email?: string | null
          form_url?: string | null
          full_name?: string | null
          full_name_ai?: string | null
          full_name_dr?: string | null
          full_name_for?: string | null
          id?: string
          inn?: string | null
          kpp?: string | null
          ks?: string | null
          ogrn?: string | null
          passport?: string | null
          passport_date?: string | null
          passport_issued?: string | null
          phone?: string | null
          raw_json?: Json | null
          rs?: string | null
          status?: string | null
          updated_at?: string
          ur_address?: string | null
        }
        Update: {
          address?: string | null
          bank?: string | null
          bik?: string | null
          city?: string | null
          code?: string | null
          company_name?: string | null
          contract_type?: string
          contract_url?: string | null
          created_at?: string
          date_now?: string | null
          email?: string | null
          form_url?: string | null
          full_name?: string | null
          full_name_ai?: string | null
          full_name_dr?: string | null
          full_name_for?: string | null
          id?: string
          inn?: string | null
          kpp?: string | null
          ks?: string | null
          ogrn?: string | null
          passport?: string | null
          passport_date?: string | null
          passport_issued?: string | null
          phone?: string | null
          raw_json?: Json | null
          rs?: string | null
          status?: string | null
          updated_at?: string
          ur_address?: string | null
        }
        Relationships: []
      }
      crm: {
        Row: {
          available_skills: string | null
          block_date: string | null
          bot_id: string | null
          card_or_account: string | null
          channel: string | null
          chat_id: string | null
          comment: string | null
          contract_check: string | null
          contract_from_chat: string | null
          contract_link: string | null
          created_at: string
          expert_clients: string | null
          expert_clients_check: string | null
          expert_description: string | null
          fio: string | null
          fio_code_tg: string | null
          id: string
          last_message: string | null
          launch_date: string | null
          partner_clients: string | null
          partner_clients_check: string | null
          partner_code: string | null
          personal_chat_id: string | null
          photo_url: string | null
          progress: string | null
          promo: string | null
          pseudonym: string | null
          reg_check: string | null
          registration_date: string | null
          registration_type: string | null
          reminder_status: string | null
          reminder_text: string | null
          reminder_time: string | null
          send_status: string | null
          status: string | null
          status_hand: string | null
          telegram: string | null
          telegram_id: string | null
          training: boolean | null
          updated_at: string
        }
        Insert: {
          available_skills?: string | null
          block_date?: string | null
          bot_id?: string | null
          card_or_account?: string | null
          channel?: string | null
          chat_id?: string | null
          comment?: string | null
          contract_check?: string | null
          contract_from_chat?: string | null
          contract_link?: string | null
          created_at?: string
          expert_clients?: string | null
          expert_clients_check?: string | null
          expert_description?: string | null
          fio?: string | null
          fio_code_tg?: string | null
          id?: string
          last_message?: string | null
          launch_date?: string | null
          partner_clients?: string | null
          partner_clients_check?: string | null
          partner_code?: string | null
          personal_chat_id?: string | null
          photo_url?: string | null
          progress?: string | null
          promo?: string | null
          pseudonym?: string | null
          reg_check?: string | null
          registration_date?: string | null
          registration_type?: string | null
          reminder_status?: string | null
          reminder_text?: string | null
          reminder_time?: string | null
          send_status?: string | null
          status?: string | null
          status_hand?: string | null
          telegram?: string | null
          telegram_id?: string | null
          training?: boolean | null
          updated_at?: string
        }
        Update: {
          available_skills?: string | null
          block_date?: string | null
          bot_id?: string | null
          card_or_account?: string | null
          channel?: string | null
          chat_id?: string | null
          comment?: string | null
          contract_check?: string | null
          contract_from_chat?: string | null
          contract_link?: string | null
          created_at?: string
          expert_clients?: string | null
          expert_clients_check?: string | null
          expert_description?: string | null
          fio?: string | null
          fio_code_tg?: string | null
          id?: string
          last_message?: string | null
          launch_date?: string | null
          partner_clients?: string | null
          partner_clients_check?: string | null
          partner_code?: string | null
          personal_chat_id?: string | null
          photo_url?: string | null
          progress?: string | null
          promo?: string | null
          pseudonym?: string | null
          reg_check?: string | null
          registration_date?: string | null
          registration_type?: string | null
          reminder_status?: string | null
          reminder_text?: string | null
          reminder_time?: string | null
          send_status?: string | null
          status?: string | null
          status_hand?: string | null
          telegram?: string | null
          telegram_id?: string | null
          training?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      experts: {
        Row: {
          created_at: string
          fio: string | null
          id: string
          promo: string | null
          status: string | null
          telegram: string | null
          timestamp: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fio?: string | null
          id?: string
          promo?: string | null
          status?: string | null
          telegram?: string | null
          timestamp?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fio?: string | null
          id?: string
          promo?: string | null
          status?: string | null
          telegram?: string | null
          timestamp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      knowledge: {
        Row: {
          answer: string | null
          category: string | null
          content: string | null
          created_at: string
          files: string | null
          id: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          files?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          files?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      laws: {
        Row: {
          a: string | null
          a_olbanian: string | null
          created_at: string
          id: string
          q: string | null
          q_olbanian: string | null
          updated_at: string
        }
        Insert: {
          a?: string | null
          a_olbanian?: string | null
          created_at?: string
          id?: string
          q?: string | null
          q_olbanian?: string | null
          updated_at?: string
        }
        Update: {
          a?: string | null
          a_olbanian?: string | null
          created_at?: string
          id?: string
          q?: string | null
          q_olbanian?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          act_date: string | null
          act_send_time: string | null
          act_sum: string | null
          ai_employee_cost: string | null
          ai_tokens_price: string | null
          avg_salary: string | null
          chat_id: string | null
          city: string | null
          client_description: string | null
          client_status: string | null
          client_telegram: string | null
          code: string | null
          company: string | null
          created_at: string
          department: string | null
          discounted_price: string | null
          employees: string | null
          expert_chat_id: string | null
          expert_code: string | null
          expert_datetime: string | null
          expert_name: string | null
          expert_payout: string | null
          expert_payout_date: string | null
          expert_percent: string | null
          expert_reg: string | null
          expert_text: string | null
          fio: string | null
          functionality: string | null
          id: string
          messenger: string | null
          partner_chat_id: string | null
          partner_code: string | null
          partner_datetime: string | null
          partner_name: string | null
          partner_payout: string | null
          partner_payout_date: string | null
          partner_percent: string | null
          partner_reg: string | null
          partner_status: string | null
          partner_text: string | null
          payback: string | null
          product: string | null
          promo: string | null
          real_salary: string | null
          referral_code: string | null
          referred_by: string | null
          region_salary: string | null
          script_id: string | null
          selected_expert: string | null
          service: string | null
          service_type: string | null
          software_price: string | null
          status: string | null
          sum: number | null
          telegram_id: string | null
          text_calculation: string | null
          text_department: string | null
          text_kp: string | null
          text_software: string | null
          timestamp: string | null
          updated_at: string
        }
        Insert: {
          act_date?: string | null
          act_send_time?: string | null
          act_sum?: string | null
          ai_employee_cost?: string | null
          ai_tokens_price?: string | null
          avg_salary?: string | null
          chat_id?: string | null
          city?: string | null
          client_description?: string | null
          client_status?: string | null
          client_telegram?: string | null
          code?: string | null
          company?: string | null
          created_at?: string
          department?: string | null
          discounted_price?: string | null
          employees?: string | null
          expert_chat_id?: string | null
          expert_code?: string | null
          expert_datetime?: string | null
          expert_name?: string | null
          expert_payout?: string | null
          expert_payout_date?: string | null
          expert_percent?: string | null
          expert_reg?: string | null
          expert_text?: string | null
          fio?: string | null
          functionality?: string | null
          id?: string
          messenger?: string | null
          partner_chat_id?: string | null
          partner_code?: string | null
          partner_datetime?: string | null
          partner_name?: string | null
          partner_payout?: string | null
          partner_payout_date?: string | null
          partner_percent?: string | null
          partner_reg?: string | null
          partner_status?: string | null
          partner_text?: string | null
          payback?: string | null
          product?: string | null
          promo?: string | null
          real_salary?: string | null
          referral_code?: string | null
          referred_by?: string | null
          region_salary?: string | null
          script_id?: string | null
          selected_expert?: string | null
          service?: string | null
          service_type?: string | null
          software_price?: string | null
          status?: string | null
          sum?: number | null
          telegram_id?: string | null
          text_calculation?: string | null
          text_department?: string | null
          text_kp?: string | null
          text_software?: string | null
          timestamp?: string | null
          updated_at?: string
        }
        Update: {
          act_date?: string | null
          act_send_time?: string | null
          act_sum?: string | null
          ai_employee_cost?: string | null
          ai_tokens_price?: string | null
          avg_salary?: string | null
          chat_id?: string | null
          city?: string | null
          client_description?: string | null
          client_status?: string | null
          client_telegram?: string | null
          code?: string | null
          company?: string | null
          created_at?: string
          department?: string | null
          discounted_price?: string | null
          employees?: string | null
          expert_chat_id?: string | null
          expert_code?: string | null
          expert_datetime?: string | null
          expert_name?: string | null
          expert_payout?: string | null
          expert_payout_date?: string | null
          expert_percent?: string | null
          expert_reg?: string | null
          expert_text?: string | null
          fio?: string | null
          functionality?: string | null
          id?: string
          messenger?: string | null
          partner_chat_id?: string | null
          partner_code?: string | null
          partner_datetime?: string | null
          partner_name?: string | null
          partner_payout?: string | null
          partner_payout_date?: string | null
          partner_percent?: string | null
          partner_reg?: string | null
          partner_status?: string | null
          partner_text?: string | null
          payback?: string | null
          product?: string | null
          promo?: string | null
          real_salary?: string | null
          referral_code?: string | null
          referred_by?: string | null
          region_salary?: string | null
          script_id?: string | null
          selected_expert?: string | null
          service?: string | null
          service_type?: string | null
          software_price?: string | null
          status?: string | null
          sum?: number | null
          telegram_id?: string | null
          text_calculation?: string | null
          text_department?: string | null
          text_kp?: string | null
          text_software?: string | null
          timestamp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          api_key: string | null
          bot_id: string | null
          bot_reply: string | null
          bot_token: string | null
          channel_id: string | null
          channel_name: string | null
          code_and_start: string | null
          created_at: string | null
          deletion: string | null
          double_block: string | null
          double_start: string | null
          error_id: string | null
          fio: string | null
          function_call_params: string | null
          function_error: string | null
          id: number
          last_100_messages: string | null
          last_message: string | null
          llm: string | null
          message_ai_text: string | null
          message_user_text: string | null
          name_no_button: string | null
          partner_code: string | null
          progress: string | null
          promo: string | null
          promo_caps: string | null
          recognized_id: string | null
          recognized_name: string | null
          sale_price: string | null
          server_name: string | null
          start_code_text: string | null
          start_time: string | null
          status: string | null
          status_code: string | null
          telegram_client: string | null
          telegram_id: string | null
          text_split_1: string | null
          text_split_2: string | null
          tokens_in_source: number | null
          tokens_out_source: number | null
          tokens_total: number | null
          tokens_user: number | null
          user_message: string | null
          user_social_id: string | null
        }
        Insert: {
          api_key?: string | null
          bot_id?: string | null
          bot_reply?: string | null
          bot_token?: string | null
          channel_id?: string | null
          channel_name?: string | null
          code_and_start?: string | null
          created_at?: string | null
          deletion?: string | null
          double_block?: string | null
          double_start?: string | null
          error_id?: string | null
          fio?: string | null
          function_call_params?: string | null
          function_error?: string | null
          id?: never
          last_100_messages?: string | null
          last_message?: string | null
          llm?: string | null
          message_ai_text?: string | null
          message_user_text?: string | null
          name_no_button?: string | null
          partner_code?: string | null
          progress?: string | null
          promo?: string | null
          promo_caps?: string | null
          recognized_id?: string | null
          recognized_name?: string | null
          sale_price?: string | null
          server_name?: string | null
          start_code_text?: string | null
          start_time?: string | null
          status?: string | null
          status_code?: string | null
          telegram_client?: string | null
          telegram_id?: string | null
          text_split_1?: string | null
          text_split_2?: string | null
          tokens_in_source?: number | null
          tokens_out_source?: number | null
          tokens_total?: number | null
          tokens_user?: number | null
          user_message?: string | null
          user_social_id?: string | null
        }
        Update: {
          api_key?: string | null
          bot_id?: string | null
          bot_reply?: string | null
          bot_token?: string | null
          channel_id?: string | null
          channel_name?: string | null
          code_and_start?: string | null
          created_at?: string | null
          deletion?: string | null
          double_block?: string | null
          double_start?: string | null
          error_id?: string | null
          fio?: string | null
          function_call_params?: string | null
          function_error?: string | null
          id?: never
          last_100_messages?: string | null
          last_message?: string | null
          llm?: string | null
          message_ai_text?: string | null
          message_user_text?: string | null
          name_no_button?: string | null
          partner_code?: string | null
          progress?: string | null
          promo?: string | null
          promo_caps?: string | null
          recognized_id?: string | null
          recognized_name?: string | null
          sale_price?: string | null
          server_name?: string | null
          start_code_text?: string | null
          start_time?: string | null
          status?: string | null
          status_code?: string | null
          telegram_client?: string | null
          telegram_id?: string | null
          text_split_1?: string | null
          text_split_2?: string | null
          tokens_in_source?: number | null
          tokens_out_source?: number | null
          tokens_total?: number | null
          tokens_user?: number | null
          user_message?: string | null
          user_social_id?: string | null
        }
        Relationships: []
      }
      map_cities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          left: string
          link: string | null
          link_text: string | null
          logo: string | null
          name: string
          top: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          left: string
          link?: string | null
          link_text?: string | null
          logo?: string | null
          name: string
          top: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          left?: string
          link?: string | null
          link_text?: string | null
          logo?: string | null
          name?: string
          top?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          created_at: string
          id: string
          inline_buttons: Json | null
          media_url: string | null
          message: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inline_buttons?: Json | null
          media_url?: string | null
          message?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inline_buttons?: Json | null
          media_url?: string | null
          message?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_profile: {
        Row: {
          balance: number | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          missions_completed: number | null
          photo_url: string | null
          promo: string | null
          rank: string | null
          referral_link: string | null
          referrals: number | null
          telegram_id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          missions_completed?: number | null
          photo_url?: string | null
          promo?: string | null
          rank?: string | null
          referral_link?: string | null
          referrals?: number | null
          telegram_id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          missions_completed?: number | null
          photo_url?: string | null
          promo?: string | null
          rank?: string | null
          referral_link?: string | null
          referrals?: number | null
          telegram_id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          cases: string | null
          channel: string | null
          chat_id: string | null
          chat_message: string | null
          created_at: string
          expert_description: string | null
          fio: string | null
          fio_code_tg: string | null
          group_id: string | null
          id: string
          other: string | null
          partner_code: string | null
          personal_message: string | null
          photo_url: string | null
          promo: string | null
          pseudonym: string | null
          script_id: string | null
          spheres: string | null
          status: string | null
          telegram: string | null
          telegram_id: string | null
          timestamp: string | null
          title: string | null
          title_pseudonym: string | null
          tools: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          cases?: string | null
          channel?: string | null
          chat_id?: string | null
          chat_message?: string | null
          created_at?: string
          expert_description?: string | null
          fio?: string | null
          fio_code_tg?: string | null
          group_id?: string | null
          id?: string
          other?: string | null
          partner_code?: string | null
          personal_message?: string | null
          photo_url?: string | null
          promo?: string | null
          pseudonym?: string | null
          script_id?: string | null
          spheres?: string | null
          status?: string | null
          telegram?: string | null
          telegram_id?: string | null
          timestamp?: string | null
          title?: string | null
          title_pseudonym?: string | null
          tools?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          cases?: string | null
          channel?: string | null
          chat_id?: string | null
          chat_message?: string | null
          created_at?: string
          expert_description?: string | null
          fio?: string | null
          fio_code_tg?: string | null
          group_id?: string | null
          id?: string
          other?: string | null
          partner_code?: string | null
          personal_message?: string | null
          photo_url?: string | null
          promo?: string | null
          pseudonym?: string | null
          script_id?: string | null
          spheres?: string | null
          status?: string | null
          telegram?: string | null
          telegram_id?: string | null
          timestamp?: string | null
          title?: string | null
          title_pseudonym?: string | null
          tools?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pseudonym_options: {
        Row: {
          created_at: string
          id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          value?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          frequency_hours: number
          id: string
          inline_buttons: Json | null
          is_active: boolean
          max_sends: number | null
          media_url: string | null
          message: string
          status_trigger: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          frequency_hours?: number
          id?: string
          inline_buttons?: Json | null
          is_active?: boolean
          max_sends?: number | null
          media_url?: string | null
          message?: string
          status_trigger: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          frequency_hours?: number
          id?: string
          inline_buttons?: Json | null
          is_active?: boolean
          max_sends?: number | null
          media_url?: string | null
          message?: string
          status_trigger?: string
          updated_at?: string
        }
        Relationships: []
      }
      rules: {
        Row: {
          created_at: string
          id: string
          rule: string | null
          text_col: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          rule?: string | null
          text_col?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          rule?: string | null
          text_col?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sav_agents: {
        Row: {
          about: string | null
          created_at: string
          full_name: string | null
          id: number
          url_bot: string | null
          url_prompt: string | null
          url_table: string | null
          url_telegram: string | null
          username: string | null
        }
        Insert: {
          about?: string | null
          created_at?: string
          full_name?: string | null
          id?: number
          url_bot?: string | null
          url_prompt?: string | null
          url_table?: string | null
          url_telegram?: string | null
          username?: string | null
        }
        Update: {
          about?: string | null
          created_at?: string
          full_name?: string | null
          id?: number
          url_bot?: string | null
          url_prompt?: string | null
          url_table?: string | null
          url_telegram?: string | null
          username?: string | null
        }
        Relationships: []
      }
      sav_cities: {
        Row: {
          avg_salary: number | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avg_salary?: number | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          avg_salary?: number | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sav_click_expert: {
        Row: {
          click_expert: string
          created_at: string
          expert_caps: string
          id: string
          reference_expert: string
        }
        Insert: {
          click_expert: string
          created_at?: string
          expert_caps: string
          id?: string
          reference_expert: string
        }
        Update: {
          click_expert?: string
          created_at?: string
          expert_caps?: string
          id?: string
          reference_expert?: string
        }
        Relationships: []
      }
      sav_click_tariff: {
        Row: {
          click_tariff: string
          created_at: string
          id: string
          tariff_caps: string
        }
        Insert: {
          click_tariff: string
          created_at?: string
          id?: string
          tariff_caps: string
        }
        Update: {
          click_tariff?: string
          created_at?: string
          id?: string
          tariff_caps?: string
        }
        Relationships: []
      }
      sav_client_messages: {
        Row: {
          client_id: string | null
          created_at: string
          direction: string
          error_message: string | null
          id: string
          inline_buttons: Json | null
          media: Json | null
          message: string | null
          sent_at: string
          status: string
          telegram_id: string | null
          template_name: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          inline_buttons?: Json | null
          media?: Json | null
          message?: string | null
          sent_at?: string
          status?: string
          telegram_id?: string | null
          template_name?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          inline_buttons?: Json | null
          media?: Json | null
          message?: string | null
          sent_at?: string
          status?: string
          telegram_id?: string | null
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sav_client_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "sav_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sav_clients: {
        Row: {
          act_date: string | null
          ai_employee_cost: string | null
          ai_tokens_price: string | null
          avg_salary: string | null
          block_date: string | null
          bot_token: string | null
          calculator_date: string | null
          channel: string | null
          city: string | null
          comment: string | null
          contract_url: string | null
          created_at: string
          department: string | null
          department_text: string | null
          employees_count: string | null
          expert_date: string | null
          expert_hand: string | null
          expert_name: string | null
          expert_pseudonym: string | null
          fio_hand: string | null
          full_name: string | null
          functionality: string | null
          id: string
          kp_text: string | null
          last_100_messages: string | null
          last_message: string | null
          payback: string | null
          payment_date: string | null
          product: string | null
          project: string | null
          project_code: string | null
          project_hand: string | null
          project_plan_url: string | null
          promo: string | null
          protalk_id: string | null
          protalk_send_status: string | null
          real_salary: string | null
          referral_code: string | null
          referred_by: string | null
          refund_amount: string | null
          region_salary: string | null
          rejection_date: string | null
          reminder_text: string | null
          reminder_time: string | null
          sav_cost: string | null
          script_id: string | null
          selected_expert: string | null
          send_status: string | null
          service: string | null
          service_price: string | null
          service_start_date: string | null
          service_type: string | null
          sheet_row_id: string | null
          software_price: string | null
          software_text: string | null
          start_date: string | null
          status: string | null
          status_hand: string | null
          tariff: string | null
          tariff_date: string | null
          telegram_client: string | null
          telegram_id: string | null
          updated_at: string
          work_end_date: string | null
          work_start_date: string | null
        }
        Insert: {
          act_date?: string | null
          ai_employee_cost?: string | null
          ai_tokens_price?: string | null
          avg_salary?: string | null
          block_date?: string | null
          bot_token?: string | null
          calculator_date?: string | null
          channel?: string | null
          city?: string | null
          comment?: string | null
          contract_url?: string | null
          created_at?: string
          department?: string | null
          department_text?: string | null
          employees_count?: string | null
          expert_date?: string | null
          expert_hand?: string | null
          expert_name?: string | null
          expert_pseudonym?: string | null
          fio_hand?: string | null
          full_name?: string | null
          functionality?: string | null
          id?: string
          kp_text?: string | null
          last_100_messages?: string | null
          last_message?: string | null
          payback?: string | null
          payment_date?: string | null
          product?: string | null
          project?: string | null
          project_code?: string | null
          project_hand?: string | null
          project_plan_url?: string | null
          promo?: string | null
          protalk_id?: string | null
          protalk_send_status?: string | null
          real_salary?: string | null
          referral_code?: string | null
          referred_by?: string | null
          refund_amount?: string | null
          region_salary?: string | null
          rejection_date?: string | null
          reminder_text?: string | null
          reminder_time?: string | null
          sav_cost?: string | null
          script_id?: string | null
          selected_expert?: string | null
          send_status?: string | null
          service?: string | null
          service_price?: string | null
          service_start_date?: string | null
          service_type?: string | null
          sheet_row_id?: string | null
          software_price?: string | null
          software_text?: string | null
          start_date?: string | null
          status?: string | null
          status_hand?: string | null
          tariff?: string | null
          tariff_date?: string | null
          telegram_client?: string | null
          telegram_id?: string | null
          updated_at?: string
          work_end_date?: string | null
          work_start_date?: string | null
        }
        Update: {
          act_date?: string | null
          ai_employee_cost?: string | null
          ai_tokens_price?: string | null
          avg_salary?: string | null
          block_date?: string | null
          bot_token?: string | null
          calculator_date?: string | null
          channel?: string | null
          city?: string | null
          comment?: string | null
          contract_url?: string | null
          created_at?: string
          department?: string | null
          department_text?: string | null
          employees_count?: string | null
          expert_date?: string | null
          expert_hand?: string | null
          expert_name?: string | null
          expert_pseudonym?: string | null
          fio_hand?: string | null
          full_name?: string | null
          functionality?: string | null
          id?: string
          kp_text?: string | null
          last_100_messages?: string | null
          last_message?: string | null
          payback?: string | null
          payment_date?: string | null
          product?: string | null
          project?: string | null
          project_code?: string | null
          project_hand?: string | null
          project_plan_url?: string | null
          promo?: string | null
          protalk_id?: string | null
          protalk_send_status?: string | null
          real_salary?: string | null
          referral_code?: string | null
          referred_by?: string | null
          refund_amount?: string | null
          region_salary?: string | null
          rejection_date?: string | null
          reminder_text?: string | null
          reminder_time?: string | null
          sav_cost?: string | null
          script_id?: string | null
          selected_expert?: string | null
          send_status?: string | null
          service?: string | null
          service_price?: string | null
          service_start_date?: string | null
          service_type?: string | null
          sheet_row_id?: string | null
          software_price?: string | null
          software_text?: string | null
          start_date?: string | null
          status?: string | null
          status_hand?: string | null
          tariff?: string | null
          tariff_date?: string | null
          telegram_client?: string | null
          telegram_id?: string | null
          updated_at?: string
          work_end_date?: string | null
          work_start_date?: string | null
        }
        Relationships: []
      }
      sav_contract_messages: {
        Row: {
          content: string | null
          contract_type: string
          created_at: string
          id: string
          role: string
          telegram_id: string
        }
        Insert: {
          content?: string | null
          contract_type: string
          created_at?: string
          id?: string
          role: string
          telegram_id: string
        }
        Update: {
          content?: string | null
          contract_type?: string
          created_at?: string
          id?: string
          role?: string
          telegram_id?: string
        }
        Relationships: []
      }
      sav_contracts: {
        Row: {
          address: string | null
          bank: string | null
          bik: string | null
          city: string | null
          code: string | null
          company_name: string | null
          contract_type: string
          contract_url: string | null
          created_at: string
          date_now: string | null
          email: string | null
          form_url: string | null
          full_name: string | null
          full_name_ai: string | null
          full_name_dr: string | null
          full_name_for: string | null
          id: string
          inn: string | null
          kpp: string | null
          ks: string | null
          ogrn: string | null
          passport: string | null
          passport_date: string | null
          passport_issued: string | null
          phone: string | null
          raw_json: Json | null
          rs: string | null
          status: string | null
          telegram_id: string | null
          updated_at: string
          ur_address: string | null
        }
        Insert: {
          address?: string | null
          bank?: string | null
          bik?: string | null
          city?: string | null
          code?: string | null
          company_name?: string | null
          contract_type: string
          contract_url?: string | null
          created_at?: string
          date_now?: string | null
          email?: string | null
          form_url?: string | null
          full_name?: string | null
          full_name_ai?: string | null
          full_name_dr?: string | null
          full_name_for?: string | null
          id?: string
          inn?: string | null
          kpp?: string | null
          ks?: string | null
          ogrn?: string | null
          passport?: string | null
          passport_date?: string | null
          passport_issued?: string | null
          phone?: string | null
          raw_json?: Json | null
          rs?: string | null
          status?: string | null
          telegram_id?: string | null
          updated_at?: string
          ur_address?: string | null
        }
        Update: {
          address?: string | null
          bank?: string | null
          bik?: string | null
          city?: string | null
          code?: string | null
          company_name?: string | null
          contract_type?: string
          contract_url?: string | null
          created_at?: string
          date_now?: string | null
          email?: string | null
          form_url?: string | null
          full_name?: string | null
          full_name_ai?: string | null
          full_name_dr?: string | null
          full_name_for?: string | null
          id?: string
          inn?: string | null
          kpp?: string | null
          ks?: string | null
          ogrn?: string | null
          passport?: string | null
          passport_date?: string | null
          passport_issued?: string | null
          phone?: string | null
          raw_json?: Json | null
          rs?: string | null
          status?: string | null
          telegram_id?: string | null
          updated_at?: string
          ur_address?: string | null
        }
        Relationships: []
      }
      sav_crm_admins: {
        Row: {
          access_level: string
          created_at: string
          id: string
          name: string | null
          telegram_id: number
          updated_at: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          id?: string
          name?: string | null
          telegram_id: number
          updated_at?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          id?: string
          name?: string | null
          telegram_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      sav_expert_selections: {
        Row: {
          created_at: string
          direction: string
          expert_id: string
          id: string
          selector_full_name: string | null
          selector_key: string
          selector_telegram_id: string | null
          selector_username: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          direction: string
          expert_id: string
          id?: string
          selector_full_name?: string | null
          selector_key: string
          selector_telegram_id?: string | null
          selector_username?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          direction?: string
          expert_id?: string
          id?: string
          selector_full_name?: string | null
          selector_key?: string
          selector_telegram_id?: string | null
          selector_username?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sav_expert_selections_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "sav_experts"
            referencedColumns: ["id"]
          },
        ]
      }
      sav_experts: {
        Row: {
          cases: string | null
          created_at: string
          description: string | null
          greeting: string | null
          id: string
          other_info: string | null
          photo_url: string | null
          pseudonym: string | null
          sheet_row_id: string | null
          spheres: string | null
          status: string | null
          telegram: string | null
          telegram_id: string | null
          tools: string | null
          updated_at: string
        }
        Insert: {
          cases?: string | null
          created_at?: string
          description?: string | null
          greeting?: string | null
          id?: string
          other_info?: string | null
          photo_url?: string | null
          pseudonym?: string | null
          sheet_row_id?: string | null
          spheres?: string | null
          status?: string | null
          telegram?: string | null
          telegram_id?: string | null
          tools?: string | null
          updated_at?: string
        }
        Update: {
          cases?: string | null
          created_at?: string
          description?: string | null
          greeting?: string | null
          id?: string
          other_info?: string | null
          photo_url?: string | null
          pseudonym?: string | null
          sheet_row_id?: string | null
          spheres?: string | null
          status?: string | null
          telegram?: string | null
          telegram_id?: string | null
          tools?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sav_leads: {
        Row: {
          avg_salary: string | null
          bot_id: string | null
          bot_token: string | null
          calc_salary: string | null
          category: string | null
          channel_name: string | null
          city: string | null
          created_at: string
          department: string | null
          employees_count: string | null
          first_name: string | null
          full_name: string | null
          functionality: string | null
          groupe_id: string | null
          id: string
          last_name: string | null
          pay_model: string | null
          payback: string | null
          photo_url: string | null
          product: string | null
          project: string | null
          project_code: string | null
          promo: string | null
          promo_caps: string | null
          protalk_id: string | null
          real_salary: string | null
          referred_by: string | null
          region_salary: string | null
          sale_percent: number | null
          sale_price: string | null
          segment: string | null
          selected_expert: string | null
          service: string | null
          service_price: string | null
          sphere: string | null
          status: string | null
          status_kp: string | null
          status_kp_chat: string | null
          tariff: string | null
          tariff_sale: string | null
          tariff_sum: string | null
          telegram_client: string | null
          telegram_id: string | null
          telegram_url: string | null
          text_chat: string | null
          text_department: string | null
          text_kp: string | null
          text_price: string | null
          text_soft: string | null
          textslide1: string | null
          textslide2: string | null
          textslide3: string | null
          textslide4: string | null
          token_price: string | null
          updated_at: string
          user_biz: string | null
          username: string | null
        }
        Insert: {
          avg_salary?: string | null
          bot_id?: string | null
          bot_token?: string | null
          calc_salary?: string | null
          category?: string | null
          channel_name?: string | null
          city?: string | null
          created_at?: string
          department?: string | null
          employees_count?: string | null
          first_name?: string | null
          full_name?: string | null
          functionality?: string | null
          groupe_id?: string | null
          id?: string
          last_name?: string | null
          pay_model?: string | null
          payback?: string | null
          photo_url?: string | null
          product?: string | null
          project?: string | null
          project_code?: string | null
          promo?: string | null
          promo_caps?: string | null
          protalk_id?: string | null
          real_salary?: string | null
          referred_by?: string | null
          region_salary?: string | null
          sale_percent?: number | null
          sale_price?: string | null
          segment?: string | null
          selected_expert?: string | null
          service?: string | null
          service_price?: string | null
          sphere?: string | null
          status?: string | null
          status_kp?: string | null
          status_kp_chat?: string | null
          tariff?: string | null
          tariff_sale?: string | null
          tariff_sum?: string | null
          telegram_client?: string | null
          telegram_id?: string | null
          telegram_url?: string | null
          text_chat?: string | null
          text_department?: string | null
          text_kp?: string | null
          text_price?: string | null
          text_soft?: string | null
          textslide1?: string | null
          textslide2?: string | null
          textslide3?: string | null
          textslide4?: string | null
          token_price?: string | null
          updated_at?: string
          user_biz?: string | null
          username?: string | null
        }
        Update: {
          avg_salary?: string | null
          bot_id?: string | null
          bot_token?: string | null
          calc_salary?: string | null
          category?: string | null
          channel_name?: string | null
          city?: string | null
          created_at?: string
          department?: string | null
          employees_count?: string | null
          first_name?: string | null
          full_name?: string | null
          functionality?: string | null
          groupe_id?: string | null
          id?: string
          last_name?: string | null
          pay_model?: string | null
          payback?: string | null
          photo_url?: string | null
          product?: string | null
          project?: string | null
          project_code?: string | null
          promo?: string | null
          promo_caps?: string | null
          protalk_id?: string | null
          real_salary?: string | null
          referred_by?: string | null
          region_salary?: string | null
          sale_percent?: number | null
          sale_price?: string | null
          segment?: string | null
          selected_expert?: string | null
          service?: string | null
          service_price?: string | null
          sphere?: string | null
          status?: string | null
          status_kp?: string | null
          status_kp_chat?: string | null
          tariff?: string | null
          tariff_sale?: string | null
          tariff_sum?: string | null
          telegram_client?: string | null
          telegram_id?: string | null
          telegram_url?: string | null
          text_chat?: string | null
          text_department?: string | null
          text_kp?: string | null
          text_price?: string | null
          text_soft?: string | null
          textslide1?: string | null
          textslide2?: string | null
          textslide3?: string | null
          textslide4?: string | null
          token_price?: string | null
          updated_at?: string
          user_biz?: string | null
          username?: string | null
        }
        Relationships: []
      }
      sav_notification_templates: {
        Row: {
          created_at: string
          fields: Json | null
          footer_text: string | null
          header_text: string | null
          id: string
          is_active: boolean | null
          media: Json | null
          name: string
          type: string
          updated_at: string
          use_media_caption: boolean | null
        }
        Insert: {
          created_at?: string
          fields?: Json | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_active?: boolean | null
          media?: Json | null
          name: string
          type: string
          updated_at?: string
          use_media_caption?: boolean | null
        }
        Update: {
          created_at?: string
          fields?: Json | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_active?: boolean | null
          media?: Json | null
          name?: string
          type?: string
          updated_at?: string
          use_media_caption?: boolean | null
        }
        Relationships: []
      }
      sav_price_base: {
        Row: {
          created_at: string
          duration: string | null
          features: string | null
          id: string
          messenger_options: string | null
          price: number
          tariff: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration?: string | null
          features?: string | null
          id?: string
          messenger_options?: string | null
          price?: number
          tariff: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration?: string | null
          features?: string | null
          id?: string
          messenger_options?: string | null
          price?: number
          tariff?: string
          updated_at?: string
        }
        Relationships: []
      }
      sav_price_coefficients: {
        Row: {
          coefficient: number
          created_at: string
          id: string
          indicator: string
          option_name: string
          updated_at: string
        }
        Insert: {
          coefficient?: number
          created_at?: string
          id?: string
          indicator: string
          option_name: string
          updated_at?: string
        }
        Update: {
          coefficient?: number
          created_at?: string
          id?: string
          indicator?: string
          option_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sav_price_tariffs: {
        Row: {
          category: string | null
          created_at: string
          full_description: string | null
          functionality: string | null
          id: string
          package: string | null
          photo_url: string | null
          price_month: number | null
          segment: string | null
          sphere: string | null
          tariff_name: string
          tariff_type: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          full_description?: string | null
          functionality?: string | null
          id?: string
          package?: string | null
          photo_url?: string | null
          price_month?: number | null
          segment?: string | null
          sphere?: string | null
          tariff_name: string
          tariff_type?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          full_description?: string | null
          functionality?: string | null
          id?: string
          package?: string | null
          photo_url?: string | null
          price_month?: number | null
          segment?: string | null
          sphere?: string | null
          tariff_name?: string
          tariff_type?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      sav_sync_sources: {
        Row: {
          created_at: string
          description: string | null
          id: string
          last_synced_at: string | null
          name: string
          sheet_id: string
          sheet_url: string
          sync_function: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          sheet_id: string
          sheet_url: string
          sync_function: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          sheet_id?: string
          sheet_url?: string
          sync_function?: string
          updated_at?: string
        }
        Relationships: []
      }
      sav_tariff_notifications: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          notification_sent: boolean | null
          payment_type: string | null
          tariff_name: string | null
          telegram_id: string | null
          telegram_username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          notification_sent?: boolean | null
          payment_type?: string | null
          tariff_name?: string | null
          telegram_id?: string | null
          telegram_username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          notification_sent?: boolean | null
          payment_type?: string | null
          tariff_name?: string | null
          telegram_id?: string | null
          telegram_username?: string | null
        }
        Relationships: []
      }
      sav_telegram_profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          photo_url: string | null
          referral_code: string | null
          referred_by: string | null
          telegram_id: number
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          photo_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          telegram_id: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          photo_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          telegram_id?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      sav_user_calculations: {
        Row: {
          calculation_type: string
          created_at: string
          data: Json | null
          id: string
          telegram_id: number
          updated_at: string
        }
        Insert: {
          calculation_type: string
          created_at?: string
          data?: Json | null
          id?: string
          telegram_id: number
          updated_at?: string
        }
        Update: {
          calculation_type?: string
          created_at?: string
          data?: Json | null
          id?: string
          telegram_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      savlogs: {
        Row: {
          api_key: string | null
          blocked: string | null
          bot_id: string | null
          bot_reply: string | null
          bot_token: string | null
          channel_id: string | null
          channel_name: string | null
          chat_expert: string | null
          chatid_tariff: string | null
          choose_expert: string | null
          clic_select: string | null
          clic_tariff: string | null
          client_code: string | null
          code_and_start: string | null
          created_at: string | null
          date_clic_expert: string | null
          date_select: string | null
          date_tariff: string | null
          deletion: string | null
          double_block: string | null
          double_start: string | null
          error_id: string | null
          expert: string | null
          fio: string | null
          function_call_params: string | null
          function_error: string | null
          id: number
          id_clic_expert: string | null
          id_tariff: string | null
          last_100_messages: string | null
          last_message: string | null
          llm: string | null
          message_ai_text: string | null
          message_user_text: string | null
          name_no_button: string | null
          partner_name: string | null
          promo: string | null
          recognized_id: string | null
          recognized_name: string | null
          referral_code: string | null
          referred_by: string | null
          sent_expert: string | null
          sent_select: string | null
          sent_tarif: string | null
          server_name: string | null
          start_time: string | null
          telegram_id: string | null
          text_caps: string | null
          text_expert: string | null
          text_select: string | null
          text_split_1: string | null
          text_split_2: string | null
          text_tariff: string | null
          tokens_in_source: number | null
          tokens_out_source: number | null
          tokens_total: number | null
          tokens_user: number | null
          user_message: string | null
          user_social_id: string | null
        }
        Insert: {
          api_key?: string | null
          blocked?: string | null
          bot_id?: string | null
          bot_reply?: string | null
          bot_token?: string | null
          channel_id?: string | null
          channel_name?: string | null
          chat_expert?: string | null
          chatid_tariff?: string | null
          choose_expert?: string | null
          clic_select?: string | null
          clic_tariff?: string | null
          client_code?: string | null
          code_and_start?: string | null
          created_at?: string | null
          date_clic_expert?: string | null
          date_select?: string | null
          date_tariff?: string | null
          deletion?: string | null
          double_block?: string | null
          double_start?: string | null
          error_id?: string | null
          expert?: string | null
          fio?: string | null
          function_call_params?: string | null
          function_error?: string | null
          id?: number
          id_clic_expert?: string | null
          id_tariff?: string | null
          last_100_messages?: string | null
          last_message?: string | null
          llm?: string | null
          message_ai_text?: string | null
          message_user_text?: string | null
          name_no_button?: string | null
          partner_name?: string | null
          promo?: string | null
          recognized_id?: string | null
          recognized_name?: string | null
          referral_code?: string | null
          referred_by?: string | null
          sent_expert?: string | null
          sent_select?: string | null
          sent_tarif?: string | null
          server_name?: string | null
          start_time?: string | null
          telegram_id?: string | null
          text_caps?: string | null
          text_expert?: string | null
          text_select?: string | null
          text_split_1?: string | null
          text_split_2?: string | null
          text_tariff?: string | null
          tokens_in_source?: number | null
          tokens_out_source?: number | null
          tokens_total?: number | null
          tokens_user?: number | null
          user_message?: string | null
          user_social_id?: string | null
        }
        Update: {
          api_key?: string | null
          blocked?: string | null
          bot_id?: string | null
          bot_reply?: string | null
          bot_token?: string | null
          channel_id?: string | null
          channel_name?: string | null
          chat_expert?: string | null
          chatid_tariff?: string | null
          choose_expert?: string | null
          clic_select?: string | null
          clic_tariff?: string | null
          client_code?: string | null
          code_and_start?: string | null
          created_at?: string | null
          date_clic_expert?: string | null
          date_select?: string | null
          date_tariff?: string | null
          deletion?: string | null
          double_block?: string | null
          double_start?: string | null
          error_id?: string | null
          expert?: string | null
          fio?: string | null
          function_call_params?: string | null
          function_error?: string | null
          id?: number
          id_clic_expert?: string | null
          id_tariff?: string | null
          last_100_messages?: string | null
          last_message?: string | null
          llm?: string | null
          message_ai_text?: string | null
          message_user_text?: string | null
          name_no_button?: string | null
          partner_name?: string | null
          promo?: string | null
          recognized_id?: string | null
          recognized_name?: string | null
          referral_code?: string | null
          referred_by?: string | null
          sent_expert?: string | null
          sent_select?: string | null
          sent_tarif?: string | null
          server_name?: string | null
          start_time?: string | null
          telegram_id?: string | null
          text_caps?: string | null
          text_expert?: string | null
          text_select?: string | null
          text_split_1?: string | null
          text_split_2?: string | null
          text_tariff?: string | null
          tokens_in_source?: number | null
          tokens_out_source?: number | null
          tokens_total?: number | null
          tokens_user?: number | null
          user_message?: string | null
          user_social_id?: string | null
        }
        Relationships: []
      }
      site_text: {
        Row: {
          created_at: string
          id: string
          key: string
          olbanian: string | null
          ru: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          olbanian?: string | null
          ru?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          olbanian?: string | null
          ru?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          fio: string | null
          id: string
          partner_code: string | null
          position: string | null
          promo: string | null
          status: string | null
          telegram: string | null
          timestamp: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fio?: string | null
          id?: string
          partner_code?: string | null
          position?: string | null
          promo?: string | null
          status?: string | null
          telegram?: string | null
          timestamp?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fio?: string | null
          id?: string
          partner_code?: string | null
          position?: string | null
          promo?: string | null
          status?: string | null
          telegram?: string | null
          timestamp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      status_config: {
        Row: {
          available_actions: string | null
          client_list: string | null
          consultation_check: string | null
          contract_check: string | null
          created_at: string
          expert_percent: number | null
          id: string
          partner_percent: number | null
          payout_by_clients: string | null
          registration_check: string | null
          sort_order: number | null
          status_name: string
          updated_at: string
        }
        Insert: {
          available_actions?: string | null
          client_list?: string | null
          consultation_check?: string | null
          contract_check?: string | null
          created_at?: string
          expert_percent?: number | null
          id?: string
          partner_percent?: number | null
          payout_by_clients?: string | null
          registration_check?: string | null
          sort_order?: number | null
          status_name: string
          updated_at?: string
        }
        Update: {
          available_actions?: string | null
          client_list?: string | null
          consultation_check?: string | null
          contract_check?: string | null
          created_at?: string
          expert_percent?: number | null
          id?: string
          partner_percent?: number | null
          payout_by_clients?: string | null
          registration_check?: string | null
          sort_order?: number | null
          status_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_access: {
        Row: {
          allowed_pages: string[]
          created_at: string
          id: string
          is_superuser: boolean
          role_name: string | null
          telegram_id: string
          updated_at: string
        }
        Insert: {
          allowed_pages?: string[]
          created_at?: string
          id?: string
          is_superuser?: boolean
          role_name?: string | null
          telegram_id: string
          updated_at?: string
        }
        Update: {
          allowed_pages?: string[]
          created_at?: string
          id?: string
          is_superuser?: boolean
          role_name?: string | null
          telegram_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
