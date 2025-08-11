const json = (s,b)=>({statusCode:s,headers:{
  "Content-Type":"application/json",
  "Cache-Control":"no-store",
  "Access-Control-Allow-Origin":"*"
},body:JSON.stringify(b)});

exports.handler = async (event) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_MESSAGES_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ADMIN_MESSAGES_KEY) {
    return json(500,{ error:"Missing env vars" });
  }

  // Auth: ?key=... or header X-Admin-Key
  const u = new URL(event.rawUrl);
  const key = event.headers["x-admin-key"] || u.searchParams.get("key");
  if (key !== ADMIN_MESSAGES_KEY) return json(401,{ error:"Unauthorized" });

  const limit = Math.min(parseInt(u.searchParams.get("limit") || "200",10), 1000);

  const endpoint = `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/messages?select=*&order=created_at.desc&limit=${limit}`;
  const r = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Accept: "application/json"
    }
  });

  if (!r.ok) return json(r.status, { error:"Supabase error", detail: await r.text() });

  const rows = await r.json();
  return json(200, { count: rows.length, messages: rows });
};
