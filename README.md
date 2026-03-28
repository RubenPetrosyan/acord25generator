# CertFiller

CertFiller is a server-side service for generating filled **ACORD 25 – Certificate of Liability Insurance** PDFs from structured JSON data.

## What it does

- Accepts JSON input
- Maps data to official ACORD 25 PDF form fields
- Generates a flattened, non-editable PDF

## Project structure

- `app/api/generate-pdf/`  
  API endpoint that fills and returns the PDF

- `app/api/debug-fields/`  
  Utility endpoint to list PDF AcroForm field names

- `acord/acord25/spec/`  
  Canonical ACORD 25 field definitions, mappings, and schema

- `public/acord25.pdf`  
  Original ACORD 25 AcroForm PDF (not generated)

## Development

```bash
npm install
npm run dev
