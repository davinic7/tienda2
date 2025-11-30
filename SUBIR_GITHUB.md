# 📤 Guía para Subir el Proyecto a GitHub

## Opción 1: Crear el Repositorio desde GitHub (Recomendado)

### Paso 1: Crear el Repositorio en GitHub

1. Ve a https://github.com y inicia sesión
2. Haz clic en el botón **"+"** (arriba a la derecha) → **"New repository"**
3. Configura el repositorio:
   - **Repository name**: `tienda2`
   - **Description**: "Sistema POS completo con escáneres, impresoras y balanzas"
   - **Visibility**: Elige **Public** o **Private**
   - ⚠️ **NO marques** "Add a README file", "Add .gitignore", ni "Choose a license" (ya los tenemos)
4. Haz clic en **"Create repository"**

### Paso 2: Subir el Código

Una vez creado el repositorio, ejecuta estos comandos en tu terminal:

```bash
# Si ya tienes el remoto configurado (que ya está hecho)
git push -u origin main

# Si necesitas cambiar la URL del remoto, usa tu nombre de usuario real:
git remote set-url origin https://github.com/TU_USUARIO/tienda2.git
git push -u origin main
```

## Opción 2: Usar GitHub CLI (Si lo tienes instalado)

```bash
# Crear el repositorio y subir en un solo comando
gh repo create tienda2 --public --source=. --remote=origin --push
```

## Opción 3: Script Automático

He creado un script que puedes ejecutar. Primero, edita el archivo `subir-github.ps1` y cambia `TU_USUARIO` por tu nombre de usuario de GitHub.

## 🔐 Autenticación

Si GitHub te pide autenticación, puedes usar:

1. **Personal Access Token** (recomendado):
   - Ve a: https://github.com/settings/tokens
   - Genera un nuevo token con permisos `repo`
   - Úsalo como contraseña cuando Git te lo pida

2. **GitHub CLI**:
   ```bash
   gh auth login
   ```

## ✅ Verificación

Después de subir, verifica que todo esté correcto:

1. Ve a tu repositorio: `https://github.com/TU_USUARIO/tienda2`
2. Verifica que todos los archivos estén presentes
3. Verifica que el README.md se muestre correctamente

## 📝 Notas Importantes

- El archivo `.env` NO se subirá (está en .gitignore)
- Los `node_modules` NO se subirán (están en .gitignore)
- Asegúrate de tener configurado tu `.env` localmente antes de trabajar

## 🚀 Próximos Pasos

Una vez subido, puedes:
- Clonar el repositorio en otros equipos
- Configurar CI/CD
- Colaborar con otros desarrolladores
- Hacer deploy automático

