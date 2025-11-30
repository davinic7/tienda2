# Despliegue en Railway - Guía Rápida

## Archivos de Configuración Creados

✅ `railway.json` - Configuración de Railway
✅ `Procfile` - Comando de inicio
✅ `.nixpacks.toml` - Configuración de build
✅ `RAILWAY_DEPLOY.md` - Guía completa de despliegue

## Variables de Entorno Necesarias

Crea estos archivos manualmente (están en .gitignore):

### `backend/.env.example`
```env
DATABASE_URL="mysql://root:password@localhost:3306/pos_multi_local"
JWT_SECRET="cambiar-por-secreto-seguro-en-produccion"
JWT_REFRESH_SECRET="cambiar-por-secreto-refresh-seguro-en-produccion"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
FRONTEND_URL="http://localhost:5173"
SOCKET_URL="http://localhost:3000"
```

### `frontend/.env.example`
```env
VITE_API_URL="http://localhost:3000"
VITE_SOCKET_URL="http://localhost:3000"
```

## Pasos para Desplegar

1. **Sube el código a GitHub**
   ```bash
   git add .
   git commit -m "Configuración para Railway"
   git push origin main
   ```

2. **Crea un proyecto en Railway**
   - Ve a https://railway.app
   - Crea un nuevo proyecto desde GitHub
   - Selecciona tu repositorio

3. **Configura la base de datos**
   - En Railway, agrega un servicio MySQL
   - La variable `DATABASE_URL` se configurará automáticamente

4. **Configura las variables de entorno**
   - Ve a Variables en tu servicio
   - Agrega:
     - `JWT_SECRET` (genera uno seguro)
     - `JWT_REFRESH_SECRET` (genera uno seguro)
     - `FRONTEND_URL` (la URL de Railway)
     - `VITE_API_URL` (la URL de Railway)
     - `VITE_SOCKET_URL` (la URL de Railway)

5. **Despliega**
   - Railway detectará automáticamente los cambios
   - El build se ejecutará automáticamente
   - Las migraciones de Prisma se ejecutarán antes de iniciar

## Generar Secrets Seguros

```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## Ver Documentación Completa

Lee `RAILWAY_DEPLOY.md` para una guía detallada.

