/**
 * Validação de senha no cliente alinhada aos padrões padrão da API.
 * O backend permanece autoritativo e pode impor valores configurados por ambiente.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_UTF8_BYTES = 72;
export const PASSWORD_MIN_COMPLEXITY_RULES = 2;

export function countPasswordRules(password: string): number {
  let lowercase = false;
  let uppercase = false;
  let digit = false;
  let special = false;

  for (let index = 0; index < password.length; index += 1) {
    const code = password.charCodeAt(index);
    if (code >= 97 && code <= 122) lowercase = true;
    else if (code >= 65 && code <= 90) uppercase = true;
    else if (code >= 48 && code <= 57) digit = true;
    else if (
      (code >= 33 && code <= 47) ||
      (code >= 58 && code <= 64) ||
      (code >= 91 && code <= 96) ||
      (code >= 123 && code <= 126)
    )
      special = true;
  }

  return (
    Number(lowercase) + Number(uppercase) + Number(digit) + Number(special)
  );
}

export function isPasswordPolicySatisfied(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_UTF8_BYTES)
    return false;
  return countPasswordRules(password) >= PASSWORD_MIN_COMPLEXITY_RULES;
}
