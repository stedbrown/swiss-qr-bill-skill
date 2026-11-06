import { readFile, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import PDFDocument from "pdfkit";
import { SwissQRBill } from "swissqrbill/pdf";
import { isIBANValid, isQRIBAN, isQRReferenceValid, isSCORReferenceValid } from "swissqrbill/utils";

const addressFields = ["name", "address", "buildingNumber", "zip", "city", "country"];
const unsupportedText = /[^ -~À-ÖØ-öø-ÿŒœŸŠšŽž’–]/u;

function checkObject(value, field, allowedFields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be a JSON object.`);
  }
  if (Object.keys(value).some((key) => !allowedFields.includes(key))) {
    throw new Error(`${field} contains an unsupported field. See the demo JSON.`);
  }
}

function textField(value, field, max, optional = false) {
  if (value === undefined && optional) return undefined;
  if (typeof value !== "string" || unsupportedText.test(value)) {
    throw new Error(`${field} must be a single line of supported text.`);
  }
  const text = value.trim();
  if (!text || text.length > max) {
    throw new Error(`${field} must contain 1 to ${max} characters.`);
  }
  return text;
}

function address(input, field) {
  const country = textField(input.country, `${field}.country`, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new Error(`${field}.country must be a two-letter country code.`);
  }
  return {
    name: textField(input.name, `${field}.name`, 70),
    address: textField(input.address, `${field}.address`, 70, true) ?? "",
    buildingNumber: textField(input.buildingNumber, `${field}.buildingNumber`, 16, true),
    zip: textField(input.zip, `${field}.zip`, 16),
    city: textField(input.city, `${field}.city`, 35),
    country
  };
}

function paymentData(input) {
  checkObject(input, "Input", ["creditor", "debtor", "amount", "currency", "language", "reference", "message"]);
  const { amount, currency, language = "IT" } = input;
  if (currency !== "CHF" && currency !== "EUR") {
    throw new Error("currency must be CHF or EUR.");
  }
  if (!["DE", "EN", "FR", "IT", "RM"].includes(language)) {
    throw new Error("language must be DE, EN, FR, IT or RM.");
  }
  if (amount !== undefined && (
    !Number.isFinite(amount) || amount < 0.01 || amount > 999_999_999.99 ||
    Number(amount.toFixed(2)) !== amount
  )) {
    throw new Error("amount must be a number from 0.01 to 999999999.99 with at most two decimal places.");
  }

  checkObject(input.creditor, "creditor", [...addressFields, "account"]);
  const account = textField(input.creditor.account, "creditor.account", 42).replaceAll(" ", "").toUpperCase();
  if (!/^(CH|LI)\d{7}[A-Z0-9]{12}$/.test(account) || !isIBANValid(account)) {
    throw new Error("creditor.account must be a valid Swiss or Liechtenstein IBAN.");
  }
  const creditor = { ...address(input.creditor, "creditor"), account };
  let debtor;
  if (input.debtor !== undefined) {
    checkObject(input.debtor, "debtor", addressFields);
    debtor = address(input.debtor, "debtor");
  }

  const reference = textField(input.reference, "reference", 54, true)?.replaceAll(" ", "").toUpperCase();
  if (isQRIBAN(account)) {
    if (currency === "EUR") throw new Error("EUR requires a regular IBAN in this skill.");
    if (!reference || !/^\d{27}$/.test(reference) || !isQRReferenceValid(reference)) {
      throw new Error("reference must be a valid 27-digit QR reference when using a QR-IBAN.");
    }
  } else if (reference !== undefined && (
    !/^RF\d{2}[A-Z0-9]{1,21}$/.test(reference) || !isSCORReferenceValid(reference)
  )) {
    throw new Error("reference must be a valid ISO 11649 SCOR reference when using a regular IBAN.");
  }

  const message = textField(input.message, "message", 140, true);
  return { language, data: { amount, currency, creditor, debtor, reference, message } };
}

async function main(args) {
  if (args.length === 1 && args[0] === "--help") {
    console.log("Usage: node generate.mjs <input.json> <output.pdf>");
    return;
  }
  if (args.length !== 2 || extname(args[1]).toLowerCase() !== ".pdf") {
    throw new Error("Usage: node generate.mjs <input.json> <output.pdf>");
  }
  const [inputPath, outputPath] = args;
  const source = await readFile(inputPath, "utf8");
  let input;
  try {
    input = JSON.parse(source.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("Input is not valid JSON.");
  }

  const { data, language } = paymentData(input);
  const slip = new SwissQRBill(data, { language });
  const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: "Swiss QR payment slip" } });
  slip.attachTo(doc);
  doc.end();

  const chunks = [];
  for await (const chunk of doc) chunks.push(chunk);
  await writeFile(outputPath, Buffer.concat(chunks), { flag: "wx" });
  console.log(outputPath);
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(error.code === "EEXIST" ? "Output file already exists. Choose a new filename." : error.message);
  process.exitCode = 1;
}
