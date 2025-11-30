# Backend - Sistema POS Multi-Local

API REST para el sistema de punto de venta multi-local.

## Configuración

1. **Instalar dependencias**:
```bash
npm install
```

2. **Configurar variables de entorno**:
Crear archivo `.env` con las variables necesarias:
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/tienda_pos"
JWT_SECRET="tu-secreto-jwt-muy-seguro-muy-largo-12345678901234567890"
JWT_REFRESH_SECRET="tu-secreto-refresh-muy-seguro-muy-largo-12345678901234567890"
PORT=5000
FRONTEND_URL="http://localhost:5173"
JWT_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800
```

**Nota para PostgreSQL**: 
- Usuario por defecto: `postgres`
- Contraseña: la que hayas configurado
- Puerto por defecto: `5432`
- Host: `localhost`

**Para servicios en la nube** (Supabase, Railway, Render):
- Usa la URL de conexión proporcionada por el servicio
- Ejemplo Supabase: `postgresql://postgres:[password]@[host]:5432/postgres`

3. **Generar cliente Prisma**:
```bash
npm run db:generate
```

4. **Ejecutar migraciones**:
```bash
npm run db:migrate
```

5. **Ejecutar seed (opcional)**:
```bash
npm run db:seed
```

Esto creará:
- Usuario admin: `admin` / `admin123`
- Usuarios vendedores: `vendedor1` / `vendedor123`, `vendedor2` / `vendedor123`
- Locales de ejemplo
- Productos de ejemplo

6. **Iniciar servidor en desarrollo**:
```bash
npm run dev
```

## Scripts Disponibles

- `npm run dev` - Inicia servidor en modo desarrollo con hot-reload
- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Inicia servidor de producción
- `npm run db:generate` - Genera cliente Prisma
- `npm run db:migrate` - Ejecuta migraciones de base de datos
- `npm run db:studio` - Abre Prisma Studio (interfaz visual para la BD)
- `npm run db:seed` - Ejecuta seed para datos iniciales

## Estructura del Proyecto

```
backend/
├── src/
│   ├── config/        # Configuraciones (DB, env, socket)
│   ├── middleware/    # Middlewares (auth, error, rate limit)
│   ├── routes/        # Rutas de la API
│   ├── utils/         # Utilidades (JWT, bcrypt, audit)
│   └── index.ts       # Punto de entrada
├── prisma/
│   ├── schema.prisma  # Schema de Prisma
│   └── seed.ts        # Script de seed
└── dist/              # Código compilado (generado)
```

## Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario (solo ADMIN)
- `POST /api/auth/refresh` - Refrescar token
- `GET /api/auth/me` - Obtener usuario actual

### Productos
- `GET /api/productos` - Listar productos
- `GET /api/productos/:id` - Obtener producto
- `POST /api/productos` - Crear producto (solo ADMIN)
- `PUT /api/productos/:id` - Actualizar producto (solo ADMIN)
- `DELETE /api/productos/:id` - Eliminar producto (solo ADMIN)
- `GET /api/productos/codigo/:codigoBarras` - Buscar por código de barras

## Socket.io

El backend utiliza Socket.io para sincronización en tiempo real:

- **precio-actualizado**: Se emite cuando un admin actualiza el precio de un producto
- **stock-bajo**: Se emite cuando el stock está por debajo del mínimo (solo al local afectado)
- **stock-bajo-admin**: Se emite a los admins cuando cualquier local tiene stock bajo

## Seguridad

- Autenticación JWT (access token + refresh token)
- Passwords hasheados con bcrypt
- Validación de inputs con Zod
- Rate limiting en endpoints críticos
- CORS configurado
- Protección contra SQL injection (Prisma)
- Auditoría de cambios críticos

