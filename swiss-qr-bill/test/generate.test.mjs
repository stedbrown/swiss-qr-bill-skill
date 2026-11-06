import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/generate.mjs", import.meta.url));
const demo = JSON.parse(readFileSync(new URL("../examples/demo.json", import.meta.url), "utf8"));

function runFixture(t, data) {
  const directory = mkdtempSync(join(tmpdir(), "swiss-qr-bill-test-"));
  const input = join(directory, "input.json");
  const output = join(directory, "output.pdf");
  t.after(() => {
    rmSync(input, { force: true });
    rmSync(output, { force: true });
    rmdirSync(directory);
  });
  writeFileSync(input, JSON.stringify(data));
  const run = () => spawnSync(process.execPath, [script, input, output], { encoding: "utf8" });
  return { output, run };
}

test("generates the demo PDF and preserves it on rerun", (t) => {
  const { output, run } = runFixture(t, demo);
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  const pdf = readFileSync(output);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  const second = run();
  assert.equal(second.status, 1);
  assert.match(second.stderr, /already exists/);
  assert.deepEqual(readFileSync(output), pdf);
});

test("accepts a regular IBAN with the amount and reference omitted", (t) => {
  const { run } = runFixture(t, { ...demo, amount: undefined, reference: undefined });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
});

const qrCreditor = { ...demo.creditor, account: "CH44 3199 9123 0008 8901 2" };
const qrReference = "21 00000 00003 13947 14300 09017";

test("accepts a QR-IBAN with a valid CHF QR reference", (t) => {
  const { run } = runFixture(t, { ...demo, creditor: qrCreditor, reference: qrReference });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
});

const invalidFixtures = [
  ["wrong SCOR checksum", { reference: "RF48 5000 0567 8901 2346" }, /reference.*SCOR/],
  ["wrong QR reference checksum", { creditor: qrCreditor, reference: qrReference.slice(0, -1) + "8" }, /reference.*QR reference/],
  ["missing QR reference", { creditor: qrCreditor, reference: undefined }, /reference.*QR reference/],
  ["QR-IBAN in EUR", { creditor: qrCreditor, currency: "EUR", reference: qrReference }, /EUR requires a regular IBAN/],
  ["wrong IBAN checksum", { creditor: { ...demo.creditor, account: "CH59 0079 1123 0008 8901 2" } }, /creditor.account/],
  ["zero amount", { amount: 0 }, /amount/],
  ["amount with fractional cents", { amount: 10.001 }, /amount/],
  ["multiline message", { message: "Demo\n" }, /message/]
];

for (const [name, overrides, error] of invalidFixtures) {
  test(`rejects ${name} before writing a PDF`, (t) => {
    const { output, run } = runFixture(t, { ...demo, ...overrides });
    const result = run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, error);
    assert.throws(() => readFileSync(output), { code: "ENOENT" });
  });
}
