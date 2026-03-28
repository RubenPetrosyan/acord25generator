# ACORD Specifications

This folder contains structured specifications for ACORD insurance forms.

## Structure

- `acord25/`  
  ACORD 25 – Certificate of Liability Insurance

### ACORD 25 Contents

- `spec/fields.json`  
  Canonical list of supported ACORD 25 input fields

- `spec/mapping.json`  
  Mapping between input fields and PDF AcroForm field names

- `spec/schema.json`  
  JSON Schema defining valid input data structure

These files together define how structured data is validated and mapped
to the official ACORD 25 PDF form.
