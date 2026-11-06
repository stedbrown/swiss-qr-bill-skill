<h1 align="center">Swiss QR Bill Skill</h1>

<p align="center"><strong>Generate a printable Swiss QR payment slip from a JSON file.</strong></p>

<p align="center">
  Codex · Claude Code · Node.js 22+ · MIT
</p>

<p align="center">
  <a href="#install-the-skill">Install the skill</a> ·
  <a href="#try-the-demo">Try the demo</a> ·
  <a href="examples/demo.pdf">View the sample PDF</a>
</p>

<p align="center">
  <a href="examples/demo.pdf"><img src="examples/preview.png" alt="Italian-language Swiss payment slip with receipt, Swiss QR code, SCOR reference and CHF amount" width="940"></a>
</p>

<p align="center"><sub>Payment slip and receipt with sample data. The full PDF is A4.</sub></p>

The skill prepares the payment data. The generator checks the IBAN, amount, and payment reference before creating the PDF. You can also run the same generator directly from your terminal.

## Install the skill

### Quick install

Run this from your project root with Node.js 22 or later and npm.

```sh
npx skills add stedbrown/swiss-qr-bill-skill --skill swiss-qr-bill --agent codex claude-code --yes --copy
```

This installs the skill for both agents in the current project. To install it for just one, keep either `codex` or `claude-code` after `--agent`. The Skills CLI copies the skill files. Run `npm ci --ignore-scripts` inside each installed copy you plan to use to set up the PDF generator. [Skills CLI documentation](https://github.com/vercel-labs/skills/blob/main/docs/commands.md#skills-add)

### Manual install

Copy the entire [`swiss-qr-bill/`](swiss-qr-bill/) directory to the path for your agent, then run `npm ci --ignore-scripts` inside the copy.

| Agent | Project path | Invoke |
| --- | --- | --- |
| [Codex](https://developers.openai.com/codex/skills) | `.agents/skills/swiss-qr-bill/` | `$swiss-qr-bill` |
| [Claude Code](https://code.claude.com/docs/en/skills) | `.claude/skills/swiss-qr-bill/` | `/swiss-qr-bill` |

> Use the swiss-qr-bill skill to generate a payment slip from `payment.json`. Save it as `payment.pdf`.

You can use the skill in Codex mode in the ChatGPT desktop app. Distribution to Chat and Work on the web requires a plugin package. [OpenAI skills documentation](https://learn.chatgpt.com/docs/build-skills)

## Try the demo

```sh
git clone https://github.com/stedbrown/swiss-qr-bill-skill.git
cd swiss-qr-bill-skill/swiss-qr-bill
npm ci --ignore-scripts
node scripts/generate.mjs examples/demo.json demo.pdf
```

The command writes `demo.pdf` to the current directory. Print at **actual size (100%)**. Use a fresh output filename on subsequent runs.

## Use your own data

Start with the [sample JSON](swiss-qr-bill/examples/demo.json). Store real payment data outside the repository. Pass the JSON path and the desired PDF path to the script, using an existing output directory.

| Field | Accepted value |
| --- | --- |
| `creditor` | `account` (CH or LI IBAN), `name`, `zip`, `city`, and `country`. `address` and `buildingNumber` are optional. |
| `debtor` | Optional. The same address fields as the creditor, without `account`. |
| `currency` | `CHF` or `EUR`. EUR requires a regular IBAN. |
| `amount` | Optional number from 0.01 to 999999999.99, with up to two decimal places. Omit it to leave a blank amount box. |
| `reference` | A 27-digit QR reference is required with a QR-IBAN. With a regular IBAN, supply a valid ISO 11649 SCOR reference or omit the field. |
| `message` | Optional, up to 140 characters on one line. |
| `language` | `IT` (default), `DE`, `FR`, `EN`, or `RM`. |

Use strings for postal codes, house numbers, and references to preserve leading zeros. Omit optional fields when empty. Text supports printable ASCII and a subset of Latin letters and punctuation.

The generator creates one payment slip per run. For invoices with a header, line items, and VAT, see the [SwissQRBill full invoice guide](https://github.com/schoero/swissqrbill/blob/main/docs/how-to-create-a-complete-qr-bill.md). Before issuing a slip, verify the beneficiary's details and compare the scanned QR data with the intended payment details. [SIX QR-bill specifications](https://www.six-group.com/en/products-services/banking-services/payment-standardization/standards/qr-bill.html)

## Tests and license

Run `npm test` from `swiss-qr-bill/`. The tests cover PDF generation, protection against overwriting an existing file, and rejection of invalid input, including the SCOR checksum case reported in [SwissQRBill #487](https://github.com/schoero/swissqrbill/issues/487).

Distributed under the [MIT License](LICENSE). Built with [SwissQRBill](https://github.com/schoero/swissqrbill) and [PDFKit](https://pdfkit.org/), with versions pinned in the lockfile.
