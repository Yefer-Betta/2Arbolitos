import prisma from '../config/database.js';

export const inventoryMovementController = {
  async getMovements(req, res) {
    try {
      const { itemId } = req.query;
      const where = itemId ? { itemId } : {};
      const movements = await prisma.inventoryMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { item: { select: { name: true, unit: true } } },
      });
      res.json(movements);
    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async createMovement(req, res) {
    try {
      const { itemId, quantity, reason } = req.body;

      if (!itemId || quantity === undefined || !reason) {
        return res.status(400).json({ error: 'itemId, quantity y reason requeridos' });
      }

      const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
      if (!item) return res.status(404).json({ error: 'Insumo no encontrado' });

      const previous = item.quantity;
      const newQuantity = previous + quantity;
      if (newQuantity < 0) return res.status(400).json({ error: 'Stock insuficiente' });

      const [movement] = await prisma.$transaction([
        prisma.inventoryMovement.create({
          data: {
            itemId,
            quantity,
            previous,
            newQuantity,
            reason,
            userId: req.user?.id || null,
          },
        }),
        prisma.inventoryItem.update({
          where: { id: itemId },
          data: { quantity: newQuantity },
        }),
      ]);

      res.status(201).json(movement);
    } catch (error) {
      console.error('Error al crear movimiento:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
