# 🚀 Guía de Deploy en Render

## ⚠️ Comando de Inicio Correcto

Para producción en Render, debes usar:

```
npm start
```

**NO uses** `npm run dev` (ese es solo para desarrollo local).

## 📋 Configuración en Render

### 1. Build Command
```
cd backend && npm install && npm run build
```

### 2. Start Command
```
cd backend && npm start
```

O si estás en la raíz del proyecto:
```
npm run build:backend && npm start --workspace=backend
```

## 🔧 Variables de Entorno Necesarias

⚠️ **IMPORTANTE**: Debes configurar estas variables en Render antes de que el servidor pueda iniciar.

### Cómo Configurar Variables de Entorno en Render:

1. Ve a tu servicio en el dashboard de Render
2. Haz clic en **"Environment"** en el menú lateral
3. Haz clic en **"Add Environment Variable"**
4. Agrega cada una de las siguientes variables:

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
- ✅ `DATABASE_URL`
- ✅ `JWT_SECRET` (mínimo 32 caracteres)
- ✅ `JWT_REFRESH_SECRET` (mínimo 32 caracteres)
- ✅ `FRONTEND_URL`

