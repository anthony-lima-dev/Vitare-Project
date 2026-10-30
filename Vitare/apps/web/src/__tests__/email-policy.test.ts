import { describe, expect, it } from "vitest";
import { resolveSignupEmailRoute } from "../core/application/auth/email-policy";

describe("patient signup email routing", () => {
  it("allows valid custom and institutional domains for local authentication", () => {
    expect(resolveSignupEmailRoute("person@hospital.org.br")).toBe("LOCAL");
    expect(resolveSignupEmailRoute("  Person@empresa.example  ")).toBe("LOCAL");
  });

  it("routes Gmail and Googlemail to Google OAuth", () => {
    expect(resolveSignupEmailRoute("person@gmail.com")).toBe("GOOGLE");
    expect(resolveSignupEmailRoute("PERSON@GOOGLEMAIL.COM")).toBe("GOOGLE");
  });

  it("rejects malformed addresses", () => {
    expect(resolveSignupEmailRoute("not-an-email")).toBe("INVALID");
    expect(resolveSignupEmailRoute("person@localhost")).toBe("INVALID");
  });
});
