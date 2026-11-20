import { onLanguageChange, t } from '../core/i18n.js';

const ENDPOINT = 'https://api.web3forms.com/submit';
const FEEDBACK_TIMEOUT_MS = 5000;

/**
 * Wires a contact form (subject chips + email + message) to Web3Forms.
 * @param {HTMLFormElement} form
 * @param {{ onSuccess?: () => void }} [options]
 */
function setupForm(form, { onSuccess } = {}) {
  const chips = form.querySelectorAll('.subject-chip');
  const customWrap = form.querySelector('.hidden-custom-subject');
  const customInput = form.querySelector('input[name="custom_subject"]');
  const emailInput = form.querySelector('input[type="email"]');
  const feedback = form.querySelector('.form-feedback');
  const submitBtn = form.querySelector('[type="submit"]');

  const showFeedback = (type, message) => {
    feedback.className = `form-feedback ${type}`;
    feedback.textContent = message;
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

  // Localized validation message for the native email check.
  emailInput?.addEventListener('invalid', () => emailInput.setCustomValidity(t('msg.required')));
  emailInput?.addEventListener('input', () => emailInput.setCustomValidity(''));
  onLanguageChange(() => emailInput?.setCustomValidity(''));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFeedback();

    // Subjects are kept in Spanish on purpose: they land in my own inbox.
    const activeChip = form.querySelector('.subject-chip.active');
    const subject =
      activeChip?.dataset.subject === 'custom'
        ? customInput?.value.trim() || 'Contacto Portfolio'
        : (activeChip?.dataset.subject ?? 'Contacto Portfolio');

    const data = new FormData(form);
    data.set('subject', `[Portfolio] - ${subject}`);
    data.set('email', emailInput.value);
    data.set('motivo', subject);

    submitBtn.disabled = true;
    try {
      const response = await fetch(ENDPOINT, { method: 'POST', body: data });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Web3Forms error');

      showFeedback('success', t('msg.success'));
      form.reset();
      chips.forEach((c, i) => c.classList.toggle('active', i === 0));
      customWrap?.classList.remove('show');
      setTimeout(() => {
        clearFeedback();
        onSuccess?.();
      }, FEEDBACK_TIMEOUT_MS);
    } catch (error) {
      console.error('[contact-form]', error);
      showFeedback('error', t('msg.error'));
    } finally {
      submitBtn.disabled = false;
    }
  });
}

export function initContactForms({ drawer } = {}) {
  const drawerForm = document.getElementById('drawer-contact-form');
  const footerForm = document.getElementById('footer-contact-form');
  if (drawerForm) setupForm(drawerForm, { onSuccess: () => drawer?.close() });
  if (footerForm) setupForm(footerForm);
}
