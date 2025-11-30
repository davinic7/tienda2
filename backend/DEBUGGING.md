# Guía de Debugging y Manejo de Errores

## 🔍 Ver Errores en Desarrollo

### Backend

El backend ahora muestra **errores detallados** en la consola cuando algo falla:

```
❌ ========== ERROR DETECTADO ==========
📍 Ruta: POST /api/ventas
📝 Mensaje: Error de validación
🏷️  Tipo: ZodError
📦 Stack: [stack trace completo]
📥 Body recibido: { ... }
=====================================
```

**Ubicación de los logs:**
- Abre la terminal donde corre el backend (`npm run dev:backend`)
- Todos los errores se muestran ahí con información completa

### Frontend

El frontend también muestra errores detallados en la **consola del navegador**:

1. Abre las **Herramientas de Desarrollador** (F12)
2. Ve a la pestaña **Console**
3. Los errores aparecerán así:

```
❌ ========== ERROR EN CARGAR ACTIVIDADES ==========
📝 Mensaje: Error al cargar actividades
📊 Status: 500
📍 Ruta: GET /api/actividades
📦 Detalles: { ... }
=====================================
```

## 🚨 Problemas Comunes y Soluciones

### 1. "Tengo que reiniciar el backend/frontend cada vez"

**Causas posibles:**

#### a) Error no capturado que detiene el proceso
- **Síntoma:** El proceso se detiene y no responde
- **Solución:** Revisa la consola del backend, debería mostrar el error completo
- **Prevención:** Todos los errores ahora se capturan y muestran sin detener el servidor

#### b) Base de datos no disponible
- **Síntoma:** Errores de conexión, el servidor no puede iniciar
- **Solución:** 
  ```bash
  # Verifica que MySQL esté corriendo
  # En XAMPP: Inicia MySQL desde el panel de control
  ```
- **Detección:** El backend mostrará un error claro al iniciar:
  ```
  ❌ ========== ERROR DE CONEXIÓN A BASE DE DATOS ==========
  💡 El servidor MySQL no está corriendo
  ```

#### c) Puerto en uso
- **Síntoma:** Error `EADDRINUSE` al iniciar
- **Solución:** 
  ```bash
  # Windows PowerShell
  netstat -ano | findstr :3000
  # Mata el proceso que usa el puerto
  taskkill /PID <PID> /F
  ```

#### d) Hot reload no funciona
- **Síntoma:** Los cambios no se reflejan sin reiniciar
- **Solución:** 
  - Verifica que estés usando `npm run dev` (usa `tsx watch`)
  - Si el problema persiste, reinicia manualmente

### 2. "No veo los errores, solo mensajes genéricos"

**Antes:** Los errores se ocultaban con mensajes genéricos como "Error al cargar datos"

**Ahora:** 
- ✅ Todos los errores se muestran en consola con detalles completos
- ✅ Los mensajes de toast muestran información más específica
- ✅ En desarrollo, se muestra el stack trace completo

**Cómo verlos:**
- **Backend:** Terminal donde corre `npm run dev:backend`
- **Frontend:** Consola del navegador (F12 → Console)

### 3. Errores de validación (Zod)

Cuando hay errores de validación, verás:

**Backend:**
```
🔴 Errores de validación Zod:
  - nombre: El nombre es requerido (invalid_type)
  - precio: El precio debe ser un número positivo (invalid_type)
```

**Frontend:**
```
Error de validación: nombre: El nombre es requerido, precio: El precio debe ser un número positivo
```

### 4. Errores de base de datos (Prisma)

**Códigos comunes:**
- `P2002`: Conflicto - registro duplicado
- `P2025`: No encontrado
- `P2003`: Error de relación (foreign key)
- `P1001`: No se puede conectar al servidor

Todos estos errores ahora muestran información detallada en desarrollo.

## 📋 Checklist de Debugging

Cuando algo no funciona:

1. ✅ **Revisa la consola del backend** - ¿Hay errores ahí?
2. ✅ **Revisa la consola del navegador** (F12) - ¿Hay errores de red o JavaScript?
3. ✅ **Verifica que MySQL esté corriendo** - ¿El backend se conectó a la BD?
4. ✅ **Revisa los logs de inicio** - ¿El servidor inició correctamente?
5. ✅ **Verifica las variables de entorno** - ¿Está configurado `.env`?

## 🔧 Mejoras Implementadas

### Backend
- ✅ Logging detallado de todos los errores
- ✅ Información de contexto (ruta, método, body, params)
- ✅ Stack traces completos en desarrollo
- ✅ Mensajes de error específicos por tipo (Zod, Prisma, etc.)
- ✅ Verificación de conexión a BD con mensajes claros

### Frontend
- ✅ Helper `errorHandler` para manejo consistente
- ✅ Logging detallado en consola del navegador
- ✅ Mensajes de error más específicos en toasts
- ✅ Información de contexto en cada error
- ✅ Detección de errores de red vs errores del servidor

## 🎯 Próximos Pasos

Si encuentras un error:

1. **Copia el mensaje completo** de la consola
2. **Incluye el contexto** (qué estabas haciendo)
3. **Revisa el stack trace** para ver dónde falló
4. **Verifica las variables de entorno** si es un error de conexión

Los errores ahora son **visibles y detallados** - ya no se ocultan. 🎉



