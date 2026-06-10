import prisma from '../config/database.js';

export const supplierController = {
  // Suppliers CRUD
  async listSuppliers(req, res) {
    try {
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
    } catch (error) {
      console.error('Error al listar proveedores:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async createSupplier(req, res) {
    try {
      const { name, phone, email, address, notes } = req.body;
      if (!name) return res.status(400).json({ error: 'Nombre requerido' });
      const supplier = await prisma.supplier.create({ data: { name, phone, email, address, notes } });
      res.status(201).json(supplier);
    } catch (error) {
      console.error('Error al crear proveedor:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async updateSupplier(req, res) {
    try {
      const { name, phone, email, address, notes, active } = req.body;
      const supplier = await prisma.supplier.update({
        where: { id: req.params.id },
        data: { name, phone, email, address, notes, active },
      });
      res.json(supplier);
    } catch (error) {
      console.error('Error al actualizar proveedor:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Purchase Orders
  async listPurchaseOrders(req, res) {
    try {
      const { status } = req.query;
      const where = status ? { status } : {};
      const orders = await prisma.purchaseOrder.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      res.json(orders);
    } catch (error) {
      console.error('Error al listar órdenes de compra:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async createPurchaseOrder(req, res) {
    try {
      const { supplierId, items, notes } = req.body;
      if (!items || items.length === 0) return res.status(400).json({ error: 'Debe incluir al menos un item' });

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
    } catch (error) {
      console.error('Error al crear orden de compra:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async updatePurchaseOrderStatus(req, res) {
    try {
      const { status } = req.body;
      const validStatuses = ['PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED'];
      if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

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
    } catch (error) {
      console.error('Error al actualizar orden de compra:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
