# 🚀 Comandos para Subir a GitHub (Copia y Pega)

## ⚠️ IMPORTANTE: Primero Instala Git

1. **Descarga Git:** https://git-scm.com/download/win
2. **Instálalo** con las opciones por defecto
3. **Reinicia** tu terminal después de instalar

---

## 📋 Comandos Paso a Paso

### 1. Verificar que Git está instalado
```bash
git --version
```

### 2. Navegar al proyecto
```bash
cd "C:\Users\davin\OneDrive\Escritorio\Proyectos personales\tienda\LaTienda"
```

### 3. Inicializar Git
```bash
git init
```

### 4. Configurar tu información (solo primera vez)
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

### 5. Agregar todos los archivos
```bash
git add .
```

### 6. Verificar qué se va a subir (NO debe aparecer .env)
```bash
git status
```

### 7. Crear commit inicial
```bash
git commit -m "Initial commit: Sistema POS Multi-local - Funcionalidades completas"
```

### 8. Cambiar rama a main
```bash
git branch -M main
```

---

## 🔗 Crear Repositorio en GitHub

### Paso 1: Ve a GitHub
Abre: https://github.com/new

### Paso 2: Configura el repositorio
- **Repository name:** `LaTienda`
- **Description:** `Sistema POS Multi-local - Gestión de inventario y ventas en tiempo real`
- **Visibility:** 
  - ✅ **Private** (recomendado para proyectos personales/comerciales)
  - ⚪ Public (si quieres que sea público)
- ❌ **NO marques** "Initialize this repository with a README"
- ❌ **NO marques** "Add .gitignore"
- ❌ **NO marques** "Choose a license"

### Paso 3: Crear repositorio
Click en **"Create repository"**

---

## 📤 Conectar y Subir

**REEMPLAZA `tu-usuario` con tu usuario real de GitHub:**

```bash
# Conectar con GitHub
git remote add origin https://github.com/tu-usuario/LaTienda.git

# Verificar que se configuró correctamente
git remote -v

# Subir el código
git push -u origin main
```

---

## 🔑 Si Pide Autenticación

### Opción 1: Usar Personal Access Token

1. **Ve a:** https://github.com/settings/tokens
2. **Click:** "Generate new token" → "Generate new token (classic)"
3. **Configura:**
   - **Note:** `LaTienda Local`
   - **Expiration:** 90 days (o el que prefieras)
   - **Permisos:** Marca `repo` (todos los permisos de repositorio)
4. **Generate token** y copia el token
5. **Úsalo como contraseña** cuando Git te lo pida

### Opción 2: Usar GitHub Desktop
Descarga: https://desktop.github.com/

---

## ✅ Verificación Final

Después de subir, ve a tu repositorio y verifica:

1. ✅ **Archivos subidos correctamente**
   - Debe haber: `backend/`, `frontend/`, `shared/`, etc.
   
2. ✅ **NO hay archivos sensibles**
   - NO debe haber: `backend/.env`
   - NO debe haber: `frontend/.env`
   
3. ✅ **SÍ hay archivos de ejemplo**
   - Debe haber: `backend/.env.example`
   - Debe haber: `frontend/.env.example`

---

## 🆘 Comandos Útiles

### Ver estado del repositorio
```bash
git status
```

### Ver commits realizados
```bash
git log --oneline
```

### Actualizar el repositorio después de cambios
```bash
git add .
git commit -m "Descripción de los cambios"
git push origin main
```

### Cambiar URL del repositorio remoto
```bash
git remote set-url origin https://github.com/tu-usuario/LaTienda.git
```

### Ver configuración de Git
```bash
git config --list
```

---

## 📝 Ejemplo Completo (Copia y Pega Todo)

```bash
# Reemplaza 'tu-usuario' con tu usuario real de GitHub

cd "C:\Users\davin\OneDrive\Escritorio\Proyectos personales\tienda\LaTienda"
git init
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
git add .
git commit -m "Initial commit: Sistema POS Multi-local"
git branch -M main
git remote add origin https://github.com/tu-usuario/LaTienda.git
git push -u origin main
```

---

## 🎯 Script Automático

También puedes usar el script: `INSTALAR_Y_SUBIR.bat`

Solo ejecuta:
```bash
.\INSTALAR_Y_SUBIR.bat
```

Y sigue las instrucciones en pantalla.

