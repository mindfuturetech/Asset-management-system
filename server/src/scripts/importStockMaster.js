
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { parse } = require("csv-parse/sync");

const Stock = require("../models/Stock");

// --------------------------------------------------
// FILE PATHS
// --------------------------------------------------

const DATA_DIR = path.join(__dirname, "../data/stock-master");
const NSE_FILE = path.join(DATA_DIR, "EQUITY_L.csv");
const BSE_FILE = path.join(DATA_DIR, "Equity.csv");

const LOG_DIR = path.join(__dirname, "../../logs");

// Only write to MongoDB when --commit is provided.
const COMMIT = process.argv.includes("--commit");

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const clean = (value) => {
  if (value === undefined || value === null) return null;

  const result = String(value).trim();

  return result === "" ? null : result;
};

const normalizeIsin = (value) => {
  return clean(value)?.toUpperCase() || null;
};

const isValidIsin = (isin) => {
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin || "");
};

const readCsv = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf8");

  const rows = parse(content, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  if (!rows.length) {
    throw new Error(`CSV file is empty: ${filePath}`);
  }

  const headers = rows[0].map((header) =>
    String(header).trim()
  );

  return rows.slice(1).map((row) => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] = clean(row[index]);
    });

    return record;
  });
};

const createEmptyStock = (isin) => ({
  isin,
  companyName: null,

  exchanges: {
    nse: {
      listed: false,
      symbol: null,
      series: null,
      listingDate: null,
      paidUpValue: null,
      faceValue: null,
    },

    bse: {
      listed: false,
      securityCode: null,
      securityId: null,
      securityName: null,
      group: null,
      faceValue: null,
    },
  },
});

// --------------------------------------------------
// NSE PROCESSING
// --------------------------------------------------

const processNse = (stocks, report) => {
  const rows = readCsv(NSE_FILE);

  report.nse.totalRows = rows.length;

  for (const row of rows) {
    const isin = normalizeIsin(row["ISIN NUMBER"]);

    if (!isValidIsin(isin)) {
      report.nse.invalidIsin++;
      continue;
    }

    if (!clean(row["SYMBOL"]) || !clean(row["NAME OF COMPANY"])) {
      report.nse.missingRequiredFields++;
      continue;
    }

    let stock = stocks.get(isin);

    if (!stock) {
      stock = createEmptyStock(isin);
      stocks.set(isin, stock);
    }

    stock.companyName =
      stock.companyName || clean(row["NAME OF COMPANY"]);

    stock.exchanges.nse = {
        listed: true,
        symbol: clean(row["SYMBOL"]),
        series: clean(row["SERIES"]),
        listingDate: clean(row["DATE OF LISTING"]),
        paidUpValue: clean(row["PAID UP VALUE"]),
        faceValue: clean(row["FACE VALUE"]),
    };

    report.nse.validRows++;
  }
};

// --------------------------------------------------
// BSE PROCESSING
// --------------------------------------------------

const processBse = (stocks, report) => {
  const rows = readCsv(BSE_FILE);

  report.bse.totalRows = rows.length;

  for (const row of rows) {
    // Only active equity securities.
    if (
      clean(row["Instrument"])?.toUpperCase() !== "EQUITY"
    ) {
      report.bse.nonEquity++;
      continue;
    }

    if (clean(row["Status"])?.toUpperCase() !== "ACTIVE") {
      report.bse.inactive++;
      continue;
    }

    const isin = normalizeIsin(row["ISIN No"]);

    if (!isValidIsin(isin)) {
      report.bse.invalidIsin++;
      continue;
    }

    if (!clean(row["Issuer Name"]) || !clean(row["Security Code"])) {
      report.bse.missingRequiredFields++;
      continue;
    }

    let stock = stocks.get(isin);

    if (!stock) {
      stock = createEmptyStock(isin);
      stocks.set(isin, stock);
    }

    // Preserve NSE company name when the NSE record exists.
    stock.companyName =
      stock.companyName || clean(row["Issuer Name"]);

    stock.exchanges.bse = {
      listed: true,
      securityCode: clean(row["Security Code"]),
      securityId: clean(row["Security Id"]),
      securityName: clean(row["Security Name"]),
      group: clean(row["Group"]),
      faceValue: clean(row["Face Value"]),
    };

    report.bse.validRows++;
  }
};

// --------------------------------------------------
// REPORT GENERATION
// --------------------------------------------------

const generateReport = (stocks, report) => {
  let both = 0;
  let nseOnly = 0;
  let bseOnly = 0;

  for (const stock of stocks.values()) {
    const nseListed = stock.exchanges.nse.listed;
    const bseListed = stock.exchanges.bse.listed;

    if (nseListed && bseListed) {
      both++;
    } else if (nseListed) {
      nseOnly++;
    } else if (bseListed) {
      bseOnly++;
    }
  }

  report.summary = {
    totalUniqueStocks: stocks.size,
    bothExchanges: both,
    nseOnly,
    bseOnly,
  };

  return report;
};

// --------------------------------------------------
// MONGODB BULK UPSERT
// --------------------------------------------------

const saveStocks = async (stocks, report) => {
  const stockArray = Array.from(stocks.values());

  const now = new Date();
  const CHUNK_SIZE = 500;

  for (let i = 0; i < stockArray.length; i += CHUNK_SIZE) {
    const chunk = stockArray.slice(i, i + CHUNK_SIZE);

    const operations = chunk.map((stock) => ({
      updateOne: {
        filter: { isin: stock.isin },

        update: {
          $set: {
            companyName: stock.companyName,
            exchanges: stock.exchanges,
            status: "ACTIVE",
            lastMasterImportAt: now,
          },

          $setOnInsert: {
            isin: stock.isin,
            classification: {
              macroEconomicSector: null,
              sector: null,
              industry: null,
              basicIndustry: null,
              source: null,
              updatedAt: null,
              status: "UNCLASSIFIED",
            },
          },
        },

        upsert: true,
      },
    }));

    const result = await Stock.bulkWrite(operations, {
      ordered: false,
    });

    report.database.inserted += result.upsertedCount || 0;
    report.database.modified += result.modifiedCount || 0;
  }
};

// --------------------------------------------------
// SAVE JSON REPORT
// --------------------------------------------------

const saveReport = (report) => {
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const reportPath = path.join(
    LOG_DIR,
    `stock-master-import-${timestamp}.json`
  );

  fs.writeFileSync(
    reportPath,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log("\nReport saved:", reportPath);
};

// --------------------------------------------------
// MAIN
// --------------------------------------------------

const importStockMaster = async () => {
  const report = {
    mode: COMMIT ? "COMMIT" : "DRY_RUN",

    nse: {
      totalRows: 0,
      validRows: 0,
      invalidIsin: 0,
      missingRequiredFields: 0,
    },

    bse: {
      totalRows: 0,
      validRows: 0,
      invalidIsin: 0,
      nonEquity: 0,
      inactive: 0,
      missingRequiredFields: 0,
    },

    summary: {},

    database: {
      inserted: 0,
      modified: 0,
    },

    startedAt: new Date(),
  };

  const stocks = new Map();

  try {
    console.log("\nStarting Stock Master Import...");
    console.log("Mode:", report.mode);

    processNse(stocks, report);
    processBse(stocks, report);

    generateReport(stocks, report);

    if (stocks.size === 0) {
      throw new Error("No valid stock records found.");
    }

    if (COMMIT) {
      if (!process.env.MONGODB_URI) {
        throw new Error("MONGO_URI is missing from .env");
      }

      await mongoose.connect(process.env.MONGODB_URI);

      console.log("\nConnected to MongoDB.");

      await saveStocks(stocks, report);
    } else {
      console.log("\nDRY RUN: MongoDB was not modified.");
    }

    report.finishedAt = new Date();

    console.log("\n========== IMPORT REPORT ==========");
    console.log(JSON.stringify(report, null, 2));

    saveReport(report);
  } catch (error) {
    console.error("\nStock import failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("\nMongoDB connection closed.");
    }
  }
};

importStockMaster();
