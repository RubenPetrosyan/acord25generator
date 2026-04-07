/**
 * ACORD 25 Generator — Google Apps Script
 * ────────────────────────────────────────
 * HOW TO DEPLOY:
 *
 * 1. Open your Google Sheet:
 *    https://docs.google.com/spreadsheets/d/1jSKnMrIBLGamC05xi_9qVTxkt75bbFEb5oUyzNdH_9c
 *
 * 2. Click  Extensions → Apps Script
 *
 * 3. Delete any existing code and paste the entire contents of this file.
 *
 * 4. Click  Deploy → New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    Click Deploy and copy the Web App URL.
 *
 * 5. In Vercel → your project → Settings → Environment Variables, add:
 *    Name:  GOOGLE_SHEETS_SCRIPT_URL
 *    Value: <paste the Web App URL>
 *    Then redeploy (Deployments → ⋮ → Redeploy).
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

const SHEET_ID   = "1jSKnMrIBLGamC05xi_9qVTxkt75bbFEb5oUyzNdH_9c";
const SHEET_NAME = "Sheet1";

// Column layout
const COL_TIMESTAMP    = 0;  // A
const COL_INSURED_NAME = 1;  // B
const COL_CERT_HOLDER  = 2;  // C
const COL_FORM_JSON    = 3;  // D

const HEADERS = ["Timestamp", "Insured Name", "Certificate Holder", "Form Data (JSON)"];

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
}

// ── GET — search by insured name ──────────────────────────────────────────
function doGet(e) {
  const action      = (e.parameter.action || "search").toLowerCase();
  const insuredName = (e.parameter.insuredName || "").trim().toLowerCase();

  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return json({ success: true, results: [] });
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const results = [];

  for (const row of data) {
    const rowName = String(row[COL_INSURED_NAME] || "").toLowerCase();
    // Empty insuredName = return ALL rows (used by token/certholder search)
    if (insuredName === "" || rowName.includes(insuredName)) {
      let formData = {};
      try { formData = JSON.parse(row[COL_FORM_JSON]); } catch {}
      results.push({
        timestamp:    row[COL_TIMESTAMP],
        insuredName:  row[COL_INSURED_NAME],
        certHolder:   row[COL_CERT_HOLDER],
        formData
      });
    }
  }

  // Most recent first
  results.reverse();

  return json({ success: true, results });
}

// ── POST — append a new row ───────────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    const sheet = getSheet();
    ensureHeaders(sheet);

    const insuredName = payload?.insured?.name || "";
    const certHolder  = payload?.certificate_holder?.name || "";

    sheet.appendRow([
      new Date().toISOString(),
      insuredName,
      certHolder,
      JSON.stringify(payload)
    ]);

    return json({ success: true });
  } catch (err) {
    return json({ success: false, error: err.message });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
