# 🚀 Guía Rápida para Probar el Sistema

## ✅ Pasos para Ejecutar (5 minutos)

### 1️⃣ Instalar Dependencias

```bash
# Desde la raíz del proyecto
npm run install:all
```

### 2️⃣ Configurar MariaDB/MySQL (XAMPP)

**Si usas XAMPP, MariaDB ya está incluido y es compatible con MySQL**

1. **Inicia XAMPP** y asegúrate de que el módulo **MySQL** esté corriendo (botón verde)

2. **Abre phpMyAdmin** (http://localhost/phpmyadmin) o usa la línea de comandos

3. **Crea la base de datos:**
   - En phpMyAdmin: Click en "Nueva" → Nombre: `pos_multilocal` → Crear
   - O desde la línea de comandos:
   ```sql
   CREATE DATABASE pos_multilocal;
   ```

**Nota:** MariaDB es 100% compatible con MySQL, así que todo funcionará igual.

### 3️⃣ Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cd backend
copy .env.example .env   # Windows
# o
cp .env.example .env     # Linux/Mac
```

**Edita `backend/.env`** y cambia:
```env
DATABASE_URL="mysql://root@localhost:3306/pos_multilocal"
```

**Para XAMPP/MariaDB:**
- Usuario por defecto: `root` (sin contraseña normalmente)
- Puerto: `3306` (puerto por defecto)
- Si tienes contraseña: `mysql://root:TU_PASSWORD@localhost:3306/pos_multilocal`
```

Genera claves JWT seguras (puedes usar cualquier string largo):
```env
JWT_SECRET="clave-secreta-super-larga-y-segura-123456789"
JWT_REFRESH_SECRET="otra-clave-secreta-diferente-987654321"
```

### 4️⃣ Configurar Base de Datos con Prisma

```bash
cd backend

# Generar cliente Prisma
npx prisma generate

# Crear las tablas en la base de datos
npx prisma migrate dev --name init
```

### 5️⃣ Crear Usuario ADMIN

**Opción A: Script interactivo (Recomendado)**
```bash
cd backend
npx tsx scripts/create-admin.ts
```

**Opción B: Script rápido**
```bash
cd backend
npx tsx -e "import { PrismaClient } from '@prisma/client'; import bcrypt from 'bcrypt'; const prisma = new PrismaClient(); (async () => { const hash = await bcrypt.hash('admin123', 10); const admin = await prisma.user.create({ data: { email: 'admin@test.com', nombre: 'Admin', password: hash, role: 'ADMIN', localId: null } }); console.log('✅ Admin creado:', admin.email, '/ admin123'); })().catch(console.error).finally(() => prisma.$disconnect());"
```

**Credenciales por defecto con Opción B:**
- Email: `admin@test.com`
- Contraseña: `admin123`

### 6️⃣ Iniciar el Sistema

**Opción 1: Ambos servicios juntos (Recomendado)**
```bash
# Desde la raíz del proyecto
npm run dev
```

**Opción 2: Por separado**
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### 7️⃣ Acceder a la Aplicación

Abre tu navegador en:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/health

Inicia sesión con las credenciales del usuario ADMIN que creaste.

---

## 🎯 Qué Hacer Después del Login

### Como ADMIN:

1. **Crear un Local** (requerido para vendedores):
   - Puedes usar Prisma Studio: `cd backend && npx prisma studio`
   - O crear desde la API (necesitas implementar la UI o usar Postman)

2. **Crear Productos**:
   - Ve a la página "Productos"
   - Crea productos con códigos de barras

3. **Asignar Stock**:
   - Ve a "Stock"
   - Agrega stock a los productos por local

4. **Crear Vendedores**:
   - Usa Prisma Studio o implementa la UI de gestión de usuarios

### Como VENDEDOR:

1. **Realizar Ventas**:
   - Ve a "Ventas"
   - Busca productos por código de barras o nombre
   - Agrega al carrito y procesa la venta

2. **Gestionar Clientes**:
   - Ve a "Clientes"
   - Crea nuevos clientes

3. **Actualizar Stock**:
   - Ve a "Stock"
   - Actualiza el inventario de tu local

---

## 🛠️ Comandos Útiles

### Ver la base de datos:
```bash
cd backend
npx prisma studio
```

### Reiniciar la base de datos:
```bash
cd backend
npx prisma migrate reset
```

### Ver logs del backend:
Los logs aparecen en la terminal donde ejecutaste `npm run dev:backend`

### Verificar que el backend está funcionando:
```bash
curl http://localhost:3000/health
```

---

## ⚠️ Solución de Problemas

### Error: "No se puede conectar a la base de datos"
- **XAMPP:** Verifica que el módulo MySQL esté iniciado (botón verde en XAMPP Control Panel)
- Revisa la URL en `backend/.env` (puerto 3306 para MySQL/MariaDB)
- Asegúrate de que la base de datos `pos_multilocal` exista
- Usuario por defecto en XAMPP: `root` (sin contraseña normalmente)
- Si usas MariaDB 10.2.7+ tiene soporte completo de UUID

### Error: "JWT_SECRET is not defined"
- Verifica que `backend/.env` exista y tenga `JWT_SECRET` y `JWT_REFRESH_SECRET`

### Error: "Puerto 3000 ya está en uso"
- Cambia el puerto en `backend/.env` o cierra la aplicación que usa el puerto 3000

### Error: "Puerto 5173 ya está en uso"
- Vite cambiará automáticamente a otro puerto (5174, 5175, etc.)

### El frontend no se conecta al backend
- Verifica que ambos estén corriendo
- Verifica que `FRONTEND_URL` en `backend/.env` sea `http://localhost:5173`

---

## 📝 Próximos Pasos

1. ✅ El sistema está funcionando
2. Crea locales desde Prisma Studio o implementa la UI
3. Crea productos y asigna stock
4. Crea vendedores y asígnalos a locales
5. ¡Comienza a vender!

**¿Todo funcionando?** ¡Excelente! Ahora puedes empezar a personalizar y agregar más funcionalidades. 🎉

