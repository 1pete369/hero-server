import FinancePlanner from "../models/financePlanner.model.js";
import Finance from "../models/finance.model.js";

// Bucket mapping for transactions
const CATEGORY_TO_BUCKET = {
  // Income - not categorized into buckets
  salary: null,
  freelance: null,
  investment: null,
  business: null,
  gift: null,
  other_income: null,
  
  // Essentials
  bills: "ESSENTIALS",
  food: "ESSENTIALS",
  transportation: "ESSENTIALS",
  healthcare: "ESSENTIALS",
  
  // Discretionary
  entertainment: "DISCRETIONARY",
  shopping: "DISCRETIONARY",
  travel: "DISCRETIONARY",
  subscriptions: "DISCRETIONARY",
  education: "DISCRETIONARY",
  other_expense: "DISCRETIONARY",
};

// Get or create planner profile
export const getPlannerProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    let profile = await FinancePlanner.findOne({ userId });

    if (!profile) {
      // Create default profile
      profile = new FinancePlanner({
        userId,
        incomeUsd: 0,
        caps: {
          INVEST: 25,
          SINKING: 10,
          ESSENTIALS: 55,
          DISCRETIONARY: 10,
        },
        plannedInvestUsd: 0,
        plannedSinkingUsd: 0,
        sinkingLines: [],
        emergencyFundUsd: 0,
      });
      await profile.save();
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Error fetching planner profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update planner profile
export const updatePlannerProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.userId;
    delete updateData._id;

    let profile = await FinancePlanner.findOne({ userId });

    if (!profile) {
      profile = new FinancePlanner({
        userId,
        ...updateData,
      });
    } else {
      Object.assign(profile, updateData);
    }

    await profile.save();
    res.status(200).json(profile);
  } catch (error) {
    console.error("Error updating planner profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get planner dashboard data for a specific month
export const getPlannerDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month } = req.query; // Format: YYYY-MM

    // Parse month or use current
    let year, monthNum;
    if (month && month.match(/^\d{4}-\d{2}$/)) {
      [year, monthNum] = month.split("-").map(Number);
    } else {
      const now = new Date();
      year = now.getFullYear();
      monthNum = now.getMonth() + 1;
    }

    // Get profile
    const profile = await FinancePlanner.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: "Planner profile not found. Please set up your profile first." });
    }

    // Calculate date range for the month
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59));

    // Get all transactions for the month
    const transactions = await Finance.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
      type: "expense",
    });

    // Calculate totals by bucket
    const totals = {
      INVEST: 0,
      SINKING: 0,
      ESSENTIALS: 0,
      DISCRETIONARY: 0,
    };

    const subcategoryTotals = {};

    transactions.forEach((transaction) => {
      const bucket = CATEGORY_TO_BUCKET[transaction.category];
      if (bucket) {
        totals[bucket] += transaction.amount;
        
        // Track subcategory totals
        if (!subcategoryTotals[bucket]) {
          subcategoryTotals[bucket] = {};
        }
        if (!subcategoryTotals[bucket][transaction.category]) {
          subcategoryTotals[bucket][transaction.category] = 0;
        }
        subcategoryTotals[bucket][transaction.category] += transaction.amount;
      }
    });

    // Add planned transfers to actuals
    const actualInvest = totals.INVEST + profile.plannedInvestUsd;
    const actualSinking = totals.SINKING + profile.plannedSinkingUsd;

    // Calculate derived caps
    const capInvest = (profile.caps.INVEST / 100) * profile.incomeUsd;
    const capSinking = (profile.caps.SINKING / 100) * profile.incomeUsd;
    const capEssentials = (profile.caps.ESSENTIALS / 100) * profile.incomeUsd;
    const capDiscretionary = (profile.caps.DISCRETIONARY / 100) * profile.incomeUsd;

    // Calculate KPIs
    const savingsRate = profile.incomeUsd > 0 
      ? (actualInvest + actualSinking) / profile.incomeUsd 
      : 0;
    
    const essentialsShare = profile.incomeUsd > 0 
      ? totals.ESSENTIALS / profile.incomeUsd 
      : 0;
    
    const avgMonthlyExpenses = totals.ESSENTIALS + totals.DISCRETIONARY;
    const runway = avgMonthlyExpenses > 0 
      ? profile.emergencyFundUsd / avgMonthlyExpenses 
      : null;

    // Calculate indicators
    const getIndicator = (value, target, isMinimum) => {
      if (isMinimum) {
        if (value >= target) return "green";
        if (value >= target - 0.05) return "yellow";
        return "red";
      } else {
        if (value <= target) return "green";
        if (value <= target + 0.05) return "yellow";
        return "red";
      }
    };

    const savingsIndicator = getIndicator(savingsRate, 0.35, true);
    const essentialsIndicator = getIndicator(essentialsShare, 0.55, false);

    // Calculate drifts
    const drifts = [
      {
        bucket: "INVEST",
        cap: capInvest,
        actual: actualInvest,
        delta: actualInvest - capInvest,
        breached: actualInvest > capInvest,
        indicator: actualInvest <= capInvest ? "green" : (actualInvest <= capInvest * 1.05 ? "yellow" : "red"),
      },
      {
        bucket: "SINKING",
        cap: capSinking,
        actual: actualSinking,
        delta: actualSinking - capSinking,
        breached: actualSinking > capSinking,
        indicator: actualSinking <= capSinking ? "green" : (actualSinking <= capSinking * 1.05 ? "yellow" : "red"),
      },
      {
        bucket: "ESSENTIALS",
        cap: capEssentials,
        actual: totals.ESSENTIALS,
        delta: totals.ESSENTIALS - capEssentials,
        breached: totals.ESSENTIALS > capEssentials,
        indicator: totals.ESSENTIALS <= capEssentials ? "green" : (totals.ESSENTIALS <= capEssentials * 1.05 ? "yellow" : "red"),
      },
      {
        bucket: "DISCRETIONARY",
        cap: capDiscretionary,
        actual: totals.DISCRETIONARY,
        delta: totals.DISCRETIONARY - capDiscretionary,
        breached: totals.DISCRETIONARY > capDiscretionary,
        indicator: totals.DISCRETIONARY <= capDiscretionary ? "green" : (totals.DISCRETIONARY <= capDiscretionary * 1.05 ? "yellow" : "red"),
      },
    ];

    res.status(200).json({
      profile,
      month: `${year}-${String(monthNum).padStart(2, "0")}`,
      totals,
      subcategoryTotals,
      caps: {
        INVEST: capInvest,
        SINKING: capSinking,
        ESSENTIALS: capEssentials,
        DISCRETIONARY: capDiscretionary,
      },
      kpis: {
        savingsRate: {
          value: savingsRate,
          target: 0.35,
          indicator: savingsIndicator,
        },
        essentialsShare: {
          value: essentialsShare,
          target: 0.55,
          indicator: essentialsIndicator,
        },
        runway: {
          value: runway,
          indicator: "neutral",
        },
      },
      drifts,
    });
  } catch (error) {
    console.error("Error fetching planner dashboard:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Weekly check - analyze budget and provide suggestions
export const weeklyCheck = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month } = req.query;

    // Parse month or use current
    let year, monthNum;
    if (month && month.match(/^\d{4}-\d{2}$/)) {
      [year, monthNum] = month.split("-").map(Number);
    } else {
      const now = new Date();
      year = now.getFullYear();
      monthNum = now.getMonth() + 1;
    }

    // Get dashboard data
    const dashboardData = await getPlannerDashboardData(userId, year, monthNum);

    // Find breached buckets
    const breachedDrifts = dashboardData.drifts.filter((d) => d.breached);

    if (breachedDrifts.length === 0) {
      return res.status(200).json({
        suggestion: "✨ On track! Roll any surplus to Investments ('No Zero Days').",
        breached: false,
      });
    }

    // Find largest subcategory in breached buckets
    let largestSubcategory = null;
    let largestAmount = 0;
    let largestBucket = null;

    breachedDrifts.forEach((drift) => {
      const subcats = dashboardData.subcategoryTotals[drift.bucket] || {};
      Object.entries(subcats).forEach(([category, amount]) => {
        if (amount > largestAmount) {
          largestAmount = amount;
          largestSubcategory = category;
          largestBucket = drift.bucket;
        }
      });
    });

    const cutAmount = Math.ceil(largestAmount * 0.1); // Suggest 10% cut
    const categoryLabel = largestSubcategory
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    const targetShare = largestBucket === "ESSENTIALS" ? "≤55%" : "≤10%";

    res.status(200).json({
      suggestion: `💡 Cut ${categoryLabel} by $${cutAmount} next week to move ${largestBucket} toward ${targetShare}; redirect to Invest.`,
      breached: true,
      details: {
        bucket: largestBucket,
        category: largestSubcategory,
        currentAmount: largestAmount,
        suggestedCut: cutAmount,
      },
    });
  } catch (error) {
    console.error("Error performing weekly check:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Monthly reset - prepare next month
export const monthlyReset = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentMonth } = req.body; // Format: YYYY-MM

    // Parse current month
    let year, monthNum;
    if (currentMonth && currentMonth.match(/^\d{4}-\d{2}$/)) {
      [year, monthNum] = currentMonth.split("-").map(Number);
    } else {
      const now = new Date();
      year = now.getFullYear();
      monthNum = now.getMonth() + 1;
    }

    // Calculate next month
    let nextYear = year;
    let nextMonth = monthNum + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;

    // Get profile
    const profile = await FinancePlanner.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: "Planner profile not found" });
    }

    // Create checklist
    const checklist = [
      "Review and confirm monthly income",
      "Execute planned transfers to Investment and Sinking funds",
      ...profile.sinkingLines.map((line) => `Transfer $${line.amountUsd} to ${line.name}`),
      "Review highest expense category from last month",
      "Set one concrete spending reduction goal",
    ];

    res.status(200).json({
      nextMonth: nextMonthStr,
      checklist,
      caps: profile.caps,
      plannedTransfers: {
        invest: profile.plannedInvestUsd,
        sinking: profile.plannedSinkingUsd,
      },
      sinkingLines: profile.sinkingLines,
    });
  } catch (error) {
    console.error("Error performing monthly reset:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to get dashboard data (reusable)
async function getPlannerDashboardData(userId, year, monthNum) {
  const profile = await FinancePlanner.findOne({ userId });
  if (!profile) {
    throw new Error("Planner profile not found");
  }

  const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59));

  const transactions = await Finance.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
    type: "expense",
  });

  const totals = {
    INVEST: 0,
    SINKING: 0,
    ESSENTIALS: 0,
    DISCRETIONARY: 0,
  };

  const subcategoryTotals = {};

  transactions.forEach((transaction) => {
    const bucket = CATEGORY_TO_BUCKET[transaction.category];
    if (bucket) {
      totals[bucket] += transaction.amount;

      if (!subcategoryTotals[bucket]) {
        subcategoryTotals[bucket] = {};
      }
      if (!subcategoryTotals[bucket][transaction.category]) {
        subcategoryTotals[bucket][transaction.category] = 0;
      }
      subcategoryTotals[bucket][transaction.category] += transaction.amount;
    }
  });

  const actualInvest = totals.INVEST + profile.plannedInvestUsd;
  const actualSinking = totals.SINKING + profile.plannedSinkingUsd;

  const capInvest = (profile.caps.INVEST / 100) * profile.incomeUsd;
  const capSinking = (profile.caps.SINKING / 100) * profile.incomeUsd;
  const capEssentials = (profile.caps.ESSENTIALS / 100) * profile.incomeUsd;
  const capDiscretionary = (profile.caps.DISCRETIONARY / 100) * profile.incomeUsd;

  const drifts = [
    {
      bucket: "INVEST",
      cap: capInvest,
      actual: actualInvest,
      delta: actualInvest - capInvest,
      breached: actualInvest > capInvest,
    },
    {
      bucket: "SINKING",
      cap: capSinking,
      actual: actualSinking,
      delta: actualSinking - capSinking,
      breached: actualSinking > capSinking,
    },
    {
      bucket: "ESSENTIALS",
      cap: capEssentials,
      actual: totals.ESSENTIALS,
      delta: totals.ESSENTIALS - capEssentials,
      breached: totals.ESSENTIALS > capEssentials,
    },
    {
      bucket: "DISCRETIONARY",
      cap: capDiscretionary,
      actual: totals.DISCRETIONARY,
      delta: totals.DISCRETIONARY - capDiscretionary,
      breached: totals.DISCRETIONARY > capDiscretionary,
    },
  ];

  return { profile, totals, subcategoryTotals, drifts };
}


