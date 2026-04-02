"use client";
import { useState } from "react";

const emptyAddress = { line1: "", city: "", state: "", zip: "" };

const defaultForm = () => ({
  form: { date: new Date().toISOString().split("T")[0] },
  producer: { name: "", phone: "", fax: "", email: "", address: { ...emptyAddress } },
  insured:  { name: "", address: { ...emptyAddress } },
  insurers: ["A","B","C","D","E","F"].map(letter => ({ letter, name: "", naic: "" })),
  policies: {
    general_liability: {
      insurer_letter: "A", occurrence: true, claims_made: false,
      policy_number: "", effective_date: "", expiration_date: "",
      limits: {
        each_occurrence: "", damage_to_rented: "", medical_expense: "",
        personal_adv: "", general_aggregate: "", products_completed: ""
      }
    },
    auto_liability: {
      insurer_letter: "A", any_auto: true, owned_autos: false,
      hired_autos: false, non_owned_autos: false,
      policy_number: "", effective_date: "", expiration_date: "",
      combined_single_limit: ""
    },
    workers_comp: {
      insurer_letter: "A", wc_statutory: true, excluded: false,
      policy_number: "", effective_date: "", expiration_date: "",
      each_accident: "", disease_policy_limit: "", disease_each_employee: ""
    }
  },
  endorsements: { additional_insured: false, waiver_of_subrogation: false },
  certificate: { description_of_operations: "" },
  certificate_holder: { name: "", address: { ...emptyAddress } },
  signature: { authorized_representative: "" }
});

/* ── Primitives ──────────────────────────────────────────────────────── */

function Field({ label, children }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}

function CheckItem({ label, checked, onChange, disabled }) {
  return (
    <label className="check-item" style={{ opacity: disabled ? 0.5 : 1 }}>
      <input type="checkbox" checked={checked} disabled={disabled}
        onChange={e => !disabled && onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function InsurerSelect({ value, onChange, disabled }) {
  return (
    <div className="insurer-select">
      <span>Insurer</span>
      <select value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
        {["A","B","C","D","E","F"].map(l => <option key={l} value={l}>{l}</option>)}
      </select>
    </div>
  );
}

/* ── Main Form ───────────────────────────────────────────────────────── */

export default function Acord25Form({ onSubmit, loading }) {
  const [form, setForm] = useState(defaultForm());

  // search state
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searching,     setSearching]     = useState(false);
  const [searchResults, setSearchResults] = useState(null); // null = pristine
  const [searchError,   setSearchError]   = useState(null);

  // lock state — true when a history record is loaded
  const [locked,        setLocked]        = useState(false);
  const [lockedRecord,  setLockedRecord]  = useState(null);

  /* Helpers */
  function getValue(path) {
    return path.split(".").reduce((o, k) => o?.[k], form);
  }

  function update(path, value) {
    const keys = path.split(".");
    const copy = structuredClone(form);
    let o = copy;
    keys.slice(0, -1).forEach(k => (o = o[k]));
    o[keys.at(-1)] = value;
    setForm(copy);
  }

  /* dis(section) — returns true if inputs in that section should be disabled */
  function dis(section) {
    return locked && section !== "cert_holder";
  }

  function submit(e) {
    e.preventDefault();
    if (!loading) onSubmit(form);
  }

  /* Search */
  async function handleSearch(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults(null);
    setSearchError(null);
    try {
      const res  = await fetch(`/api/sheets?insuredName=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Search failed");
      setSearchResults(data.results);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  function loadRecord(rec) {
    setForm(structuredClone(rec.formData));
    setLocked(true);
    setLockedRecord(rec);
    setSearchResults(null);
    setSearchQuery("");
  }

  function clearLock() {
    setLocked(false);
    setLockedRecord(null);
    setForm(defaultForm());
  }

  /* Shorthand builders */
  const txt = (path, placeholder = "", section = "other") => (
    <input className="input" placeholder={placeholder}
      value={getValue(path) ?? ""}
      disabled={dis(section)}
      style={dis(section) ? { opacity: 0.55, cursor: "not-allowed" } : {}}
      onChange={e => update(path, e.target.value)} />
  );

  const dateInput = (path, section = "other") => (
    <input className="input" type="date"
      value={getValue(path) ?? ""}
      disabled={dis(section)}
      style={dis(section) ? { opacity: 0.55, cursor: "not-allowed" } : {}}
      onChange={e => update(path, e.target.value)} />
  );

  const policyRow = (base, section = "other") => (
    <div className="grid-3" style={{ marginTop: "0.5rem" }}>
      <Field label="Policy Number">{txt(`${base}.policy_number`, "", section)}</Field>
      <Field label="Effective Date">{dateInput(`${base}.effective_date`, section)}</Field>
      <Field label="Expiration Date">{dateInput(`${base}.expiration_date`, section)}</Field>
    </div>
  );

  /* ── RENDER ──────────────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

      {/* ── SEARCH BAR ────────────────────────────────────────────── */}
      <div className="section" style={{ background: "#fafbff", borderColor: "#c7d2fe" }}>
        <div className="section-title" style={{ marginBottom: "0.75rem" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Search History
        </div>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem" }}>
          <input className="input" placeholder="Search by Insured Name…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1 }} />
          <button type="submit" disabled={searching || !searchQuery.trim()}
            style={{
              padding: "0.42rem 1rem",
              background: searching ? "#94a3b8" : "#6366f1",
              color: "#fff", fontWeight: 700, fontSize: "0.82rem",
              borderRadius: 7, border: "none",
              cursor: searching ? "not-allowed" : "pointer",
              whiteSpace: "nowrap", flexShrink: 0
            }}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {/* Search error */}
        {searchError && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#dc2626", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {searchError === "GOOGLE_SHEETS_SCRIPT_URL not configured"
              ? "Google Sheets not connected yet — see setup instructions."
              : searchError}
          </div>
        )}

        {/* Search results */}
        {searchResults !== null && (
          <div style={{ marginTop: "0.65rem" }}>
            {searchResults.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>No records found.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>
                  {searchResults.length} record{searchResults.length !== 1 ? "s" : ""} found — click to load
                </p>
                {searchResults.slice(0, 8).map((rec, i) => (
                  <button key={i} type="button" onClick={() => loadRecord(rec)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      background: "#fff", border: "1px solid #c7d2fe", borderRadius: 8,
                      cursor: "pointer", textAlign: "left", width: "100%",
                      transition: "border-color 0.1s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#6366f1"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#c7d2fe"}
                  >
                    <div>
                      <div style={{ fontSize: "0.83rem", fontWeight: 700, color: "#1e293b" }}>
                        {rec.insuredName || "—"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                        Cert Holder: {rec.certHolder || "—"}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", flexShrink: 0, marginLeft: "1rem" }}>
                      {rec.timestamp ? new Date(rec.timestamp).toLocaleDateString() : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── LOCKED BANNER ─────────────────────────────────────────── */}
      {locked && lockedRecord && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "0.5rem",
          background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10,
          padding: "0.65rem 1rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span style={{ fontSize: "0.83rem", fontWeight: 700, color: "#92400e" }}>
              History loaded: <span style={{ color: "#1e293b" }}>{lockedRecord.insuredName}</span>
              {" "}— only the <strong>Certificate Holder</strong> section is editable
            </span>
          </div>
          <button type="button" onClick={clearLock}
            style={{
              padding: "0.3rem 0.75rem", background: "#fff",
              border: "1px solid #fcd34d", borderRadius: 6,
              fontSize: "0.78rem", fontWeight: 700, color: "#92400e",
              cursor: "pointer"
            }}>
            ✕ Clear &amp; Start New
          </button>
        </div>
      )}

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

        {/* ── PRODUCER ─────────────────────────────────────────────── */}
        <div className="section">
          <div className="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Producer
          </div>
          <div className="grid-3">
            <Field label="Name">{txt("producer.name","","producer")}</Field>
            <Field label="Phone">{txt("producer.phone","","producer")}</Field>
            <Field label="Fax">{txt("producer.fax","","producer")}</Field>
            <Field label="Email">{txt("producer.email","","producer")}</Field>
            <Field label="Address">{txt("producer.address.line1","","producer")}</Field>
            <Field label="City">{txt("producer.address.city","","producer")}</Field>
            <Field label="State">{txt("producer.address.state","e.g. CA","producer")}</Field>
            <Field label="ZIP">{txt("producer.address.zip","","producer")}</Field>
            <Field label="Date">
              <input className="input" type="date"
                value={getValue("form.date") ?? ""}
                disabled={dis("producer")}
                style={dis("producer") ? { opacity: 0.55, cursor: "not-allowed" } : {}}
                onChange={e => update("form.date", e.target.value)} />
            </Field>
          </div>
        </div>

        {/* ── INSURED ───────────────────────────────────────────────── */}
        <div className="section">
          <div className="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Insured
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Field label="Name">{txt("insured.name","","insured")}</Field>
            <div className="grid-4">
              <Field label="Address">{txt("insured.address.line1","","insured")}</Field>
              <Field label="City">{txt("insured.address.city","","insured")}</Field>
              <Field label="State">{txt("insured.address.state","CA","insured")}</Field>
              <Field label="ZIP">{txt("insured.address.zip","","insured")}</Field>
            </div>
          </div>
        </div>

        {/* ── INSURERS ──────────────────────────────────────────────── */}
        <div className="section">
          <div className="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Insurers
          </div>
          <div className="grid-3">
            {form.insurers.map((ins, i) => (
              <div key={ins.letter} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <span className="field-label">Insurer {ins.letter}</span>
                <input className="input" placeholder="Company name" value={ins.name}
                  disabled={dis("insurers")}
                  style={dis("insurers") ? { opacity: 0.55, cursor: "not-allowed" } : {}}
                  onChange={e => update(`insurers.${i}.name`, e.target.value)} />
                <input className="input" placeholder="NAIC #" value={ins.naic}
                  disabled={dis("insurers")}
                  style={dis("insurers") ? { opacity: 0.55, cursor: "not-allowed" } : {}}
                  onChange={e => update(`insurers.${i}.naic`, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* ── GENERAL LIABILITY ─────────────────────────────────────── */}
        <div className="section">
          <div className="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            General Liability
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <InsurerSelect value={form.policies.general_liability.insurer_letter} disabled={dis("gl")}
              onChange={v => update("policies.general_liability.insurer_letter", v)} />
            <div className="check-row">
              <CheckItem label="Occurrence" disabled={dis("gl")}
                checked={form.policies.general_liability.occurrence}
                onChange={v => update("policies.general_liability.occurrence", v)} />
              <CheckItem label="Claims-Made" disabled={dis("gl")}
                checked={form.policies.general_liability.claims_made}
                onChange={v => update("policies.general_liability.claims_made", v)} />
            </div>
          </div>
          {policyRow("policies.general_liability", "gl")}
          <p className="sub-heading">Limits</p>
          <div className="grid-3">
            <Field label="Each Occurrence">{txt("policies.general_liability.limits.each_occurrence","$","gl")}</Field>
            <Field label="Damage to Rented Premises">{txt("policies.general_liability.limits.damage_to_rented","$","gl")}</Field>
            <Field label="Medical Expense">{txt("policies.general_liability.limits.medical_expense","$","gl")}</Field>
            <Field label="Personal & Adv Injury">{txt("policies.general_liability.limits.personal_adv","$","gl")}</Field>
            <Field label="General Aggregate">{txt("policies.general_liability.limits.general_aggregate","$","gl")}</Field>
            <Field label="Products – Completed Ops">{txt("policies.general_liability.limits.products_completed","$","gl")}</Field>
          </div>
        </div>

        {/* ── AUTO LIABILITY ────────────────────────────────────────── */}
        <div className="section">
          <div className="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Automobile Liability
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <InsurerSelect value={form.policies.auto_liability.insurer_letter} disabled={dis("auto")}
              onChange={v => update("policies.auto_liability.insurer_letter", v)} />
            <div className="check-row">
              <CheckItem label="Any Auto" disabled={dis("auto")}
                checked={form.policies.auto_liability.any_auto}
                onChange={v => update("policies.auto_liability.any_auto", v)} />
              <CheckItem label="Owned Autos" disabled={dis("auto")}
                checked={form.policies.auto_liability.owned_autos}
                onChange={v => update("policies.auto_liability.owned_autos", v)} />
              <CheckItem label="Hired Autos" disabled={dis("auto")}
                checked={form.policies.auto_liability.hired_autos}
                onChange={v => update("policies.auto_liability.hired_autos", v)} />
              <CheckItem label="Non-Owned Autos" disabled={dis("auto")}
                checked={form.policies.auto_liability.non_owned_autos}
                onChange={v => update("policies.auto_liability.non_owned_autos", v)} />
            </div>
          </div>
          {policyRow("policies.auto_liability", "auto")}
          <div className="grid-3" style={{ marginTop: "0.5rem" }}>
            <Field label="Combined Single Limit">{txt("policies.auto_liability.combined_single_limit","$","auto")}</Field>
          </div>
        </div>

        {/* ── WORKERS COMP ──────────────────────────────────────────── */}
        <div className="section">
          <div className="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Workers Compensation
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <InsurerSelect value={form.policies.workers_comp.insurer_letter} disabled={dis("wc")}
              onChange={v => update("policies.workers_comp.insurer_letter", v)} />
            <div className="check-row">
              <CheckItem label="WC Statutory" disabled={dis("wc")}
                checked={form.policies.workers_comp.wc_statutory}
                onChange={v => update("policies.workers_comp.wc_statutory", v)} />
              <CheckItem label="Any Persons Excluded" disabled={dis("wc")}
                checked={form.policies.workers_comp.excluded}
                onChange={v => update("policies.workers_comp.excluded", v)} />
            </div>
          </div>
          {policyRow("policies.workers_comp", "wc")}
          <p className="sub-heading">Employers Liability Limits</p>
          <div className="grid-3">
            <Field label="Each Accident">{txt("policies.workers_comp.each_accident","$","wc")}</Field>
            <Field label="Disease – Policy Limit">{txt("policies.workers_comp.disease_policy_limit","$","wc")}</Field>
            <Field label="Disease – Each Employee">{txt("policies.workers_comp.disease_each_employee","$","wc")}</Field>
          </div>
        </div>

        {/* ── ENDORSEMENTS ──────────────────────────────────────────── */}
        <div className="section">
          <div className="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Endorsements
          </div>
          <div className="check-row">
            <CheckItem label="Additional Insured" disabled={dis("endorsements")}
              checked={form.endorsements.additional_insured}
              onChange={v => update("endorsements.additional_insured", v)} />
            <CheckItem label="Waiver of Subrogation" disabled={dis("endorsements")}
              checked={form.endorsements.waiver_of_subrogation}
              onChange={v => update("endorsements.waiver_of_subrogation", v)} />
          </div>
        </div>

        {/* ── DESCRIPTION ───────────────────────────────────────────── */}
        <div className="section">
          <div className="section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Description of Operations / Locations / Vehicles
          </div>
          <textarea className="input" rows={3}
            placeholder="Operations, locations, vehicles, exclusions added by endorsement, special provisions…"
            value={form.certificate.description_of_operations}
            disabled={dis("desc")}
            style={dis("desc") ? { opacity: 0.55, cursor: "not-allowed" } : {}}
            onChange={e => update("certificate.description_of_operations", e.target.value)} />
        </div>

        {/* ── CERTIFICATE HOLDER + GENERATE ─────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}
             className="cert-bottom-grid">

          {/* Certificate Holder — always editable */}
          <div className="section" style={locked ? { border: "2px solid #6366f1", background: "#fafbff" } : {}}>
            <div className="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              Certificate Holder
              {locked && (
                <span style={{
                  marginLeft: "auto", fontSize: "0.65rem", fontWeight: 700,
                  background: "#6366f1", color: "#fff",
                  padding: "2px 7px", borderRadius: 4
                }}>EDITABLE</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Field label="Name">{txt("certificate_holder.name","","cert_holder")}</Field>
              <Field label="Address">{txt("certificate_holder.address.line1","","cert_holder")}</Field>
              <div className="grid-3">
                <Field label="City">{txt("certificate_holder.address.city","","cert_holder")}</Field>
                <Field label="State">{txt("certificate_holder.address.state","CA","cert_holder")}</Field>
                <Field label="ZIP">{txt("certificate_holder.address.zip","","cert_holder")}</Field>
              </div>
            </div>
          </div>

          {/* Signature (auto) + Generate button */}
          <div className="section" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Authorized Representative
              </div>
              {/* Signature is auto-embedded from RPSign.png — not editable */}
              <div style={{
                padding: "0.45rem 0.65rem",
                border: "1px dashed #cbd5e1",
                borderRadius: 7,
                background: "#f8fafc",
                fontSize: "0.78rem",
                color: "#94a3b8",
                display: "flex", alignItems: "center", gap: 6
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Signature auto-applied from RPSign.png
              </div>
            </div>
            <div style={{ marginTop: "1.25rem" }}>
              <button type="submit" disabled={loading}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  width: "100%", padding: "0.65rem 1rem",
                  background: loading ? "#94a3b8" : "linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)",
                  color: "#fff", fontSize: "0.9rem", fontWeight: "700",
                  borderRadius: "10px", border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 4px 14px rgba(99,102,241,0.35)",
                }}>
                {loading ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Generating…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    Generate ACORD 25 PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (max-width: 640px) { .cert-bottom-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </form>
    </div>
  );
}
