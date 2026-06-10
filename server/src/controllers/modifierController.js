import prisma from '../config/database.js';

export const modifierController = {
  // Groups
  async listGroups(req, res) {
    try {
      const groups = await prisma.modifierGroup.findMany({
        include: {
          modifiers: { where: { active: true }, orderBy: { name: 'asc' } },
          products: { include: { product: { select: { id: true, name: true } } } },
        },
        orderBy: { name: 'asc' },
      });
      res.json(groups);
    } catch (error) {
      console.error('Error al listar grupos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async createGroup(req, res) {
    try {
      const { name, type } = req.body;
      if (!name) return res.status(400).json({ error: 'Nombre requerido' });
      const group = await prisma.modifierGroup.create({ data: { name, type: type || 'SINGLE' } });
      res.status(201).json(group);
    } catch (error) {
      console.error('Error al crear grupo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async updateGroup(req, res) {
    try {
      const { name, type } = req.body;
      const group = await prisma.modifierGroup.update({
        where: { id: req.params.id },
        data: { name, type },
      });
      res.json(group);
    } catch (error) {
      console.error('Error al actualizar grupo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async deleteGroup(req, res) {
    try {
      await prisma.modifierGroup.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      console.error('Error al eliminar grupo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Modifiers
  async createModifier(req, res) {
    try {
      const { groupId, name, price } = req.body;
      if (!groupId || !name) return res.status(400).json({ error: 'groupId y nombre requeridos' });
      const modifier = await prisma.modifier.create({
        data: { groupId, name, price: price || 0 },
      });
      res.status(201).json(modifier);
    } catch (error) {
      console.error('Error al crear modificador:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async updateModifier(req, res) {
    try {
      const { name, price, active } = req.body;
      const modifier = await prisma.modifier.update({
        where: { id: req.params.id },
        data: { name, price, active },
      });
      res.json(modifier);
    } catch (error) {
      console.error('Error al actualizar modificador:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async deleteModifier(req, res) {
    try {
      await prisma.modifier.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      console.error('Error al eliminar modificador:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Product-Modifier assignments
  async setProductGroups(req, res) {
    try {
      const { productId, groupIds } = req.body;
      if (!productId) return res.status(400).json({ error: 'productId requerido' });

      await prisma.productModifierGroup.deleteMany({ where: { productId } });
      if (groupIds && groupIds.length > 0) {
        await prisma.productModifierGroup.createMany({
          data: groupIds.map(groupId => ({ productId, groupId })),
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error al asignar grupos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getProductGroups(req, res) {
    try {
      const groups = await prisma.productModifierGroup.findMany({
        where: { productId: req.params.productId },
        include: {
          group: {
            include: { modifiers: { where: { active: true } } },
          },
        },
      });
      res.json(groups.map(pg => pg.group));
    } catch (error) {
      console.error('Error al obtener grupos del producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
