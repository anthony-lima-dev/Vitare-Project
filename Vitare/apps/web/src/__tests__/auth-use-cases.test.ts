import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User, TokenPair } from "@vitare/core-typings";
import { REQUIRED_LEGAL_DOCUMENTS } from "@vitare/core-typings";
import { createAuthUseCases } from "../core/application/auth/use-cases/auth.use-cases";
import type { AuthPorts, SessionPort, OfflineCachePort } from "../core/application/auth/ports/auth-ports";

const tokens: TokenPair = { accessToken: "fresh-access", refreshToken: "fresh-refresh" };
const user: User = {
  id: "new-user", fullName: "Test User", email: "user@example.com", avatarUrl: null,
  birthDate: null, bloodType: null, weightKg: null, heightCm: null, cpf: null, phone: null, address: null,
};

function buildFixture(profileShouldFail = false, previousUserId = "old-user") {
  const events: string[] = [];
  let accessToken: string | null = "old-access";
  let refreshToken: string | null = "old-refresh";
  let profile: User | null = { ...user, id: previousUserId };
  let currentScope = previousUserId;
  const session: SessionPort = {
    getAccessToken: () => accessToken,
    getRefreshToken: () => refreshToken,
    save: (value) => { events.push("session.save-tokens"); accessToken = value.accessToken; refreshToken = value.refreshToken; },
    clear: () => { events.push("session.clear"); accessToken = null; refreshToken = null; profile = null; },
    saveProfile: (value) => { events.push("session.save-profile"); profile = value; },
    getProfile: () => profile,
  };
  const offlineCache: OfflineCachePort = {
    clear: async () => { events.push("cache.clear"); currentScope = "anonymous"; },
    setUserScope: (userId) => { events.push(`cache.scope:${userId}`); currentScope = userId; },
  };
  const acceptedActs = REQUIRED_LEGAL_DOCUMENTS.map((doc) => ({
    actType: doc.actType, documentVersion: doc.version, contentHash: doc.contentHash,
  }));
  const ports: AuthPorts = {
    login: vi.fn(async () => { events.push("api.login"); return tokens; }),
    register: vi.fn(async () => { events.push("api.register"); return tokens; }),
    completeGoogleLogin: vi.fn(async () => { events.push("api.google"); return tokens; }),
    getProfile: vi.fn(async () => user),
    getFreshProfile: vi.fn(async () => {
      events.push("api.fresh-profile");
      expect(accessToken).toBe(tokens.accessToken);
      expect(refreshToken).toBe(tokens.refreshToken);
      if (profileShouldFail) throw new Error("profile unavailable");
      return user;
    }),
    refreshToken: vi.fn(async () => tokens),
    listLegalAcceptances: vi.fn(async () => acceptedActs),
  };
  return { events, session, offlineCache, ports, getScope: () => currentScope, cases: createAuthUseCases(ports, session, offlineCache) };
}

describe("patient authentication session establishment", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/login");
  });

  it("persists new tokens, fetches a fresh profile and clears a different account cache", async () => {
    const fixture = buildFixture();
    const result = await fixture.cases.login("user@example.com", "correct-password");
    expect(result.id).toBe("new-user");
    expect(fixture.events.indexOf("api.login")).toBeLessThan(fixture.events.indexOf("session.clear"));
    expect(fixture.events.indexOf("session.save-tokens")).toBeLessThan(fixture.events.indexOf("api.fresh-profile"));
    expect(fixture.events.indexOf("api.fresh-profile")).toBeLessThan(fixture.events.indexOf("cache.clear"));
    expect(fixture.events.indexOf("cache.clear")).toBeLessThan(fixture.events.indexOf("cache.scope:new-user"));
    expect(fixture.getScope()).toBe("new-user");
  });

  it("preserves the offline cache when the user reauthenticates as the same account", async () => {
    const fixture = buildFixture(false, "new-user");
    await fixture.cases.login("user@example.com", "correct-password");
    expect(fixture.events).not.toContain("cache.clear");
    expect(fixture.getScope()).toBe("new-user");
  });

  it("uses the same safe session sequence for registration and Google exchange", async () => {
    const registerFixture = buildFixture();
    await registerFixture.cases.register("Test User", "user@example.com", "correct-password");
    expect(registerFixture.events.indexOf("session.save-tokens")).toBeLessThan(registerFixture.events.indexOf("api.fresh-profile"));

    const googleFixture = buildFixture();
    await googleFixture.cases.completeGoogleLogin("one-time-code");
    expect(googleFixture.events.indexOf("session.save-tokens")).toBeLessThan(googleFixture.events.indexOf("api.fresh-profile"));
  });

  it("clears the new session if the fresh profile cannot be loaded", async () => {
    const fixture = buildFixture(true);
    await expect(fixture.cases.login("user@example.com", "correct-password")).rejects.toThrow("profile unavailable");
    expect(fixture.session.getAccessToken()).toBeNull();
    expect(fixture.session.getRefreshToken()).toBeNull();
  });
});
