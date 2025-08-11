// Netlify Function: GET /api/metrics
// Optional query: ?path=/only/this/path

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }
  if (event.httpMethod !== "GET") return json(405, { error: "Method Not Allowed" });

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return json(500, { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY" });
  }

  const url = new URL(event.rawUrl || "https://dummy.local/");
  const pathFilter = url.searchParams.get("path"); // optional
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "1000", 10), 5000);

  const base = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/pageview_counts`;
  const params = new URLSearchParams();
  params.set("select", "*");
  params.set("order", "day.desc");
  params.set("limit", String(limit));
  if (pathFilter) params.set("path", `eq.${pathFilter}`);

  const endpoint = `${base}?${params.toString()}`;

  const resp = await fetch(endpoint, {
    method: "GET",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    const detail = await resp.text();
    return json(resp.status, { error: "Supabase read failed", detail });
  }

  const data = await resp.json();
  return json(200, { rows: data.length, data });
};
