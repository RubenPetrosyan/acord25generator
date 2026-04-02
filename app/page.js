"use client";

import { useState } from "react";
import Acord25Form from "./components/Acord25Form";

export default function Home() {
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved,   setSaved]   = useState(false);  // Google Sheets save status

  async function generate(formData) {
    setLoading(true);
    setResult(null);
    setError(null);
    setSaved(false);

    if (result) URL.revokeObjectURL(result);

    try {
      // Generate PDF and save to Sheets in parallel
      const [pdfRes] = await Promise.all([
        fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        }),
        // Fire-and-forget Sheets save — don't block PDF on it
        fetch("/api/sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        }).then(r => r.json()).then(d => { if (d.success) setSaved(true); }).catch(() => {})
      ]);

      if (!pdfRes.ok) {
        const errBody = await pdfRes.json().catch(() => ({ error: "Unknown server error" }));
        throw new Error(errBody.error || `Server error ${pdfRes.status}`);
      }

      const blob = await pdfRes.blob();
      const url  = URL.createObjectURL(blob);
      setResult(url);
    } catch (err) {
      setError(err.message || "Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "2px solid #e0e7ff"
      }}>
        <div style={{
          width: 38, height: 38,
          background: "linear-gradient(135deg,#6366f1,#4f46e5)",
          borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            ACORD 25 Generator
          </h1>
          <p style={{ fontSize: "0.78rem", color: "#64748b", margin: 0 }}>
            Certificate of Liability Insurance
          </p>
        </div>
      </div>

      {/* Success banner */}
      {result && !loading && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "0.75rem",
          background: "#f0fdf4", border: "1px solid #86efac",
          borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#15803d" }}>
              PDF generated
              {saved && <span style={{ marginLeft: 8, fontSize: "0.78rem", color: "#16a34a" }}>· saved to Google Sheets ✓</span>}
            </span>
          </div>
          <a href={result} download="acord25-filled.pdf"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "0.4rem 1rem", background: "#16a34a", color: "#fff",
              fontWeight: 700, fontSize: "0.8rem", borderRadius: 8, textDecoration: "none"
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
          </a>
        </div>
      )}

      {/* Error banner */}
      {error && !loading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#b91c1c" }}>{error}</span>
        </div>
      )}

      <Acord25Form onSubmit={generate} loading={loading} />
    </main>
  );
}
