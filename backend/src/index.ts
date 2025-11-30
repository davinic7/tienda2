import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import routes from './routes';
import { initializeSocket } from './config/socket';
import { ejecutarVerificacionesAlertas } from './utils/alertas.util';

const app = express();
const httpServer = createServer(app);

// Inicializar Socket.io
export const io = initializeSocket(httpServer);

// Middlewares
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', routes);

// Error handler (debe ir al final)
app.use(errorHandler);

// Iniciar servidor
const PORT = env.PORT;

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📡 Socket.io inicializado`);
  console.log(`🌐 Ambiente: ${env.NODE_ENV}`);
  
  // Ejecutar verificaciones de alertas al iniciar
  ejecutarVerificacionesAlertas().catch(console.error);
  
  // Ejecutar verificaciones cada 6 horas
  setInterval(() => {
    ejecutarVerificacionesAlertas().catch(console.error);
  }, 6 * 60 * 60 * 1000);
  
  console.log(`🔔 Sistema de alertas iniciado (verificaciones cada 6 horas)`);
});

