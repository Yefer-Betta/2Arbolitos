import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const modifierController = {
  // Groups
  listGroups: asyncHandler(async (req, res) => {
    const groups = await prisma.modifierGroup.findMany({
      include: {
        modifiers: { where: { active: true }, orderBy: { name: 'asc' } },
        products: { include: { product: { select: { id: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(groups);
  }),

  createGroup: asyncHandler(async (req, res) => {
    const { name, type } = req.body;
    if (!name) throw new AppError('Nombre requerido', 400);
    const group = await prisma.modifierGroup.create({ data: { name, type: type || 'SINGLE' } });
    res.status(201).json(group);
  }),

  updateGroup: asyncHandler(async (req, res) => {
    const { name, type } = req.body;
    const group = await prisma.modifierGroup.update({
      where: { id: req.params.id },
      data: { name, type },
    });
    res.json(group);
  }),

  deleteGroup: asyncHandler(async (req, res) => {
    await prisma.modifierGroup.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),

  // Modifiers
  createModifier: asyncHandler(async (req, res) => {
    const { groupId, name, price } = req.body;
    if (!groupId || !name) throw new AppError('groupId y nombre requeridos', 400);
    const modifier = await prisma.modifier.create({
      data: { groupId, name, price: price || 0 },
    });
    res.status(201).json(modifier);
  }),

  updateModifier: asyncHandler(async (req, res) => {
    const { name, price, active } = req.body;
    const modifier = await prisma.modifier.update({
      where: { id: req.params.id },
      data: { name, price, active },
    });
    res.json(modifier);
  }),

  deleteModifier: asyncHandler(async (req, res) => {
    await prisma.modifier.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),

  // Product-Modifier assignments
  setProductGroups: asyncHandler(async (req, res) => {
    const { productId, groupIds } = req.body;
    if (!productId) throw new AppError('productId requerido', 400);

    await prisma.productModifierGroup.deleteMany({ where: { productId } });
    if (groupIds && groupIds.length > 0) {
      await prisma.productModifierGroup.createMany({
        data: groupIds.map(groupId => ({ productId, groupId })),
      });
    }
    res.json({ success: true });
  }),

  getProductGroups: asyncHandler(async (req, res) => {
    const groups = await prisma.productModifierGroup.findMany({
      where: { productId: req.params.productId },
      include: {
        group: {
          include: { modifiers: { where: { active: true } } },
        },
      },
    });
    res.json(groups.map(pg => pg.group));
  }),
};
