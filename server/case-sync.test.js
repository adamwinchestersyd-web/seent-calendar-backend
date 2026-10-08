import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { fetchAllCaseRows } from "./case-pagination.js";

const response = (data, more = false, token) => ({
  ok: true, status: 200,
  json: async () => ({ data, info: { more_records: more, next_page_token: token } }),
});
const options = {
  domain: "https://example.com", token: "test-only", fields: "id,Subject",
};

test("fetches beyond the previous 5,000-case cap, using continuation tokens", async () => {
  let calls = 0;
  const rows = await fetchAllCaseRows({
    ...options,
    fetchPage: async url => {
      const query = new URL(url).searchParams;
      assert.equal(query.get("sort_by"), "id");
      if (calls) {
        assert.equal(query.get("page_token"), `next-${calls}`);
        assert.equal(query.has("page"), false);
      }
      const data = Array.from({ length: 200 }, (_, i) => ({ id: String(calls * 200 + i) }));
      calls++;
      return response(data, calls < 27, `next-${calls}`);
    },
  });
  assert.equal(calls, 27);
  assert.equal(rows.length, 5400);
});

test("honours more_records even on short pages and deduplicates IDs", async () => {
  let calls = 0;
  const rows = await fetchAllCaseRows({
    ...options, fetchPage: async () => ++calls === 1
      ? response([{ id: "1" }], true, "next")
      : response([{ id: "1" }, { id: "2" }]),
  });
  assert.equal(rows.length, 2);
});

test("supports page numbers until Zoho provides a token", async () => {
  let calls = 0;
  await fetchAllCaseRows({
    ...options, fetchPage: async url => {
      calls++;
      assert.equal(new URL(url).searchParams.get("page"), String(calls));
      return response([{ id: String(calls) }], calls < 3);
    },
  });
  assert.equal(calls, 3);
});

test("rejects failed pages rather than returning a partial import", async () => {
  let calls = 0;
  await assert.rejects(fetchAllCaseRows({
    ...options, fetchPage: async () => ++calls === 1
      ? response([{ id: "1" }], true, "next")
      : { ok: false, status: 429 },
  }), /batch 2.*429/);
});

test("rejects missing and repeated pagination tokens", async () => {
  await assert.rejects(fetchAllCaseRows({
    ...options, fetchPage: async () => response([{ id: "1" }], true, "same"),
  }), /repeated/);
  await assert.rejects(fetchAllCaseRows({
    ...options, fetchPage: async () => response([{ id: "1" }], true),
  }), /did not provide a token/);
});

test("handles empty module; rejects malformed responses and network failure", async () => {
  assert.deepEqual(await fetchAllCaseRows({
    ...options, fetchPage: async () => ({ ok: true, status: 204 }),
  }), []);
  await assert.rejects(fetchAllCaseRows({
    ...options, fetchPage: async () => ({ ok: true, status: 200, json: async () => ({}) }),
  }), /Invalid case response/);
  await assert.rejects(fetchAllCaseRows({
    ...options, fetchPage: async () => { throw new Error("timeout"); },
  }), /timeout/);
});

// Exercise the actual server refresh functions without starting a server,
// reading credentials, contacting Zoho, or modifying the calendar's data file.
const server = await readFile(new URL("./index.js", import.meta.url), "utf8");
const refreshCode = server.slice(server.indexOf("let activeRefresh = null;"), server.indexOf("// ROUTES"));
function harness(overrides = {}) {
  const context = vm.createContext({
    console: { log() {}, error() {} },
    CASES_CACHE: { events: [{ id: "old" }, { id: "manual", isManual: true }], lastUpdated: 1 },
    _cacheReady: Promise.resolve(), CASES_PATH: "unused",
    fetchCasesFromZoho: async () => [{ id: "new" }],
    fetchManualEntries: async () => [{ id: "manual", isManual: true }],
    pruneOld: items => items,
    writeJSONAtomic: async () => {},
    ...overrides,
  });
  vm.runInContext(refreshCode + "\n globalThis.refresh = refreshCases; globalThis.status = () => SYNC_STATUS;", context);
  return context;
}

test("failed case import leaves the previous snapshot and timestamp intact", async () => {
  const h = harness({ fetchCasesFromZoho: async () => { throw new Error("page failed"); } });
  const before = h.CASES_CACHE;
  assert.equal((await h.refresh()).ok, false);
  assert.equal(h.CASES_CACHE, before);
  assert.equal(h.status().state, "failed");
});

test("failed disk write cannot publish a replacement snapshot", async () => {
  const h = harness({ writeJSONAtomic: async () => { throw new Error("disk full"); } });
  const before = h.CASES_CACHE;
  assert.equal((await h.refresh()).ok, false);
  assert.equal(h.CASES_CACHE, before);
});

test("concurrent refresh requests share one import and return counts", async () => {
  let imports = 0;
  const h = harness({ fetchCasesFromZoho: async () => { imports++; return [{ id: "new" }]; } });
  const first = h.refresh();
  assert.equal(h.refresh(), first);
  const result = await first;
  assert.equal(imports, 1);
  assert.equal(result.casesFetched, 1);
  assert.equal(result.count, 2);
  assert.equal(h.status().state, "complete");
});

test("manual-entry failure keeps manual entries and reports a warning", async () => {
  const h = harness({ fetchManualEntries: async () => { throw new Error("unavailable"); } });
  const result = await h.refresh();
  assert.equal(result.ok, true);
  assert.equal(result.warnings.length, 1);
  assert.equal(h.CASES_CACHE.events.find(e => e.isManual).id, "manual");
});
