// Netlify Function: POST /api/track
// Body: { "path": "/some/page" }  (optional; will fallback to request URL path)

const ok = (body) => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

const err = (code, body) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") return err(405, { error: "Method Not Allowed" });

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return err(500, { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY" });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return err(400, { error: "Invalid JSON" });
  }

  const url = new URL(event.rawUrl || "https://dummy.local/");
  const path = payload.path || url.pathname || "/";

  const referrer = event.headers["referer"] || null;
  const ua = event.headers["user-agent"] || null;
  const ip =
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["x-forwarded-for"] ||
    event.headers["client-ip"] ||
    null;

  // Insert via PostgREST
  const endpoint = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/pageviews`;
  const row = { path, referrer, ua, ip }; // visited_at defaults in SQL

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    return err(resp.status, { error: "Supabase insert failed", detail });
  }

  const [inserted] = await resp.json();
  return ok({ ok: true, inserted });
};

// redeploy 2025-08-11T17:30:49
