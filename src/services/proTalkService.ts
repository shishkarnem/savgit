import { BusinessInfo, PlanLevel } from "../types";
import { getOrGenerateUID } from "../lib/uidHelper";

export interface UserInfo {
  telegram_id?: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

/**
 * Classifies business via SAV AI ProTalk engine
 */
export async function classifyBusiness(
  userInput: string,
  userInfo?: UserInfo,
  companyName?: string
): Promise<BusinessInfo> {
  try {
    const uid = getOrGenerateUID();
    const res = await fetch('/api/v1/ai/classify-business', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userInput, userInfo, companyName, uid })
    });

    if (!res.ok) {
      throw new Error(`Ошибка сервера классификации: ${res.status}`);
    }

    const data = await res.json();
    if (!data.success && data.error) {
      throw new Error(data.error);
    }

    return {
      company_name: data.company_name || companyName || undefined,
      segment: data.segment,
      category: data.category,
      sphere: data.sphere,
      description: data.description,
      praise: data.praise,
      package: data.package || 'Стандарт',
      image_url: data.image_url || undefined
    } as BusinessInfo;
  } catch (err: any) {
    console.error("ProTalk classification error:", err);
    throw new Error(err.message || "Ошибка классификации бизнеса через ProTalk");
  }
}

/**
 * Generates plan presentation via ProTalk AI templates
 */
export async function generatePlanPresentation(businessInfo: BusinessInfo, planLevel: PlanLevel): Promise<string> {
  return `Представляем вам тарифный план "${planLevel}" для вашего бизнеса в сфере ${businessInfo.sphere}!

Этот план идеально подходит для ${businessInfo.segment === 'B2B' ? 'корпоративных клиентов' : 'розничных покупателей'}, предлагающих ${businessInfo.category.toLowerCase()}.

AI-продавец SAV возьмет на себя все рутинные задачи: консультации клиентов, расчет стоимости, обработку заявок и работу с возражениями. Ваши сотрудники смогут сосредоточиться на стратегических задачах, пока наш механический помощник работает 24/7.

Мы гарантируем увеличение конверсии и снижение нагрузки на отдел продаж уже в первый месяц использования!`;
}
