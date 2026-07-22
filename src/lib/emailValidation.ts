// List of common temporary / disposable email domain names and patterns
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.org',
  'tempmail.com',
  'temp-mail.org',
  'tempmail.net',
  'tempail.com',
  'tempinbox.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'trashmail.com',
  'trashmail.net',
  'throwawaymail.com',
  'dispostable.com',
  'getnada.com',
  'nada.ltd',
  'maildrop.cc',
  'sharklasers.com',
  'burnermail.io',
  'fakeinbox.com',
  'mohmal.com',
  'inboxkitten.com',
  'byom.de',
  'generator.email',
  'mailnesia.com',
  'crazymailing.com',
  'disposable.com',
  'disposablemail.com',
  'mailcatch.com',
  'spambox.us',
  'dayrep.com',
  'einrot.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
  'armyspy.com',
  'cuvox.de',
  'minutemail.com',
  'tempmail.de',
  'temp-mail.ru',
  'mytemp.email',
  'dropmail.me',
  'emkei.cz',
  'fakemailgenerator.com',
  'getairmail.com',
  'dispostable.org',
  'throwaway.com',
  'binkmail.com',
  'safetymail.info',
  'tradermail.info',
  'grr.la',
  'pokehole.ch',
]);

const DISPOSABLE_KEYWORDS = [
  'tempmail',
  'disposable',
  'throwaway',
  'trashmail',
  '10minute',
  'fakeinbox',
  'burnermail',
  'mailinator',
  'guerrillamail',
  'yopmail',
  'fakemail',
];

export interface EmailValidationResult {
  isValid: boolean;
  error: string | null;
}

export function validateEmailProvider(email: string): EmailValidationResult {
  const trimmed = email.trim().toLowerCase();
  
  if (!trimmed) {
    return { isValid: false, error: 'Email address is required' };
  }

  // Basic email syntax check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Invalid email address format' };
  }

  const domain = parts[1];

  // Check known disposable domain set
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: 'Temporary or disposable email addresses are not allowed. Please use a verified provider (e.g. Gmail, Outlook, Yahoo, or your business domain).',
    };
  }

  // Check disposable keyword patterns in domain name
  for (const keyword of DISPOSABLE_KEYWORDS) {
    if (domain.includes(keyword)) {
      return {
        isValid: false,
        error: 'Temporary or disposable email addresses are not allowed. Please use a verified provider (e.g. Gmail, Outlook, Yahoo, or your business domain).',
      };
    }
  }

  return { isValid: true, error: null };
}
