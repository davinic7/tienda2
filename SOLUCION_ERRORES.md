# Solución de Errores de Conexión

## Problema: ERR_CONNECTION_REFUSED

Si ves errores en la consola del navegador como `ERR_CONNECTION_REFUSED`, significa que el **backend no está corriendo** o no está accesible.

## Solución Rápida

### 1. Verificar que el backend esté corriendo

Abre una nueva terminal y ejecuta:

```bash
cd backend
npm run dev
```

Deberías ver:
```
🚀 Servidor ejecutándose en puerto 5000
📡 Socket.io inicializado
🌐 Ambiente: development
```

### 2. Verificar configuración del backend

Asegúrate de que el archivo `backend/.env` existe y tiene la configuración correcta:

```env
DATABASE_URL="mysql://root:@localhost:3306/tienda_pos"
JWT_SECRET="tu-secreto-jwt-muy-seguro"
JWT_REFRESH_SECRET="tu-secreto-refresh-muy-seguro"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
JWT_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800
```

### 3. Verificar que MySQL/MariaDB esté corriendo

- Abre XAMPP Control Panel
- Asegúrate de que MySQL está en estado "Running"
- Verifica que el puerto sea 3306

### 4. Probar conexión manual

Abre tu navegador y ve a:
```
http://localhost:5000/health
```

Deberías ver:
```json
{"status":"ok","timestamp":"..."}
```

## Solución: Iniciar ambos servidores

### Opción 1: Usar el comando del workspace raíz

```bash
npm run dev
```

Este comando inicia tanto el backend como el frontend simultáneamente.

### Opción 2: Iniciar por separado

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Verificar que todo funciona

1. **Backend**: http://localhost:5000/health
   - Debe mostrar: `{"status":"ok",...}`

2. **Frontend**: http://localhost:5173
   - Debe mostrar la pantalla de login

3. **Login**: Usa `admin` / `admin123`
   - Debe redirigir al dashboard sin errores en consola

## Errores Comunes

### Error: "Backend no responde"
- Verifica que MySQL esté corriendo en XAMPP
- Verifica que el archivo `.env` exista en `backend/`
- Verifica que no haya otro proceso usando el puerto 5000

### Error: "Cannot connect to database"
- Verifica la URL de conexión en `backend/.env`
- Verifica que la base de datos `tienda_pos` exista
- Ejecuta: `npm run db:push` en la carpeta backend

### Error: "Vite cache issues"
- Ejecuta: `cd frontend && npm run clean && npm run dev`

