# Guía de Configuración del Sistema POS Multi-local

## Pasos de Instalación

### 1. Instalar Dependencias

```bash
# Instalar dependencias del monorepo
npm install

# O instalar por workspace
npm run install:all
```

### 2. Configurar Base de Datos MySQL

1. Asegúrate de tener MySQL instalado y corriendo (versión 8.0 o superior recomendada)
2. Crea una base de datos:
```sql
CREATE DATABASE pos_multilocal;
```

3. Crea el archivo `.env` en `backend/` basado en `.env.example`:
```bash
cd backend
cp .env.example .env
```

4. Edita `backend/.env` con tus credenciales:
```env
DATABASE_URL="mysql://usuario:password@localhost:3306/pos_multilocal"
JWT_SECRET="tu-secret-key-super-segura"
JWT_REFRESH_SECRET="tu-refresh-secret-key-super-segura"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

### 3. Configurar Prisma

```bash
cd backend

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev --name init
```

### 4. Crear Usuario ADMIN

```bash
cd backend

# Opción 1: Usar el script interactivo
npx tsx scripts/create-admin.ts

# Opción 2: Crear manualmente usando Prisma Studio
npx prisma studio
# Luego crea un usuario manualmente con role='ADMIN' y password hasheado con bcrypt

# Opción 3: Usar este script de ejemplo
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      nombre: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN',
      localId: null,
    },
  });
  
  console.log('Admin creado:', admin);
}

main().catch(console.error).finally(() => prisma.$disconnect());
"
```

### 5. Configurar Variables de Entorno del Frontend (Opcional)

Crea un archivo `.env` en `frontend/` si necesitas personalizar las URLs:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### 6. Iniciar el Proyecto

#### Desarrollo (ambos servicios):
```bash
npm run dev
```

#### Por separado:
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### 7. Acceder a la Aplicación

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Prisma Studio**: `cd backend && npx prisma studio`

## Crear Usuarios y Locales

### Crear un Local (desde el sistema o directamente en la BD)

```sql
-- Usando Prisma Studio o desde la API cuando estés autenticado como ADMIN
INSERT INTO "Local" (id, nombre, direccion, telefono, activo, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Sucursal Centro', 'Av. Principal 123', '555-1234', true, NOW(), NOW());
```

### Crear un Usuario VENDEDOR

1. Primero crea un Local (ver arriba)
2. Luego crea el usuario vendedor asignado a ese local:

```sql
-- Obtén el ID del local primero
SELECT id FROM "Local" WHERE nombre = 'Sucursal Centro';

-- Crea el usuario (el password debe estar hasheado con bcrypt)
-- Usa bcrypt.hash('password123', 10) para hashear la contraseña
INSERT INTO "User" (id, email, password, nombre, role, "localId", activo, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'vendedor@example.com',
  '$2b$10$hashedpassword...', -- Usa bcrypt para hashear
  'Juan Vendedor',
  'VENDEDOR',
  'LOCAL_ID_AQUI', -- ID del local creado
  true,
  NOW(),
  NOW()
);
```

O usa el script interactivo modificado para crear vendedores.

## Estructura del Proyecto

```
LaTienda/
├── backend/              # API REST + Socket.io
│   ├── prisma/          # Schema y migraciones
│   ├── src/
│   │   ├── middleware/  # Auth, audit, error handling
│   │   ├── routes/      # Endpoints REST
│   │   ├── socket/      # Configuración Socket.io
│   │   └── utils/       # Utilidades (bcrypt, jwt)
│   └── scripts/         # Scripts de utilidad
├── frontend/            # Aplicación React
│   ├── src/
│   │   ├── components/  # Componentes reutilizables
│   │   ├── contexts/    # Contextos React (Auth, Socket)
│   │   ├── pages/       # Páginas/views
│   │   ├── types/       # Tipos TypeScript
│   │   └── utils/       # Utilidades (API client)
├── shared/              # Tipos compartidos (opcional)
└── package.json         # Configuración del monorepo
```

## Scripts Disponibles

### Backend
- `npm run dev` - Inicia en modo desarrollo
- `npm run build` - Compila TypeScript
- `npm run start` - Inicia versión compilada
- `npx prisma generate` - Genera cliente Prisma
- `npx prisma migrate dev` - Crea migración
- `npx prisma studio` - Abre interfaz visual de BD

### Frontend
- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Compila para producción
- `npm run preview` - Preview de build de producción

### Monorepo
- `npm run dev` - Inicia frontend y backend
- `npm run build` - Compila todos los proyectos
- `npm run install:all` - Instala todas las dependencias

## Problemas Comunes

### Error de conexión a la base de datos
- Verifica que MySQL esté corriendo
- Verifica las credenciales en `.env`
- Verifica que la base de datos exista

### Error de token JWT
- Verifica que `JWT_SECRET` y `JWT_REFRESH_SECRET` estén configurados en `.env`
- Regenera los tokens si cambiaste los secretos

### Error de CORS
- Verifica que `FRONTEND_URL` en `backend/.env` coincida con la URL del frontend

### Socket.io no conecta
- Verifica que el backend esté corriendo
- Verifica que `VITE_SOCKET_URL` en el frontend apunte al backend
- Verifica los logs del servidor para errores de autenticación

## Próximos Pasos

1. Crea un usuario ADMIN usando el script
2. Inicia sesión en el frontend
3. Crea locales desde el sistema (requiere ser ADMIN)
4. Crea productos y asigna stock a los locales
5. Crea usuarios VENDEDOR y asígnalos a locales
6. ¡Listo para usar el sistema!

