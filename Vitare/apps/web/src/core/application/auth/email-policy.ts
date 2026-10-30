/**
 * Determina o fluxo de cadastro conforme o domínio do e-mail.
 * Gmail/Googlemail utiliza OAuth do Google; os demais domínios válidos usam
 * autenticação local. A política evita impor uma lista arbitrária de provedores.
 */
export type SignupEmailRoute = "LOCAL" | "GOOGLE" | "INVALID";

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_EMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function resolveSignupEmailRoute(email: string): SignupEmailRoute {
  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_FORMAT_REGEX.test(normalizedEmail)) return "INVALID";

  const domain = normalizedEmail.slice(normalizedEmail.lastIndexOf("@") + 1);
  return GOOGLE_EMAIL_DOMAINS.has(domain) ? "GOOGLE" : "LOCAL";
}
