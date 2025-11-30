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

Asegúrate de configurar estas variables en Render:

- `DATABASE_URL` - URL de conexión a PostgreSQL
- `JWT_SECRET` - Secreto para JWT (mínimo 32 caracteres)
- `JWT_REFRESH_SECRET` - Secreto para refresh tokens (mínimo 32 caracteres)
- `PORT` - Puerto (Render lo asigna automáticamente, pero puedes usar 5000)
- `NODE_ENV` - `production`
- `FRONTEND_URL` - URL de tu frontend (ej: https://tu-frontend.onrender.com)
- `JWT_EXPIRES_IN` - `3600` (1 hora)
- `JWT_REFRESH_EXPIRES_IN` - `604800` (7 días)

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
- Verifica las variables de entorno
- Revisa los logs en Render
- Asegúrate de que la base de datos esté accesible

