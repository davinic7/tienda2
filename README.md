# Sistema de Punto de Venta (POS) Multi-Local

Sistema completo de punto de venta multi-local con sincronización en tiempo real.

## 🚀 Tecnologías

- **Frontend**: React + TypeScript + TailwindCSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Base de datos**: PostgreSQL con Prisma ORM
- **Autenticación**: JWT (Access Token + Refresh Token)
- **Sincronización**: Socket.io

## 📁 Estructura del Proyecto

```
pos-multilocal/
├── frontend/          # Aplicación React
├── backend/           # API REST con Express
├── shared/            # Tipos TypeScript compartidos
└── package.json       # Workspace raíz
```

## 🛠️ Instalación

### Prerrequisitos

- Node.js >= 18.0.0
- PostgreSQL >= 14 (o usar un servicio en la nube como Supabase, Railway, Render)
- npm o yarn

### Pasos

1. **Clonar e instalar dependencias**:

```bash
npm install
```

2. **Configurar base de datos**:

Crear una base de datos PostgreSQL:

```sql
CREATE DATABASE tienda_pos;
```

O usar un servicio en la nube:
- **Supabase**: https://supabase.com (gratis)
- **Railway**: https://railway.app (gratis con límites)
- **Render**: https://render.com (gratis con límites)

3. **Configurar variables de entorno**:

Crear archivo `.env` en la carpeta `backend/` con la siguiente estructura:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/tienda_pos"
JWT_SECRET="tu-secreto-jwt-muy-seguro-para-produccion"
JWT_REFRESH_SECRET="tu-secreto-refresh-muy-seguro-para-produccion"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
JWT_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800
```

**Nota**: Ajusta la URL de conexión según tu configuración:
- Usuario por defecto: `postgres`
- Contraseña: la que hayas configurado
- Puerto por defecto: `5432`
- Para servicios en la nube, usa la URL de conexión proporcionada

4. **Generar cliente Prisma y ejecutar migraciones**:

```bash
npm run db:generate
npm run db:migrate
```

5. **Crear usuario administrador inicial** (opcional):

Ejecutar el script de seed o crear manualmente en la base de datos.

6. **Iniciar desarrollo**:

```bash
# Iniciar frontend y backend simultáneamente
npm run dev

# O por separado:
npm run dev:backend   # Puerto 5000
npm run dev:frontend  # Puerto 5173
```

## 👥 Roles y Permisos

### ADMIN (Dueño)
- CRUD completo de productos
- Gestión de locales/sucursales
- Gestión de usuarios
- Ver reportes de todos los locales
- Actualizar precios (sincroniza en tiempo real)

### VENDEDOR
- Realizar ventas en su local asignado
- Actualizar stock de su local
- CRUD de clientes
- Ver historial de ventas de su local
- NO puede modificar precios ni eliminar productos

## 📝 Scripts Disponibles

- `npm run dev` - Inicia frontend y backend en modo desarrollo
- `npm run build` - Construye ambos proyectos para producción
- `npm run db:generate` - Genera cliente Prisma
- `npm run db:migrate` - Ejecuta migraciones de base de datos
- `npm run db:studio` - Abre Prisma Studio

## 🔐 Seguridad

- Passwords hasheados con bcrypt
- Validación de inputs con Zod
- Rate limiting en endpoints críticos
- CORS configurado
- Protección contra SQL injection (Prisma)
- Protección contra XSS

## 📡 Sincronización en Tiempo Real

El sistema utiliza Socket.io para sincronizar:
- Cambios de precios de productos
- Alertas de stock bajo
- Notificaciones de sistema

## 📄 Licencia

MIT

