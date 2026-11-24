const XLSX = require("xlsx");

const normalizeHeader = (value) =>
  String(value || "").trim().replace(/\s+/g, "").toLowerCase();

const HEADER_MAP = {
  personid: "personId",
  isin: "isin",
  companyname: "companyName",
  tradeid: "tradeId",
  brokertradeid: "tradeId",
  transactiontype: "transactionType",
  quantity: "quantity",
  pricepershare: "pricePerShare",
  transactiondate: "transactionDate",
  date: "transactionDate",
  exchange: "exchange",
  brokerage: "brokerage",
  othercharges: "otherCharges",
  notes: "notes",
};

const parseExcelBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    raw: false,
  });

  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error("Excel file has no worksheet");

  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  if (matrix.length < 2) {
    throw new Error("Excel must contain a header and at least one data row");
  }

  const rawHeaders = matrix[0];
  const headers = rawHeaders.map((h) => HEADER_MAP[normalizeHeader(h)] || null);

  // Reject duplicate mapped columns, e.g. ISIN + isin.
  const mapped = headers.filter(Boolean);
  const duplicates = mapped.filter((field, index) => mapped.indexOf(field) !== index);

  if (duplicates.length) {
    throw new Error(
      `Duplicate mapped Excel columns: ${[...new Set(duplicates)].join(", ")}`
    );
  }

  const required = [
    "personId",
    "isin",
    "tradeId",
    "transactionType",
    "quantity",
    "pricePerShare",
    "transactionDate",
    "exchange",
  ];

  const missing = required.filter((field) => !headers.includes(field));
  if (missing.length) {
    throw new Error(`Missing required Excel columns: ${missing.join(", ")}`);
  }

  const rows = [];

  for (let i = 1; i < matrix.length; i++) {
    const values = matrix[i];

    if (values.every((v) => String(v ?? "").trim() === "")) continue;

    const rowData = {};

    headers.forEach((field, columnIndex) => {
      if (field) rowData[field] = values[columnIndex] ?? "";
    });

    rows.push({ excelRow: i + 1, rowData });
  }

  if (!rows.length) throw new Error("Excel contains no data rows");
  return rows;
};

module.exports = { parseExcelBuffer };