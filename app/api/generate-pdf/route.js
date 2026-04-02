import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const data = await req.json();

    const pdfPath = path.join(process.cwd(), "public", "acord25.pdf");
    const pdfBytes = fs.readFileSync(pdfPath);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    const mappingPath = path.join(
      process.cwd(),
      "acord",
      "acord25",
      "spec",
      "mapping.json"
    );

    const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));

    for (const fieldPath in mapping) {
      // Signature is handled separately via embedded image — skip text field
      if (fieldPath === "signature.authorized_representative") continue;

      const map = mapping[fieldPath];
      const value = fieldPath
        .split(".")
        .reduce((obj, key) => obj?.[key], data);

      if (value === undefined || value === null) continue;

      for (const pdfFieldName of map.pdf_fields) {
        try {
          if (map.type === "checkbox") {
            const checkbox = form.getCheckBox(pdfFieldName);
            value ? checkbox.check() : checkbox.uncheck();
          } else {
            const textField = form.getTextField(pdfFieldName);
            textField.setText(String(value));
          }
        } catch {
          // PDF field not present — safely ignored
        }
      }
    }

    // ── Embed RPSign.png at the signature field location ──────────────────
    const sigImagePath = path.join(process.cwd(), "public", "RPSign.png");
    if (fs.existsSync(sigImagePath)) {
      try {
        const sigTextField = form.getTextField(
          "Producer_AuthorizedRepresentative_Signature_A"
        );
        const widgets = sigTextField.acroField.getWidgets();
        if (widgets.length > 0) {
          const widget = widgets[0];
          const rect = widget.getRectangle();

          // Locate the page this widget lives on via its P (page) reference
          const pageRef = widget.P();
          const pages = pdfDoc.getPages();
          const sigPage = pageRef
            ? pages.find(p => p.ref === pageRef) ?? pages[0]
            : pages[0];

          const sigImageBytes = fs.readFileSync(sigImagePath);
          const sigImage = await pdfDoc.embedPng(sigImageBytes);

          // Draw with a small inset so it doesn't clip the field border
          sigPage.drawImage(sigImage, {
            x: rect.x + 2,
            y: rect.y + 2,
            width: rect.width - 4,
            height: rect.height - 4,
          });
        }
      } catch (sigErr) {
        // Signature embed failed — continue without it rather than crash
        console.error("Signature embedding error:", sigErr.message);
      }
    }

    form.flatten();

    const filledPdfBytes = await pdfDoc.save();

    return new Response(filledPdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=acord25-filled.pdf"
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
