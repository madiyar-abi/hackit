// Minimal CSV reader/writer for 1С / Excel exports: «;» or «,» delimiter, quoted fields, BOM, CRLF.

export type Row = Record<string, string>;

function detectDelimiter(headerLine: string): string {
  const count = (ch: string) => headerLine.split(ch).length - 1;
  return count(";") >= count(",") ? ";" : ",";
}

/** Parse CSV text into rows keyed by lower-cased, trimmed header names. */
export function parseCsv(text: string): Row[] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = detectDelimiter(firstLine);
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || record.length) {
    record.push(field);
    records.push(record);
  }
  const nonEmpty = records.filter((r) => r.some((x) => x.trim() !== ""));
  if (!nonEmpty.length) return [];
  const header = nonEmpty[0].map((h) => h.trim().toLowerCase());
  return nonEmpty.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const escape = (v: string, delim: string) =>
  /["\n\r]/.test(v) || v.includes(delim) ? `"${v.replace(/"/g, '""')}"` : v;

/** Serialize rows with the given column order; «;» by default (opens correctly in Excel with RU locale). */
export function toCsv(columns: string[], rows: (string | number | boolean | undefined)[][], delim = ";"): string {
  const line = (xs: (string | number | boolean | undefined)[]) =>
    xs.map((x) => escape(x === undefined ? "" : String(x), delim)).join(delim);
  return [line(columns), ...rows.map(line)].join("\n") + "\n";
}
