const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All product routes require auth
router.use(auth);

// GET /api/products - list all products
router.get('/', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { search, category } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }
    if (category) {
      where.category = category;
    }

    const products = await prisma.product.findMany({
      where,
      include: { stock: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: { stock: true },
    });
    if (!product) return res.status(404).json({ error: '商品不存在' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// POST /api/products - create product
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { sku, name, category, unit, costPrice, sellPrice, safetyStock, location } = req.body;

    if (!sku || !name) {
      return res.status(400).json({ error: 'SKU 和名称不能为空' });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        category,
        unit,
        costPrice: Number(costPrice) || 0,
        sellPrice: Number(sellPrice) || 0,
        safetyStock: Number(safetyStock) || 0,
        location,
      },
    });

    // Create stock record with 0 quantity
    await prisma.stock.create({
      data: { productId: product.id, quantity: 0 },
    });

    res.json(product);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'SKU 已存在' });
    }
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, category, unit, costPrice, sellPrice, safetyStock, location } = req.body;

    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: {
        name,
        category,
        unit,
        costPrice: Number(costPrice),
        sellPrice: Number(sellPrice),
        safetyStock: Number(safetyStock),
        location,
      },
    });

    res.json(product);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.product.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/products/import - batch import from Excel/CSV
const multer = require('multer');
const XLSX = require('xlsx');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/import', adminOnly, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'File is empty' });
    }

    const prisma = req.app.get('prisma');
    const results = { success: 0, failed: 0, errors: [] };

    for (const row of rows) {
      try {
        const sku = row['SKU'] || row['sku'] || row['Item No.'] || row['item_no'];
        const name = row['Name'] || row['name'] || row['Item Name'] || row['item_name'];
        if (!sku || !name) {
          results.failed++;
          results.errors.push(`Row: missing SKU or Name`);
          continue;
        }

        await prisma.product.upsert({
          where: { sku: String(sku) },
          update: {
            name: String(name),
            category: row['Category'] || row['category'] || null,
            unit: row['Unit'] || row['unit'] || 'pcs',
            costPrice: Number(row['Cost'] || row['cost'] || row['Landing Price'] || row['cost_price'] || 0),
            sellPrice: Number(row['Price'] || row['price'] || row['Selling Price'] || row['sell_price'] || 0),
            safetyStock: Number(row['Safety'] || row['safety'] || row['Safety Stock'] || row['safety_stock'] || 0),
            location: row['Location'] || row['location'] || null,
          },
          create: {
            sku: String(sku),
            name: String(name),
            category: row['Category'] || row['category'] || null,
            unit: row['Unit'] || row['unit'] || 'pcs',
            costPrice: Number(row['Cost'] || row['cost'] || row['Landing Price'] || row['cost_price'] || 0),
            sellPrice: Number(row['Price'] || row['price'] || row['Selling Price'] || row['sell_price'] || 0),
            safetyStock: Number(row['Safety'] || row['safety'] || row['Safety Stock'] || row['safety_stock'] || 0),
            location: row['Location'] || row['location'] || null,
          },
        });

        // Create stock record if not exists
        const product = await prisma.product.findUnique({ where: { sku: String(sku) }, include: { stock: true } });
        if (product && !product.stock) {
          const initQty = Number(row['Stock'] || row['stock'] || row['Qty'] || row['qty'] || 0);
          await prisma.stock.create({
            data: { productId: product.id, quantity: initQty },
          });
        }

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`${row['SKU'] || row['sku'] || 'unknown'}: ${err.message}`);
      }
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
