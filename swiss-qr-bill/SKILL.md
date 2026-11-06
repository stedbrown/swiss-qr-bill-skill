---
name: swiss-qr-bill
description: Generate a Swiss QR payment slip as a printable A4 PDF from supplied billing data, or prepare the input JSON for generation. Use for Swiss QR-bills, Swiss QR invoices' payment sections, QR-fatture and Swiss payment slips.
---

# Swiss QR payment slip

Generate one Swiss payment slip with its receipt using the bundled Node script.

1. Use the supplied JSON, or build a JSON file using [the demo](examples/demo.json) as the field guide. Keep real data in the user's chosen workspace outside the skill checkout.
2. Require currency and the creditor's account, name, postal code, city and country. Street and house number are optional. If debtor details are supplied, require name, postal code, city and country. Keep postal codes and references as strings to preserve leading zeros.
3. Use payment details supplied by the user or their named source. Ask for missing required values. A QR-IBAN also requires its matching QR reference. Preserve a supplied reference even if it looks wrong and ask the user to resolve any validation error. Omit optional fields only when the user's request permits it.
4. Install locked dependencies from the skill folder with `npm ci --ignore-scripts` if needed and permitted. Run the following with Node.js 22 or later. Resolve the script path from this skill folder and the input and output paths from the user's workspace.

   ```sh
   node "<skill-folder>/scripts/generate.mjs" "<input.json>" "<output.pdf>"
   ```

5. Report any validation error with the affected field and request a corrected value. On success, confirm the file exists and return its path. When preview tooling is available, inspect the payment area at the bottom of the A4 page for clipping. Treat validation as a check of the supplied data and format.

The optional `language` field controls the PDF labels and defaults to `IT`. The demo uses public test data and is for demonstration only.
