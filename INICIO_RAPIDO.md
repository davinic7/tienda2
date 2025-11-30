# 🚀 Inicio Rápido - Sistema POS Multi-Local

## ✅ Proyecto Configurado y Listo

El proyecto ha sido configurado exitosamente y está listo para usar.

## 📋 Credenciales de Acceso

### Usuario Administrador
- **Usuario**: `admin`
- **Contraseña**: `admin123`

### Usuarios Vendedores
- **Usuario 1**: `vendedor1` / Contraseña: `vendedor123`
- **Usuario 2**: `vendedor2` / Contraseña: `vendedor123`

## 🌐 Acceso a la Aplicación

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 🔧 Comandos Disponibles

### Iniciar el proyecto completo
```bash
npm run dev
```

### Iniciar por separado
```bash
# Backend solamente
npm run dev:backend

# Frontend solamente
npm run dev:frontend
```

### Base de datos
```bash
# Sincronizar schema con la base de datos (desarrollo)
npm run db:push

# Crear migración
npm run db:migrate

# Generar cliente Prisma
npm run db:generate

# Abrir Prisma Studio (interfaz visual de BD)
npm run db:studio

# Ejecutar seed (datos iniciales)
npm run db:seed
```

## 📊 Datos Iniciales Creados

- ✅ 2 Locales: "Local Central" y "Sucursal Norte"
- ✅ 1 Usuario Administrador
- ✅ 2 Usuarios Vendedores (asignados a cada local)
- ✅ 3 Productos de ejemplo con stock en ambos locales

## 🎯 Próximos Pasos

1. **Accede al frontend**: Abre http://localhost:5173 en tu navegador
2. **Inicia sesión** con las credenciales del administrador
3. **Explora las funcionalidades**:
   - Dashboard según tu rol
   - Gestión de productos (solo ADMIN)
   - Sistema de ventas (próximamente)
   - Gestión de clientes (próximamente)
   - Reportes (próximamente)

## 📡 Socket.io

El sistema utiliza Socket.io para sincronización en tiempo real:
- Cambios de precios se notifican automáticamente
- Alertas de stock bajo
- Actualizaciones instantáneas entre todos los locales

## 🔍 Verificar que todo funciona

1. **Backend**: Abre http://localhost:5000/health
   - Deberías ver: `{"status":"ok","timestamp":"..."}`

2. **Frontend**: Abre http://localhost:5173
   - Deberías ver la pantalla de login

3. **Login**: Usa `admin` / `admin123`
   - Deberías acceder al dashboard

## ⚠️ Solución de Problemas

### Si el servidor no inicia:
- Verifica que PostgreSQL esté corriendo
- Verifica que el archivo `.env` en `backend/` tenga la configuración correcta
- Verifica que los puertos 5000 y 5173 no estén en uso

### Si hay errores de conexión:
- Verifica la URL de conexión en `backend/.env`:
  ```
  DATABASE_URL="postgresql://postgres:password@localhost:5432/tienda_pos"
  ```
- Si usas un servicio en la nube (Supabase, Railway, Render), usa la URL de conexión proporcionada

## 🎉 ¡Listo para usar!

El sistema está completamente funcional. Puedes empezar a desarrollar nuevas funcionalidades o usar las existentes.

