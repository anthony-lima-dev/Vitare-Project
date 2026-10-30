import {describe, expect, it} from "vitest"
import { validateSignupPrerequisites } from "./signup-flow";

describe("signup prerequisites", () => {
  it("requires terms and privacy acceptance before email routing", () => {
    const result = validateSignupPrerequisites("", false, false);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toContain("assinale as caixas");
  });
  it("returns the user guidance when Google is clicked before accepting terms", () => {
    const result = validateSignupPrerequisites("person@gmail.com", false, true);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toContain("Termos de Uso");
  });
  it("normalizes local email after acceptance", () => {
    expect(validateSignupPrerequisites(" Person@Hotmail.com ", true, true)).toEqual({
      valid: true, normalizedEmail: "person@hotmail.com", route: "LOCAL",
    });
  });
  it("routes Google domains only after acceptance", () => {
    expect(validateSignupPrerequisites("person@gmail.com", true, true)).toEqual({
      valid: true, normalizedEmail: "person@gmail.com", route: "GOOGLE",
    });
  });
});
