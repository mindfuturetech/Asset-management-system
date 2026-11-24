const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const roundQuantity = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 1000000) / 1000000;

const calculateGrossAmount = (quantity, pricePerShare) =>
  roundMoney(quantity * pricePerShare);

const calculateCharges = (brokerage, otherCharges) =>
  roundMoney(brokerage + otherCharges);

const calculateNetAmount = (type, gross, charges) =>
  type === "BUY"
    ? roundMoney(gross + charges)
    : roundMoney(gross - charges);

/**
 * Replays all ACTIVE transactions in chronological order.
 * Used by both manual transactions and Excel imports.
 */
const recalculateHolding = (transactions) => {
  let totalBuyQuantity = 0;
  let totalSellQuantity = 0;
  let quantity = 0;

  let totalBuyValue = 0;
  let totalBuyCharges = 0;
  let totalSellValue = 0;
  let totalSellCharges = 0;

  let investedAmount = 0;
  let realizedProfitLoss = 0;
  let lastTransactionAt = null;

  for (const tx of transactions) {
    const qty = Number(tx.quantity);
    const gross = Number(tx.grossAmount);
    const charges = Number(tx.totalCharges || 0);
    const net = Number(tx.netAmount);

    if (tx.transactionType === "BUY") {
      totalBuyQuantity = roundQuantity(totalBuyQuantity + qty);
      totalBuyValue = roundMoney(totalBuyValue + gross);
      totalBuyCharges = roundMoney(totalBuyCharges + charges);

      quantity = roundQuantity(quantity + qty);
      investedAmount = roundMoney(investedAmount + gross + charges);
    } else {
      if (qty > quantity) {
        const error = new Error(
          `SELL quantity ${qty} exceeds available quantity ${quantity}`
        );
        error.statusCode = 400;
        throw error;
      }

      const averageCost = investedAmount / quantity;
      const costBasisSold = roundMoney(averageCost * qty);

      totalSellQuantity = roundQuantity(totalSellQuantity + qty);
      totalSellValue = roundMoney(totalSellValue + gross);
      totalSellCharges = roundMoney(totalSellCharges + charges);

      quantity = roundQuantity(quantity - qty);

      investedAmount =
        quantity <= 0
          ? 0
          : roundMoney(investedAmount - costBasisSold);

      realizedProfitLoss = roundMoney(
        realizedProfitLoss + net - costBasisSold
      );
    }

    lastTransactionAt = tx.transactionDate;
  }

  return {
    totalBuyQuantity,
    totalSellQuantity,
    quantity,
    totalBuyValue,
    totalBuyCharges,
    totalSellValue,
    totalSellCharges,
    investedAmount: Math.max(0, investedAmount),
    averageBuyPrice:
      quantity > 0 ? roundMoney(investedAmount / quantity) : 0,
    realizedProfitLoss,
    lastTransactionAt,
  };
};

module.exports = {
  roundMoney,
  roundQuantity,
  calculateGrossAmount,
  calculateCharges,
  calculateNetAmount,
  recalculateHolding,
};