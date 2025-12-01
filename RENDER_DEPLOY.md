# 🚀 Guía de Deploy en Render

## 🚨 ERROR COMÚN: "ZodError: Required" - Variables de Entorno Faltantes

Si ves este error en los logs de Render:
```
ZodError: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["JWT_SECRET"],
    "message": "Required"
  },
  ...
]
```

**SOLUCIÓN**: Debes configurar las variables de entorno en Render. Ve directamente a la sección [🔧 Variables de Entorno Necesarias](#-variables-de-entorno-necesarias) más abajo.

## ⚠️ Comando de Inicio Correcto

Para producción en Render, debes usar:

```
npm start
```

**NO uses** `npm run dev` (ese es solo para desarrollo local).

## 📋 Configuración en Render

### 1. Build Command
```
npm install && npm run build
```

**IMPORTANTE**: Debe ejecutarse desde la raíz del proyecto para que npm workspaces instale correctamente todas las dependencias.

### 2. Pre-Deploy Command (Recomendado)
```
cd backend && npx prisma db push
```

**IMPORTANTE**: Este comando crea/actualiza las tablas en la base de datos antes de iniciar el servidor. Se ejecuta automáticamente después del build y antes del start.

**Nota**: Si prefieres no ejecutarlo automáticamente, puedes dejarlo vacío y ejecutar las migraciones manualmente usando el Shell de Render cuando sea necesario.

### 3. Start Command
```
npm start
```

O alternativamente:
```
npm run start --workspace=backend
```

## 🔧 Variables de Entorno Necesarias

⚠️ **IMPORTANTE**: Debes configurar estas variables en Render antes de que el servidor pueda iniciar.

### Cómo Configurar Variables de Entorno en Render (PASO A PASO):

1. **Accede a tu servicio en Render**:
   - Ve a https://dashboard.render.com
   - Selecciona tu servicio (Web Service)

2. **Abre la sección de Environment Variables**:
   - En el menú lateral izquierdo, haz clic en **"Environment"**
   - O busca la pestaña **"Environment"** en la parte superior

3. **Agrega cada variable**:
   - Haz clic en **"Add Environment Variable"** o **"Add Variable"**
   - Ingresa el nombre de la variable (ej: `JWT_SECRET`)
   - Ingresa el valor de la variable
   - Haz clic en **"Save Changes"**
   - Repite para cada variable requerida

4. **Después de agregar todas las variables**:
   - Render automáticamente reiniciará el servicio
   - O puedes hacer clic en **"Manual Deploy"** → **"Deploy latest commit"** para forzar un nuevo deploy

### Variables Requeridas:

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|----------|------------|
| `DATABASE_URL` | URL de conexión a PostgreSQL | `postgresql://user:pass@host:5432/dbname` | ✅ Sí |
| `JWT_SECRET` | Secreto para JWT (mínimo 32 caracteres) | `tu-secreto-super-seguro-de-al-menos-32-caracteres` | ✅ Sí |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens (mínimo 32 caracteres) | `otro-secreto-super-seguro-de-al-menos-32-caracteres` | ✅ Sí |
| `FRONTEND_URL` | URL de tu frontend | `https://tu-frontend.onrender.com` o `http://localhost:5173` | ✅ Sí |
| `NODE_ENV` | Ambiente de ejecución | `production` | ⚠️ Opcional (default: development) |
| `PORT` | Puerto del servidor | `5000` o dejar vacío (Render lo asigna) | ⚠️ Opcional (default: 5000) |
| `JWT_EXPIRES_IN` | Tiempo de expiración del JWT | `3600` | ⚠️ Opcional (default: 3600) |
| `JWT_REFRESH_EXPIRES_IN` | Tiempo de expiración del refresh token | `604800` | ⚠️ Opcional (default: 604800) |

### Generar Secretos Seguros:

Puedes generar secretos seguros usando:

```bash
# En PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# En Linux/Mac
openssl rand -base64 32
```

O simplemente usa una cadena aleatoria de al menos 32 caracteres.

## 📝 Notas Importantes

1. **Base de Datos**: Render ofrece PostgreSQL gratuito. Crea una base de datos PostgreSQL y usa la URL de conexión proporcionada.

2. **Migraciones**: Después del primer deploy, ejecuta las migraciones:
   ```bash
   npm run db:push --workspace=backend
   ```

3. **Build**: El comando `npm run build` compila TypeScript a JavaScript en la carpeta `dist/`.

4. **Start**: El comando `npm start` ejecuta el servidor desde `dist/index.js`.

## 🐛 Solución de Problemas

Si el build falla:
- Verifica que todos los errores de TypeScript estén corregidos
- Asegúrate de que `tsconfig.json` esté configurado correctamente
- Verifica que todas las dependencias estén instaladas

Si el servidor no inicia:
- **Verifica las variables de entorno**: Asegúrate de que todas las variables requeridas estén configuradas en Render
- **Revisa los logs en Render**: Los logs mostrarán exactamente qué variable falta
- **Asegúrate de que la base de datos esté accesible**: Verifica que `DATABASE_URL` sea correcta
- **Verifica que los secretos tengan al menos 32 caracteres**: `JWT_SECRET` y `JWT_REFRESH_SECRET` deben tener mínimo 32 caracteres

### Error Común: "ZodError: Required"

Si ves este error, significa que faltan variables de entorno. Verifica que hayas configurado:

**Variables OBLIGATORIAS (deben estar todas configuradas):**
- ✅ `DATABASE_URL` - URL de conexión a PostgreSQL
- ✅ `JWT_SECRET` - Mínimo 32 caracteres (genera uno seguro)
- ✅ `JWT_REFRESH_SECRET` - Mínimo 32 caracteres (genera uno diferente)
- ✅ `FRONTEND_URL` - URL completa de tu frontend (ej: `https://tu-app.onrender.com`)

**Ejemplo de valores:**

```
DATABASE_URL=postgresql://usuario:password@host:5432/nombre_db
JWT_SECRET=mi-secreto-super-seguro-de-al-menos-32-caracteres-1234567890
JWT_REFRESH_SECRET=otro-secreto-super-seguro-de-al-menos-32-caracteres-9876543210
FRONTEND_URL=https://tu-frontend.onrender.com
NODE_ENV=production
```

**⚠️ IMPORTANTE:**
- Los secretos JWT deben tener **mínimo 32 caracteres**
- `FRONTEND_URL` debe ser una URL válida (con `http://` o `https://`)
- `DATABASE_URL` debe ser la URL completa de conexión a PostgreSQL
- Después de agregar las variables, Render reiniciará automáticamente el servicio

