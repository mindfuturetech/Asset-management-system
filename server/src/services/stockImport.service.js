const crypto = require("crypto");
const mongoose = require("mongoose");

const StockTransaction = require("../models/StockTransaction");
const StockHolding = require("../models/StockHolding");
const StockImportBatch = require("../models/StockImportBatch");
const Person = require("../models/Person");
const Stock = require("../models/Stock");

const {
  roundMoney,
  roundQuantity,
  calculateGrossAmount,
  calculateCharges,
  calculateNetAmount,
  recalculateHolding,
} = require("../utils/stockTransaction.helper");

const { parseExcelBuffer } = require("../utils/stockExcel.helper");

const error = (message, statusCode = 400) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

const validId = mongoose.isValidObjectId;

const parseNumber = (value) => {
  if (value === "" || value == null) return NaN;
  return Number(String(value).replace(/,/g, "").trim());
};

const parseDate = (value) => {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  if (typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(String(value || "").trim());
  return value && !isNaN(date.getTime()) ? date : null;
};

const hasPersonAccess = (membership, personId) =>
  membership?.accessScope === "ALL_PEOPLE" ||
  (membership?.personIds || []).some(
    (id) => String(id) === String(personId)
  );

const getFileHash = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

const validateRows = async ({ rows, householdId, membership }) => {
  const resolved = [];
  const errors = [];
  const seenTradeIds = new Map();

  for (const item of rows) {
    const row = item.rowData || {};
    const rowErrors = [];
    const add = (code, field, message) => rowErrors.push({ code, field, message });

    const personId = String(row.personId || "").trim();
    const isin = String(row.isin || "").trim().toUpperCase();
    const tradeId = String(row.tradeId || "").trim();
    const transactionType = String(row.transactionType || "").trim().toUpperCase();
    const exchange = String(row.exchange || "").trim().toUpperCase();

    let quantity = parseNumber(row.quantity);
    let pricePerShare = parseNumber(row.pricePerShare);
    let brokerage = row.brokerage === "" || row.brokerage == null
      ? 0 : parseNumber(row.brokerage);
    let otherCharges = row.otherCharges === "" || row.otherCharges == null
      ? 0 : parseNumber(row.otherCharges);
    const transactionDate = parseDate(row.transactionDate);

    if (!personId || !validId(personId)) {
      add("INVALID_PERSON", "personId", "Valid PersonID is required");
    }

    if (!isin) add("REQUIRED", "isin", "ISIN is required");
    if (!tradeId) add("REQUIRED", "tradeId", "TradeID is required");

    if (tradeId) {
      if (seenTradeIds.has(tradeId)) {
        add("DUPLICATE_TRADE_ID", "tradeId",
          `TradeID is duplicated in Excel row ${seenTradeIds.get(tradeId)}`);
      } else {
        seenTradeIds.set(tradeId, item.excelRow);
      }
    }

    if (!["BUY", "SELL"].includes(transactionType)) {
      add("INVALID_TYPE", "transactionType", "Must be BUY or SELL");
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      add("INVALID_QUANTITY", "quantity", "Quantity must be greater than zero");
    }
    if (!Number.isFinite(pricePerShare) || pricePerShare <= 0) {
      add("INVALID_PRICE", "pricePerShare", "Price must be greater than zero");
    }
    if (!Number.isFinite(brokerage) || brokerage < 0 ||
        !Number.isFinite(otherCharges) || otherCharges < 0) {
      add("INVALID_CHARGES", "charges", "Charges must be non-negative numbers");
    }
    if (!transactionDate) {
      add("INVALID_DATE", "transactionDate", "Valid transaction date is required");
    }
    if (!["NSE", "BSE"].includes(exchange)) {
      add("INVALID_EXCHANGE", "exchange", "Exchange must be NSE or BSE");
    }

    let person = null;
    let stock = null;

    if (validId(personId)) {
      person = await Person.findOne({
        _id: personId,
        householdId,
        status: "ACTIVE",
      }).lean();

      if (!person) {
        add("PERSON_NOT_FOUND", "personId", "Person is not active in this household");
      } else if (!hasPersonAccess(membership, personId)) {
        add("ACCESS_DENIED", "personId", "You cannot import for this Person");
      }
    }

    if (isin) {
      stock = await Stock.findOne({ isin, status: "ACTIVE" }).lean();

      if (!stock) {
        add("STOCK_NOT_FOUND", "isin", "Active stock not found for ISIN");
      } else if (
        ["NSE", "BSE"].includes(exchange) &&
        !(exchange === "NSE"
          ? stock.exchanges?.nse?.listed
          : stock.exchanges?.bse?.listed)
      ) {
        add("NOT_LISTED", "exchange", `${stock.companyName} is not listed on ${exchange}`);
      }
    }

    if (rowErrors.length) {
      errors.push({
        excelRow: item.excelRow,
        personId,
        isin,
        tradeId,
        rowData: row,
        errors: rowErrors,
      });
      continue;
    }

    quantity = roundQuantity(quantity);
    pricePerShare = roundMoney(pricePerShare);
    brokerage = roundMoney(brokerage);
    otherCharges = roundMoney(otherCharges);

    const grossAmount = calculateGrossAmount(quantity, pricePerShare);
    const totalCharges = calculateCharges(brokerage, otherCharges);
    const netAmount = calculateNetAmount(transactionType, grossAmount, totalCharges);

    if (transactionType === "SELL" && netAmount < 0) {
      errors.push({
        excelRow: item.excelRow,
        personId,
        isin,
        tradeId,
        rowData: row,
        errors: [{
          code: "SELL_CHARGES_EXCEED",
          field: "charges",
          message: "SELL charges cannot exceed gross amount",
        }],
      });
      continue;
    }

    resolved.push({
      excelRow: item.excelRow,
      rowData: row,
      householdId,
      personId: person._id,
      stockId: stock._id,
      stockName: stock.companyName,
      isin,
      tradeId,
      transactionType,
      quantity,
      pricePerShare,
      transactionDate,
      exchange,
      brokerage,
      otherCharges,
      grossAmount,
      totalCharges,
      netAmount,
      notes: String(row.notes || "").trim(),
    });
  }

  return { resolved, errors };
};

// Existing events first on same date, imported rows in Excel row order.
const sortForImportValidation = (a, b) => {
  const diff = new Date(a.transactionDate) - new Date(b.transactionDate);
  if (diff) return diff;

  if (a.isImport !== b.isImport) return a.isImport ? 1 : -1;

  if (a.isImport) return Number(a.excelRow) - Number(b.excelRow);

  return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
};

const validateHistory = async ({ candidates, session }) => {
  const errors = [];
  const accepted = [];
  const groups = new Map();

  for (const row of candidates) {
    const key = `${row.personId}_${row.stockId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  for (const groupRows of groups.values()) {
    const first = groupRows[0];

    const existing = await StockTransaction.find({
      householdId: first.householdId,
      personId: first.personId,
      stockId: first.stockId,
      status: "ACTIVE",
    }).session(session).lean();

    const existingTradeIds = new Set(existing.map((t) => t.tradeId).filter(Boolean));
    for (const row of groupRows) {
      if (existingTradeIds.has(row.tradeId)) {
        errors.push({
          excelRow: row.excelRow,
          personId: row.personId,
          isin: row.isin,
          tradeId: row.tradeId,
          rowData: row.rowData,
          errors: [{
            code: "DUPLICATE_TRADE_ID",
            field: "tradeId",
            message: "TradeID already exists in transaction history",
          }],
        });
      }
    }

    const validGroupRows = groupRows.filter((row) =>
      !existingTradeIds.has(row.tradeId)
    );

    const events = [
      ...existing.map((t) => ({ ...t, isImport: false })),
      ...validGroupRows.map((t) => ({ ...t, isImport: true })),
    ].sort(sortForImportValidation);

    let runningQuantity = 0;

    for (const event of events) {
      if (event.transactionType === "BUY") {
        runningQuantity = roundQuantity(runningQuantity + Number(event.quantity));
        if (event.isImport) accepted.push(event);
        continue;
      }

      if (Number(event.quantity) > runningQuantity) {
        if (event.isImport) {
          errors.push({
            excelRow: event.excelRow,
            personId: event.personId,
            isin: event.isin,
            tradeId: event.tradeId,
            rowData: event.rowData,
            errors: [{
              code: "INSUFFICIENT_HOLDINGS",
              field: "quantity",
              message: `Shares available on this date: ${runningQuantity}; requested: ${event.quantity}`,
            }],
          });
        } else {
          throw error(
            "Existing transaction history contains a SELL with insufficient shares. Please fix history first."
          );
        }
        continue;
      }

      runningQuantity = roundQuantity(runningQuantity - Number(event.quantity));
      if (event.isImport) accepted.push(event);
    }
  }

  return { accepted, errors };
};

const countFailedRows = (errors) =>
  new Set(errors.map((e) => e.excelRow)).size;

const buildPreview = (rows, accepted, errors, fileName) => ({
  fileName,
  totalRows: rows.length,
  validRows: accepted.length,
  failedRows: countFailedRows(errors),
  canImport: errors.length === 0,
  preview: accepted.map((row) => ({
    excelRow: row.excelRow,
    personId: row.personId,
    companyName: row.stockName,
    isin: row.isin,
    tradeId: row.tradeId,
    transactionType: row.transactionType,
    quantity: row.quantity,
    pricePerShare: row.pricePerShare,
    transactionDate: row.transactionDate,
    exchange: row.exchange,
    netAmount: row.netAmount,
  })),
  errors: errors.map((e) => ({
    excelRow: e.excelRow,
    personId: e.personId,
    isin: e.isin,
    tradeId: e.tradeId,
    rowData: e.rowData,
    errors: e.errors,
  })),
});

const previewStockImport = async ({ householdId, membership, file }) => {
  if (!file?.buffer) throw error("Excel file is required");

  const rows = parseExcelBuffer(file.buffer);
  const { resolved, errors: validationErrors } = await validateRows({
    rows,
    householdId,
    membership,
  });

  const session = await mongoose.startSession();

  try {
    let historyResult = { accepted: [], errors: [] };

    await session.withTransaction(async () => {
      historyResult = await validateHistory({ candidates: resolved, session });
    });

    const errors = [...validationErrors, ...historyResult.errors];

    return buildPreview(
      rows,
      historyResult.accepted,
      errors,
      file.originalname
    );
  } finally {
    await session.endSession();
  }
};

const importStockTransactions = async ({
  householdId,
  userId,
  membership,
  file,
}) => {
  if (!file?.buffer) throw error("Excel file is required");
  if (!validId(householdId) || !validId(userId)) {
    throw error("Invalid household or user ID");
  }

  const fileHash = getFileHash(file.buffer);
  const rows = parseExcelBuffer(file.buffer);

  const { resolved, errors: rowErrors } = await validateRows({
    rows,
    householdId,
    membership,
  });

  const session = await mongoose.startSession();
  let batchId;

  try {
    await session.withTransaction(async () => {
      // Recheck file duplicate inside transaction.
      const existingBatch = await StockImportBatch.findOne({
        householdId,
        fileHash,
      }).session(session).lean();

      if (existingBatch) {
        throw error("This Excel file was already imported", 409);
      }

      const historyResult = await validateHistory({
        candidates: resolved,
        session,
      });

      const allErrors = [...rowErrors, ...historyResult.errors];

      // All-or-nothing: no batch or transaction writes if any row fails.
      if (allErrors.length) {
        const validationError = error(
          "Excel import rejected. Correct all failed rows and preview again.",
          422
        );
        validationError.validationErrors = allErrors.map((e) => ({
          excelRow: e.excelRow,
          personId: e.personId,
          isin: e.isin,
          tradeId: e.tradeId,
          rowData: e.rowData,
          errors: e.errors,
        }));
        throw validationError;
      }

      const accepted = historyResult.accepted;

      const batch = await StockImportBatch.create(
        [{
          householdId,
          uploadedBy: userId,
          fileName: file.originalname,
          fileSize: file.size,
          fileHash,
          status: "PROCESSING",
          totalRows: rows.length,
          startedAt: new Date(),
        }],
        { session }
      );

      batchId = batch[0]._id;

      for (const row of accepted) {
        await StockTransaction.create(
          [{
            householdId,
            personId: row.personId,
            stockId: row.stockId,
            transactionType: row.transactionType,
            quantity: row.quantity,
            pricePerShare: row.pricePerShare,
            transactionDate: row.transactionDate,
            exchange: row.exchange,
            grossAmount: row.grossAmount,
            brokerage: row.brokerage,
            otherCharges: row.otherCharges,
            totalCharges: row.totalCharges,
            netAmount: row.netAmount,
            source: "EXCEL_IMPORT",
            importBatchId: batchId,
            tradeId: row.tradeId,
            notes: row.notes,
            createdBy: userId,
            status: "ACTIVE",
          }],
          { session }
        );
      }

      // Recalculate holdings for every affected person + stock.
      const affected = new Map();
      for (const row of accepted) {
        const key = `${row.personId}_${row.stockId}`;
        affected.set(key, {
          householdId,
          personId: row.personId,
          stockId: row.stockId,
        });
      }

      for (const key of affected.values()) {
        const history = await StockTransaction.find({
          householdId: key.householdId,
          personId: key.personId,
          stockId: key.stockId,
          status: "ACTIVE",
        })
          .sort({ transactionDate: 1, createdAt: 1, _id: 1 })
          .session(session)
          .lean();

        const calculated = recalculateHolding(history);

        await StockHolding.findOneAndUpdate(
          {
            householdId: key.householdId,
            personId: key.personId,
            stockId: key.stockId,
          },
          {
            $set: calculated,
            $setOnInsert: {
              householdId: key.householdId,
              personId: key.personId,
              stockId: key.stockId,
            },
          },
          {
            upsert: true,
            new: true,
            session,
            setDefaultsOnInsert: true,
          }
        );
      }

      const completedBatch = await StockImportBatch.findById(batchId).session(session);
      completedBatch.importedRows = accepted.length;
      completedBatch.failedRows = 0;
      completedBatch.skippedRows = 0;
      completedBatch.status = "COMPLETED";
      completedBatch.completedAt = new Date();
      await completedBatch.save({ session });
    });

    return StockImportBatch.findById(batchId)
      .populate("uploadedBy", "name email")
      .lean();
  } catch (e) {
    if (e.code === 11000) throw error("Duplicate TradeID or file import", 409);
    throw e;
  } finally {
    await session.endSession();
  }
};

const getStockImports = async ({ householdId, page = 1, limit = 20 }) => {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [batches, total] = await Promise.all([
    StockImportBatch.find({ householdId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("uploadedBy", "name email")
      .lean(),
    StockImportBatch.countDocuments({ householdId }),
  ]);

  return {
    batches,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getStockImportById = async ({ householdId, batchId }) => {
  if (!validId(batchId)) throw error("Invalid import batch ID");

  const batch = await StockImportBatch.findOne({ _id: batchId, householdId })
    .populate("uploadedBy", "name email")
    .lean();

  if (!batch) throw error("Import batch not found", 404);
  return batch;
};

module.exports = {
  previewStockImport,
  importStockTransactions,
  getStockImports,
  getStockImportById,
  getFileHash,
};