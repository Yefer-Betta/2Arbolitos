import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database.js';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

async function startServer() {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🏪 Servidor 2Arbolitos API                          ║
║                                                       ║
║   🌐 http://localhost:${PORT}                          ║
║   📚 API Docs: http://localhost:${PORT}/api            ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch(console.error);
