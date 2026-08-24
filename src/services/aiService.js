/**
 * AI Marketing Ad Service using Google Gemini 1.5 Flash API
 * 
 * Generates engaging, Arabic promotional ad copy for products.
 * Free Tier: Google Gemini 1.5 Flash (15 Requests/Min, 1M Tokens/Min)
 */

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

/**
 * Generates marketing ads using Gemini API or smart fallback templates.
 */
const generateProductAds = async (productInfo) => {
  const { title, price, currency = 'YER', unit, description, category, businessName } = productInfo;

  // If Gemini API Key is available, call Google Gemini 1.5 Flash
  if (GEMINI_API_KEY) {
    try {
      const prompt = `أنت خبير تسويق محترف متخصص في صياغة إعلانات الواتساب ومواقع التواصل الاجتماعي للأسر المنتجة والمتاجر المحلية.

قم بكتابة 2 إعلانات تسويقية مبتكرة وجذابة ومختلفة كلياً لمنتج بالمعلومات التالية:
- اسم المنتج: ${title}
- السعر: ${price} ${currency} ${unit ? `(${unit})` : ''}
- القسم: ${category || 'عام'}
- اسم المتجر/الماركة: ${businessName || 'السوق المنزلي'}
- الوصف/التفاصيل: ${description || 'منتج مميز وطازج بحسب الطلب'}

المتطلبات الهامة:
1. الإعلان الأول (نمط حماسي وسريع مع إيموجيات ملونة ومناسب للواتساب):
مثال على الأسلوب المطلوب:
🍥 غداء اليوم مفتوح 🍥
سينابون طازج ولذيذ 😋❤️
📦 5 حبات فقط بسعر 1000 ريال.
للطلب والحجز تواصلوا معي 💕

2. الإعلان الثاني (نمط فاخر، أنيق وشيق يبرز الجودة والتميز):
مثال على الأسلوب المطلوب:
منتج مميز من براند... ✨
تركيبة فريدة... يمنحك تجربة رائعة...
ثقة وتألق يليق بك 🤍

قم بإرجاع الإعلانين في صيغة JSON حصرية بالشكل التالي دون أي نصوص إضافية خارج الـ JSON:
{
  "ads": [
    "النص الكامل للإعلان الأول مع كافة الإيموجيات والسطور والأسعار",
    "النص الكامل للإعلان الثاني مع كافة الإيموجيات والسطور والأسعار"
  ]
}`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 800
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Extract JSON string from raw markdown block if present
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.ads && Array.isArray(parsed.ads) && parsed.ads.length > 0) {
            return { success: true, ads: parsed.ads, provider: 'gemini-ai' };
          }
        }

        // If JSON parsing fails, use the raw text divided by lines
        if (rawText.trim().length > 0) {
          return { success: true, ads: [rawText.trim()], provider: 'gemini-ai-raw' };
        }
      } else {
        console.warn(`[AI Service] Gemini API returned status ${response.status}. Using fallback templates.`);
      }
    } catch (error) {
      console.error('[AI Service] Error calling Gemini API:', error.message);
    }
  }

  // Smart Fallback Marketing Ad Generator (if key not configured or API fails)
  const ad1 = `✨ *${title}* ✨\n` +
    `من متجر: ${businessName || 'السوق المنزلي'} 🏠\n\n` +
    `${description ? `${description}\n\n` : ''}` +
    `💰 *السعر:* ${price} ${currency} ${unit ? `لكل ${unit}` : ''}\n` +
    `📦 متوفر للطلب الفوري باختيارات طازجة ومميزة!\n\n` +
    `للطلب والاستفسار تواصلوا معنا عبر الواتساب 💕`;

  const ad2 = `🔥 *عرض خاص ومميز!* 🔥\n\n` +
    `استمتعوا بـ *${title}* الأكثر طلباً 😋❤️\n` +
    `سعر مغري جداً: *${price} ${currency}* فقط!\n\n` +
    `الجودة التي تستحقها والخدمة السريعة 👌✨\n` +
    `سارع بالطلب الآن قبل نفاد الكمية! 📲`;

  return {
    success: true,
    ads: [ad1, ad2],
    provider: 'fallback-templates'
  };
};

module.exports = {
  generateProductAds
};
