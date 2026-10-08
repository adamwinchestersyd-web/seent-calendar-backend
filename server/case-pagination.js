// Only return a snapshot once Zoho confirms every page has been read.
export async function fetchAllCaseRows({ domain, token, fields, fetchPage, onProgress = () => {} }) {
  const records = new Map();
  const seenTokens = new Set();
  let page = 1;
  let pageToken;
  for (let batch = 1; batch <= 500; batch++) {
    const url = new URL(`${domain}/crm/v8/Cases`);
    url.search = new URLSearchParams({
      fields, per_page: "200", sort_by: "id", sort_order: "asc",
      ...(pageToken ? { page_token: pageToken } : { page: String(page) }),
    }).toString();
    const response = await fetchPage(url.toString(), {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    if (response.status === 204 && batch === 1) return [];
    if (!response.ok) throw new Error(`Case import failed on batch ${batch} (HTTP ${response.status}). Previous calendar retained.`);
    const body = await response.json();
    if (!Array.isArray(body.data) || typeof body.info?.more_records !== "boolean") {
      throw new Error(`Invalid case response on batch ${batch}. Previous calendar retained.`);
    }
    for (const row of body.data) {
      if (!row.id) throw new Error("Case response contains a record without an ID.");
      records.set(String(row.id), row);
    }
    onProgress({ fetched: records.size, pages: batch });
    if (!body.info.more_records) return [...records.values()];
    if (!body.data.length) throw new Error("Zoho returned an empty page with more cases pending.");
    const nextToken = body.info.next_page_token;
    if (nextToken) {
      if (seenTokens.has(nextToken)) throw new Error("Zoho repeated a pagination token. Import stopped safely.");
      seenTokens.add(nextToken);
      pageToken = nextToken;
    } else if (!pageToken && page < 10) {
      page++;
    } else {
      throw new Error("Zoho did not provide a token for the remaining cases. Previous calendar retained.");
    }
  }
  throw new Error("Zoho's 100,000-case pagination limit was reached. Previous calendar retained.");
}
