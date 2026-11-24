
const mongoose = require("mongoose");
const StockHolding = require("../models/StockHolding");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isValidId = (id) => mongoose.isValidObjectId(id);

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getStockHoldings = async ({
  householdId,
  accessScope,
  personIds = [],
  personId,
  sector,
  search,
  sortBy = "investedAmount",
  sortOrder = "desc",
  page = 1,
  limit = 20,
}) => {
  if (!isValidId(householdId)) {
    throw createError("Invalid householdId");
  }

  // Base filter: household + currently held shares
  const baseMatch = {
    householdId: new mongoose.Types.ObjectId(householdId),
    quantity: { $gt: 0 },
  };

  // Restrict access for selected-person memberships
  if (accessScope === "SELECTED_PEOPLE") {
    const validPersonIds = (personIds || [])
      .filter(isValidId)
      .map((id) => new mongoose.Types.ObjectId(id));

    baseMatch.personId = { $in: validPersonIds };
  }

  // Optional person filter
  if (personId) {
    if (!isValidId(personId)) {
      throw createError("Invalid personId");
    }

    if (
      accessScope === "SELECTED_PEOPLE" &&
      !(personIds || []).some(
        (id) => id.toString() === personId.toString()
      )
    ) {
      throw createError(
        "You do not have access to this person's portfolio",
        403
      );
    }

    baseMatch.personId = new mongoose.Types.ObjectId(personId);
  }

  // Normalize pagination
  page = Math.max(1, parseInt(page, 10) || 1);

  limit = Math.min(
    100,
    Math.max(1, parseInt(limit, 10) || 20)
  );

  const skip = (page - 1) * limit;

  // Allow only known sorting fields
  const allowedSortFields = [
    "investedAmount",
    "quantity",
    "averageBuyPrice",
    "realizedProfitLoss",
    "totalBuyQuantity",
    "totalSellQuantity",
    "companyName",
  ];

  if (!allowedSortFields.includes(sortBy)) {
    throw createError(
      `Invalid sortBy. Allowed values: ${allowedSortFields.join(", ")}`
    );
  }

  if (!["asc", "desc"].includes(String(sortOrder).toLowerCase())) {
    throw createError("sortOrder must be asc or desc");
  }

  const sortDirection =
    String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

  // Denominator for allocation percentage:
  // all holdings for the selected authorized people,
  // NOT the filtered search or sector result.
  const totalResult = await StockHolding.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: null,
        totalInvested: { $sum: "$investedAmount" },
      },
    },
  ]);

  const totalInvested = totalResult[0]?.totalInvested || 0;

  // Join stock master and person data
  const pipeline = [
    { $match: baseMatch },

    {
      $lookup: {
        from: "stocks",
        localField: "stockId",
        foreignField: "_id",
        as: "stock",
      },
    },
    { $unwind: "$stock" },

    {
      $lookup: {
        from: "people",
        localField: "personId",
        foreignField: "_id",
        as: "person",
      },
    },
    {
      $unwind: {
        path: "$person",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  // Optional sector filter
  if (sector) {
    const normalizedSector = String(sector).trim();

    if (normalizedSector.toLowerCase() === "unclassified") {
      pipeline.push({
        $match: {
          $or: [
            { "stock.classification.sector": null },
            { "stock.classification.sector": "" },
          ],
        },
      });
    } else {
      pipeline.push({
        $match: {
          "stock.classification.sector": normalizedSector,
        },
      });
    }
  }

  // Optional company name or ISIN search
  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");

    pipeline.push({
      $match: {
        $or: [
          { "stock.companyName": regex },
          { "stock.isin": regex },
          { "stock.exchanges.nse.symbol": regex },
          { "stock.exchanges.bse.securityId": regex },
        ],
      },
    });
  }

  // Sort
  const sortField =
    sortBy === "companyName"
      ? "stock.companyName"
      : sortBy;

  pipeline.push({
    $sort: {
      [sortField]: sortDirection,
      _id: 1,
    },
  });

  // Pagination
  pipeline.push(
    { $skip: skip },
    { $limit: limit }
  );

  // Response projection
  pipeline.push({
    $project: {
      _id: 1,

      householdId: 1,

      personId: {
        _id: "$person._id",
        name: "$person.name",
        relationship: "$person.relationship",
      },

      stockId: "$stock._id",
      isin: "$stock.isin",
      companyName: "$stock.companyName",

      sector: {
        $ifNull: [
          "$stock.classification.sector",
          "Unclassified",
        ],
      },

      industry: "$stock.classification.industry",

      exchanges: "$stock.exchanges",

      totalBuyQuantity: 1,
      totalSellQuantity: 1,
      quantity: 1,

      totalBuyValue: 1,
      totalBuyCharges: 1,
      totalSellValue: 1,
      totalSellCharges: 1,

      investedAmount: 1,
      averageBuyPrice: 1,
      realizedProfitLoss: 1,
      lastTransactionAt: 1,

      allocationPercentage: {
        $cond: [
          { $gt: [totalInvested, 0] },
          {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      "$investedAmount",
                      totalInvested,
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
          0,
        ],
      },
    },
  });

  const [holdings, totalCount] = await Promise.all([
    StockHolding.aggregate(pipeline),

    StockHolding.aggregate([
      { $match: baseMatch },

      {
        $lookup: {
          from: "stocks",
          localField: "stockId",
          foreignField: "_id",
          as: "stock",
        },
      },
      { $unwind: "$stock" },

      {
        $lookup: {
          from: "people",
          localField: "personId",
          foreignField: "_id",
          as: "person",
        },
      },
      {
        $unwind: {
          path: "$person",
          preserveNullAndEmptyArrays: true,
        },
      },

      ...(sector
        ? [
            {
              $match:
                String(sector).trim().toLowerCase() ===
                "unclassified"
                  ? {
                      $or: [
                        {
                          "stock.classification.sector":
                            null,
                        },
                        {
                          "stock.classification.sector":
                            "",
                        },
                      ],
                    }
                  : {
                      "stock.classification.sector":
                        String(sector).trim(),
                    },
            },
          ]
        : []),

      ...(search
        ? [
            {
              $match: {
                $or: [
                  {
                    "stock.companyName": new RegExp(
                      escapeRegex(search.trim()),
                      "i"
                    ),
                  },
                  {
                    "stock.isin": new RegExp(
                      escapeRegex(search.trim()),
                      "i"
                    ),
                  },
                  {
                    "stock.exchanges.nse.symbol":
                      new RegExp(escapeRegex(search.trim()), "i"),
                  },
                  {
                    "stock.exchanges.bse.securityId":
                      new RegExp(escapeRegex(search.trim()), "i"),
                  },
                ],
              },
            },
          ]
        : []),

      { $count: "total" },
    ]),
  ]);

  const filteredTotal = totalCount[0]?.total || 0;

  return {
    holdings,
    summary: {
      totalInvested,
      totalCompanies: filteredTotal,
    },
    pagination: {
      total: filteredTotal,
      page,
      limit,
      totalPages: Math.ceil(filteredTotal / limit),
    },
  };
};

module.exports = {
  getStockHoldings,
};
