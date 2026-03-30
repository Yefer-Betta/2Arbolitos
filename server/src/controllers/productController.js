import prisma from '../config/database.js';

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
      const { name, categoryId, price, isUsd, imageUrl, description } = req.body;

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
        },
      });

      res.status(201).json(product);
    } catch (error) {
      console.error('Error al crear producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { name, categoryId, price, isUsd, imageUrl, description, active } = req.body;

      const data = {};
      if (name) data.name = name;
      if (categoryId) data.categoryId = categoryId;
      if (price !== undefined) data.price = parseFloat(price);
      if (isUsd !== undefined) data.isUsd = isUsd;
      if (imageUrl !== undefined) data.imageUrl = imageUrl;
      if (description !== undefined) data.description = description;
      if (active !== undefined) data.active = active;

      const product = await prisma.product.update({
        where: { id },
        data,
        include: {
          category: true,
        },
      });

      res.json(product);
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      await prisma.product.update({
        where: { id },
        data: { active: false },
      });

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
};
