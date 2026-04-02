export const runtime = "nodejs";

// Set GOOGLE_SHEETS_SCRIPT_URL in your Vercel environment variables.
// See docs/google-apps-script.js for the script to deploy.
const SCRIPT_URL = process.env.GOOGLE_SHEETS_SCRIPT_URL;

function notConfigured() {
  return new Response(
    JSON.stringify({ success: false, error: "GOOGLE_SHEETS_SCRIPT_URL not configured" }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}

/** GET /api/sheets?insuredName=... — search history */
export async function GET(req) {
  if (!SCRIPT_URL) return notConfigured();

  const { searchParams } = new URL(req.url);
  const insuredName = searchParams.get("insuredName") ?? "";

  try {
    const url = `${SCRIPT_URL}?action=search&insuredName=${encodeURIComponent(insuredName)}`;
    const res = await fetch(url, { redirect: "follow" });
    const text = await res.text();
    // Apps Script sometimes returns HTML on error — parse safely
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
    // Apps Script doPost reads e.postData.contents — send as text/plain
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
