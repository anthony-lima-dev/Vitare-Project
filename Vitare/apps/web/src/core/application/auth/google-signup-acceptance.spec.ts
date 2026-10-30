import { beforeEach, describe, expect, it, vi } from "vitest";
import { REQUIRED_LEGAL_DOCUMENTS } from "@vitare/core-typings";
import { PENDING_GOOGLE_SIGNUP_ACCEPTANCES_KEY, recordPendingGoogleSignupAcceptances } from "./google-signup-acceptance";

describe("recordPendingGoogleSignupAcceptances", () => {
  let values: Map<string,string>;
  let storage: Pick<Storage,"getItem"|"removeItem">;
  const api = { listByHolder: vi.fn(), record: vi.fn() };
  beforeEach(() => {
    values = new Map();
    storage = { getItem: (key) => values.get(key) ?? null, removeItem: (key) => { values.delete(key); } };
    vi.clearAllMocks();
  });
  it("does nothing when no signup acceptance is waiting for OAuth", async () => {
    await expect(recordPendingGoogleSignupAcceptances("u1", api as never, storage)).resolves.toBe(false);
    expect(api.record).not.toHaveBeenCalled();
  });
  it("records current accepted documents after OAuth and removes the pending marker", async () => {
    values.set(PENDING_GOOGLE_SIGNUP_ACCEPTANCES_KEY, JSON.stringify(REQUIRED_LEGAL_DOCUMENTS.map((d) => ({ actType:d.actType, documentVersion:d.version, contentHash:d.contentHash }))));
    api.listByHolder.mockResolvedValue({data:[]});
    api.record.mockResolvedValue({data:{}});
    await expect(recordPendingGoogleSignupAcceptances("u1",api as never,storage)).resolves.toBe(true);
    expect(api.record).toHaveBeenCalledTimes(REQUIRED_LEGAL_DOCUMENTS.length);
    expect(values.has(PENDING_GOOGLE_SIGNUP_ACCEPTANCES_KEY)).toBe(false);
  });
  it("does not record stale document versions", async () => {
    values.set(PENDING_GOOGLE_SIGNUP_ACCEPTANCES_KEY, JSON.stringify([{actType:"TERMS_OF_USE",documentVersion:"old",contentHash:"old"}]));
    await expect(recordPendingGoogleSignupAcceptances("u1",api as never,storage)).rejects.toThrow("documentos foram atualizados");
    expect(api.record).not.toHaveBeenCalled();
  });
});
