import { describe, expect, it } from "vitest";
import {
  countPasswordRules,
  isPasswordPolicySatisfied,
  PASSWORD_MAX_UTF8_BYTES,
  PASSWORD_MIN_LENGTH,
} from "../core/application/auth/password-policy";

describe("password policy used by patient forms", () => {
  it("accepts passwords with at least 8 characters and two complexity classes", () => {
    expect(isPasswordPolicySatisfied("abcdef12")).toBe(true);
    expect(isPasswordPolicySatisfied("abc12345-more-than-eight")).toBe(true);
  });

  it("does not require all four complexity classes", () => {
    expect(countPasswordRules("abcdefgh1234")).toBe(2);
    expect(isPasswordPolicySatisfied("abcdefgh1234")).toBe(true);
  });

  it("rejects fewer than 8 characters and a single complexity class", () => {
    expect(isPasswordPolicySatisfied("abc123")).toBe(false);
    expect(isPasswordPolicySatisfied("abcdefgh")).toBe(false);
  });

  it("enforces bcrypt's 72-byte UTF-8 limit, not just character count", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_MAX_UTF8_BYTES).toBe(72);
    expect(isPasswordPolicySatisfied("á".repeat(40) + "A1!")).toBe(false);
    expect(isPasswordPolicySatisfied("Abcdef12!")).toBe(true);
  });
});
