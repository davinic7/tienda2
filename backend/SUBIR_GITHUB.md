# 🚀 Guía Paso a Paso para Subir el Proyecto a GitHub

## 📋 Requisitos Previos

### 1. Instalar Git (si no lo tienes)

**Opción A: Descargar Git para Windows**
- Descarga desde: https://git-scm.com/download/win
- Instala con las opciones por defecto
- Reinicia tu terminal después de instalar

**Opción B: Usar GitHub Desktop**
- Descarga desde: https://desktop.github.com/
- Interfaz gráfica más fácil de usar

### 2. Crear cuenta en GitHub (si no tienes)
- Ve a: https://github.com
- Regístrate si no tienes cuenta
- Crea un nuevo repositorio (lo haremos en los pasos)

---

## 🎯 Pasos para Subir el Proyecto

### PASO 1: Verificar que Git está instalado

Abre PowerShell o CMD y ejecuta:

```bash
git --version
```

Si muestra una versión, Git está instalado. Si no, instálalo primero (ver Requisitos Previos).

---

### PASO 2: Inicializar el repositorio (si no está inicializado)

```bash
# Navegar a la carpeta del proyecto (si no estás ahí)
cd "C:\Users\davin\OneDrive\Escritorio\Proyectos personales\tienda\LaTienda"

# Inicializar git
git init

# Configurar tu nombre y email (si es la primera vez)
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

---

### PASO 3: Verificar que no hay archivos sensibles

```bash
# Ver qué archivos hay en el proyecto
git status

# Verificar que .env está ignorado (debe aparecer en la sección "Untracked files" pero no debe estar marcado)
git check-ignore -v backend/.env
git check-ignore -v frontend/.env
```

**⚠️ IMPORTANTE:** Si ves archivos `.env` que NO están ignorados, ejecuta:

```bash
# Remover del staging (pero mantener el archivo local)
git rm --cached backend/.env 2>$null
git rm --cached frontend/.env 2>$null
```

---

### PASO 4: Agregar todos los archivos

```bash
# Agregar todos los archivos al staging
git add .

# Verificar qué se va a subir (debe mostrar muchos archivos, PERO NO .env)
git status
```

---

### PASO 5: Hacer el commit inicial

```bash
# Crear commit inicial
git commit -m "Initial commit: Sistema POS Multi-local - Funcionalidades completas

- Sistema de autenticación JWT (Access Token + Refresh Token)
- Gestión de roles (ADMIN, VENDEDOR)
- Sistema de turnos para vendedores
- Gestión multi-local de inventario y ventas
- Sistema de auditoría y actividades
- Reportes y analytics en tiempo real
- Atajos de teclado y focus trap en modales
- Confirmaciones para acciones críticas
- Integración con Socket.io para sincronización en tiempo real"
```

---

### PASO 6: Crear repositorio en GitHub

1. **Ve a GitHub:** https://github.com
2. **Click en el botón "+"** (arriba a la derecha) → **"New repository"**
3. **Completa el formulario:**
   - **Repository name:** `LaTienda` (o el nombre que prefieras)
   - **Description:** `Sistema POS Multi-local - Gestión de inventario y ventas en tiempo real`
   - **Visibility:** 
     - ✅ **Private** (recomendado si es un proyecto personal/comercial)
     - ⚪ Public (si quieres que sea público)
   - ❌ **NO marques** "Initialize this repository with a README" (ya tenemos uno)
   - ❌ **NO marques** "Add .gitignore" (ya tenemos uno)
   - ❌ **NO marques** "Choose a license" (puedes agregarlo después)
4. **Click en "Create repository"**

---

### PASO 7: Conectar con GitHub y subir

Después de crear el repositorio, GitHub te mostrará comandos. Usa estos:

```bash
# Cambiar el nombre de la rama principal a 'main' (si no está ya)
git branch -M main

# Agregar el repositorio remoto (REEMPLAZA 'tu-usuario' con tu nombre de usuario de GitHub)
git remote add origin https://github.com/tu-usuario/LaTienda.git

# Si el repositorio ya existía y quieres cambiar la URL:
# git remote set-url origin https://github.com/tu-usuario/LaTienda.git

# Verificar que el remoto está configurado correctamente
git remote -v

# Subir el código a GitHub
git push -u origin main
```

**Nota:** Te pedirá usuario y contraseña de GitHub. Si tienes autenticación de dos factores habilitada, necesitarás crear un **Personal Access Token** como contraseña.

---

### PASO 8: Crear Personal Access Token (si lo requiere)

Si GitHub te pide autenticación:

1. Ve a: https://github.com/settings/tokens
2. Click en **"Generate new token"** → **"Generate new token (classic)"**
3. **Nombre:** `LaTienda Local`
4. **Expiración:** Elige una duración (90 días recomendado)
5. **Permisos:** Marca `repo` (todos los permisos de repositorio)
6. **Click en "Generate token"**
7. **Copia el token** (solo se muestra una vez)
8. Usa el token como contraseña cuando Git te lo pida

---

## ✅ Verificación Final

Después de subir, verifica:

1. **Ve a tu repositorio en GitHub:** https://github.com/tu-usuario/LaTienda
2. **Verifica que todos los archivos se subieron:**
   - Debe haber carpetas: `backend/`, `frontend/`, `shared/`
   - Debe haber archivos: `README.md`, `.gitignore`, etc.
3. **VERIFICA que NO hay archivos `.env`:**
   - NO debe haber `backend/.env`
   - NO debe haber `frontend/.env`
4. **Verifica que hay archivos `.env.example`:**
   - Debe haber `backend/.env.example`
   - Debe haber `frontend/.env.example`

---

## 🔄 Actualizar el Repositorio en el Futuro

Cada vez que hagas cambios:

```bash
# Ver qué archivos cambiaron
git status

# Agregar archivos modificados
git add .

# Crear commit con un mensaje descriptivo
git commit -m "Descripción de los cambios realizados"

# Subir los cambios a GitHub
git push origin main
```

---

## 🆘 Solución de Problemas

### Error: "remote origin already exists"
```bash
# Ver los remotos configurados
git remote -v

# Remover el remoto existente
git remote remove origin

# Agregar el nuevo remoto
git remote add origin https://github.com/tu-usuario/LaTienda.git
```

### Error: "authentication failed"
- Verifica que el Personal Access Token sea correcto
- Si expiró, genera uno nuevo

### Error: "permission denied"
- Verifica que el nombre del repositorio sea correcto
- Verifica que tienes permisos de escritura en el repositorio

### Quiero subir solo archivos específicos
```bash
# Agregar archivos específicos
git add archivo1.ts archivo2.ts

# Hacer commit
git commit -m "Mensaje"

# Subir
git push origin main
```

---

## 📝 Notas Importantes

1. **Nunca subas archivos `.env`** con credenciales reales
2. **Siempre verifica con `git status`** antes de hacer push
3. **Los `.env.example` son seguros** - solo contienen templates
4. **Las migraciones de Prisma se suben** - son necesarias para replicar la BD

---

## 🎉 ¡Listo!

Una vez completados estos pasos, tu proyecto estará en GitHub y podrás:
- Acceder desde cualquier lugar
- Compartirlo con otros (si es público o les das acceso)
- Mantener un historial de cambios
- Trabajar en equipo

**¿Necesitas ayuda con algún paso específico?** 🚀

