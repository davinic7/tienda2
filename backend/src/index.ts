import express, { Request, Response } from 'express';
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
// Configurar CORS para permitir múltiples orígenes si están separados por coma
const allowedOrigins = env.FRONTEND_URL.split(',').map(url => url.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como Postman o mobile apps)
    if (!origin) return callback(null, true);
    
    // Verificar si el origin está en la lista permitida
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'API TiendasLOLO - Sistema POS Multi-Local',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      productos: '/api/productos',
      ventas: '/api/ventas',
      clientes: '/api/clientes',
      stock: '/api/stock',
      locales: '/api/locales',
      usuarios: '/api/usuarios',
      reportes: '/api/reportes',
      depositos: '/api/depositos',
      caja: '/api/caja',
    },
    timestamp: new Date().toISOString(),
  });
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

