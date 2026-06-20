const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

function generateCode(date) {
  const d = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `ST-${d}-${rand}`;
}

// GET /api/tasks - list tasks
router.get('/', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const tasks = await prisma.stockTakingTask.findMany({
      include: {
        assignee: { select: { id: true, username: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id - get task detail
router.get('/:id', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const task = await prisma.stockTakingTask.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        assignee: { select: { id: true, username: true } },
        items: { include: { product: true } },
      },
    });
    if (!task) return res.status(404).json({ error: '盘点任务不存在' });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks - create task
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { assigneeId, area, category, type } = req.body;

    const code = generateCode(new Date());

    // Build product filter based on type
    const productFilter = {};
    if (type === 'CATEGORY' && category) {
      productFilter.category = category;
    } else if (type === 'AREA' && area) {
      productFilter.location = { contains: area };
    }

    const products = await prisma.product.findMany({
      where: productFilter,
      include: { stock: true },
    });

    if (products.length === 0) {
      return res.status(400).json({ error: 'No products found for this scope' });
    }

    const taskType = type || 'FULL';
    const task = await prisma.stockTakingTask.create({
      data: {
        code,
        type: taskType,
        assigneeId: assigneeId || req.user.id,
        area: taskType === 'AREA' ? area : (taskType === 'CATEGORY' ? category : null),
        items: {
          create: products.map(p => ({
            productId: p.id,
            systemQty: p.stock?.quantity || 0,
          })),
        },
      },
      include: {
        assignee: { select: { id: true, username: true } },
        items: { include: { product: true } },
      },
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id - delete task (admin only)
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const task = await prisma.stockTakingTask.findUnique({ where: { id: Number(req.params.id) } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status === 'ADJUSTED') {
      return res.status(400).json({ error: 'Cannot delete adjusted tasks' });
    }
    await prisma.stockTakingItem.deleteMany({ where: { taskId: task.id } });
    await prisma.stockTakingTask.delete({ where: { id: task.id } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id/items - update actual quantities
router.put('/:id/items', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { items } = req.body; // [{itemId, actualQty}]

    const task = await prisma.stockTakingTask.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!task) return res.status(404).json({ error: '盘点任务不存在' });
    if (task.status === 'COMPLETED' || task.status === 'ADJUSTED') {
      return res.status(400).json({ error: '已完成的任务不能修改' });
    }

    // Update status to IN_PROGRESS
    await prisma.stockTakingTask.update({
      where: { id: task.id },
      data: { status: 'IN_PROGRESS' },
    });

    // Update each item
    for (const item of items) {
      await prisma.stockTakingItem.update({
        where: { id: item.itemId },
        data: {
          actualQty: Number(item.actualQty),
          status: 'COUNTED',
        },
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/review - submit for review / approve
router.post('/:id/review', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { action } = req.body; // "submit" or "approve"

    const task = await prisma.stockTakingTask.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true },
    });
    if (!task) return res.status(404).json({ error: '盘点任务不存在' });

    if (action === 'submit') {
      // Check all items have been counted
      const uncounted = task.items.filter(i => i.status === 'PENDING');
      if (uncounted.length > 0) {
        return res.status(400).json({ error: `还有 ${uncounted.length} 项未盘点` });
      }
      await prisma.stockTakingTask.update({
        where: { id: task.id },
        data: { status: 'REVIEWING' },
      });
    }

    if (action === 'approve') {
      // Adjust stock based on differences
      for (const item of task.items) {
        if (item.actualQty === null) continue;
        const diff = item.actualQty - item.systemQty;
        if (diff === 0) continue;

        // Update stock
        await prisma.stock.update({
          where: { productId: item.productId },
          data: { quantity: item.actualQty },
        });

        // Create movement record
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: diff > 0 ? 'STOCK_IN' : 'STOCK_OUT',
            quantity: Math.abs(diff),
            source: '盘点调账',
            operatorId: req.user.id,
            remark: `盘点调整: ${item.systemQty} → ${item.actualQty}`,
          },
        });
      }

      await prisma.stockTakingTask.update({
        where: { id: task.id },
        data: { status: 'ADJUSTED', completedAt: new Date() },
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
