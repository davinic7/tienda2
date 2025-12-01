# 🔧 Guía Visual: Configurar Variables de Entorno en Render

## ⚠️ PROBLEMA ACTUAL

El servidor falla porque faltan estas 3 variables de entorno:
- ❌ `JWT_SECRET`
- ❌ `JWT_REFRESH_SECRET`
- ❌ `FRONTEND_URL`

✅ `DATABASE_URL` ya está configurada (vinculaste la base de datos "lolodb")

---

## 📋 PASOS PARA AGREGAR LAS VARIABLES

### Paso 1: Acceder al Dashboard de Render

1. Ve a: **https://dashboard.render.com**
2. Inicia sesión con tu cuenta
3. En la lista de servicios, busca y haz clic en **"tienda2"** (tu Web Service)

### Paso 2: Abrir la Sección de Environment Variables

1. En el menú lateral izquierdo, busca y haz clic en **"Environment"**
   - También puede aparecer como una pestaña en la parte superior
   - O en el menú de configuración del servicio

### Paso 3: Verificar Variables Existentes

Deberías ver que ya existe:
- ✅ `DATABASE_URL` (configurada automáticamente por Render)

### Paso 4: Agregar JWT_SECRET

1. Haz clic en el botón **"Add Environment Variable"** o **"Add Variable"**
2. En el campo **"Key"** (o "Variable Name"), escribe exactamente:
   ```
   JWT_SECRET
   ```
3. En el campo **"Value"** (o "Variable Value"), pega este valor:
   ```
   KD0UR4asto7N/+sBZIaSfS06HdLmkjxGeHi7gL7I6+hxvlmp/XiZUyxqIvaY1EQm
   ```
4. Haz clic en **"Save Changes"** o **"Add"**

### Paso 5: Agregar JWT_REFRESH_SECRET

1. Haz clic nuevamente en **"Add Environment Variable"**
2. En el campo **"Key"**, escribe:
   ```
   JWT_REFRESH_SECRET
   ```
3. En el campo **"Value"**, pega este valor:
   ```
   AaoqX0+DfywI1MA4Yqk02NgOl5EYK8GMnms59q/VTidDE+XiBpyacSgzSYg6uHfC
   ```
4. Haz clic en **"Save Changes"**

### Paso 6: Agregar FRONTEND_URL

1. Haz clic nuevamente en **"Add Environment Variable"**
2. En el campo **"Key"**, escribe:
   ```
   FRONTEND_URL
   ```
3. En el campo **"Value"**, escribe una de estas opciones:
   
   **Opción A:** Si tienes un frontend desplegado en Render:
   ```
   https://tu-frontend.onrender.com
   ```
   (Reemplaza `tu-frontend` con el nombre real de tu servicio frontend)
   
   **Opción B:** Si aún no tienes frontend desplegado (temporal):
   ```
   http://localhost:5173
   ```
   (Puedes cambiarla después cuando despliegues el frontend)
   
4. Haz clic en **"Save Changes"**

### Paso 7: Agregar NODE_ENV (Opcional pero Recomendado)

1. Haz clic en **"Add Environment Variable"**
2. En el campo **"Key"**, escribe:
   ```
   NODE_ENV
   ```
3. En el campo **"Value"**, escribe:
   ```
   production
   ```
4. Haz clic en **"Save Changes"**

---

## ✅ VERIFICACIÓN FINAL

Después de agregar todas las variables, deberías ver en la lista:

| Variable | Estado |
|----------|--------|
| `DATABASE_URL` | ✅ Configurada |
| `JWT_SECRET` | ✅ Configurada |
| `JWT_REFRESH_SECRET` | ✅ Configurada |
| `FRONTEND_URL` | ✅ Configurada |
| `NODE_ENV` | ✅ Configurada (opcional) |

---

## 🔄 REINICIO AUTOMÁTICO

Después de guardar cada variable:
- Render **automáticamente reiniciará** el servicio
- O puedes ir a **"Manual Deploy"** → **"Deploy latest commit"** para forzar un nuevo deploy

---

## 🐛 SI EL ERROR PERSISTE

Si después de agregar las variables el error continúa:

1. **Verifica que los nombres de las variables sean exactos** (sin espacios, mayúsculas correctas)
2. **Verifica que los valores no tengan espacios al inicio o final**
3. **Espera unos segundos** para que Render reinicie el servicio
4. **Revisa los logs** en Render para ver si hay otros errores
5. **Verifica que guardaste los cambios** (cada variable debe tener un botón "Save")

---

## 📝 NOTAS IMPORTANTES

- ⚠️ Los secretos JWT deben tener **mínimo 32 caracteres** (los que te proporcioné tienen 64)
- ⚠️ `FRONTEND_URL` debe ser una URL válida (con `http://` o `https://`)
- ⚠️ No compartas estos secretos públicamente
- ⚠️ Si necesitas regenerar los secretos, ejecuta el script `generar-secretos.ps1`

---

## 🎯 RESUMEN RÁPIDO

**Variables a agregar:**
1. `JWT_SECRET` = `KD0UR4asto7N/+sBZIaSfS06HdLmkjxGeHi7gL7I6+hxvlmp/XiZUyxqIvaY1EQm`
2. `JWT_REFRESH_SECRET` = `AaoqX0+DfywI1MA4Yqk02NgOl5EYK8GMnms59q/VTidDE+XiBpyacSgzSYg6uHfC`
3. `FRONTEND_URL` = `http://localhost:5173` (o la URL de tu frontend)
4. `NODE_ENV` = `production` (opcional)

**Dónde agregarlas:**
- Dashboard de Render → Tu servicio "tienda2" → Pestaña "Environment" → "Add Environment Variable"

