import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User, TokenPair } from "@vitare/core-typings";
import { REQUIRED_LEGAL_DOCUMENTS } from "@vitare/core-typings";
import { createAuthUseCases } from "../core/application/auth/use-cases/auth.use-cases";
import type { AuthPorts, OfflineCachePort, SessionPort } from "../core/application/auth/ports/auth-ports";

const tokens: TokenPair = { accessToken: "new-access", refreshToken: "new-refresh" };
const profile: User = { id: "user-new", fullName: "Teste", email: "teste@hotmail.com", avatarUrl: null, birthDate: null, bloodType: null, weightKg: null, heightCm: null, cpf: null, phone: null, address: null };

describe("authentication session ordering", () => {
  beforeEach(() => { window.history.replaceState({}, "", "/login"); });

  it("saves new tokens before requesting the fresh profile and scopes cache to that user", async () => {
    const events: string[] = [];
    let accessToken: string | null = "old-access";
    let refreshToken: string | null = "old-refresh";
    let storedProfile: User | null = { ...profile, id: "old-user" };
    let cacheScope = "old-user";
    const session: SessionPort = {
      getAccessToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      save: (pair) => { accessToken = pair.accessToken; refreshToken = pair.refreshToken; events.push("save-tokens"); },
      clear: () => { accessToken = null; refreshToken = null; storedProfile = null; events.push("session-clear"); },
      saveProfile: (user) => { storedProfile = user; events.push("save-profile"); },
      getProfile: () => storedProfile,
    };
    const cache: OfflineCachePort = {
      clear: async () => { cacheScope = "anonymous"; events.push("cache-clear"); },
      setUserScope: (userId) => { cacheScope = userId; events.push(`scope:${userId}`); },
    };
    const accepted = REQUIRED_LEGAL_DOCUMENTS.map((doc) => ({ actType: doc.actType, documentVersion: doc.version, contentHash: doc.contentHash }));
    const ports: AuthPorts = {
      login: vi.fn(async () => tokens),
      register: vi.fn(async () => tokens),
      completeGoogleLogin: vi.fn(async () => tokens),
      getProfile: vi.fn(async () => profile),
      getFreshProfile: vi.fn(async () => { events.push("fresh-profile"); expect(accessToken).toBe("new-access"); return profile; }),
      refreshToken: vi.fn(async () => tokens),
      listLegalAcceptances: vi.fn(async () => accepted),
    };
    const useCases = createAuthUseCases(ports, session, cache);
    await expect(useCases.login(profile.email, "Abcdef12!")).resolves.toEqual(profile);
    expect(events.indexOf("save-tokens")).toBeLessThan(events.indexOf("fresh-profile"));
    expect(events.indexOf("fresh-profile")).toBeLessThan(events.indexOf("cache-clear"));
    expect(cacheScope).toBe("user-new");
  });

  it("clears a partially-created session if the fresh profile request fails", async () => {
    let accessToken: string | null = null;
    const session: SessionPort = {
      getAccessToken: () => accessToken,
      getRefreshToken: () => null,
      save: (pair) => { accessToken = pair.accessToken; },
      clear: () => { accessToken = null; },
      saveProfile: () => undefined,
      getProfile: () => null,
    };
    const cache: OfflineCachePort = { clear: async () => undefined, setUserScope: () => undefined };
    const ports: AuthPorts = {
      login: async () => tokens, register: async () => tokens, completeGoogleLogin: async () => tokens,
      getProfile: async () => profile, getFreshProfile: async () => { throw new Error("profile failed"); },
      refreshToken: async () => tokens, listLegalAcceptances: async () => [],
    };
    const useCases = createAuthUseCases(ports, session, cache);
    await expect(useCases.login(profile.email, "Abcdef12!")).rejects.toThrow("profile failed");
    expect(session.getAccessToken()).toBeNull();
  });
});
