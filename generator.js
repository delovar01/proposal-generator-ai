/*
 * generator.js — OpenAI proposal generation logic.
 * Builds a carefully engineered prompt and calls the Chat Completions API
 * (model: gpt-4o-mini). Returns a structured JSON object that app.js renders.
 */

(function (global) {
  'use strict';

  const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
  const MODEL = 'gpt-4o-mini';

  const TONE_DESCRIPTIONS = {
    formal: {
      ru: 'Строгий деловой тон. Уважительное обращение на «Вы», профессиональная лексика, без жаргона и восклицаний. Классика B2B-коммуникации.',
      en: 'Strict business tone. Professional vocabulary, respectful address, no slang or exclamations. Classic B2B communication.'
    },
    friendly: {
      ru: 'Дружественный, но профессиональный тон. Обращение на «Вы», тёплые формулировки, живой язык, при этом без фамильярности.',
      en: 'Warm and approachable but still professional. Conversational yet polished, shows partnership, never sloppy.'
    },
    sales: {
      ru: 'Продающий, уверенный тон. Активные глаголы, конкретные выгоды и цифры, сильные СТА, ощущение срочности, но без давления и «воды».',
      en: 'Assertive, sales-driven tone. Active verbs, concrete benefits and numbers, strong CTAs, sense of urgency — confident but not pushy.'
    }
  };

  const CURRENCY_SYMBOL = { USD: '$', EUR: '€', RUB: '₽', GBP: '£' };

  function buildSystemPrompt(lang) {
    if (lang === 'ru') {
      return [
        'Ты — опытный B2B-копирайтер с 10+ лет практики в составлении коммерческих предложений (КП) для IT, консалтинга, маркетинга и производства.',
        'Ты пишешь на безупречном деловом русском языке, избегая клише, «воды», канцелярита и маркетингового мусора.',
        'Твои КП всегда:',
        '— структурированы (вступление → суть услуги → ценность для клиента → ключевые преимущества → инвестиция → следующий шаг),',
        '— персонализированы под конкретного получателя,',
        '— основаны на реальных бизнес-выгодах, а не на общих обещаниях,',
        '— написаны от лица компании-отправителя, но фокусируются на проблемах и выигрышах клиента.',
        'Ты отвечаешь СТРОГО в формате JSON по заданной схеме, без Markdown и комментариев.'
      ].join(' ');
    }
    return [
      'You are a senior B2B copywriter with 10+ years of experience writing commercial proposals for IT, consulting, marketing, and manufacturing.',
      'You write in impeccable business English, avoiding clichés, filler, and marketing fluff.',
      'Your proposals are always:',
      '— well-structured (intro → service overview → client value → key advantages → investment → next step),',
      '— personalized for the specific recipient,',
      '— grounded in real business outcomes, not vague promises,',
      '— written from the sender\'s perspective but focused on the client\'s problems and wins.',
      'You ALWAYS respond in STRICT JSON matching the provided schema — no Markdown, no commentary.'
    ].join(' ');
  }

  function buildUserPrompt(input) {
    const {
      senderCompany,
      receiverCompany,
      service,
      advantages,
      budgetFrom,
      budgetTo,
      currency,
      deadline,
      tone,
      lang
    } = input;

    const symbol = CURRENCY_SYMBOL[currency] || currency;
    const toneDesc = (TONE_DESCRIPTIONS[tone] && TONE_DESCRIPTIONS[tone][lang]) || '';
    const advList = advantages.filter(Boolean);

    if (lang === 'ru') {
      return [
        'Составь профессиональное коммерческое предложение на РУССКОМ языке, строго в JSON-формате ниже.',
        '',
        `Компания-отправитель: ${senderCompany}`,
        `Компания-получатель: ${receiverCompany}`,
        `Услуга/продукт: ${service}`,
        `Ключевые преимущества:\n- ${advList.join('\n- ')}`,
        `Бюджет: от ${budgetFrom} до ${budgetTo} ${symbol} (${currency})`,
        `Срок выполнения: ${deadline}`,
        `Тон: ${tone} — ${toneDesc}`,
        '',
        'Требования к содержанию:',
        '1. "title" — ёмкое заглавие КП (до 10 слов), отражает суть ценности, НЕ просто «Коммерческое предложение».',
        '2. "subtitle" — подзаголовок: для кого и по какому поводу (1 короткое предложение).',
        '3. "intro" — 2–3 предложения: контекст, понимание задачи клиента, почему отправитель именно тот, кто её решит. БЕЗ общих фраз типа «рады предложить сотрудничество».',
        '4. "serviceDescription" — 3–5 предложений о самой услуге: что именно будет сделано, как это решит задачу клиента, какой результат получит бизнес.',
        '5. "advantages" — массив объектов { "title": "...", "description": "..." }, 3–5 штук. title = 2–5 слов, description = 1–2 конкретных предложения с цифрами/фактами, где уместно. Переформулируй ввод пользователя профессионально, добавь 1–2 смежных преимущества.',
        '6. "deliverables" — массив из 3–6 строк: конкретные артефакты/этапы (что именно получит клиент).',
        '7. "pricing" — объект:',
        '   - "amount": строка с диапазоном в формате "от X до Y" и указанием валюты-символа;',
        '   - "note": 1 короткое предложение про что входит/фиксация цены/НДС и т.п.',
        '8. "timeline" — 1–2 предложения о сроках и этапах.',
        '9. "cta" — объект { "headline": "...", "text": "..." }: сильный призыв (созвон/встреча/договор), headline = 3–6 слов.',
        '10. "signature" — объект { "name": "Команда " + sender, "contact": "оставь плейсхолдер вида «email@company.com · +X XXX XXX-XX-XX»" }.',
        '',
        'Верни ТОЛЬКО валидный JSON, без преамбулы, без Markdown-обёрток, без ```.',
        '',
        'JSON schema:',
        '{',
        '  "title": string,',
        '  "subtitle": string,',
        '  "intro": string,',
        '  "serviceDescription": string,',
        '  "advantages": [{ "title": string, "description": string }],',
        '  "deliverables": [string],',
        '  "pricing": { "amount": string, "note": string },',
        '  "timeline": string,',
        '  "cta": { "headline": string, "text": string },',
        '  "signature": { "name": string, "contact": string }',
        '}'
      ].join('\n');
    }

    return [
      'Produce a professional commercial proposal in ENGLISH, strictly as the JSON schema below.',
      '',
      `Sender company: ${senderCompany}`,
      `Recipient company: ${receiverCompany}`,
      `Service/product: ${service}`,
      `Key advantages:\n- ${advList.join('\n- ')}`,
      `Budget: from ${budgetFrom} to ${budgetTo} ${symbol} (${currency})`,
      `Delivery timeframe: ${deadline}`,
      `Tone: ${tone} — ${toneDesc}`,
      '',
      'Content requirements:',
      '1. "title" — punchy headline (≤10 words) capturing the core value. NOT a generic "Commercial Proposal".',
      '2. "subtitle" — one sentence: who it is for and what it is about.',
      '3. "intro" — 2–3 sentences: context, understanding of the client\'s challenge, why the sender is the right partner. Avoid empty phrases like "we are happy to offer".',
      '4. "serviceDescription" — 3–5 sentences on the service: what exactly is delivered, how it solves the client\'s problem, what business outcome to expect.',
      '5. "advantages" — array of { "title": "...", "description": "..." }, 3–5 items. title = 2–5 words, description = 1–2 concrete sentences with numbers/facts where possible. Rephrase user input professionally, add 1–2 adjacent benefits.',
      '6. "deliverables" — array of 3–6 concrete artifacts/milestones the client will receive.',
      '7. "pricing" — object:',
      '   - "amount": string with the range, formatted as "from X to Y" with currency symbol;',
      '   - "note": 1 short sentence about scope/price lock/taxes.',
      '8. "timeline" — 1–2 sentences about schedule and phases.',
      '9. "cta" — { "headline": "...", "text": "..." }, strong next step (call/meeting/contract); headline = 3–6 words.',
      '10. "signature" — { "name": "Team " + sender, "contact": "placeholder like email@company.com · +X XXX XXX-XX-XX" }.',
      '',
      'Return ONLY valid JSON. No preface, no Markdown fences, no ```.',
      '',
      'JSON schema:',
      '{',
      '  "title": string,',
      '  "subtitle": string,',
      '  "intro": string,',
      '  "serviceDescription": string,',
      '  "advantages": [{ "title": string, "description": string }],',
      '  "deliverables": [string],',
      '  "pricing": { "amount": string, "note": string },',
      '  "timeline": string,',
      '  "cta": { "headline": string, "text": string },',
      '  "signature": { "name": string, "contact": string }',
      '}'
    ].join('\n');
  }

  function stripCodeFences(raw) {
    if (!raw) return '';
    let s = String(raw).trim();
    if (s.startsWith('```')) {
      s = s.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
    }
    return s;
  }

  function safeParseJSON(raw) {
    const cleaned = stripCodeFences(raw);
    try {
      return JSON.parse(cleaned);
    } catch (_) {
      // Try to recover first {...} block.
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1));
        } catch (e) {
          throw new Error('Model returned invalid JSON.');
        }
      }
      throw new Error('Model returned invalid JSON.');
    }
  }

  async function generateProposal(input, apiKey) {
    if (!apiKey || !apiKey.startsWith('sk-')) {
      throw new Error('Please provide a valid OpenAI API key (starts with "sk-").');
    }

    const body = {
      model: MODEL,
      temperature: 0.75,
      top_p: 0.95,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(input.lang) },
        { role: 'user', content: buildUserPrompt(input) }
      ]
    };

    let response;
    try {
      response = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error('Network error while calling OpenAI: ' + e.message);
    }

    if (!response.ok) {
      let detail = '';
      try {
        const err = await response.json();
        detail = err?.error?.message || JSON.stringify(err);
      } catch (_) {
        detail = await response.text();
      }
      throw new Error(`OpenAI API error (${response.status}): ${detail}`);
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) throw new Error('OpenAI response did not contain any content.');

    const parsed = safeParseJSON(raw);
    return normalizeProposal(parsed);
  }

  function normalizeProposal(p) {
    const out = {
      title: String(p.title || '').trim(),
      subtitle: String(p.subtitle || '').trim(),
      intro: String(p.intro || '').trim(),
      serviceDescription: String(p.serviceDescription || '').trim(),
      advantages: Array.isArray(p.advantages) ? p.advantages.map(a => ({
        title: String(a.title || '').trim(),
        description: String(a.description || '').trim()
      })).filter(a => a.title || a.description) : [],
      deliverables: Array.isArray(p.deliverables) ? p.deliverables.map(d => String(d).trim()).filter(Boolean) : [],
      pricing: {
        amount: String(p.pricing?.amount || '').trim(),
        note: String(p.pricing?.note || '').trim()
      },
      timeline: String(p.timeline || '').trim(),
      cta: {
        headline: String(p.cta?.headline || '').trim(),
        text: String(p.cta?.text || '').trim()
      },
      signature: {
        name: String(p.signature?.name || '').trim(),
        contact: String(p.signature?.contact || '').trim()
      }
    };
    return out;
  }

  global.ProposalGenerator = { generateProposal };
})(window);
