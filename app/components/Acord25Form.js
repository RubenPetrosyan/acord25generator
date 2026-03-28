"use client";
import { useState } from "react";

const emptyAddress = { line1: "", city: "", state: "", zip: "" };

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export default function Acord25Form({ onSubmit, loading }) {
  const [form, setForm] = useState({
    form: {
      date: new Date().toISOString().split("T")[0]
    },

    producer: {
      name: "",
      phone: "",
      fax: "",
      email: "",
      address: { ...emptyAddress }
    },

    insured: {
      name: "",
      address: { ...emptyAddress }
    },

    insurers: ["A","B","C","D","E","F"].map(letter => ({
      letter,
      name: "",
      naic: ""
    })),

    policies: {
      general_liability: {
        insurer_letter: "A",
        occurrence: true,
        claims_made: false,
        policy_number: "",
        effective_date: "",
        expiration_date: "",
        limits: {
          each_occurrence: "",
          damage_to_rented: "",
          medical_expense: "",
          personal_adv: "",
          general_aggregate: "",
          products_completed: ""
        }
      },

      auto_liability: {
        insurer_letter: "A",
        any_auto: true,
        owned_autos: false,
        hired_autos: false,
        non_owned_autos: false,
        policy_number: "",
        effective_date: "",
        expiration_date: "",
        combined_single_limit: ""
      },

      workers_comp: {
        insurer_letter: "A",
        wc_statutory: true,
        excluded: false,
        policy_number: "",
        effective_date: "",
        expiration_date: "",
        each_accident: "",
        disease_policy_limit: "",
        disease_each_employee: ""
      }
    },

    endorsements: {
      additional_insured: false,
      waiver_of_subrogation: false
    },

    certificate: {
      description_of_operations: ""
    },

    certificate_holder: {
      name: "",
      address: { ...emptyAddress }
    },

    signature: {
      authorized_representative: ""
    }
  });

  function getValue(path) {
    return path.split(".").reduce((obj, key) => obj?.[key], form);
  }

  function update(path, value) {
    const keys = path.split(".");
    const copy = structuredClone(form);
    let obj = copy;
    keys.slice(0, -1).forEach(k => (obj = obj[k]));
    obj[keys.at(-1)] = value;
    setForm(copy);
  }

  function submit(e) {
    e.preventDefault();
    if (!loading) onSubmit(form);
  }

  // Controlled insurer letter select — reads current value from state
  const insurerSelect = path => (
    <select
      className="input"
      value={getValue(path)}
      onChange={e => update(path, e.target.value)}
    >
      {["A","B","C","D","E","F"].map(l => (
        <option key={l} value={l}>{l}</option>
      ))}
    </select>
  );

  return (
    <form onSubmit={submit} className="space-y-10">

      {/* PRODUCER */}
      <section className="section">
        <h2 className="section-title">Producer</h2>
        <div className="grid-2">
          <input className="input" placeholder="Name" value={form.producer.name} onChange={e=>update("producer.name",e.target.value)} />
          <input className="input" placeholder="Phone" value={form.producer.phone} onChange={e=>update("producer.phone",e.target.value)} />
          <input className="input" placeholder="Fax" value={form.producer.fax} onChange={e=>update("producer.fax",e.target.value)} />
          <input className="input" placeholder="Email" value={form.producer.email} onChange={e=>update("producer.email",e.target.value)} />
          <input className="input" placeholder="Address" value={form.producer.address.line1} onChange={e=>update("producer.address.line1",e.target.value)} />
          <input className="input" placeholder="City" value={form.producer.address.city} onChange={e=>update("producer.address.city",e.target.value)} />
          <input className="input" placeholder="State" value={form.producer.address.state} onChange={e=>update("producer.address.state",e.target.value)} />
          <input className="input" placeholder="ZIP" value={form.producer.address.zip} onChange={e=>update("producer.address.zip",e.target.value)} />
        </div>
      </section>

      {/* INSURED */}
      <section className="section">
        <h2 className="section-title">Insured</h2>
        <div className="grid-2">
          <input className="input" placeholder="Name" value={form.insured.name} onChange={e=>update("insured.name",e.target.value)} />
          <input className="input" placeholder="Address" value={form.insured.address.line1} onChange={e=>update("insured.address.line1",e.target.value)} />
          <input className="input" placeholder="City" value={form.insured.address.city} onChange={e=>update("insured.address.city",e.target.value)} />
          <input className="input" placeholder="State" value={form.insured.address.state} onChange={e=>update("insured.address.state",e.target.value)} />
          <input className="input" placeholder="ZIP" value={form.insured.address.zip} onChange={e=>update("insured.address.zip",e.target.value)} />
        </div>
      </section>

      {/* INSURERS */}
      <section className="section">
        <h2 className="section-title">Insurers</h2>
        <div className="grid-2">
          {form.insurers.map((ins,i)=>(
            <div key={ins.letter}>
              <strong>Insurer {ins.letter}</strong>
              <input className="input" placeholder="Name" value={ins.name} onChange={e=>update(`insurers.${i}.name`,e.target.value)} />
              <input className="input" placeholder="NAIC" value={ins.naic} onChange={e=>update(`insurers.${i}.naic`,e.target.value)} />
            </div>
          ))}
        </div>
      </section>

      {/* GENERAL LIABILITY */}
      <section className="section">
        <h2 className="section-title">General Liability</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span>Insurer</span> {insurerSelect("policies.general_liability.insurer_letter")}
          </div>
          <div className="flex gap-4">
            <Checkbox label="Occurrence" checked={form.policies.general_liability.occurrence}
              onChange={v=>update("policies.general_liability.occurrence",v)} />
            <Checkbox label="Claims-Made" checked={form.policies.general_liability.claims_made}
              onChange={v=>update("policies.general_liability.claims_made",v)} />
          </div>
          <div className="grid-2">
            <input className="input" placeholder="Policy Number" value={form.policies.general_liability.policy_number} onChange={e=>update("policies.general_liability.policy_number",e.target.value)} />
            <input className="input" type="date" placeholder="Effective Date" value={form.policies.general_liability.effective_date} onChange={e=>update("policies.general_liability.effective_date",e.target.value)} />
            <input className="input" type="date" placeholder="Expiration Date" value={form.policies.general_liability.expiration_date} onChange={e=>update("policies.general_liability.expiration_date",e.target.value)} />
          </div>
          <h3 className="font-semibold mt-2">Limits</h3>
          <div className="grid-2">
            <input className="input" placeholder="Each Occurrence" value={form.policies.general_liability.limits.each_occurrence} onChange={e=>update("policies.general_liability.limits.each_occurrence",e.target.value)} />
            <input className="input" placeholder="Damage to Rented Premises" value={form.policies.general_liability.limits.damage_to_rented} onChange={e=>update("policies.general_liability.limits.damage_to_rented",e.target.value)} />
            <input className="input" placeholder="Medical Expense" value={form.policies.general_liability.limits.medical_expense} onChange={e=>update("policies.general_liability.limits.medical_expense",e.target.value)} />
            <input className="input" placeholder="Personal & Adv Injury" value={form.policies.general_liability.limits.personal_adv} onChange={e=>update("policies.general_liability.limits.personal_adv",e.target.value)} />
            <input className="input" placeholder="General Aggregate" value={form.policies.general_liability.limits.general_aggregate} onChange={e=>update("policies.general_liability.limits.general_aggregate",e.target.value)} />
            <input className="input" placeholder="Products – Completed Ops Aggregate" value={form.policies.general_liability.limits.products_completed} onChange={e=>update("policies.general_liability.limits.products_completed",e.target.value)} />
          </div>
        </div>
      </section>

      {/* AUTO LIABILITY */}
      <section className="section">
        <h2 className="section-title">Automobile Liability</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span>Insurer</span> {insurerSelect("policies.auto_liability.insurer_letter")}
          </div>
          <div className="flex flex-wrap gap-4">
            <Checkbox label="Any Auto" checked={form.policies.auto_liability.any_auto}
              onChange={v=>update("policies.auto_liability.any_auto",v)} />
            <Checkbox label="Owned Autos" checked={form.policies.auto_liability.owned_autos}
              onChange={v=>update("policies.auto_liability.owned_autos",v)} />
            <Checkbox label="Hired Autos" checked={form.policies.auto_liability.hired_autos}
              onChange={v=>update("policies.auto_liability.hired_autos",v)} />
            <Checkbox label="Non-Owned Autos" checked={form.policies.auto_liability.non_owned_autos}
              onChange={v=>update("policies.auto_liability.non_owned_autos",v)} />
          </div>
          <div className="grid-2">
            <input className="input" placeholder="Policy Number" value={form.policies.auto_liability.policy_number} onChange={e=>update("policies.auto_liability.policy_number",e.target.value)} />
            <input className="input" type="date" placeholder="Effective Date" value={form.policies.auto_liability.effective_date} onChange={e=>update("policies.auto_liability.effective_date",e.target.value)} />
            <input className="input" type="date" placeholder="Expiration Date" value={form.policies.auto_liability.expiration_date} onChange={e=>update("policies.auto_liability.expiration_date",e.target.value)} />
            <input className="input" placeholder="Combined Single Limit" value={form.policies.auto_liability.combined_single_limit} onChange={e=>update("policies.auto_liability.combined_single_limit",e.target.value)} />
          </div>
        </div>
      </section>

      {/* WORKERS COMP */}
      <section className="section">
        <h2 className="section-title">Workers Compensation</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span>Insurer</span> {insurerSelect("policies.workers_comp.insurer_letter")}
          </div>
          <div className="flex gap-4">
            <Checkbox label="WC Statutory" checked={form.policies.workers_comp.wc_statutory}
              onChange={v=>update("policies.workers_comp.wc_statutory",v)} />
            <Checkbox label="Any Persons Excluded" checked={form.policies.workers_comp.excluded}
              onChange={v=>update("policies.workers_comp.excluded",v)} />
          </div>
          <div className="grid-2">
            <input className="input" placeholder="Policy Number" value={form.policies.workers_comp.policy_number} onChange={e=>update("policies.workers_comp.policy_number",e.target.value)} />
            <input className="input" type="date" placeholder="Effective Date" value={form.policies.workers_comp.effective_date} onChange={e=>update("policies.workers_comp.effective_date",e.target.value)} />
            <input className="input" type="date" placeholder="Expiration Date" value={form.policies.workers_comp.expiration_date} onChange={e=>update("policies.workers_comp.expiration_date",e.target.value)} />
          </div>
          <h3 className="font-semibold mt-2">Employers Liability Limits</h3>
          <div className="grid-2">
            <input className="input" placeholder="Each Accident" value={form.policies.workers_comp.each_accident} onChange={e=>update("policies.workers_comp.each_accident",e.target.value)} />
            <input className="input" placeholder="Disease – Policy Limit" value={form.policies.workers_comp.disease_policy_limit} onChange={e=>update("policies.workers_comp.disease_policy_limit",e.target.value)} />
            <input className="input" placeholder="Disease – Each Employee" value={form.policies.workers_comp.disease_each_employee} onChange={e=>update("policies.workers_comp.disease_each_employee",e.target.value)} />
          </div>
        </div>
      </section>

      {/* ENDORSEMENTS */}
      <section className="section">
        <h2 className="section-title">Endorsements</h2>
        <Checkbox label="Additional Insured" checked={form.endorsements.additional_insured}
          onChange={v=>update("endorsements.additional_insured",v)} />
        <Checkbox label="Waiver of Subrogation" checked={form.endorsements.waiver_of_subrogation}
          onChange={v=>update("endorsements.waiver_of_subrogation",v)} />
      </section>

      {/* DESCRIPTION OF OPERATIONS */}
      <section className="section">
        <h2 className="section-title">Description of Operations / Locations / Vehicles</h2>
        <textarea
          className="input w-full"
          rows={4}
          placeholder="Description of operations, locations, vehicles, exclusions added by endorsement, special provisions…"
          value={form.certificate.description_of_operations}
          onChange={e=>update("certificate.description_of_operations",e.target.value)}
        />
      </section>

      {/* CERTIFICATE HOLDER */}
      <section className="section">
        <h2 className="section-title">Certificate Holder</h2>
        <div className="grid-2">
          <input className="input" placeholder="Name" value={form.certificate_holder.name} onChange={e=>update("certificate_holder.name",e.target.value)} />
          <input className="input" placeholder="Address" value={form.certificate_holder.address.line1} onChange={e=>update("certificate_holder.address.line1",e.target.value)} />
          <input className="input" placeholder="City" value={form.certificate_holder.address.city} onChange={e=>update("certificate_holder.address.city",e.target.value)} />
          <input className="input" placeholder="State" value={form.certificate_holder.address.state} onChange={e=>update("certificate_holder.address.state",e.target.value)} />
          <input className="input" placeholder="ZIP" value={form.certificate_holder.address.zip} onChange={e=>update("certificate_holder.address.zip",e.target.value)} />
        </div>
      </section>

      {/* SIGNATURE */}
      <section className="section">
        <h2 className="section-title">Signature</h2>
        <input className="input" placeholder="Authorized Representative" value={form.signature.authorized_representative}
          onChange={e=>update("signature.authorized_representative",e.target.value)} />
      </section>

      {/* SUBMIT */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className={`px-8 py-3 rounded-lg text-white font-semibold ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Generating PDF…" : "Generate ACORD 25 PDF"}
        </button>

        {loading && (
          <div className="text-sm text-gray-600">
            Please wait, this may take a few seconds…
          </div>
        )}
      </div>

    </form>
  );
}
