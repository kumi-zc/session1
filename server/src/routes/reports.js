const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/reports/summary - dashboard summary
router.get('/summary', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');

    const totalProducts = await prisma.product.count();
    const totalTasks = await prisma.stockTakingTask.count();

    const lowStock = await prisma.stock.findMany({
      include: { product: true },
    });
    const lowStockCount = lowStock.filter(s => s.quantity < s.product.safetyStock).length;

    const recentTasks = await prisma.stockTakingTask.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { assignee: { select: { username: true } } },
    });

    res.json({
      totalProducts,
      totalTasks,
      lowStockCount,
      recentTasks,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/diff/:taskId - stock taking difference report
router.get('/diff/:taskId', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const items = await prisma.stockTakingItem.findMany({
      where: { taskId: Number(req.params.taskId) },
      include: { product: true },
    });

    const report = items.map(item => {
      const diff = (item.actualQty ?? 0) - item.systemQty;
      let diffAmount = 0;
      if (diff > 0) {
        // 盘盈：入库，成本增加
        diffAmount = diff * item.product.costPrice;
      } else if (diff < 0) {
        // 盘亏：卖出去了，利润 = 售价 - 成本价
        diffAmount = Math.abs(diff) * (item.product.sellPrice - item.product.costPrice);
      }
      return {
        productId: item.productId,
        sku: item.product.sku,
        name: item.product.name,
        category: item.product.category,
        systemQty: item.systemQty,
        actualQty: item.actualQty,
        diff,
        diffAmount,
        costPrice: item.product.costPrice,
        sellPrice: item.product.sellPrice,
      };
    });

    const summary = {
      totalItems: report.length,
      countedItems: report.filter(r => r.actualQty !== null).length,
      totalDiff: report.reduce((sum, r) => sum + r.diff, 0),
      stockGain: report.filter(r => r.diff > 0).reduce((sum, r) => sum + r.diff, 0),
      stockLoss: report.filter(r => r.diff < 0).reduce((sum, r) => sum + Math.abs(r.diff), 0),
      totalGainAmount: report.filter(r => r.diff > 0).reduce((sum, r) => sum + r.diffAmount, 0),
      totalLossAmount: report.filter(r => r.diff < 0).reduce((sum, r) => sum + r.diffAmount, 0),
    };

    res.json({ items: report, summary });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/inventory-overview - inventory by category
router.get('/inventory-overview', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const stocks = await prisma.stock.findMany({
      include: { product: true },
    });

    const byCategory = {};
    for (const s of stocks) {
      const cat = s.product.category || 'Uncategorized';
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, totalQty: 0, totalValue: 0 };
      }
      byCategory[cat].count++;
      byCategory[cat].totalQty += s.quantity;
      byCategory[cat].totalValue += s.quantity * s.product.costPrice;
    }

    res.json(byCategory);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/stock-distribution - each product's stock for donut chart
router.get('/stock-distribution', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const stocks = await prisma.stock.findMany({
      include: { product: true },
      where: { quantity: { gt: 0 } },
    });

    const distribution = stocks.map(s => ({
      name: s.product.name,
      value: s.quantity,
      costValue: s.quantity * s.product.costPrice,
    }));

    res.json(distribution);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/movements - recent stock movements for trend
router.get('/movements', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const movements = await prisma.stockMovement.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true } } },
    });
    res.json(movements);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/trend - stock movement trend grouped by date
router.get('/trend', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    // Group by date
    const trend = {};
    for (const m of movements) {
      const date = m.createdAt.toISOString().slice(0, 10);
      if (!trend[date]) trend[date] = { date, stockIn: 0, stockOut: 0 };
      if (m.type === 'IN' || m.type === 'STOCK_IN') {
        trend[date].stockIn += m.quantity;
      } else {
        trend[date].stockOut += m.quantity;
      }
    }

    // Convert to array and sort by date
    const result = Object.values(trend).sort((a, b) => a.date.localeCompare(b.date));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
