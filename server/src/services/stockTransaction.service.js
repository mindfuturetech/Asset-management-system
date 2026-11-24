const mongoose = require("mongoose");

const StockTransaction = require("../models/StockTransaction");
const StockHolding = require("../models/StockHolding");
const Stock = require("../models/Stock");
const Person = require("../models/Person");

const {
  roundMoney,
  roundQuantity,
  calculateGrossAmount,
  calculateCharges,
  calculateNetAmount,
  recalculateHolding,
} = require("../utils/stockTransaction.helper");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isValidId = mongoose.isValidObjectId;

const normalizeText = (value) =>
  String(value || "").trim().replace(/\s+/g, " ").toUpperCase();

const recalculatePosition = async (
  { householdId, personId, stockId },
  session
) => {
  const history = await StockTransaction.find({
    householdId,
    personId,
    stockId,
    status: "ACTIVE",
  })
    .sort({ transactionDate: 1, createdAt: 1, _id: 1 })
    .session(session)
    .lean();

  const calculated = recalculateHolding(history);

  await StockHolding.findOneAndUpdate(
    { householdId, personId, stockId },
    {
      $set: calculated,
      $setOnInsert: { householdId, personId, stockId },
    },
    {
      upsert: true,
      new: true,
      session,
      setDefaultsOnInsert: true,
    }
  );

  return calculated;
};

const createStockTransaction = async (data) => {
  let {
    householdId,
    personId,
    isin,
    companyName,
    userId,
    transactionType,
    quantity,
    pricePerShare,
    transactionDate,
    exchange,
    brokerage = 0,
    otherCharges = 0,
    tradeId,
    brokerTradeId,
    idempotencyKey,
    notes = "",
  } = data;

  if (!isValidId(householdId) || !isValidId(personId) || !isValidId(userId)) {
    throw createError("Invalid household, person or user ID");
  }

  transactionType = String(transactionType || "").trim().toUpperCase();
  exchange = String(exchange || "").trim().toUpperCase();
  isin = String(isin || "").trim().toUpperCase();

  // Accept old request field temporarily
  tradeId = String(tradeId || brokerTradeId || "").trim();

  if (!isin) throw createError("ISIN is required");
  if (!tradeId) throw createError("TradeID is required");

  if (!["BUY", "SELL"].includes(transactionType)) {
    throw createError("transactionType must be BUY or SELL");
  }

  if (!["NSE", "BSE"].includes(exchange)) {
    throw createError("Exchange must be NSE or BSE");
  }

  quantity = Number(quantity);
  pricePerShare = Number(pricePerShare);
  brokerage = Number(brokerage);
  otherCharges = Number(otherCharges);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw createError("Quantity must be greater than zero");
  }

  if (!Number.isFinite(pricePerShare) || pricePerShare <= 0) {
    throw createError("Price per share must be greater than zero");
  }

  if (
    !Number.isFinite(brokerage) ||
    brokerage < 0 ||
    !Number.isFinite(otherCharges) ||
    otherCharges < 0
  ) {
    throw createError("Charges must be non-negative numbers");
  }

  quantity = roundQuantity(quantity);
  pricePerShare = roundMoney(pricePerShare);
  brokerage = roundMoney(brokerage);
  otherCharges = roundMoney(otherCharges);

  const parsedDate = new Date(transactionDate);
  if (!transactionDate || Number.isNaN(parsedDate.getTime())) {
    throw createError("Valid transaction date is required");
  }

  notes = String(notes || "").trim();
  if (notes.length > 1000) throw createError("Notes exceed 1000 characters");

  const person = await Person.findOne({
    _id: personId,
    householdId,
    status: "ACTIVE",
  }).lean();

  if (!person) throw createError("Person not found in household", 404);

  const stock = await Stock.findOne({
    isin,
    status: "ACTIVE",
  }).lean();

  if (!stock) throw createError(`Active stock not found for ISIN ${isin}`, 404);

  if (
    companyName &&
    normalizeText(companyName) !== normalizeText(stock.companyName)
  ) {
    throw createError(`Company name mismatch. Expected: ${stock.companyName}`);
  }

  const isListed =
    exchange === "NSE"
      ? stock.exchanges?.nse?.listed
      : stock.exchanges?.bse?.listed;

  if (!isListed) {
    throw createError(`${stock.companyName} is not listed on ${exchange}`);
  }

  const grossAmount = calculateGrossAmount(quantity, pricePerShare);
  const totalCharges = calculateCharges(brokerage, otherCharges);
  const netAmount = calculateNetAmount(
    transactionType,
    grossAmount,
    totalCharges
  );

  if (transactionType === "SELL" && netAmount < 0) {
    throw createError("SELL charges cannot exceed sale amount");
  }

  idempotencyKey = String(idempotencyKey || "").trim() || null;

  const session = await mongoose.startSession();
  let transactionId;

  try {
    await session.withTransaction(async () => {
      const duplicate = await StockTransaction.findOne({
        householdId,
        $or: [
          { tradeId },
          ...(idempotencyKey ? [{ idempotencyKey }] : []),
        ],
      })
        .session(session)
        .lean();

      if (duplicate) {
        throw createError("TradeID already exists in this household", 409);
      }

      const transaction = new StockTransaction({
        householdId,
        personId,
        stockId: stock._id,
        transactionType,
        quantity,
        pricePerShare,
        transactionDate: parsedDate,
        exchange,
        grossAmount,
        brokerage,
        otherCharges,
        totalCharges,
        netAmount,
        source: "MANUAL",
        tradeId,
        idempotencyKey,
        notes,
        createdBy: userId,
        status: "ACTIVE",
      });

      await transaction.save({ session });

      // Replays all historical events. Backdated BUY/SELL is supported.
      // An invalid historical SELL causes the transaction to roll back.
      await recalculatePosition(
        { householdId, personId, stockId: stock._id },
        session
      );

      transactionId = transaction._id;
    });

    return await StockTransaction.findById(transactionId)
      .populate("personId", "name relationship")
      .populate("stockId", "isin companyName exchanges classification")
      .populate("createdBy", "name email")
      .lean();
  } catch (error) {
    if (error.code === 11000) {
      throw createError("Duplicate TradeID or idempotencyKey", 409);
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

// Keep the existing GET transaction list and GET transaction by ID functions
// from your current stockTransaction.service.js below this point.
// They do not need to change for the TradeID/recalculation implementation.

const getStockTransactions = async ({
  householdId,
  accessScope,
  personIds,
  personId,
  stockId,
  isin,
  transactionType,
  fromDate,
  toDate,
  page = 1,
  limit = 20,
}) => {
  const filter = { householdId, status: "ACTIVE" };

  if (accessScope === "SELECTED_PEOPLE") {
    filter.personId = { $in: personIds || [] };
  }

  if (personId) {
    if (!isValidId(personId)) throw createError("Invalid personId");

    if (
      accessScope === "SELECTED_PEOPLE" &&
      !(personIds || []).some((id) => String(id) === String(personId))
    ) {
      throw createError("No access to this person's transactions", 403);
    }

    filter.personId = personId;
  }

  if (isin) {
    const stock = await Stock.findOne({
      isin: String(isin).trim().toUpperCase(),
    }).select("_id").lean();

    if (!stock) throw createError("Stock not found", 404);
    filter.stockId = stock._id;
  } else if (stockId) {
    if (!isValidId(stockId)) throw createError("Invalid stockId");
    filter.stockId = stockId;
  }

  if (transactionType) {
    transactionType = String(transactionType).toUpperCase();
    if (!["BUY", "SELL"].includes(transactionType)) {
      throw createError("Invalid transactionType");
    }
    filter.transactionType = transactionType;
  }

  if (fromDate || toDate) {
    filter.transactionDate = {};

    if (fromDate) {
      const d = new Date(fromDate);
      if (Number.isNaN(d.getTime())) throw createError("Invalid fromDate");
      filter.transactionDate.$gte = d;
    }

    if (toDate) {
      const d = new Date(toDate);
      if (Number.isNaN(d.getTime())) throw createError("Invalid toDate");
      filter.transactionDate.$lte = d;
    }

    if (
      filter.transactionDate.$gte &&
      filter.transactionDate.$lte &&
      filter.transactionDate.$gte > filter.transactionDate.$lte
    ) {
      throw createError("fromDate cannot be after toDate");
    }
  }

  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    StockTransaction.find(filter)
      .sort({ transactionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("personId", "name relationship")
      .populate("stockId", "isin companyName exchanges classification")
      .populate("createdBy", "name email")
      .lean(),
    StockTransaction.countDocuments(filter),
  ]);

  return {
    transactions,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getStockTransactionById = async ({
  householdId,
  transactionId,
  accessScope,
  personIds,
}) => {
  if (!isValidId(transactionId)) throw createError("Invalid transaction ID");

  const filter = {
    _id: transactionId,
    householdId,
    status: "ACTIVE",
  };

  if (accessScope === "SELECTED_PEOPLE") {
    filter.personId = { $in: personIds || [] };
  }

  const transaction = await StockTransaction.findOne(filter)
    .populate("personId", "name relationship")
    .populate("stockId", "isin companyName exchanges classification")
    .populate("createdBy", "name email")
    .lean();

  if (!transaction) throw createError("Transaction not found", 404);
  return transaction;
};

module.exports = {
  createStockTransaction,
  getStockTransactions,
  getStockTransactionById,
};