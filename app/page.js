"use client";

import { useState } from "react";
import Acord25Form from "./components/Acord25Form";

export default function Home() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generate(formData) {
    setLoading(true);
    setResult(null);
    setError(null);

    // Revoke any previous blob URL to avoid memory leaks
    if (result) URL.revokeObjectURL(result);

    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Unknown server error" }));
        throw new Error(errBody.error || `Server error ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResult(url);
    } catch (err) {
      setError(err.message || "Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">ACORD 25 Generator</h1>

      <Acord25Form onSubmit={generate} loading={loading} />

      {loading && (
        <div className="text-center text-gray-600 font-medium">
          Generating PDF, please wait…
        </div>
      )}

      {error && !loading && (
        <div className="text-center text-red-600 font-medium">
          Error: {error}
        </div>
      )}

      {result && !loading && (
        <div className="text-center">
          <a
            href={result}
            download="acord25-filled.pdf"
            className="text-blue-600 underline font-semibold"
          >
            Download generated PDF
          </a>
        </div>
      )}
    </main>
  );
}
