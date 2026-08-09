import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const supplierController = {
  // Suppliers CRUD
  listSuppliers: asyncHandler(async (req, res) => {
    const { search } = req.query;
    const where = search ? {
      OR: [
        { name: { contains: search } },
        { phone: { contains: search } },
      ],
    } : {};
    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json(suppliers);
  }),

  createSupplier: asyncHandler(async (req, res) => {
    const { name, phone, email, address, notes } = req.body;
    if (!name) throw new AppError('Nombre requerido', 400);
    const supplier = await prisma.supplier.create({ data: { name, phone, email, address, notes } });
    res.status(201).json(supplier);
  }),

  updateSupplier: asyncHandler(async (req, res) => {
    const { name, phone, email, address, notes, active } = req.body;
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: { name, phone, email, address, notes, active },
    });
    res.json(supplier);
  }),

  // Purchase Orders
  listPurchaseOrders: asyncHandler(async (req, res) => {
    const { status } = req.query;
    const where = status ? { status } : {};
    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(orders);
  }),

  createPurchaseOrder: asyncHandler(async (req, res) => {
    const { supplierId, items, notes } = req.body;
    if (!items || items.length === 0) throw new AppError('Debe incluir al menos un item', 400);

    const total = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitCost || 0), 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId: supplierId || null,
        items,
        total,
        notes,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
    res.status(201).json(order);
  }),

  updatePurchaseOrderStatus: asyncHandler(async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) throw new AppError('Estado inválido', 400);

    const data = { status };
    if (status === 'RECEIVED') {
      data.receivedAt = new Date();

      // Auto-create inventory movements for each item linked to an inventory item
      const order = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
      if (order?.items) {
        for (const item of order.items) {
          if (item.inventoryItemId) {
            const invItem = await prisma.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
            if (invItem) {
              const qty = item.quantity || 0;
              if (qty > 0) {
                await prisma.inventoryMovement.create({
                  data: {
                    itemId: item.inventoryItemId,
                    quantity: qty,
                    previous: invItem.quantity,
                    newQuantity: invItem.quantity + qty,
                    reason: 'compra',
                  },
                });
                await prisma.inventoryItem.update({
                  where: { id: item.inventoryItemId },
                  data: { quantity: invItem.quantity + qty },
                });
              }
            }
          }
        }
      }
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data,
      include: { supplier: { select: { id: true, name: true } } },
    });
    res.json(updated);
  }),
};
