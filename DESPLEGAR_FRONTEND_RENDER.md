# 🎨 Guía para Desplegar el Frontend en Render

## 📋 Resumen

Necesitas crear un **nuevo servicio Static Site** en Render para desplegar el frontend. El frontend se conectará automáticamente a tu API backend que ya está desplegada.

## 🚀 Pasos para Desplegar el Frontend

### Paso 1: Crear un Nuevo Servicio en Render

1. Ve a https://dashboard.render.com
2. Haz clic en **"+ New"** (arriba a la derecha)
3. Selecciona **"Static Site"**

### Paso 2: Conectar el Repositorio

1. Conecta tu repositorio de GitHub: `davinic7/tienda2`
2. Selecciona la rama: `main`

### Paso 3: Configurar el Build

**Name**: `tiendaslolo-frontend` (o el nombre que prefieras)

**Build Command**:
```bash
cd frontend && npm install && npm run build
```

**Publish Directory**:
```
frontend/dist
```

### Paso 4: Configurar Variable de Entorno

1. Ve a la sección **"Environment"** del servicio Static Site
2. Agrega esta variable de entorno:

**Key**: `VITE_API_URL`
**Value**: `https://tiendaslolo.onrender.com/api`

**⚠️ IMPORTANTE**: 
- Debe ser la URL completa de tu backend API
- Incluye `/api` al final
- Usa `https://` (no `http://`)

### Paso 5: Desplegar

1. Haz clic en **"Create Static Site"**
2. Render comenzará a construir y desplegar el frontend
3. Cuando termine, tendrás una URL como: `https://tiendaslolo-frontend.onrender.com`

## ✅ Verificación

Después del deploy:

1. Abre la URL del frontend en tu navegador
2. Deberías ver la pantalla de login
3. Puedes hacer login con:
   - Usuario: `admin`
   - Contraseña: `admin123`

## 🔧 Configuración Completa

### Resumen de Servicios en Render:

1. **Backend (Web Service)**: `https://tiendaslolo.onrender.com`
   - API REST
   - Socket.io
   - Base de datos PostgreSQL

2. **Frontend (Static Site)**: `https://tiendaslolo-frontend.onrender.com` (o el nombre que elijas)
   - Interfaz web React
   - Se conecta automáticamente al backend

## 📝 Notas Importantes

- El frontend necesita la variable `VITE_API_URL` para saber dónde está el backend
- Si cambias la URL del backend, actualiza `VITE_API_URL` en el frontend
- El frontend se reconstruye automáticamente cuando haces push al repositorio
- **Archivo `_redirects`**: El archivo `frontend/public/_redirects` está configurado para que todas las rutas redirijan a `index.html`, permitiendo que React Router maneje correctamente las rutas cuando actualizas la página

## 🎯 Próximos Pasos

1. Despliega el frontend siguiendo los pasos arriba
2. Comparte la URL del frontend con tus usuarios
3. Ellos podrán acceder y usar el sistema sin conocimientos técnicos

