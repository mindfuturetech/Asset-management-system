
const stockTransactionService = require("../services/stockTransaction.service");

// ---------------------------------------------------------
// CREATE BUY / SELL
// ---------------------------------------------------------

const createStockTransaction = async (req, res, next) => {
  try {
    const transaction =
      await stockTransactionService.createStockTransaction({
        householdId: req.params.householdId,

        personId: req.body.personId,
        isin: req.body.isin,
        companyName: req.body.companyName,

        userId: req.user.id,

        transactionType: req.body.transactionType,
        quantity: req.body.quantity,
        pricePerShare: req.body.pricePerShare,
        transactionDate: req.body.transactionDate,
        exchange: req.body.exchange,

        brokerage: req.body.brokerage,
        otherCharges: req.body.otherCharges,

        brokerTradeId: req.body.brokerTradeId,
        idempotencyKey: req.body.idempotencyKey,
        notes: req.body.notes,
      });

    return res.status(201).json({
      success: true,
      message: `${transaction.transactionType} transaction created successfully`,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------
// GET TRANSACTIONS
// ---------------------------------------------------------

const getStockTransactions = async (req, res, next) => {
  try {
    const result =
      await stockTransactionService.getStockTransactions({
        householdId: req.params.householdId,

        accessScope: req.householdAccess.accessScope,
        personIds: req.householdAccess.personIds,

        personId: req.query.personId,
        stockId: req.query.stockId,
        isin: req.query.isin,

        transactionType: req.query.transactionType,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,

        page: req.query.page,
        limit: req.query.limit,
      });

    return res.status(200).json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------
// GET SINGLE TRANSACTION
// ---------------------------------------------------------

const getStockTransactionById = async (req, res, next) => {
  try {
    const transaction =
      await stockTransactionService.getStockTransactionById({
        householdId: req.params.householdId,
        transactionId: req.params.transactionId,

        accessScope: req.householdAccess.accessScope,
        personIds: req.householdAccess.personIds,
      });

    return res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStockTransaction,
  getStockTransactions,
  getStockTransactionById,
};
