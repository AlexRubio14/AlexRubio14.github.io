import { getLanguage, onLanguageChange, t } from '../core/i18n.js';

/**
 * Contact form -> own backend (Cloudflare Worker in workers/contact, which sends via Resend).
 * The URL comes from .env.development / .env.production (VITE_CONTACT_ENDPOINT).
 */
const ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT;
const FEEDBACK_TIMEOUT_MS = 5000;
const REQUEST_TIMEOUT_MS = 15000;

/** Server error code -> translation key shown to the visitor. */
function messageKeyFor(result) {
  if (result?.error === 'validation_failed') {
    const { email, message } = result.fields ?? {};
    if (email) return 'msg.required';
    if (message === 'too_short') return 'msg.too_short';
    if (message === 'too_long') return 'msg.too_long';
  }
  return 'msg.error';
}

/**
 * Wires a contact form (subject chips + email + message).
 * @param {HTMLFormElement} form
 * @param {{ onSuccess?: () => void }} [options]
 */
function setupForm(form, { onSuccess } = {}) {
  const chips = form.querySelectorAll('.subject-chip');
  const customWrap = form.querySelector('.hidden-custom-subject');
  const customInput = form.querySelector('input[name="custom_subject"]');
  const emailInput = form.querySelector('input[name="email"]');
  const messageInput = form.querySelector('textarea[name="message"]');
  const botcheck = form.querySelector('input[name="botcheck"]');
  const feedback = form.querySelector('.form-feedback');
  const submitBtn = form.querySelector('[type="submit"]');

  // One id per message: if the same message is sent twice (double click, retry),
  // the Worker forwards it as Resend's Idempotency-Key and only one email goes out.
  let requestId = crypto.randomUUID();

  const showFeedback = (type, key) => {
    feedback.className = `form-feedback ${type}`;
    feedback.textContent = t(key);
  };
  const clearFeedback = () => {
    feedback.className = 'form-feedback';
    feedback.textContent = '';
  };

  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.toggle('active', c === chip));
      const isCustom = chip.dataset.subject === 'custom';
      customWrap?.classList.toggle('show', isCustom);
      if (isCustom) customInput?.focus();
    }),
  );

  // Localized messages for the browser's native validation bubbles.
  emailInput?.addEventListener('invalid', () => emailInput.setCustomValidity(t('msg.required')));
  messageInput?.addEventListener('invalid', () => {
    if (messageInput.validity.tooShort) messageInput.setCustomValidity(t('msg.too_short'));
  });
  for (const input of [emailInput, messageInput]) {
    input?.addEventListener('input', () => input.setCustomValidity(''));
  }
  onLanguageChange(() => {
    emailInput?.setCustomValidity('');
    messageInput?.setCustomValidity('');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!ENDPOINT) {
      console.error('[contact-form] VITE_CONTACT_ENDPOINT is not set (see .env.example)');
      showFeedback('error', 'msg.error');
      return;
    }

    // Subjects are kept in Spanish on purpose: they land in my own inbox.
    const activeChip = form.querySelector('.subject-chip.active');
    const subject =
      activeChip?.dataset.subject === 'custom'
        ? customInput?.value.trim() || 'Contacto Portfolio'
        : (activeChip?.dataset.subject ?? 'Contacto Portfolio');

    const payload = {
      subject,
      email: emailInput.value,
      message: messageInput.value,
      botcheck: botcheck?.checked ?? false,
      lang: getLanguage(),
      requestId,
    };

    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        showFeedback('error', messageKeyFor(result));
        return;
      }

      showFeedback('success', 'msg.success');
      form.reset();
      requestId = crypto.randomUUID(); // next message is a new one
      chips.forEach((c, i) => c.classList.toggle('active', i === 0));
      customWrap?.classList.remove('show');
      setTimeout(() => {
        clearFeedback();
        onSuccess?.();
      }, FEEDBACK_TIMEOUT_MS);
    } catch (error) {
      // Network error or timeout: keep the same requestId so a retry can't duplicate the email.
      console.error('[contact-form]', error);
      showFeedback('error', 'msg.error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
    }
  });
}

export function initContactForms({ drawer } = {}) {
  const drawerForm = document.getElementById('drawer-contact-form');
  const footerForm = document.getElementById('footer-contact-form');
  if (drawerForm) setupForm(drawerForm, { onSuccess: () => drawer?.close() });
  if (footerForm) setupForm(footerForm);
}
