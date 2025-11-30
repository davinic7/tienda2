import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import authRoutes from './routes/auth.routes';
import productoRoutes from './routes/producto.routes';
import localRoutes from './routes/local.routes';
import ventaRoutes from './routes/venta.routes';
import clienteRoutes from './routes/cliente.routes';
import stockRoutes from './routes/stock.routes';
import usuarioRoutes from './routes/usuario.routes';
import turnoRoutes from './routes/turno.routes';
import analyticsRoutes from './routes/analytics.routes';
import dashboardRoutes from './routes/dashboard.routes';
import actividadesRoutes from './routes/actividades.routes';
import { setupSocketIO } from './socket/socket.io';
import { errorHandler } from './middleware/errorHandler';
import { config } from './config/env';

// __dirname está disponible en CommonJS (producción compilada)
// En desarrollo con tsx, usamos import.meta.url

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.security.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

export const prisma = new PrismaClient();

// Verificar conexión a la base de datos al iniciar
const verificarConexionDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos');
    
    // Verificar que podemos hacer una query simple
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Base de datos respondiendo correctamente');
  } catch (error: any) {
    console.error('\n❌ ========== ERROR DE CONEXIÓN A BASE DE DATOS ==========');
    console.error('📝 Mensaje:', error.message);
    console.error('🔗 DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'NO CONFIGURADA');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 El servidor MySQL no está corriendo o no está accesible');
      console.error('💡 Verifica que XAMPP/MySQL esté iniciado');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('💡 Timeout al conectar. Verifica la configuración de red');
    } else if (error.code === 'P1001') {
      console.error('💡 No se puede alcanzar el servidor de base de datos');
    } else if (error.code === 'P1000') {
      console.error('💡 Error de autenticación. Verifica usuario y contraseña en DATABASE_URL');
    }
    
    console.error('========================================================\n');
    
    if (config.isDevelopment) {
      console.warn('⚠️  Continuando en modo desarrollo, pero algunas funciones pueden fallar');
    } else {
      console.error('🛑 Cerrando servidor por error crítico');
      process.exit(1);
    }
  }
};

if (config.isDevelopment) {
  verificarConexionDB();
} else {
  // En producción, conectar y salir si falla
  prisma.$connect().catch((error) => {
    console.error('❌ Error crítico: No se pudo conectar a la base de datos');
    process.exit(1);
  });
}

export const socketIO = io;

// Middleware
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true,
  // En producción, ser más restrictivo
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/locales', localRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/turnos', turnoRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/actividades', actividadesRoutes);

// Socket.io setup
setupSocketIO(io);

// En producción, servir el frontend estático
if (config.isProduction) {
  // En producción, __dirname apunta a dist/
  // El frontend está en ../../frontend/dist desde dist/
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  
  // Servir archivos estáticos del frontend
  app.use(express.static(frontendPath));
  
  // Todas las rutas que no sean /api/* se sirven desde el frontend (SPA)
  app.get('*', (req, res, next) => {
    // No servir el index.html para rutas de API
    if (req.path.startsWith('/api')) {
      return next(); // Pasar al siguiente middleware (error handler)
    }
    // Servir index.html para todas las demás rutas (SPA routing)
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
      if (err) {
        console.error('Error al servir index.html:', err);
        res.status(500).send('Error al cargar la aplicación');
      }
    });
  });
}

// Error handler
app.use(errorHandler);

httpServer.listen(config.port, () => {
  if (config.isDevelopment) {
    console.log('\n✅ ========== SERVIDOR INICIADO ==========');
    console.log(`🚀 Servidor corriendo en puerto ${config.port}`);
    console.log(`📡 API disponible en http://localhost:${config.port}/api`);
    console.log(`📡 Socket.io disponible en ws://localhost:${config.port}`);
    console.log(`🌍 Entorno: DESARROLLO`);
    console.log(`🔄 Hot reload activado (tsx watch)`);
    console.log('==========================================\n');
  } else {
    console.log(`🚀 Servidor en producción - Puerto ${config.port}`);
    console.log(`🌍 Entorno: PRODUCCIÓN`);
  }
});

// Manejo de errores del servidor
httpServer.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ El puerto ${config.port} ya está en uso`);
    if (config.isDevelopment) {
      console.error('💡 Cierra la aplicación que usa el puerto o cambia el puerto en .env');
    }
  } else {
    console.error('❌ Error en el servidor:', config.isDevelopment ? error : 'Error del servidor');
  }
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('\n❌ ========== ERROR NO CAPTURADO ==========');
  console.error('📝 Mensaje:', error.message);
  console.error('🏷️  Tipo:', error.name);
  if (config.isDevelopment) {
    console.error('📚 Stack completo:');
    console.error(error.stack);
    console.error('💡 El servidor continuará corriendo, pero REVISA ESTE ERROR');
    console.error('💡 Este tipo de errores pueden causar que el servidor se comporte de manera inesperada');
  } else {
    console.error('🛑 Cerrando servidor por error crítico');
    process.exit(1);
  }
  console.error('==========================================\n');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ ========== PROMESA RECHAZADA NO MANEJADA ==========');
  if (config.isDevelopment) {
    console.error('📝 Razón:', reason);
    if (reason instanceof Error) {
      console.error('📚 Stack:', reason.stack);
    }
    console.error('💡 El servidor continuará corriendo, pero REVISA ESTE ERROR');
    console.error('💡 Asegúrate de manejar todos los errores en tus promesas con .catch()');
  } else {
    console.error('Error en promesa');
  }
  console.error('====================================================\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Cerrando servidor (Ctrl+C)...');
  await prisma.$disconnect();
  process.exit(0);
});

