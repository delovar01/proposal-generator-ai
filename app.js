/*
 * app.js — UI glue: form handling, state, rendering, and action wiring.
 */

(function () {
  'use strict';

  const LS_KEY = 'proposalGen.apiKey';
  const LS_LAST = 'proposalGen.lastProposal';
  const LS_FORM = 'proposalGen.lastForm';

  // ---------- DOM refs ----------
  const els = {
    apiKey: document.getElementById('apiKey'),
    saveKey: document.getElementById('saveKeyBtn'),
    clearKey: document.getElementById('clearKeyBtn'),

    form: document.getElementById('proposalForm'),
    senderCompany: document.getElementById('senderCompany'),
    receiverCompany: document.getElementById('receiverCompany'),
    service: document.getElementById('service'),
    adv1: document.getElementById('adv1'),
    adv2: document.getElementById('adv2'),
    adv3: document.getElementById('adv3'),
    budgetFrom: document.getElementById('budgetFrom'),
    budgetTo: document.getElementById('budgetTo'),
    currency: document.getElementById('currency'),
    deadline: document.getElementById('deadline'),

    generateBtn: document.getElementById('generateBtn'),
    copyBtn: document.getElementById('copyBtn'),
    pdfBtn: document.getElementById('pdfBtn'),
    regenBtn: document.getElementById('regenBtn'),

    previewWrap: document.getElementById('previewWrap'),
    emptyState: document.getElementById('emptyState'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    errorRetry: document.getElementById('errorRetry'),
    proposalDoc: document.getElementById('proposalDoc')
  };

  // ---------- State ----------
  let currentProposal = null;
  let currentInput = null;
  let isGenerating = false;

  // ---------- Helpers ----------
  function getSelectedRadio(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  }

  function setRadio(name, value) {
    const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
  }

  function escapeHTML(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function showState(state) {
    els.emptyState.hidden = state !== 'empty';
    els.loadingState.hidden = state !== 'loading';
    els.errorState.hidden = state !== 'error';
    els.proposalDoc.hidden = state !== 'doc';
  }

  function setActionButtons(enabled) {
    els.copyBtn.disabled = !enabled;
    els.pdfBtn.disabled = !enabled;
    els.regenBtn.disabled = !enabled;
  }

  function toast(message, type = 'success', ms = 2200) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = `toast ${type} visible`;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('visible'), ms);
  }

  function formatDate(lang) {
    const d = new Date();
    if (lang === 'ru') {
      return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function getInitials(name) {
    return (name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'CP';
  }

  function labels(lang) {
    if (lang === 'ru') {
      return {
        from: 'От',
        to: 'Для',
        date: 'Дата',
        overview: 'Описание услуги',
        advantages: 'Ключевые преимущества',
        deliverables: 'Что вы получите',
        pricing: 'Инвестиция',
        timeline: 'Сроки',
        nextStep: 'Следующий шаг',
        sincerely: 'С уважением,'
      };
    }
    return {
      from: 'From',
      to: 'To',
      date: 'Date',
      overview: 'Service overview',
      advantages: 'Key advantages',
      deliverables: 'What you get',
      pricing: 'Investment',
      timeline: 'Timeline',
      nextStep: 'Next step',
      sincerely: 'Sincerely,'
    };
  }

  // ---------- Collect form ----------
  function collectInput() {
    return {
      senderCompany: els.senderCompany.value.trim(),
      receiverCompany: els.receiverCompany.value.trim(),
      service: els.service.value.trim(),
      advantages: [els.adv1.value, els.adv2.value, els.adv3.value]
        .map((s) => s.trim())
        .filter(Boolean),
      budgetFrom: els.budgetFrom.value.trim(),
      budgetTo: els.budgetTo.value.trim(),
      currency: els.currency.value,
      deadline: els.deadline.value.trim(),
      tone: getSelectedRadio('tone') || 'formal',
      lang: getSelectedRadio('lang') || 'ru'
    };
  }

  function saveFormToStorage() {
    try {
      localStorage.setItem(LS_FORM, JSON.stringify(collectInput()));
    } catch (_) { /* ignore */ }
  }

  function restoreFormFromStorage() {
    try {
      const raw = localStorage.getItem(LS_FORM);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.senderCompany) els.senderCompany.value = s.senderCompany;
      if (s.receiverCompany) els.receiverCompany.value = s.receiverCompany;
      if (s.service) els.service.value = s.service;
      if (s.advantages) {
        els.adv1.value = s.advantages[0] || '';
        els.adv2.value = s.advantages[1] || '';
        els.adv3.value = s.advantages[2] || '';
      }
      if (s.budgetFrom) els.budgetFrom.value = s.budgetFrom;
      if (s.budgetTo) els.budgetTo.value = s.budgetTo;
      if (s.currency) els.currency.value = s.currency;
      if (s.deadline) els.deadline.value = s.deadline;
      if (s.tone) setRadio('tone', s.tone);
      if (s.lang) setRadio('lang', s.lang);
    } catch (_) { /* ignore */ }
  }

  // ---------- Render ----------
  function renderProposal(proposal, input) {
    const L = labels(input.lang);
    const initials = getInitials(input.senderCompany);
    const date = formatDate(input.lang);

    const advantagesHTML = (proposal.advantages || [])
      .map((a) => `
        <li>
          <strong>${escapeHTML(a.title)}.</strong> ${escapeHTML(a.description)}
        </li>`)
      .join('');

    const deliverablesHTML = (proposal.deliverables || [])
      .map((d) => `<li>${escapeHTML(d)}</li>`)
      .join('');

    const html = `
      <header class="doc-header">
        <div>
          <div class="doc-logo">${escapeHTML(initials)}</div>
          <div class="doc-parties">
            <div><b>${L.from}:</b> ${escapeHTML(input.senderCompany)}</div>
            <div><b>${L.to}:</b> ${escapeHTML(input.receiverCompany)}</div>
          </div>
        </div>
        <div class="doc-meta">
          <div class="doc-date">${escapeHTML(date)}</div>
          <div>${L.date}</div>
        </div>
      </header>

      <h1 class="doc-title">${escapeHTML(proposal.title)}</h1>
      ${proposal.subtitle ? `<p class="doc-subtitle">${escapeHTML(proposal.subtitle)}</p>` : ''}

      ${proposal.intro ? `<p>${escapeHTML(proposal.intro)}</p>` : ''}

      ${proposal.serviceDescription ? `
        <h2>${L.overview}</h2>
        <p>${escapeHTML(proposal.serviceDescription)}</p>
      ` : ''}

      ${advantagesHTML ? `
        <h2>${L.advantages}</h2>
        <ul>${advantagesHTML}</ul>
      ` : ''}

      ${deliverablesHTML ? `
        <h2>${L.deliverables}</h2>
        <ol>${deliverablesHTML}</ol>
      ` : ''}

      ${proposal.pricing?.amount ? `
        <h2>${L.pricing}</h2>
        <div class="doc-price">
          <div class="label">${L.pricing}</div>
          <div class="amount">${escapeHTML(proposal.pricing.amount)}</div>
          ${proposal.pricing.note ? `<div class="period">${escapeHTML(proposal.pricing.note)}</div>` : ''}
        </div>
      ` : ''}

      ${proposal.timeline ? `
        <h2>${L.timeline}</h2>
        <p>${escapeHTML(proposal.timeline)}</p>
      ` : ''}

      ${proposal.cta?.headline ? `
        <div class="doc-cta">
          <h3>${escapeHTML(proposal.cta.headline)}</h3>
          ${proposal.cta.text ? `<p>${escapeHTML(proposal.cta.text)}</p>` : ''}
        </div>
      ` : ''}

      <div class="doc-signature">
        <div>${L.sincerely}</div>
        <div><b>${escapeHTML(proposal.signature?.name || input.senderCompany)}</b></div>
        ${proposal.signature?.contact ? `<div>${escapeHTML(proposal.signature.contact)}</div>` : ''}
      </div>
    `;

    els.proposalDoc.innerHTML = html;
  }

  // ---------- Text export (for "Copy") ----------
  function proposalToPlainText(proposal, input) {
    const L = labels(input.lang);
    const lines = [];

    lines.push(proposal.title);
    if (proposal.subtitle) lines.push(proposal.subtitle);
    lines.push('');
    lines.push(`${L.from}: ${input.senderCompany}`);
    lines.push(`${L.to}: ${input.receiverCompany}`);
    lines.push(`${L.date}: ${formatDate(input.lang)}`);
    lines.push('');
    if (proposal.intro) { lines.push(proposal.intro); lines.push(''); }

    if (proposal.serviceDescription) {
      lines.push(L.overview.toUpperCase());
      lines.push(proposal.serviceDescription);
      lines.push('');
    }

    if (proposal.advantages?.length) {
      lines.push(L.advantages.toUpperCase());
      proposal.advantages.forEach((a) => {
        lines.push(`• ${a.title}. ${a.description}`);
      });
      lines.push('');
    }

    if (proposal.deliverables?.length) {
      lines.push(L.deliverables.toUpperCase());
      proposal.deliverables.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
      lines.push('');
    }

    if (proposal.pricing?.amount) {
      lines.push(L.pricing.toUpperCase());
      lines.push(proposal.pricing.amount);
      if (proposal.pricing.note) lines.push(proposal.pricing.note);
      lines.push('');
    }

    if (proposal.timeline) {
      lines.push(L.timeline.toUpperCase());
      lines.push(proposal.timeline);
      lines.push('');
    }

    if (proposal.cta?.headline) {
      lines.push(proposal.cta.headline.toUpperCase());
      if (proposal.cta.text) lines.push(proposal.cta.text);
      lines.push('');
    }

    lines.push(L.sincerely);
    lines.push(proposal.signature?.name || input.senderCompany);
    if (proposal.signature?.contact) lines.push(proposal.signature.contact);

    return lines.join('\n');
  }

  // ---------- Actions ----------
  async function handleGenerate(input) {
    if (isGenerating) return;

    // Basic validation
    if (!input.senderCompany || !input.receiverCompany || !input.service) {
      toast(input.lang === 'ru' ? 'Заполните обязательные поля' : 'Please fill required fields', 'error');
      return;
    }
    if (!input.advantages.length) {
      toast(input.lang === 'ru' ? 'Укажите хотя бы одно преимущество' : 'Provide at least one advantage', 'error');
      return;
    }

    const apiKey = els.apiKey.value.trim();
    if (!apiKey) {
      toast(input.lang === 'ru' ? 'Введите OpenAI API key' : 'Enter your OpenAI API key', 'error');
      els.apiKey.focus();
      return;
    }

    isGenerating = true;
    setActionButtons(false);
    els.generateBtn.disabled = true;
    els.generateBtn.querySelector('.btn-label').textContent =
      input.lang === 'ru' ? 'Генерация...' : 'Generating...';

    showState('loading');

    try {
      const proposal = await window.ProposalGenerator.generateProposal(input, apiKey);
      currentProposal = proposal;
      currentInput = input;

      try {
        localStorage.setItem(LS_LAST, JSON.stringify({ proposal, input }));
      } catch (_) { /* ignore quota */ }

      renderProposal(proposal, input);
      showState('doc');
      setActionButtons(true);
      toast(input.lang === 'ru' ? 'КП готово' : 'Proposal ready', 'success');
    } catch (err) {
      console.error(err);
      els.errorMessage.textContent = err.message || String(err);
      showState('error');
      setActionButtons(false);
    } finally {
      isGenerating = false;
      els.generateBtn.disabled = false;
      els.generateBtn.querySelector('.btn-label').textContent =
        input.lang === 'ru' ? 'Сгенерировать КП' : 'Generate proposal';
    }
  }

  async function handleCopy() {
    if (!currentProposal || !currentInput) return;
    const text = proposalToPlainText(currentProposal, currentInput);
    try {
      await navigator.clipboard.writeText(text);
      toast(currentInput.lang === 'ru' ? 'Скопировано в буфер' : 'Copied to clipboard', 'success');
    } catch (_) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) { /* ignore */ }
      document.body.removeChild(ta);
      toast(currentInput.lang === 'ru' ? 'Скопировано' : 'Copied', 'success');
    }
  }

  async function handlePDF() {
    if (!currentProposal || !currentInput) return;
    const fileName = buildPdfFileName(currentInput);
    const prevLabel = els.pdfBtn.textContent;
    els.pdfBtn.disabled = true;
    els.pdfBtn.textContent = currentInput.lang === 'ru' ? 'Генерация PDF...' : 'Building PDF...';
    try {
      await window.PDFExport.exportProposalToPDF(els.proposalDoc, fileName);
      toast(currentInput.lang === 'ru' ? 'PDF сохранён' : 'PDF saved', 'success');
    } catch (err) {
      console.error(err);
      toast(err.message || 'PDF export failed', 'error');
    } finally {
      els.pdfBtn.disabled = false;
      els.pdfBtn.textContent = prevLabel;
    }
  }

  function buildPdfFileName(input) {
    const safe = (s) => String(s || '').replace(/[^A-Za-zА-Яа-я0-9_\-]+/g, '_').slice(0, 40);
    const stamp = new Date().toISOString().slice(0, 10);
    return `Proposal_${safe(input.senderCompany)}_for_${safe(input.receiverCompany)}_${stamp}.pdf`;
  }

  // ---------- Wire-up ----------
  function bindEvents() {
    els.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = collectInput();
      saveFormToStorage();
      handleGenerate(input);
    });

    els.regenBtn.addEventListener('click', () => {
      const input = collectInput();
      saveFormToStorage();
      handleGenerate(input);
    });

    els.errorRetry.addEventListener('click', () => {
      const input = collectInput();
      handleGenerate(input);
    });

    els.copyBtn.addEventListener('click', handleCopy);
    els.pdfBtn.addEventListener('click', handlePDF);

    // API key controls
    els.saveKey.addEventListener('click', () => {
      const val = els.apiKey.value.trim();
      if (!val) {
        toast('Enter an API key first', 'error');
        return;
      }
      try {
        localStorage.setItem(LS_KEY, val);
        toast('API key saved locally', 'success');
      } catch (_) {
        toast('Unable to save key', 'error');
      }
    });

    els.clearKey.addEventListener('click', () => {
      localStorage.removeItem(LS_KEY);
      els.apiKey.value = '';
      toast('API key cleared', 'success');
    });

    // Persist form on every change (debounced).
    let saveTimer;
    els.form.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveFormToStorage, 350);
    });
  }

  function restoreLastProposal() {
    try {
      const raw = localStorage.getItem(LS_LAST);
      if (!raw) return;
      const { proposal, input } = JSON.parse(raw);
      if (proposal && input) {
        currentProposal = proposal;
        currentInput = input;
        renderProposal(proposal, input);
        showState('doc');
        setActionButtons(true);
      }
    } catch (_) { /* ignore */ }
  }

  function restoreApiKey() {
    try {
      const val = localStorage.getItem(LS_KEY);
      if (val) els.apiKey.value = val;
    } catch (_) { /* ignore */ }
  }

  // ---------- Init ----------
  function init() {
    restoreApiKey();
    restoreFormFromStorage();
    bindEvents();
    restoreLastProposal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
