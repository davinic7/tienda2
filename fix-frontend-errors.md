# Correcciones necesarias para el frontend

## 1. Cambiar imports de @shared/types
Todos los archivos que importan desde '@shared/types' necesitan usar '@shared/types' (el path ya está corregido en tsconfig.json)

## 2. Eliminar variables no utilizadas
- VendedorOnlyRoute en App.tsx
- DollarSign en Layout.tsx
- CheckCircle en ModalCaja.tsx
- AlertCircle, Package, etc. en varios archivos

## 3. Corregir toast.info
Cambiar todas las instancias de `toast.info()` a `toast()` con icon

## 4. Agregar tipos explícitos
- Parámetros en forEach, map, reduce
- Variables con any implícito

## 5. Corregir propiedades que no existen
- estadoCaja.caja puede ser undefined
- PedidoCompleto necesita propiedades correctas
- StockCompleto necesita propiedades correctas

