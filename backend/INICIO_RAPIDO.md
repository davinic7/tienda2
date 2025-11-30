# 🚀 Inicio Rápido - Sistema POS

## ⚡ Inicio Automático (Recomendado)

### Opción 1: Script de Inicio Automático
```powershell
.\iniciar-sistema.ps1
```

Este script:
- ✅ Verifica que MySQL esté corriendo
- ✅ Limpia procesos anteriores
- ✅ Inicia Backend y Frontend en ventanas separadas
- ✅ Verifica que todo esté funcionando

### Opción 2: Verificar Estado del Sistema
```powershell
.\verificar-sistema.ps1
```

Este script te muestra:
- ✅ Estado de MySQL
- ✅ Estado del Backend (puerto 3000)
- ✅ Estado del Frontend (puerto 5173)
- ✅ Configuración (.env)

---

## 📋 Inicio Manual

### 1. Iniciar MySQL (XAMPP)
1. Abre **XAMPP Control Panel**
2. Haz clic en **Start** en el módulo **MySQL**
3. Debe aparecer en **verde** (Running)

### 2. Iniciar Backend
```powershell
cd backend
npm run dev
```

**Debes ver:**
```
🚀 Servidor corriendo en puerto 3000
📡 Socket.io disponible en ws://localhost:3000
✅ Conectado a la base de datos
```

### 3. Iniciar Frontend
```powershell
# En otra terminal
cd frontend
npm run dev
```

**Debes ver:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 4. Abrir en el Navegador
- **Frontend**: http://localhost:5173
- **Backend Health**: http://localhost:3000/health

---

## 🔍 Solución Rápida de Problemas

### ❌ Error: "ERR_CONNECTION_REFUSED"

**Causa:** El servidor no está corriendo

**Solución:**
1. Ejecuta `.\verificar-sistema.ps1` para ver qué falta
2. Si falta Backend: `cd backend; npm run dev`
3. Si falta Frontend: `cd frontend; npm run dev`
4. Si falta MySQL: Inicia desde XAMPP Control Panel

### ❌ Error: "No se puede conectar a la base de datos"

**Causa:** MySQL no está corriendo o credenciales incorrectas

**Solución:**
1. Verifica que MySQL esté corriendo en XAMPP (debe estar en verde)
2. Verifica `backend/.env`:
   ```env
   DATABASE_URL="mysql://root@localhost:3306/pos_multilocal"
   ```
3. Si tienes contraseña en MySQL:
   ```env
   DATABASE_URL="mysql://root:TU_PASSWORD@localhost:3306/pos_multilocal"
   ```

### ❌ Error: "Puerto 3000 ya está en uso"

**Solución:**
```powershell
# Ver qué proceso usa el puerto
netstat -ano | findstr :3000

# Detener todos los procesos Node
Get-Process -Name node | Stop-Process -Force

# Reiniciar
cd backend
npm run dev
```

### ❌ Error: "JWT_SECRET is not defined"

**Solución:**
1. Verifica que `backend/.env` exista
2. Agrega estas líneas:
   ```env
   JWT_SECRET="clave-secreta-super-larga-y-segura-123456789"
   JWT_REFRESH_SECRET="otra-clave-secreta-diferente-987654321"
   ```

---

## 📝 Checklist de Inicio

Antes de empezar, verifica:

- [ ] MySQL está corriendo (XAMPP Control Panel)
- [ ] Archivo `backend/.env` existe y está configurado
- [ ] Base de datos `pos_multilocal` existe
- [ ] Backend está corriendo (puerto 3000)
- [ ] Frontend está corriendo (puerto 5173)

**Para verificar todo de una vez:**
```powershell
.\verificar-sistema.ps1
```

---

## 🎯 Comandos Útiles

### Verificar que todo esté corriendo
```powershell
.\verificar-sistema.ps1
```

### Iniciar todo automáticamente
```powershell
.\iniciar-sistema.ps1
```

### Detener todos los servicios
```powershell
Get-Process -Name node | Stop-Process -Force
```

### Ver logs del backend
Los logs aparecen en la terminal donde ejecutaste `npm run dev`

### Ver la base de datos
```powershell
cd backend
npx prisma studio
```

---

## 💡 Consejos

1. **Mantén las terminales abiertas**: No cierres las ventanas donde corren los servicios
2. **Inicia MySQL primero**: Siempre inicia MySQL antes que el backend
3. **Usa los scripts**: Los scripts `verificar-sistema.ps1` e `iniciar-sistema.ps1` te ahorran tiempo
4. **Revisa los logs**: Si algo falla, los logs en las terminales te dirán qué está mal

---

## 🆘 ¿Sigue sin funcionar?

1. Ejecuta `.\verificar-sistema.ps1` y revisa qué está fallando
2. Revisa los logs en las terminales de Backend y Frontend
3. Verifica que MySQL esté corriendo
4. Verifica que `backend/.env` esté correctamente configurado
5. Reinicia todo: Detén todos los procesos y vuelve a iniciar

---

**¿Todo funcionando?** 🎉 ¡Ahora puedes usar el sistema!

