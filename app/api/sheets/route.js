export const runtime = "nodejs";

const SCRIPT_URL = process.env.GOOGLE_SHEETS_SCRIPT_URL;

function notConfigured() {
  return new Response(
    JSON.stringify({ success: false, error: "GOOGLE_SHEETS_SCRIPT_URL not configured" }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Build the access token for a stored record.
 * Token = (first letter of insured name) + (state, uppercase) + (zip)
 * Example: "ABC TRUCKING LLC", CA, 91040  →  "ACA91040"
 */
function computeToken(formData) {
  const name  = (formData?.insured?.name  || "").trim();
  const state = (formData?.insured?.address?.state || "").trim().toUpperCase();
  const zip   = (formData?.insured?.address?.zip   || "").trim();
  const first = name[0]?.toUpperCase() || "";
  return first + state + zip;
}

/**
 * GET /api/sheets
 *
 * Two modes — supply exactly one query param:
 *   ?insuredName=...   full-text search (used by the internal admin form)
 *   ?token=...         access-code search for the /certholder portal
 *                      e.g. token=ACA91040  (firstLetter + state + zip)
 */
export async function GET(req) {
  if (!SCRIPT_URL) return notConfigured();

  const { searchParams } = new URL(req.url);
  const token       = searchParams.get("token");
  const insuredName = searchParams.get("insuredName") ?? "";

  try {
    // ── Token search (certholder portal) ─────────────────────────────────
    if (token !== null) {
      const needle = token.trim().toUpperCase();
      if (!needle) {
        return Response.json({ success: true, results: [] });
      }

      // Fetch ALL records from Apps Script, then filter client-side by token
      const url  = `${SCRIPT_URL}?action=search&insuredName=`;   // empty = all rows
      const res  = await fetch(url, { redirect: "follow" });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { success: false, error: text }; }
      if (!data.success) return Response.json(data);

      const matched = (data.results || []).filter(rec => {
        const tok = computeToken(rec.formData);
        return tok === needle;
      });

      return Response.json({ success: true, results: matched });
    }

    // ── Name search (admin form) ──────────────────────────────────────────
    const url  = `${SCRIPT_URL}?action=search&insuredName=${encodeURIComponent(insuredName)}`;
    const res  = await fetch(url, { redirect: "follow" });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { success: false, error: text }; }
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/** POST /api/sheets — append a new row */
export async function POST(req) {
  if (!SCRIPT_URL) return notConfigured();

  try {
    const formData = await req.json();
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(formData)
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { success: false, error: text }; }
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
