import { resolveSignupEmailRoute, type SignupEmailRoute } from "./email-policy";

export type SignupPrerequisiteResult =
  | { valid: true; normalizedEmail: string; route: Exclude<SignupEmailRoute, "INVALID"> }
  | { valid: false; message: string };

export function validateSignupPrerequisites(
  email: string,
  acceptedTerms: boolean,
  acceptedPrivacy: boolean,
): SignupPrerequisiteResult {
  if (!acceptedTerms || !acceptedPrivacy) {
    return {
      valid: false,
      message: "Antes de continuar, assinale as caixas de aceitação dos Termos de Uso e do Aviso de Privacidade.",
    };
  }
  const normalizedEmail = email.trim().toLowerCase();
  const route = resolveSignupEmailRoute(normalizedEmail);
  if (route === "INVALID") {
    return { valid: false, message: "Informe um endereço de e-mail válido." };
  }
  return { valid: true, normalizedEmail, route };
}
