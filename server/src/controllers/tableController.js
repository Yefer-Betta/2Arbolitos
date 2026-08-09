import prisma from '../config/database.js';
import { notifySSEClients } from '../sse.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const tableController = {
  getTables: asyncHandler(async (req, res) => {
    const { active } = req.query;

    const where = {};
    if (active !== undefined) {
      where.active = active === 'true';
    }

    const tables = await prisma.table.findMany({
      where,
      include: {
        orders: {
          where: {
            status: {
              in: ['PENDING', 'PREPARING', 'READY'],
            },
          },
          include: {
            items: true,
          },
        },
      },
      orderBy: { number: 'asc' },
    });

    const tablesWithStatus = tables.map(table => ({
      ...table,
      isOccupied: table.orders.length > 0,
      currentOrder: table.orders[0] || null,
    }));

    res.json(tablesWithStatus);
  }),

  getTable: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        orders: {
          where: {
            status: {
              in: ['PENDING', 'PREPARING', 'READY'],
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!table) {
      throw new AppError('Mesa no encontrada', 404);
    }

    res.json(table);
  }),

  createTable: asyncHandler(async (req, res) => {
    const { number, name, capacity } = req.body;

    if (!number) {
      throw new AppError('Número de mesa requerido', 400);
    }

    const existingTable = await prisma.table.findUnique({
      where: { number },
    });

    if (existingTable) {
      throw new AppError('Ya existe una mesa con este número', 400);
    }

    const table = await prisma.table.create({
      data: {
        number,
        name,
        capacity: capacity || 4,
      },
    });

    res.status(201).json(table);
  }),

  updateTable: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { number, name, capacity, active } = req.body;

    const data = {};
    if (number) data.number = number;
    if (name !== undefined) data.name = name;
    if (capacity) data.capacity = capacity;
    if (active !== undefined) data.active = active;

    const table = await prisma.table.update({
      where: { id },
      data,
    });

    res.json(table);
  }),

  deleteTable: asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.table.update({
      where: { id },
      data: { active: false },
    });

    res.json({ message: 'Mesa desactivada correctamente' });
  }),

  // TableState for active table synchronization
  getTableStates: asyncHandler(async (req, res) => {
    const states = await prisma.tableState.findMany();
    const result = {};
    states.forEach(state => {
      result[state.tableId] = {
        items: JSON.parse(state.items || '[]'),
        version: state.version,
      };
    });
    res.json(result);
  }),

  getTableState: asyncHandler(async (req, res) => {
    const { tableId } = req.params;
    const state = await prisma.tableState.findUnique({
      where: { tableId },
    });
    if (!state) {
      return res.json({ items: [], version: 0 });
    }
    try {
      res.json({
        items: JSON.parse(state.items || '[]'),
        version: state.version,
      });
    } catch (parseError) {
      console.error('Error al parsear items:', parseError, state.items);
      res.json({ items: [], version: 0 });
    }
  }),

  updateTableState: asyncHandler(async (req, res) => {
    const { tableId, items } = req.body;
    if (!tableId) {
      throw new AppError('tableId requerido', 400);
    }

    const { _clientVersion } = req.body;

    const current = await prisma.tableState.findUnique({ where: { tableId } });
    const serverVersion = current ? current.version : 0;
    const clientVersion = _clientVersion || 0;

    if (clientVersion < serverVersion) {
      notifySSEClients('table:conflict', {
        tableId,
        serverData: JSON.parse(current.items || '[]'),
        serverVersion,
      });
      return res.json({
        conflict: true,
        tableId,
        serverData: JSON.parse(current.items || '[]'),
        serverVersion,
      });
    }

    const newVersion = serverVersion + 1;
    const itemsJson = Array.isArray(items) ? JSON.stringify(items) : JSON.stringify([]);

    const state = await prisma.tableState.upsert({
      where: { tableId },
      update: { items: itemsJson, version: newVersion },
      create: { tableId, items: itemsJson, version: newVersion },
    });

    notifySSEClients('table:updated', {
      tableId,
      items: JSON.parse(state.items),
      version: state.version,
    });
    res.json({
      success: true,
      tableId,
      version: state.version,
      items: JSON.parse(state.items),
    });
  }),

  deleteTableState: asyncHandler(async (req, res) => {
    const { tableId } = req.params;
    await prisma.tableState.delete({
      where: { tableId },
    });
    notifySSEClients('table:cleared', { tableId });
    res.json({ success: true });
  }),
};
