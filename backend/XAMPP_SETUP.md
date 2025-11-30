# 🚀 Configuración para XAMPP (MariaDB)

## ✅ Configuración Rápida con XAMPP

### 1. Iniciar XAMPP

1. Abre **XAMPP Control Panel**
2. Inicia el módulo **MySQL** (click en "Start")
3. Verifica que el puerto sea **3306** (por defecto)

### 2. Crear la Base de Datos

**Opción A: Usando phpMyAdmin (Recomendado)**

1. Abre tu navegador en: http://localhost/phpmyadmin
2. Click en "Nueva" en el menú lateral
3. Nombre de la base de datos: `pos_multilocal`
4. Cotejamiento: `utf8mb4_unicode_ci` (o déjalo por defecto)
5. Click en "Crear"

**Opción B: Usando línea de comandos**

```bash
# Conectarse a MariaDB (XAMPP normalmente no tiene contraseña para root)
mysql -u root

# Crear la base de datos
CREATE DATABASE pos_multilocal;

# Salir
exit;
```

### 3. Configurar `.env`

Edita `backend/.env` con esta configuración:

```env
# Para XAMPP (sin contraseña por defecto)
DATABASE_URL="mysql://root@localhost:3306/pos_multilocal"

# Si configuraste contraseña para root:
# DATABASE_URL="mysql://root:tu_password@localhost:3306/pos_multilocal"
```

### 4. Verificar Conexión

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

Si todo está bien, verás:
```
✅ The migration has been applied
```

### 5. Crear Usuario ADMIN

```bash
cd backend
npx tsx scripts/create-admin.ts
```

O el script rápido:
```bash
npx tsx -e "import { PrismaClient } from '@prisma/client'; import bcrypt from 'bcrypt'; const prisma = new PrismaClient(); (async () => { const hash = await bcrypt.hash('admin123', 10); const admin = await prisma.user.create({ data: { email: 'admin@test.com', nombre: 'Admin', password: hash, role: 'ADMIN', localId: null } }); console.log('✅ Admin creado:', admin.email, '/ admin123'); })().catch(console.error).finally(() => prisma.$disconnect());"
```

## 🔧 Configuración de Usuario en XAMPP

### Si necesitas crear un usuario específico:

```sql
-- Conectarse a MariaDB
mysql -u root

-- Crear usuario (opcional, puedes usar root)
CREATE USER 'pos_user'@'localhost' IDENTIFIED BY 'tu_password';
GRANT ALL PRIVILEGES ON pos_multilocal.* TO 'pos_user'@'localhost';
FLUSH PRIVILEGES;

-- Luego en .env usar:
-- DATABASE_URL="mysql://pos_user:tu_password@localhost:3306/pos_multilocal"
```

## ⚠️ Notas Importantes

1. **MariaDB es compatible con MySQL** - No necesitas cambiar nada en el código
2. **Usuario por defecto:** `root` sin contraseña en XAMPP
3. **Puerto:** `3306` (verifica en XAMPP Control Panel)
4. **Versión:** MariaDB 10.2.7+ soporta UUID() nativamente

## 🐛 Solución de Problemas

### Error: "Access denied for user 'root'@'localhost'"
- Verifica que MySQL esté corriendo en XAMPP
- Intenta sin contraseña primero: `mysql://root@localhost:3306/pos_multilocal`
- Si configuraste contraseña, úsala en la URL

### Error: "Can't connect to MySQL server"
- Verifica que el módulo MySQL esté iniciado en XAMPP
- Verifica el puerto (debe ser 3306)
- Revisa que no haya otro MySQL corriendo en otro puerto

### Error: "Unknown database 'pos_multilocal'"
- Crea la base de datos primero (ver paso 2)
- Verifica que el nombre sea exactamente `pos_multilocal`

### Error con UUID en MariaDB antiguo
- Si tienes MariaDB < 10.2.7, puedes:
  1. Actualizar XAMPP a una versión más reciente
  2. O cambiar los `@default(uuid())` en el schema por `@default(uuid())` (funciona igual en versiones recientes)

## ✅ Verificar que Todo Funciona

```bash
# Verificar conexión
cd backend
npx prisma db pull

# Si funciona, verás las tablas o un mensaje de éxito
```

## 🎯 Siguiente Paso

Una vez configurado, continúa con:
```bash
npm run dev
```

Y accede a http://localhost:5173

