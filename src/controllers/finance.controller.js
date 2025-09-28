import Finance from "../models/finance.model.js";

// Get all transactions for a user
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, category, startDate, endDate, limit = 50, page = 1 } = req.query;

    // Build filter object
    const filter = { userId };
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Finance.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Finance.countDocuments(filter);

    res.status(200).json({
      transactions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total,
      },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get transaction by ID
export const getTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const transaction = await Finance.findOne({ _id: id, userId });
    
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create new transaction
export const createTransaction = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      type,
      amount,
      category,
      description,
      date,
      tags,
      recurring,
      recurringFrequency,
      recurringEndDate,
      notes,
    } = req.body;

    // Validate required fields
    if (!type || !amount || !category || !description) {
      return res.status(400).json({
        message: "Type, amount, category, and description are required",
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // Handle date properly to avoid timezone issues
    let transactionDate = new Date();
    if (date) {
      // If date is in YYYY-MM-DD format, create date at local midnight
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = date.split('-').map(Number);
        transactionDate = new Date(year, month - 1, day);
      } else {
        transactionDate = new Date(date);
      }
    }

    let endDate = null;
    if (recurringEndDate) {
      if (typeof recurringEndDate === 'string' && recurringEndDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = recurringEndDate.split('-').map(Number);
        endDate = new Date(year, month - 1, day);
      } else {
        endDate = new Date(recurringEndDate);
      }
    }

    const transaction = new Finance({
      userId,
      type,
      amount,
      category,
      description,
      date: transactionDate,
      tags: tags || [],
      recurring: recurring || false,
      recurringFrequency,
      recurringEndDate: endDate,
      notes,
    });

    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update transaction
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.userId;
    delete updateData._id;

    // Validate amount if provided
    if (updateData.amount && updateData.amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // Handle date properly to avoid timezone issues
    if (updateData.date) {
      if (typeof updateData.date === 'string' && updateData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = updateData.date.split('-').map(Number);
        updateData.date = new Date(year, month - 1, day);
      } else {
        updateData.date = new Date(updateData.date);
      }
    }

    if (updateData.recurringEndDate) {
      if (typeof updateData.recurringEndDate === 'string' && updateData.recurringEndDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = updateData.recurringEndDate.split('-').map(Number);
        updateData.recurringEndDate = new Date(year, month - 1, day);
      } else {
        updateData.recurringEndDate = new Date(updateData.recurringEndDate);
      }
    }

    const transaction = await Finance.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete transaction
export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const transaction = await Finance.findOneAndDelete({ _id: id, userId });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.status(200).json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get financial summary/statistics
export const getFinancialSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = { userId };
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    // Get income and expense totals
    const [incomeResult, expenseResult] = await Promise.all([
      Finance.aggregate([
        { $match: { ...dateFilter, type: "income" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Finance.aggregate([
        { $match: { ...dateFilter, type: "expense" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalIncome = incomeResult[0]?.total || 0;
    const totalExpense = expenseResult[0]?.total || 0;
    const netIncome = totalIncome - totalExpense;

    // Get category breakdown
    const categoryBreakdown = await Finance.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { type: "$type", category: "$category" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);
    
    console.log("Category breakdown from database:", categoryBreakdown);

    // Get recent transactions
    const recentTransactions = await Finance.find(dateFilter)
      .sort({ date: -1 })
      .limit(5);

    res.status(200).json({
      summary: {
        totalIncome,
        totalExpense,
        netIncome,
        transactionCount: recentTransactions.length,
      },
      categoryBreakdown,
      recentTransactions,
    });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
