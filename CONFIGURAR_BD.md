# 🔧 Configuración de Base de Datos PostgreSQL

## Problema Actual
El error indica que **no se puede conectar a PostgreSQL** porque:
1. ✅ El archivo `.env` ya fue creado
2. ❌ PostgreSQL no está instalado o no está corriendo
3. ❌ La base de datos `tienda_pos` no existe

## Solución: Opción 1 - PostgreSQL Local (Recomendado)

### Paso 1: Instalar PostgreSQL
1. Descarga PostgreSQL desde: https://www.postgresql.org/download/windows/
2. Instala PostgreSQL (usa la contraseña que quieras para el usuario `postgres`)
3. Asegúrate de que el servicio de PostgreSQL esté corriendo

### Paso 2: Configurar el archivo `.env`
Edita `backend/.env` y actualiza la línea `DATABASE_URL` con tu contraseña:

```env
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/tienda_pos"
```

### Paso 3: Crear la base de datos
Abre **pgAdmin** (viene con PostgreSQL) o usa **psql** desde la terminal:

```sql
CREATE DATABASE tienda_pos;
```

O desde la terminal de PowerShell:
```powershell
psql -U postgres -c "CREATE DATABASE tienda_pos;"
```

### Paso 4: Ejecutar migraciones y seed
Desde la raíz del proyecto, ejecuta este comando que hace todo automáticamente:

```bash
npm run db:setup
```

O si prefieres hacerlo paso a paso:

```bash
# Generar cliente Prisma
npm run db:generate

# Crear las tablas (usar db:push para desarrollo)
npm run db:push

# Crear usuarios y datos iniciales
npm run db:seed
```

### Paso 5: Verificar usuarios creados
Después del seed, tendrás estos usuarios:
- **admin** / **admin123**
- **vendedor1** / **vendedor123**
- **vendedor2** / **vendedor123**

---

## Solución: Opción 2 - Servicio en la Nube (Más Fácil)

### Usar Supabase (Gratis)
1. Ve a https://supabase.com y crea una cuenta
2. Crea un nuevo proyecto
3. Ve a **Settings** → **Database** → **Connection string**
4. Copia la URL de conexión (formato: `postgresql://postgres:[password]@[host]:5432/postgres`)
5. Pega la URL en `backend/.env` como `DATABASE_URL`
6. Ejecuta: `npm run db:setup` (desde la raíz del proyecto)

### Usar Railway (Gratis)
1. Ve a https://railway.app y crea una cuenta
2. Crea un nuevo proyecto → **New** → **Database** → **PostgreSQL**
3. Copia la `DATABASE_URL` que te proporciona
4. Pega la URL en `backend/.env`
5. Ejecuta: `npm run db:setup` (desde la raíz del proyecto)

---

## Verificar que todo funciona

Después de configurar, reinicia el servidor y prueba hacer login con:
- Usuario: `admin`
- Contraseña: `admin123`

Si todo está bien, deberías poder iniciar sesión sin problemas.

