# 🗄️ Ejecutar Migraciones de Prisma en Render

## ⚠️ Problema Actual

El servidor está funcionando, pero las tablas de la base de datos no existen. Necesitas ejecutar las migraciones de Prisma.

## 🔧 Solución: Usar Render Shell

### Paso 1: Abrir Shell en Render

1. Ve a tu servicio en Render: https://dashboard.render.com
2. Selecciona tu servicio "TiendasLOLO"
3. En el menú lateral, haz clic en **"Shell"**
4. Se abrirá una terminal en el navegador

### Paso 2: Ejecutar Migraciones

En el Shell de Render, ejecuta estos comandos:

```bash
# Navegar al directorio del backend
cd backend

# Ejecutar prisma db push para crear las tablas
npx prisma db push
```

O si prefieres usar el script de npm:

```bash
# Desde la raíz del proyecto
npm run db:push --workspace=backend
```

### Paso 3: (Opcional) Ejecutar Seed

Si quieres datos iniciales (usuario admin, productos de ejemplo, etc.):

```bash
# Desde la raíz del proyecto
npm run db:seed --workspace=backend
```

Esto creará:
- Usuario admin: `admin` / `admin123`
- Usuarios vendedores de ejemplo
- Locales de ejemplo
- Productos de ejemplo

## ✅ Verificación

Después de ejecutar `prisma db push`, deberías ver un mensaje como:

```
✔ Generated Prisma Client
✔ Database synchronized
```

Y los errores sobre tablas faltantes deberían desaparecer.

## 🔄 Automatizar Migraciones: Pre-Deploy Command (RECOMENDADO)

Para que las migraciones se ejecuten automáticamente en cada deploy:

1. Ve a tu servicio en Render: https://dashboard.render.com
2. Selecciona tu servicio "TiendasLOLO"
3. Ve a **Settings** → **Build & Deploy**
4. En **Pre-Deploy Command**, agrega:
   ```
   cd backend && npx prisma db push
   ```
5. Haz clic en **"Save Changes"**

**Ventajas**:
- ✅ Las migraciones se ejecutan automáticamente en cada deploy
- ✅ No necesitas ejecutarlas manualmente
- ✅ Las tablas siempre estarán sincronizadas con el schema

**Nota**: Esto ejecutará las migraciones en cada deploy. Si haces cambios destructivos en el schema, considera usar migraciones versionadas con `prisma migrate deploy` en lugar de `prisma db push`.

## 📝 Notas Importantes

- `prisma db push` sincroniza el schema con la base de datos sin crear archivos de migración
- Es ideal para desarrollo y prototipos
- Para producción, considera usar `prisma migrate deploy` con migraciones versionadas

