# 🚀 Guía para Ejecutar el Proyecto Localmente

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

1. **Node.js** (versión 18.x o superior)
   - Descarga: https://nodejs.org/
   - Verifica instalación: `node --version`

2. **PostgreSQL** (versión 14 o superior)
   - Opción 1: Instalar localmente
     - Windows: https://www.postgresql.org/download/windows/
     - Mac: `brew install postgresql`
     - Linux: `sudo apt-get install postgresql`
   - Opción 2: Usar un servicio en la nube (más fácil)
     - **Supabase** (gratis): https://supabase.com
     - **Railway** (gratis): https://railway.app
     - **Render** (gratis): https://render.com

3. **Git** (opcional, si quieres clonar desde GitHub)
   - Descarga: https://git-scm.com/

## 🔧 Configuración Paso a Paso

### Paso 1: Instalar Dependencias

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

Esto instalará todas las dependencias del frontend, backend y shared.

### Paso 2: Configurar Base de Datos

#### Opción A: PostgreSQL Local

1. **Crear la base de datos**:
   ```sql
   -- Conéctate a PostgreSQL
   psql -U postgres
   
   -- Crea la base de datos
   CREATE DATABASE tienda_pos;
   
   -- Salir
   \q
   ```

2. **Obtén la URL de conexión**:
   ```
   postgresql://postgres:TU_PASSWORD@localhost:5432/tienda_pos
   ```

#### Opción B: Servicio en la Nube (Recomendado)

1. **Supabase** (más fácil):
   - Crea una cuenta en https://supabase.com
   - Crea un nuevo proyecto
   - Ve a Settings → Database
   - Copia la "Connection string" (URI)

2. **Railway**:
   - Crea una cuenta en https://railway.app
   - Crea un nuevo proyecto → Add PostgreSQL
   - Copia la "DATABASE_URL" de las variables de entorno

### Paso 3: Configurar Variables de Entorno

1. **Crea el archivo `.env`** en la carpeta `backend/`:

```bash
# En Windows (PowerShell)
cd backend
New-Item -Path .env -ItemType File

# En Mac/Linux
cd backend
touch .env
```

2. **Agrega el siguiente contenido** al archivo `.env`:

```env
# Base de datos
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/tienda_pos"
# O si usas Supabase/Railway, pega aquí la URL que copiaste

# JWT Secrets (genera valores aleatorios seguros)
JWT_SECRET="tu-secreto-jwt-muy-seguro-y-aleatorio-aqui"
JWT_REFRESH_SECRET="tu-secreto-refresh-muy-seguro-y-aleatorio-aqui"

# Puerto del servidor
PORT=5000

# Entorno
NODE_ENV=development

# URL del frontend
FRONTEND_URL="http://localhost:5173"

# Expiración de tokens (en segundos)
JWT_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800
```

**⚠️ Importante**: 
- Reemplaza `TU_PASSWORD` con tu contraseña de PostgreSQL
- Genera secretos JWT seguros (puedes usar: https://randomkeygen.com/)

### Paso 4: Configurar Base de Datos

Ejecuta estos comandos para crear las tablas y datos iniciales:

```bash
# Generar cliente Prisma
npm run db:generate

# Crear tablas en la base de datos
npm run db:push

# Insertar datos iniciales (admin, locales, productos de ejemplo)
npm run db:seed
```

### Paso 5: Iniciar el Proyecto

Tienes dos opciones:

#### Opción A: Iniciar Todo Junto (Recomendado)

```bash
npm run dev
```

Esto iniciará:
- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:5173

#### Opción B: Iniciar por Separado

**Terminal 1 - Backend**:
```bash
npm run dev:backend
```

**Terminal 2 - Frontend**:
```bash
npm run dev:frontend
```

## ✅ Verificar que Todo Funciona

1. **Backend**: Abre http://localhost:5000/health
   - Deberías ver: `{"status":"ok","timestamp":"..."}`

2. **Frontend**: Abre http://localhost:5173
   - Deberías ver la pantalla de login

3. **Login**: Usa las credenciales:
   - **Usuario**: `admin`
   - **Contraseña**: `admin123`

## 📊 Credenciales por Defecto

Después de ejecutar `npm run db:seed`, tendrás:

### Usuario Administrador
- **Usuario**: `admin`
- **Contraseña**: `admin123`

### Usuarios Vendedores
- **Usuario 1**: `vendedor1` / Contraseña: `vendedor123`
- **Usuario 2**: `vendedor2` / Contraseña: `vendedor123`

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm run dev                    # Inicia frontend y backend
npm run dev:frontend          # Solo frontend
npm run dev:backend           # Solo backend

# Base de datos
npm run db:generate           # Generar cliente Prisma
npm run db:push               # Sincronizar schema con BD
npm run db:migrate            # Crear migración
npm run db:seed               # Insertar datos iniciales
npm run db:studio             # Abrir Prisma Studio (interfaz visual)

# Producción
npm run build                 # Compilar ambos proyectos
npm start                     # Iniciar en modo producción
```

## 🔍 Prisma Studio (Interfaz Visual de BD)

Para ver y editar la base de datos visualmente:

```bash
npm run db:studio
```

Esto abrirá una interfaz web en http://localhost:5555 donde podrás:
- Ver todas las tablas
- Editar datos
- Agregar registros
- Eliminar registros

## ⚠️ Solución de Problemas

### Error: "Cannot find module"
```bash
# Elimina node_modules y reinstala
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf backend/node_modules
npm install
```

### Error: "Prisma Client not generated"
```bash
npm run db:generate
```

### Error: "Database connection failed"
- Verifica que PostgreSQL esté corriendo
- Verifica la URL en `backend/.env`
- Si usas un servicio en la nube, verifica que la URL sea correcta

### Error: "Port 5000 already in use"
- Cambia el puerto en `backend/.env`: `PORT=5001`
- O cierra el proceso que está usando el puerto

### Error: "Port 5173 already in use"
- Vite usará automáticamente el siguiente puerto disponible
- O cierra el proceso que está usando el puerto

## 📱 Acceso desde Dispositivos Móviles

Si quieres probar en tu móvil en la misma red:

1. **Encuentra tu IP local**:
   - Windows: `ipconfig` (busca "IPv4 Address")
   - Mac/Linux: `ifconfig` o `ip addr`

2. **Actualiza `FRONTEND_URL`** en `backend/.env`:
   ```env
   FRONTEND_URL="http://TU_IP:5173,http://localhost:5173"
   ```

3. **Accede desde tu móvil**:
   ```
   http://TU_IP:5173
   ```

## 🎉 ¡Listo!

Ahora deberías tener el proyecto corriendo localmente. Puedes:
- Desarrollar nuevas funcionalidades
- Probar cambios antes de subirlos
- Usar Prisma Studio para gestionar datos
- Acceder desde cualquier dispositivo en tu red local

## 📚 Recursos Adicionales

- **Prisma Docs**: https://www.prisma.io/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **Socket.io**: https://socket.io/docs

