const service = require("../services/stockImport.service");

const previewStockImport = async (req, res, next) => {
  try {
    const data = await service.previewStockImport({
      householdId: req.params.householdId,
      membership: req.householdAccess,
      file: req.file,
    });

    return res.status(200).json({
      success: true,
      message: "Import preview generated",
      data,
    });
  } catch (err) {
    next(err);
  }
};

const importStockTransactions = async (req, res, next) => {
  try {
    const data = await service.importStockTransactions({
      householdId: req.params.householdId,
      userId: req.user.id,
      membership: req.householdAccess,
      file: req.file,
    });

    return res.status(201).json({
      success: true,
      message: "Stock transactions imported successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};

const getStockImports = async (req, res, next) => {
  try {
    const data = await service.getStockImports({
      householdId: req.params.householdId,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getStockImportById = async (req, res, next) => {
  try {
    const data = await service.getStockImportById({
      householdId: req.params.householdId,
      batchId: req.params.batchId,
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  previewStockImport,
  importStockTransactions,
  getStockImports,
  getStockImportById,
};