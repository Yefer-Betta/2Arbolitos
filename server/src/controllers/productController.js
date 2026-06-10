import prisma from '../config/database.js';

function getUserId(req) {
  return req.user?.id || null;
}

async function auditCreate(entity, entityId, after, userId) {
  await prisma.auditLog.create({ data: { entity, entityId, action: 'CREATE', after, userId } }).catch(() => {});
}

async function auditUpdate(entity, entityId, before, after, userId) {
  await prisma.auditLog.create({ data: { entity, entityId, action: 'UPDATE', before, after, userId } }).catch(() => {});
}

async function auditDelete(entity, entityId, before, userId) {
  await prisma.auditLog.create({ data: { entity, entityId, action: 'DELETE', before, userId } }).catch(() => {});
}

export const productController = {
  async getProducts(req, res) {
    try {
      const { active, categoryId } = req.query;

      const where = {};
      
      if (active !== undefined) {
        where.active = active === 'true';
      }
      
      if (categoryId) {
        where.categoryId = categoryId;
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          category: true,
          inventoryItems: true,
        },
        orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
      });

      res.json(products);
    } catch (error) {
      console.error('Error al obtener productos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getProduct(req, res) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          inventoryItems: true,
        },
      });

      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      res.json(product);
    } catch (error) {
      console.error('Error al obtener producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async createProduct(req, res) {
    try {
      const { name, categoryId, price, isUsd, imageUrl, description, inventoryItemId } = req.body;

      if (!name || !categoryId || price === undefined) {
        return res.status(400).json({ error: 'Datos incompletos' });
      }

      const product = await prisma.product.create({
        data: {
          name,
          categoryId,
          price: parseFloat(price),
          isUsd: isUsd || false,
          imageUrl,
          description,
        },
        include: {
          category: true,
          inventoryItems: true,
        },
      });

      const userId = getUserId(req);
      await auditCreate('Product', product.id, product, userId);

      // Si se especificó un insumo, vincularlo al producto
      if (inventoryItemId) {
        await prisma.inventoryItem.update({
          where: { id: inventoryItemId },
          data: { productId: product.id },
        });
        // Recargar producto con el insumo vinculado
        const updated = await prisma.product.findUnique({
          where: { id: product.id },
          include: { category: true, inventoryItems: true },
        });
        return res.status(201).json(updated);
      }

      res.status(201).json(product);
    } catch (error) {
      console.error('Error al crear producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { name, categoryId, price, isUsd, imageUrl, description, active, inventoryItemId } = req.body;

      const data = {};
      if (name) data.name = name;
      if (categoryId) data.categoryId = categoryId;
      if (price !== undefined) data.price = parseFloat(price);
      if (isUsd !== undefined) data.isUsd = isUsd;
      if (imageUrl !== undefined) data.imageUrl = imageUrl;
      if (description !== undefined) data.description = description;
      if (active !== undefined) data.active = active;

      const previous = await prisma.product.findUnique({
        where: { id },
        include: { inventoryItems: true },
      });

      // Si cambia el insumo vinculado, desvincular el anterior
      if (inventoryItemId !== undefined) {
        // Desvincular insumo anterior (si existe)
        for (const inv of previous.inventoryItems) {
          await prisma.inventoryItem.update({
            where: { id: inv.id },
            data: { productId: null },
          });
        }
        // Vincular nuevo insumo
        if (inventoryItemId) {
          await prisma.inventoryItem.update({
            where: { id: inventoryItemId },
            data: { productId: id },
          });
        }
      }

      const product = await prisma.product.update({
        where: { id },
        data,
        include: {
          category: true,
          inventoryItems: true,
        },
      });

      const userId = getUserId(req);
      await auditUpdate('Product', id, previous, product, userId);

      res.json(product);
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      const before = await prisma.product.findUnique({ where: { id } });

      await prisma.product.update({
        where: { id },
        data: { active: false },
      });

      const userId = getUserId(req);
      await auditDelete('Product', id, before, userId);

      res.json({ message: 'Producto desactivado correctamente' });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getCategories(req, res) {
    try {
      const { active } = req.query;

      const where = {};
      if (active !== undefined) {
        where.active = active === 'true';
      }

      const categories = await prisma.category.findMany({
        where,
        orderBy: { order: 'asc' },
      });

      res.json(categories);
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async createCategory(req, res) {
    try {
      const { name, order } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Nombre de categoría requerido' });
      }

      const category = await prisma.category.create({
        data: {
          name,
          order: order || 0,
        },
      });

      res.status(201).json(category);
    } catch (error) {
      console.error('Error al crear categoría:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, order, active } = req.body;

      const data = {};
      if (name) data.name = name;
      if (order !== undefined) data.order = order;
      if (active !== undefined) data.active = active;

      const category = await prisma.category.update({
        where: { id },
        data,
      });

      res.json(category);
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      await prisma.category.update({
        where: { id },
        data: { active: false },
      });

      res.json({ message: 'Categoría desactivada correctamente' });
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getCostAnalysis(req, res) {
    try {
      const products = await prisma.product.findMany({
        where: { active: true },
        include: {
          inventoryItems: { select: { unitCost: true, quantity: true, unit: true } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { categoryId: 'asc' },
      });

      const analysis = products.map(p => {
        const totalCost = p.inventoryItems.reduce((sum, item) => {
          return sum + (item.unitCost || 0);
        }, 0);
        return {
          id: p.id,
          name: p.name,
          category: p.category.name,
          price: p.price,
          isUsd: p.isUsd,
          totalInventoryCost: totalCost,
          margin: p.price > 0 ? ((p.price - totalCost) / p.price * 100) : 0,
          linkedItems: p.inventoryItems.length,
        };
      });

      res.json(analysis);
    } catch (error) {
      console.error('Error al obtener análisis de costos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
