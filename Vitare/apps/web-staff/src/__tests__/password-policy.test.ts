import { describe, expect, it } from "vitest";
import { countPasswordRules, isPasswordPolicySatisfied } from "../core/application/auth/password-policy";

describe("password policy used by staff registration", () => {
  it("accepts at least 8 characters with two complexity classes", () => {
    expect(isPasswordPolicySatisfied("abcdef12")).toBe(true);
    expect(isPasswordPolicySatisfied("abc12345-more-than-eight")).toBe(true);
  });

  it("does not require all four complexity classes", () => {
    expect(countPasswordRules("abcdefgh1234")).toBe(2);
    expect(isPasswordPolicySatisfied("abcdefgh1234")).toBe(true);
  });

  it("rejects short, weak and over-72-byte UTF-8 passwords", () => {
    expect(isPasswordPolicySatisfied("abc123")).toBe(false);
    expect(isPasswordPolicySatisfied("abcdefgh")).toBe(false);
    expect(isPasswordPolicySatisfied("á".repeat(40) + "A1!")).toBe(false);
  });
});
