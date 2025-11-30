# 📥 Guía de Importación de Datos FASTFOODSTORE

Este documento explica cómo importar los datos de la base de datos SQL Server FASTFOODSTORE al sistema POS actual.

## ⚠️ Importante

El archivo SQL original (`1- BASE DE DATOS FASTFOODSTORE-.sql`) está diseñado para **SQL Server**, pero nuestro sistema usa **MySQL/MariaDB**. 

Hemos creado un script de importación que adapta los datos al esquema actual del sistema.

## 📋 Datos que se Importarán

El script importará:

- ✅ **10 Locales** (Ubicaciones: Madrid, Barcelona, Lima, Buenos Aires, Santiago, etc.)
- ✅ **20 Productos** (Hamburguesas, Pizzas, Bebidas, Postres, etc.)
- ✅ **Stock Inicial** (100 unidades de cada producto en cada local)
- ✅ **5 Vendedores** (Creados como usuarios VENDEDOR)
- ✅ **10 Clientes** (Con sus datos básicos)

## 🚀 Cómo Ejecutar la Importación

### Paso 1: Asegúrate de que la base de datos esté configurada

Verifica que tu archivo `.env` en `backend/` tenga la conexión correcta:

```env
DATABASE_URL="mysql://usuario:contraseña@localhost:3306/nombre_base_datos"
```

### Paso 2: Ejecuta las migraciones (si aún no lo has hecho)

```bash
cd backend
npx prisma migrate dev
```

### Paso 3: Ejecuta el script de importación

```bash
cd backend
npx tsx scripts/import-fastfood-data.ts
```

El script te pedirá confirmación antes de importar los datos.

## 🔐 Credenciales por Defecto

### Vendedores

Todos los vendedores importados tienen la contraseña por defecto: **`vendedor123`**

Puedes cambiar las contraseñas desde la interfaz de administración después de iniciar sesión como ADMIN.

**Vendedores creados:**
- juan.perez@example.com
- maria.vizcaino@example.com
- ana.santana@example.com
- luis.diaz@example.com
- sofia.bergara@example.com

### Admin

Si aún no tienes un usuario ADMIN, créalo primero:

```bash
cd backend
npx tsx scripts/create-admin-quick.ts
```

O de forma interactiva:

```bash
npx tsx scripts/create-admin.ts
```

## 📦 Productos Importados

El script importa 20 productos con códigos de barras predefinidos:

| Código | Producto | Precio | Categoría |
|--------|----------|--------|-----------|
| 1000000000001 | Hamburguesa | $150 | Comida Rápida |
| 1000000000002 | Pizza | $200 | Comida Rápida |
| 1000000000003 | Hot Dog | $100 | Comida Rápida |
| 1000000000004 | Papas Fritas | $50 | Comida Rápida |
| 1000000000005 | Refresco | $50 | Bebidas |
| ... | ... | ... | ... |

Todos los productos tienen **stock inicial de 100 unidades** en cada local.

## 🏪 Locales Creados

Se crearán 10 locales basados en las ubicaciones del SQL original:

- Madrid - España
- Barcelona - España
- Lima - Perú
- Buenos Aires - Argentina
- Santiago - Chile
- Bogotá - Colombia
- Ciudad de México - México
- San José - Costa Rica
- Montevideo - Uruguay
- Quito - Ecuador

## 🔄 Re-ejecutar la Importación

Si ejecutas el script nuevamente:

- ✅ Los productos existentes se **actualizarán** (no se duplicarán)
- ✅ Los locales existentes se **reutilizarán** (no se duplicarán)
- ✅ El stock se **incrementará** si ya existe
- ✅ Los vendedores y clientes se **actualizarán** si ya existen

## ⚙️ Personalizar la Importación

Si quieres modificar los datos importados, edita el archivo:

```
backend/scripts/import-fastfood-data.ts
```

Puedes modificar:
- Lista de productos
- Precios
- Categorías
- Locales
- Vendedores
- Clientes
- Stock inicial

## 🐛 Solución de Problemas

### Error: "Cannot find module '@prisma/client'"

Ejecuta:
```bash
cd backend
npm install
npx prisma generate
```

### Error: "Database connection failed"

Verifica:
1. Que MySQL/MariaDB esté corriendo
2. Que la `DATABASE_URL` en `.env` sea correcta
3. Que la base de datos exista

### Error: "Unique constraint failed"

Algunos datos ya existen. El script usa `upsert` para evitar duplicados, pero si hay conflictos, puedes:
1. Limpiar la base de datos manualmente
2. O modificar el script para manejar mejor los conflictos

## 📝 Notas

- Los códigos de barras son únicos y se generan automáticamente
- El stock inicial es de 100 unidades por producto por local
- Los vendedores se asignan automáticamente a su local correspondiente
- Los clientes no tienen crédito inicial (puedes agregarlo después)

## ✅ Verificar la Importación

Después de importar, puedes verificar los datos:

1. **Desde la aplicación web:**
   - Inicia sesión como ADMIN
   - Ve a "Productos" para ver los productos importados
   - Ve a "Locales" para ver los locales creados
   - Ve a "Usuarios" para ver los vendedores
   - Ve a "Clientes" para ver los clientes

2. **Desde Prisma Studio:**
   ```bash
   cd backend
   npx prisma studio
   ```

3. **Desde MySQL:**
   ```sql
   SELECT COUNT(*) FROM Producto;
   SELECT COUNT(*) FROM Local;
   SELECT COUNT(*) FROM User WHERE role = 'VENDEDOR';
   SELECT COUNT(*) FROM Cliente;
   ```

## 🎯 Próximos Pasos

Después de importar los datos:

1. ✅ Inicia sesión como ADMIN
2. ✅ Verifica que todos los productos tengan stock
3. ✅ Asigna vendedores a locales si es necesario
4. ✅ Prueba hacer una venta con el escáner de código de barras
5. ✅ Personaliza los datos según tus necesidades

---

¿Necesitas ayuda? Revisa los archivos de documentación:
- `README.md` - Información general del proyecto
- `SETUP.md` - Guía de instalación
- `GUIA_RAPIDA.md` - Inicio rápido

