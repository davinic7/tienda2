# Sistema POS - Funcionalidades Implementadas

## ✅ Resumen de Implementación

Se ha configurado un sistema POS completo con las siguientes funcionalidades:

## 📋 Funcionalidades Principales

### 1. Sistema de Precios Avanzado

#### Cálculo de Precios
- **Fórmula**: Precio = (Costo + IVA) × (1 + %Utilidad/100)
- Al registrar un producto, solo se ingresa el **costo**
- El sistema calcula automáticamente el **precio sugerido**
- Solo el **administrador** puede aprobar o ajustar el precio final

#### Precios por Local
- Cada local puede tener su propio **% de utilidad** configurable
- Los precios se pueden ajustar por producto y por local
- Historial completo de cambios de precios con fecha y usuario

#### Precios por Cantidad
- Definir precios distintos según cantidad (ej: 1, 6, 12, 24 unidades)
- El sistema selecciona automáticamente el precio más adecuado según la cantidad

### 2. Modelo de Producto Completo

Campos implementados:
- ✅ Nombre
- ✅ Código (interno)
- ✅ Código de barras
- ✅ Costo
- ✅ IVA (porcentaje)
- ✅ % Utilidad (por defecto)
- ✅ Precio (calculado, requiere aprobación)
- ✅ Stock
- ✅ Fecha de vencimiento (opcional)
- ✅ Categoría
- ✅ Unidad de medida
- ✅ Imagen

### 3. Sistema de Combos

- Crear combos de productos con precio promocional especial
- Cada combo puede incluir múltiples productos con cantidades específicas
- Gestión completa de combos (crear, editar, eliminar)

### 4. Historial de Precios

- Registro automático de todos los cambios de precios
- Incluye: precio anterior, precio nuevo, porcentaje de utilidad, motivo, usuario y fecha
- Consulta de historial por producto o por local

### 5. Sistema de Notificaciones

#### Tipos de Notificaciones:
1. **Cambio de Precio**: Cuando se modifica un precio
2. **Baja Rotación**: Productos sin ventas en 30 días
3. **Vencimiento**: Productos próximos a vencer (7 días)
4. **Venta Remota**: Notificaciones al local cuando se realiza una venta remota

#### Características:
- Notificaciones pendientes, leídas y archivadas
- Filtrado por local (vendedores solo ven las de su local)
- Verificaciones automáticas cada 6 horas

### 6. Ventas Remotas

- Los vendedores pueden consultar disponibilidad en otros locales
- Realizar ventas desde otros locales especificando el `localOrigenId`
- Notificación automática al local origen con el nombre del comprador
- El stock se descuenta del local origen

### 7. Perfiles de Usuario

#### Administrador
- ✅ Configurar precios (aprobar/ajustar)
- ✅ Gestionar combos
- ✅ Configurar alertas
- ✅ Gestionar vencimientos
- ✅ Ver todas las notificaciones
- ✅ Consultar historial de precios

#### Vendedor
- ✅ Consultar disponibilidad en otros locales
- ✅ Realizar ventas remotas
- ✅ Ver notificaciones de su local
- ✅ Ver precios (no puede modificarlos)

## 🗄️ Base de Datos

### Nuevos Modelos Creados:

1. **PrecioPorCantidad**: Precios según cantidad de unidades
2. **PrecioLocal**: Precios ajustados por local
3. **Combo**: Combos de productos
4. **ComboProducto**: Relación entre combos y productos
5. **HistorialPrecio**: Historial de cambios de precios
6. **Notificacion**: Sistema de notificaciones

### Modelos Actualizados:

- **Producto**: Agregados campos costo, IVA, unidadMedida, fechaVencimiento, codigo, precioAprobado
- **Local**: Agregado porcentajeUtilidadDefault
- **Venta**: Agregados campos para ventas remotas (localOrigenId, nombreComprador, esVentaRemota)

## 🔌 API Endpoints

### Productos
- `POST /api/productos` - Crear producto (solo costo, calcula precio sugerido)
- `PUT /api/productos/:id` - Actualizar producto
- `POST /api/productos/:id/aprobar-precio` - Aprobar/ajustar precio (solo ADMIN)
- `GET /api/productos/:id/precios-local` - Ver precios por local
- `GET /api/productos/:id/historial-precios` - Ver historial de precios
- `POST /api/productos/:id/precios-cantidad` - Crear precio por cantidad
- `DELETE /api/productos/:id/precios-cantidad/:precioId` - Eliminar precio por cantidad

### Combos
- `GET /api/combos` - Listar combos
- `GET /api/combos/:id` - Obtener combo
- `POST /api/combos` - Crear combo (solo ADMIN)
- `PUT /api/combos/:id` - Actualizar combo (solo ADMIN)
- `PUT /api/combos/:id/productos` - Actualizar productos del combo
- `DELETE /api/combos/:id` - Eliminar combo (solo ADMIN)

### Notificaciones
- `GET /api/notificaciones` - Listar notificaciones
- `GET /api/notificaciones/pendientes` - Notificaciones pendientes
- `PUT /api/notificaciones/:id/marcar-leida` - Marcar como leída
- `PUT /api/notificaciones/:id/archivar` - Archivar notificación

### Ventas
- `POST /api/ventas` - Crear venta (soporta ventas remotas)
  - Campos opcionales: `localOrigenId`, `nombreComprador`

## 🚀 Próximos Pasos

Para completar la implementación, falta:

1. **Frontend**: Actualizar componentes para:
   - Formulario de productos con costo y cálculo de precio sugerido
   - Interfaz de aprobación de precios
   - Gestión de precios por cantidad
   - Gestión de combos
   - Panel de notificaciones
   - Soporte para ventas remotas

2. **Migración de Base de Datos**:
   ```bash
   cd backend
   npm run db:push
   # o
   npm run db:migrate -- --name add_pos_system
   ```

3. **Generar Cliente Prisma**:
   ```bash
   cd backend
   npm run db:generate
   ```

## 📝 Notas Importantes

- El precio se calcula automáticamente pero requiere aprobación del administrador
- Los cambios de precio se registran automáticamente en el historial
- Las notificaciones se generan automáticamente cada 6 horas
- Las ventas remotas notifican automáticamente al local origen
- El sistema verifica vencimientos y baja rotación periódicamente

