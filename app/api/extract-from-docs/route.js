import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export const runtime = "nodejs";

// ── File-type helpers ──────────────────────────────────────────────────────

function guessMime(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const map = {
    pdf: "application/pdf",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv", txt: "text/plain"
  };
  return map[ext] || "application/octet-stream";
}

function extractDocxText(buffer, filename) {
  const tmp = `/tmp/doc_${Date.now()}_${Math.random().toString(36).slice(2)}.docx`;
  try {
    fs.writeFileSync(tmp, buffer);
    // Extract main document XML from the DOCX ZIP
    const xml = execSync(`unzip -p "${tmp}" word/document.xml 2>/dev/null || true`, {
      timeout: 8000, maxBuffer: 4 * 1024 * 1024
    }).toString();
    // Strip XML tags, decode common entities
    return xml
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ").replace(/&#xA;/g, "\n")
      .replace(/\s+/g, " ").trim()
      || `[Could not extract text from ${filename}]`;
  } catch {
    return `[Could not extract text from ${filename}]`;
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

function extractXlsxText(buffer, filename) {
  const tmp = `/tmp/xl_${Date.now()}_${Math.random().toString(36).slice(2)}.xlsx`;
  try {
    fs.writeFileSync(tmp, buffer);
    // Grab shared strings (cell text) + first sheet XML
    const parts = execSync(
      `unzip -p "${tmp}" xl/sharedStrings.xml xl/worksheets/sheet1.xml 2>/dev/null || true`,
      { timeout: 8000, maxBuffer: 4 * 1024 * 1024 }
    ).toString();
    return parts
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/\s+/g, " ").trim()
      || `[Could not extract text from ${filename}]`;
  } catch {
    return `[Could not extract text from ${filename}]`;
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

// ── Build Claude content blocks from uploaded files ────────────────────────

async function fileToContentBlock(file) {
  const buf  = Buffer.from(await file.arrayBuffer());
  const mime = file.type || guessMime(file.name);

  // Images — send as base64 image blocks
  if (mime.startsWith("image/")) {
    const supportedMimes = ["image/jpeg","image/png","image/gif","image/webp"];
    const safeMime = supportedMimes.includes(mime) ? mime : "image/png";
    return {
      type: "image",
      source: { type: "base64", media_type: safeMime, data: buf.toString("base64") }
    };
  }

  // PDFs — send as base64 document blocks
  if (mime === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") }
    };
  }

  // DOCX
  if (mime.includes("wordprocessingml") || file.name.toLowerCase().endsWith(".docx")) {
    const text = extractDocxText(buf, file.name);
    return { type: "text", text: `[File: ${file.name}]\n${text}` };
  }

  // XLSX
  if (mime.includes("spreadsheetml") || mime.includes("excel") || file.name.toLowerCase().endsWith(".xlsx")) {
    const text = extractXlsxText(buf, file.name);
    return { type: "text", text: `[File: ${file.name}]\n${text}` };
  }

  // CSV / TXT and everything else — send as plain text
  const text = buf.toString("utf8").slice(0, 50000); // 50k char cap
  return { type: "text", text: `[File: ${file.name}]\n${text}` };
}

// ── Extraction prompt ──────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are an expert at reading insurance-related documents and extracting data for an ACORD 25 Certificate of Liability Insurance.

Analyze ALL provided files carefully. Extract every piece of information you can find that matches the ACORD 25 fields below. Return ONLY a valid JSON object — no explanations, no markdown, no extra text.

Use empty string "" for text fields you cannot find. For boolean fields use true/false. For dates use YYYY-MM-DD format. For currency amounts include $ sign if present (e.g. "$1,000,000").

{
  "form": {
    "date": ""
  },
  "producer": {
    "name": "", "phone": "", "fax": "", "email": "",
    "address": { "line1": "", "city": "", "state": "", "zip": "" }
  },
  "insured": {
    "name": "",
    "address": { "line1": "", "city": "", "state": "", "zip": "" }
  },
  "insurers": [
    { "letter": "A", "name": "", "naic": "" },
    { "letter": "B", "name": "", "naic": "" },
    { "letter": "C", "name": "", "naic": "" },
    { "letter": "D", "name": "", "naic": "" },
    { "letter": "E", "name": "", "naic": "" },
    { "letter": "F", "name": "", "naic": "" }
  ],
  "policies": {
    "general_liability": {
      "insurer_letter": "A",
      "occurrence": true,
      "claims_made": false,
      "policy_number": "",
      "effective_date": "",
      "expiration_date": "",
      "limits": {
        "each_occurrence": "",
        "damage_to_rented": "",
        "medical_expense": "",
        "personal_adv": "",
        "general_aggregate": "",
        "products_completed": ""
      }
    },
    "auto_liability": {
      "insurer_letter": "A",
      "any_auto": true,
      "owned_autos": false,
      "hired_autos": false,
      "non_owned_autos": false,
      "policy_number": "",
      "effective_date": "",
      "expiration_date": "",
      "combined_single_limit": ""
    },
    "workers_comp": {
      "insurer_letter": "A",
      "wc_statutory": true,
      "excluded": false,
      "policy_number": "",
      "effective_date": "",
      "expiration_date": "",
      "each_accident": "",
      "disease_policy_limit": "",
      "disease_each_employee": ""
    }
  },
  "endorsements": {
    "additional_insured": false,
    "waiver_of_subrogation": false
  },
  "certificate": {
    "description_of_operations": ""
  },
  "certificate_holder": {
    "name": "",
    "address": { "line1": "", "city": "", "state": "", "zip": "" }
  }
}`;

// ── POST handler ───────────────────────────────────────────────────────────

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  let formData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Could not parse form data" }, { status: 400 });
  }

  const files = formData.getAll("files");
  if (!files || files.length === 0) {
    return Response.json({ error: "No files provided" }, { status: 400 });
  }

  // Convert each file to a Claude content block
  let contentBlocks;
  try {
    contentBlocks = await Promise.all(files.map(f => fileToContentBlock(f)));
  } catch (err) {
    return Response.json({ error: `File processing error: ${err.message}` }, { status: 500 });
  }

  // Build the Claude message
  const messages = [
    {
      role: "user",
      content: [
        ...contentBlocks,
        { type: "text", text: EXTRACTION_PROMPT }
      ]
    }
  ];

  // Call Anthropic API
  let claudeRes;
  try {
    claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25"   // enables native PDF reading
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages
      })
    });
  } catch (err) {
    return Response.json({ error: `Claude API request failed: ${err.message}` }, { status: 502 });
  }

  if (!claudeRes.ok) {
    const errText = await claudeRes.text().catch(() => "");
    return Response.json(
      { error: `Claude API error ${claudeRes.status}: ${errText.slice(0, 300)}` },
      { status: 502 }
    );
  }

  const claudeData = await claudeRes.json();
  const rawText = claudeData?.content?.[0]?.text ?? "";

  // Parse the JSON from Claude's response
  let extracted;
  try {
    // Claude sometimes wraps JSON in markdown code fences — strip them
    const clean = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    extracted = JSON.parse(clean);
  } catch {
    return Response.json(
      { error: "Claude returned non-JSON response", raw: rawText.slice(0, 500) },
      { status: 502 }
    );
  }

  return Response.json({ success: true, extracted });
}
