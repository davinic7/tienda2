# 🔧 Solución de Errores Comunes

## Error: `ERR_CONNECTION_REFUSED` en `localhost:3000`

### ¿Por qué ocurre?

Este error significa que el **backend no está corriendo** o no está accesible. Las causas más comunes son:

1. **El servidor se detuvo**
   - Se cerró la terminal donde estaba corriendo
   - Hubo un error no manejado que detuvo el proceso
   - Se reinició la computadora

2. **El puerto 3000 está ocupado**
   - Otra aplicación está usando el puerto 3000
   - Un proceso anterior de Node.js quedó colgado

3. **Error en el código que detuvo el servidor**
   - Error de sintaxis
   - Error de conexión a la base de datos
   - Variable de entorno faltante

4. **MySQL/MariaDB no está corriendo**
   - XAMPP MySQL no está iniciado
   - La base de datos no está accesible

### Soluciones

#### 1. Verificar que MySQL esté corriendo
```bash
# Abre XAMPP Control Panel
# Verifica que MySQL esté en verde (Running)
```

#### 2. Reiniciar el backend
```bash
cd backend
npm run dev
```

#### 3. Verificar que el puerto 3000 esté libre
```powershell
# Ver qué proceso usa el puerto 3000
netstat -ano | findstr :3000

# Si hay un proceso, puedes terminarlo (reemplaza PID con el número)
taskkill /PID <PID> /F
```

#### 4. Verificar variables de entorno
```bash
cd backend
# Verifica que .env exista y tenga todas las variables
Get-Content .env
```

#### 5. Ver logs del backend
Cuando ejecutas `npm run dev`, deberías ver:
```
🚀 Servidor corriendo en puerto 3000
📡 Socket.io disponible en ws://localhost:3000
```

Si ves errores, esos son los que están causando el problema.

### Prevención

1. **Mantén la terminal abierta**: No cierres la terminal donde corre `npm run dev`
2. **Usa PM2 para producción**: Para mantener el servidor corriendo automáticamente
3. **Verifica MySQL primero**: Siempre inicia MySQL en XAMPP antes del backend

## Error: `WebSocket connection failed`

### Causa
El backend no está corriendo o Socket.io no está configurado correctamente.

### Solución
1. Asegúrate de que el backend esté corriendo
2. Verifica que `FRONTEND_URL` en `.env` sea correcto
3. Recarga la página después de iniciar el backend

## Error: `Error interno del servidor` (500)

### Causas comunes

1. **Base de datos no conectada**
   - MySQL no está corriendo
   - Credenciales incorrectas en `.env`
   - Base de datos no existe

2. **Variable de entorno faltante**
   - `JWT_SECRET` no definido
   - `DATABASE_URL` incorrecta

3. **Error en el código**
   - Revisa los logs del backend para ver el error específico

### Solución
1. Revisa los logs en la terminal del backend
2. Verifica la conexión a la base de datos
3. Verifica todas las variables en `.env`

## Comandos Útiles

### Verificar que todo esté corriendo
```powershell
# Backend
Invoke-WebRequest -Uri "http://localhost:3000/health"

# Frontend
Invoke-WebRequest -Uri "http://localhost:5173"
```

### Reiniciar todo
```powershell
# Detener todos los procesos Node
Get-Process -Name node | Stop-Process -Force

# Reiniciar
cd backend
npm run dev

# En otra terminal
cd frontend
npm run dev
```

### Ver logs en tiempo real
Los logs aparecen en la terminal donde ejecutaste `npm run dev`. Si no ves logs, el proceso no está corriendo.

