# 🗄️ Ejecutar Migraciones desde tu Máquina Local

## 📋 Pasos para Ejecutar Migraciones

### Paso 1: Obtener la DATABASE_URL de Render

1. Ve a tu servicio en Render: https://dashboard.render.com
2. Selecciona tu servicio "TiendasLOLO"
3. Ve a la sección **"Environment"** (en el menú lateral)
4. Busca la variable `DATABASE_URL`
5. **Copia el valor completo** (haz clic en el ícono de copiar o muestra el valor)

La URL debería verse algo así:
```
postgresql://lolodb_user:Gudt9unXZnPc1kUrH2yf7MegzhpxNQgJ@dpg-d4me1hali9vc73eonfkg-a/lolodb
```

### Paso 2: Configurar tu .env local temporalmente

1. Ve a la carpeta `backend/` en tu proyecto local
2. Abre o crea el archivo `.env`
3. Agrega la `DATABASE_URL` que copiaste de Render **AGREGANDO SSL**:

```env
DATABASE_URL="postgresql://lolodb_user:Gudt9unXZnPc1kUrH2yf7MegzhpxNQgJ@dpg-d4me1hali9vc73eonfkg-a/lolodb?sslmode=require"
```

**⚠️ IMPORTANTE**: 
- Reemplaza la URL con la que copiaste de Render
- **AGREGA `?sslmode=require` al final de la URL** (antes de las comillas de cierre)
- Esto es necesario porque Render requiere SSL para conexiones externas
- Mantén las comillas alrededor de la URL
- No necesitas las otras variables de entorno para ejecutar las migraciones

**Ejemplo completo**:
```env
DATABASE_URL="postgresql://usuario:password@host:5432/database?sslmode=require"
```

### Paso 3: Ejecutar las Migraciones

Abre una terminal en tu proyecto y ejecuta:

```bash
cd backend
npx prisma db push
```

O desde la raíz del proyecto:

```bash
npm run db:push --workspace=backend
```

### Paso 4: Verificar el Resultado

Deberías ver un mensaje como:

```
✔ Generated Prisma Client
✔ Database synchronized
```

O:

```
Your database is now in sync with your Prisma schema.
```

### Paso 5: (Opcional) Ejecutar Seed

Si quieres datos iniciales (usuario admin, productos de ejemplo):

```bash
cd backend
npx prisma db seed
```

O desde la raíz:

```bash
npm run db:seed --workspace=backend
```

Esto creará:
- Usuario admin: `admin` / `admin123`
- Usuarios vendedores de ejemplo
- Locales de ejemplo
- Productos de ejemplo

## ✅ Verificación

Después de ejecutar las migraciones:

1. Ve a los logs de Render
2. Los errores sobre tablas faltantes deberían desaparecer
3. El servidor debería funcionar correctamente
4. Puedes probar el endpoint: `https://tiendaslolo.onrender.com/health`

## 🔒 Seguridad

**IMPORTANTE**: 
- El archivo `.env` está en `.gitignore`, así que no se subirá al repositorio
- No compartas tu `DATABASE_URL` públicamente
- Puedes restaurar tu `.env` local después si tenías otras configuraciones

## 📝 Notas

- Esta es una solución temporal para el plan gratuito
- Las migraciones se ejecutan directamente en la base de datos de producción
- Asegúrate de tener la versión correcta del schema antes de ejecutar

