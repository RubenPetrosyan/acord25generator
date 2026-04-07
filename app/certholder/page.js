"use client";
import { useState } from "react";

/* ── Mini read-only field ─────────────────────────────────────────── */
function ReadRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#94a3b8" }}>{label}</span>
      <span style={{ fontSize: "0.85rem", color: "#1e293b", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function PolicyCard({ title, icon, rows }) {
  const hasData = rows.some(r => r.value);
  if (!hasData) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "0.9rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.65rem", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
        <span style={{ fontSize: "1rem" }}>{icon}</span>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6366f1" }}>{title}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.5rem" }}>
        {rows.map(r => <ReadRow key={r.label} {...r} />)}
      </div>
    </div>
  );
}

/* ── CertHolder form ──────────────────────────────────────────────── */
function CertHolderForm({ record, onBack }) {
  const [cert, setCert] = useState({
    name: "", line1: "", city: "", state: "", zip: ""
  });
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [saved,   setSaved]   = useState(false);

  const fd = record.formData;
  const ins = fd?.insured || {};
  const gl  = fd?.policies?.general_liability || {};
  const au  = fd?.policies?.auto_liability || {};
  const wc  = fd?.policies?.workers_comp || {};
  const insA = fd?.insurers?.[0] || {};

  function field(label, key) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748b" }}>{label}</span>
        <input
          value={cert[key]}
          onChange={e => setCert(p => ({ ...p, [key]: e.target.value }))}
          style={{
            border: "1px solid #c7d2fe", borderRadius: 7,
            padding: "0.42rem 0.6rem", fontSize: "0.85rem",
            background: "#f8fafc", outline: "none", width: "100%",
            transition: "border-color 0.15s, box-shadow 0.15s"
          }}
          onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; e.target.style.background = "#fff"; }}
          onBlur={e  => { e.target.style.borderColor = "#c7d2fe"; e.target.style.boxShadow = "none"; e.target.style.background = "#f8fafc"; }}
        />
      </div>
    );
  }

  async function generate(e) {
    e.preventDefault();
    if (!cert.name.trim()) { setError("Please enter the Certificate Holder name."); return; }
    setLoading(true); setResult(null); setError(null); setSaved(false);
    if (result) URL.revokeObjectURL(result);

    const payload = {
      ...fd,
      certificate_holder: {
        name: cert.name,
        address: { line1: cert.line1, city: cert.city, state: cert.state, zip: cert.zip }
      }
    };

    try {
      const [pdfRes] = await Promise.all([
        fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }),
        fetch("/api/sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).then(r => r.json()).then(d => { if (d.success) setSaved(true); }).catch(() => {})
      ]);

      if (!pdfRes.ok) {
        const err = await pdfRes.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error || `Error ${pdfRes.status}`);
      }
      const blob = await pdfRes.blob();
      setResult(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Back */}
      <button type="button" onClick={onBack}
        style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", color: "#6366f1", fontSize: "0.82rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Search again
      </button>

      {/* Insured summary */}
      <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 10, padding: "0.9rem 1rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6366f1", marginBottom: "0.5rem" }}>
          🏢 Insured
        </div>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>{ins.name || "—"}</div>
        <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 2 }}>
          {[ins.address?.line1, ins.address?.city, ins.address?.state, ins.address?.zip].filter(Boolean).join(", ")}
        </div>
      </div>

      {/* Policy summaries */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <PolicyCard title="General Liability" icon="🛡️" rows={[
          { label: "Policy #",   value: gl.policy_number },
          { label: "Effective",  value: gl.effective_date },
          { label: "Expires",    value: gl.expiration_date },
          { label: "Each Occ",   value: gl.limits?.each_occurrence },
          { label: "General Agg",value: gl.limits?.general_aggregate },
          { label: "Insurer",    value: insA.name ? `${insA.name}${insA.naic ? ` (${insA.naic})` : ""}` : "" },
        ]} />
        <PolicyCard title="Automobile Liability" icon="🚗" rows={[
          { label: "Policy #",  value: au.policy_number },
          { label: "Effective", value: au.effective_date },
          { label: "Expires",   value: au.expiration_date },
          { label: "CSL",       value: au.combined_single_limit },
        ]} />
        <PolicyCard title="Workers Compensation" icon="👷" rows={[
          { label: "Policy #",       value: wc.policy_number },
          { label: "Effective",      value: wc.effective_date },
          { label: "Expires",        value: wc.expiration_date },
          { label: "Each Accident",  value: wc.each_accident },
        ]} />
      </div>

      {/* Cert Holder form */}
      <div style={{ background: "#fff", border: "2px solid #6366f1", borderRadius: 12, padding: "1rem 1.1rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6366f1", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          Certificate Holder — fill in your information
        </div>
        <form onSubmit={generate} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {field("Company / Name", "name")}
          {field("Address",        "line1")}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.5rem" }}>
            {field("City",  "city")}
            {field("State", "state")}
            {field("ZIP",   "zip")}
          </div>

          {error && (
            <div style={{ fontSize: "0.78rem", color: "#dc2626", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {result && !loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "0.6rem 0.75rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#15803d" }}>
                ✓ PDF ready{saved ? " · saved to records" : ""}
              </span>
              <a href={result} download="acord25-certificate.pdf"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "0.35rem 0.9rem", background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: "0.78rem", borderRadius: 7, textDecoration: "none" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download PDF
              </a>
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "0.65rem", background: loading ? "#94a3b8" : "linear-gradient(135deg,#6366f1,#4f46e5)",
              color: "#fff", fontWeight: 700, fontSize: "0.9rem", borderRadius: 10,
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.35)",
              marginTop: "0.25rem"
            }}>
            {loading ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Generating PDF…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Generate My Certificate
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Portal page ──────────────────────────────────────────────────── */
export default function CertHolderPortal() {
  const [token,     setToken]     = useState("");
  const [searching, setSearching] = useState(false);
  const [error,     setError]     = useState(null);
  const [record,    setRecord]    = useState(null);   // loaded record
  const [notFound,  setNotFound]  = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    const q = token.trim().toUpperCase();
    if (!q) return;
    setSearching(true); setError(null); setNotFound(false); setRecord(null);

    try {
      const res  = await fetch(`/api/sheets?token=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Lookup failed");
      if (data.results.length === 0) { setNotFound(true); return; }
      // Use the most recent matching record
      setRecord(data.results[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 1rem 4rem" }}>

      {/* Brand header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "2rem" }}>
        <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#6366f1,#4f46e5)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b" }}>Certificate Portal</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>ACORD 25 · Certificate of Liability Insurance</div>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* ── ACCESS CODE SCREEN ──────────────────────────────────── */}
        {!record && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "2rem 1.75rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div style={{ width: 52, height: 52, background: "#eef2ff", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h1 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Enter Your Access Code</h1>
              <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.4rem", lineHeight: 1.5 }}>
                Your access code was provided by your insurance producer.<br/>
                Enter it below to retrieve your certificate.
              </p>
            </div>

            <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748b" }}>
                  Access Code
                </label>
                <input
                  value={token}
                  onChange={e => { setToken(e.target.value.toUpperCase()); setNotFound(false); setError(null); }}
                  placeholder="e.g. ACA91040"
                  autoFocus
                  style={{
                    border: "1.5px solid #c7d2fe", borderRadius: 9, padding: "0.65rem 0.85rem",
                    fontSize: "1rem", fontWeight: 700, letterSpacing: "0.12em",
                    color: "#4f46e5", background: "#fafbff", outline: "none",
                    textAlign: "center", textTransform: "uppercase",
                    transition: "border-color 0.15s, box-shadow 0.15s"
                  }}
                  onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
                  onBlur={e  => { e.target.style.borderColor = "#c7d2fe"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              {notFound && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "0.6rem 0.75rem" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span style={{ fontSize: "0.82rem", color: "#b91c1c", fontWeight: 600 }}>Access code not recognized. Please check and try again.</span>
                </div>
              )}

              {error && (
                <div style={{ fontSize: "0.8rem", color: "#dc2626" }}>⚠ {error}</div>
              )}

              <button type="submit" disabled={searching || !token.trim()}
                style={{
                  padding: "0.7rem", background: searching || !token.trim() ? "#94a3b8" : "linear-gradient(135deg,#6366f1,#4f46e5)",
                  color: "#fff", fontWeight: 700, fontSize: "0.95rem",
                  borderRadius: 10, border: "none",
                  cursor: searching || !token.trim() ? "not-allowed" : "pointer",
                  boxShadow: searching || !token.trim() ? "none" : "0 4px 14px rgba(99,102,241,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7
                }}>
                {searching ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Verifying…
                  </>
                ) : "Access My Certificate"}
              </button>
            </form>

            {/* How to find your code */}
            <details style={{ marginTop: "1.25rem" }}>
              <summary style={{ fontSize: "0.78rem", color: "#94a3b8", cursor: "pointer", fontWeight: 600 }}>
                How is my access code formed?
              </summary>
              <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#64748b", lineHeight: 1.6, background: "#f8fafc", borderRadius: 8, padding: "0.65rem 0.75rem" }}>
                Your code = <strong>1st letter of your company name</strong> + <strong>state (2 letters)</strong> + <strong>ZIP code</strong><br/>
                <em>Example: ABC Trucking LLC · CA · 91040 → <strong>ACA91040</strong></em>
              </div>
            </details>
          </div>
        )}

        {/* ── LOADED RECORD ────────────────────────────────────────── */}
        {record && (
          <CertHolderForm record={record} onBack={() => { setRecord(null); setToken(""); }} />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
