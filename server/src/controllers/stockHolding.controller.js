
const stockHoldingService = require("../services/stockHolding.service");

const getStockHoldings = async (req, res, next) => {
  try {
    const result = await stockHoldingService.getStockHoldings({
      householdId: req.params.householdId,

      // Existing household access middleware
      accessScope: req.householdAccess.accessScope,
      personIds: req.householdAccess.personIds,

      // Optional filters
      personId: req.query.personId,
      sector: req.query.sector,
      search: req.query.search,

      // Sorting and pagination
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      data: result.holdings,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStockHoldings,
};
