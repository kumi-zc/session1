const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/stock - get all stock levels
router.get('/', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const stocks = await prisma.stock.findMany({
      include: { product: true },
    });
    res.json(stocks);
  } catch (err) {
    next(err);
  }
});

// POST /api/stock/movement - stock in/out/set
router.post('/movement', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { productId, type, quantity, remark } = req.body;

    if (!productId || !type || quantity === undefined || quantity === null) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const stock = await prisma.stock.findUnique({ where: { productId } });
    if (!stock) return res.status(404).json({ error: '库存记录不存在' });

    let newQty;
    if (type === 'SET') {
      newQty = Number(quantity);
    } else if (type === 'IN') {
      newQty = stock.quantity + Number(quantity);
    } else if (type === 'OUT') {
      if (stock.quantity < quantity) {
        return res.status(400).json({ error: `库存不足，当前库存 ${stock.quantity}` });
      }
      newQty = stock.quantity - Number(quantity);
    } else {
      return res.status(400).json({ error: '无效的操作类型' });
    }

    await prisma.stock.update({
      where: { productId },
      data: { quantity: newQty },
    });

    await prisma.stockMovement.create({
      data: {
        productId,
        type,
        quantity: Number(quantity),
        source: '手动操作',
        operatorId: req.user.id,
        remark,
      },
    });

    res.json({ success: true, newQuantity: newQty });
  } catch (err) {
    next(err);
  }
});

// GET /api/stock/alerts - low stock alerts
router.get('/alerts', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const allStocks = await prisma.stock.findMany({
      include: { product: true },
    });
    const lowStock = allStocks.filter(s => s.quantity < s.product.safetyStock);
    res.json(lowStock);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
