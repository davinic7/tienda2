# 🚀 Subir Proyecto a GitHub - Guía Completa

## ⚠️ IMPORTANTE: Git No Está Instalado

Para subir tu proyecto a GitHub, necesitas instalar **Git** primero.

---

## 📋 Opción 1: Instalar Git y Usar Script Automático (Recomendado)

### Paso 1: Instalar Git

1. **Ejecuta:** `.\INSTALAR_GIT.bat`
   - Este script verificará si Git está instalado
   - Si no está, abrirá la página de descarga
   - Te dará instrucciones detalladas

2. **O descarga manualmente:**
   - Ve a: https://git-scm.com/download/win
   - Descarga Git para Windows
   - Instálalo con opciones por defecto
   - ⚠️ **IMPORTANTE:** Marca "Add Git to PATH"

### Paso 2: Ejecutar Script de Subida

**Después de instalar Git, ejecuta:**

```powershell
.\SUBIR_A_GITHUB.ps1
```

Este script hará **TODO automáticamente:**
- ✅ Inicializar el repositorio Git
- ✅ Configurar Git
- ✅ Agregar todos los archivos
- ✅ Verificar que no se suban archivos .env
- ✅ Crear commit inicial
- ✅ Te guiará para crear el repositorio en GitHub
- ✅ Subir el código automáticamente

---

## 📋 Opción 2: Usar GitHub Desktop (Más Fácil)

Si prefieres una interfaz gráfica:

1. **Descarga GitHub Desktop:**
   - https://desktop.github.com/
   - Instálalo y conéctate con tu cuenta de GitHub

2. **Subir el proyecto:**
   - File → Add Local Repository
   - Selecciona la carpeta `LaTienda`
   - Click en "Publish repository"
   - Listo ✅

---

## 📋 Opción 3: Comandos Manuales

Si prefieres hacerlo manualmente, lee: **COMANDOS_GITHUB.md**

---

## 🔐 Autenticación con GitHub

Cuando subas el código, GitHub puede pedirte autenticación.

### Opción 1: Personal Access Token (Recomendado)

1. **Ve a:** https://github.com/settings/tokens
2. **Click:** "Generate new token" → "Generate new token (classic)"
3. **Configura:**
   - **Note:** `LaTienda Local`
   - **Expiration:** 90 days (o el que prefieras)
   - **Permisos:** Marca `repo` (todos los permisos)
4. **Generate token** y copia el token
5. **Úsalo como contraseña** cuando Git te lo pida

### Opción 2: GitHub CLI

```bash
# Instalar GitHub CLI
winget install GitHub.cli

# Autenticarse
gh auth login
```

---

## ✅ Verificación Final

Después de subir, verifica en GitHub:

1. ✅ **Archivos subidos correctamente**
   - Debe haber: `backend/`, `frontend/`, `shared/`, etc.

2. ✅ **NO hay archivos sensibles**
   - NO debe haber: `backend/.env`
   - NO debe haber: `frontend/.env`

3. ✅ **SÍ hay archivos de ejemplo**
   - Debe haber: `backend/.env.example` (si existe)
   - Debe haber: `frontend/.env.example` (si existe)

---

## 🆘 Problemas Comunes

### Error: "git no se reconoce como comando"

**Solución:** Git no está instalado o no está en el PATH.
- Reinstala Git marcando "Add Git to PATH"
- O reinicia tu terminal después de instalar

### Error: "repository not found"

**Solución:** El repositorio no existe en GitHub.
- Verifica que lo creaste: https://github.com/tu-usuario/LaTienda
- Verifica que el nombre del usuario sea correcto

### Error: "authentication failed"

**Solución:** Necesitas un Personal Access Token.
- Crea un token en: https://github.com/settings/tokens
- Usa el token como contraseña

### Error: "cannot push to protected branch"

**Solución:** La rama `main` está protegida.
- Ve a Settings → Branches en tu repositorio
- Quita la protección temporalmente
- O usa otra rama: `git push -u origin develop`

---

## 📚 Archivos de Ayuda Creados

- **INSTALAR_GIT.bat** - Instala Git
- **SUBIR_A_GITHUB.ps1** - Script completo para subir a GitHub
- **COMANDOS_GITHUB.md** - Comandos manuales detallados
- **INSTALAR_Y_SUBIR.bat** - Script alternativo (batch)
- **README_GITHUB.md** - Este archivo

---

## 🎯 ¿Cuál Usar?

- **Si no tienes Git:** Ejecuta `INSTALAR_GIT.bat` primero
- **Si tienes Git:** Ejecuta `SUBIR_A_GITHUB.ps1` (más completo)
- **Si prefieres GUI:** Usa GitHub Desktop
- **Si eres avanzado:** Lee `COMANDOS_GITHUB.md`

---

## 💡 Recomendación

**Lo más fácil:** Instala GitHub Desktop y úsalo para subir el proyecto.

**Lo más completo:** Instala Git y ejecuta `SUBIR_A_GITHUB.ps1`.

