# Guía de Despliegue en Railway

Esta guía te ayudará a desplegar tu aplicación POS Multi-local en Railway.

## Prerrequisitos

1. Cuenta en [Railway](https://railway.app)
2. Repositorio en GitHub con el código del proyecto
3. Base de datos MySQL (puedes usar el plugin de Railway o una externa)

## Paso 1: Preparar el Repositorio

Asegúrate de que todos los archivos de configuración estén en el repositorio:

- `railway.json` - Configuración de Railway
- `Procfile` - Comando de inicio
- `.nixpacks.toml` - Configuración de build (opcional)
- `package.json` - Scripts de build y start

## Paso 2: Crear Proyecto en Railway

1. Ve a [Railway Dashboard](https://railway.app/dashboard)
2. Haz clic en "New Project"
3. Selecciona "Deploy from GitHub repo"
4. Conecta tu cuenta de GitHub y selecciona el repositorio
5. Railway detectará automáticamente el proyecto

## Paso 3: Configurar Base de Datos

### Opción A: MySQL de Railway (Recomendado)

1. En tu proyecto de Railway, haz clic en "+ New"
2. Selecciona "Database" → "MySQL"
3. Railway creará automáticamente una base de datos MySQL
4. La variable `DATABASE_URL` se configurará automáticamente

### Opción B: Base de Datos Externa

Si usas una base de datos externa (como PlanetScale, AWS RDS, etc.):

1. Ve a "Variables" en tu servicio
2. Agrega la variable `DATABASE_URL` con tu cadena de conexión:
   ```
   mysql://usuario:contraseña@host:puerto/nombre_base_datos
   ```

## Paso 4: Configurar Variables de Entorno

En Railway, ve a tu servicio → "Variables" y agrega:

### Variables Requeridas

```env
# JWT Secrets (¡IMPORTANTE! Genera valores seguros)
JWT_SECRET=tu-secreto-jwt-muy-seguro-aqui
JWT_REFRESH_SECRET=tu-secreto-refresh-muy-seguro-aqui

# URLs (Railway las proporciona automáticamente, pero puedes personalizarlas)
FRONTEND_URL=https://tu-app.railway.app
SOCKET_URL=https://tu-app.railway.app
```

### Generar Secrets Seguros

Puedes generar secrets seguros usando:

```bash
# En Linux/Mac
openssl rand -base64 32

# O usar Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Variables Opcionales

```env
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## Paso 5: Configurar el Frontend

El frontend se construye automáticamente durante el build y se sirve desde el backend en producción.

Las variables de entorno del frontend deben configurarse en el archivo `.env` o en Railway:

```env
VITE_API_URL=https://tu-app.railway.app
VITE_SOCKET_URL=https://tu-app.railway.app
```

**Nota:** Las variables que empiezan con `VITE_` deben estar disponibles durante el build. Railway las inyecta automáticamente.

## Paso 6: Desplegar

1. Railway detectará automáticamente los cambios en tu repositorio
2. Cada push a la rama principal (main/master) desplegará automáticamente
3. Puedes ver el progreso en la pestaña "Deployments"

## Paso 7: Ejecutar Migraciones de Prisma

Las migraciones se ejecutan automáticamente antes de iniciar el servidor gracias al script `prestart` en `backend/package.json`.

Si necesitas ejecutarlas manualmente:

1. Ve a tu servicio en Railway
2. Abre la consola (terminal)
3. Ejecuta:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

## Paso 8: Verificar el Despliegue

1. Una vez desplegado, Railway te dará una URL (ej: `https://tu-app.railway.app`)
2. Visita la URL en tu navegador
3. Verifica que la aplicación carga correctamente
4. Prueba el endpoint de health: `https://tu-app.railway.app/health`

## Solución de Problemas

### Error: "Cannot find module"

- Asegúrate de que todas las dependencias estén en `package.json`
- Verifica que el build se complete correctamente

### Error: "Database connection failed"

- Verifica que `DATABASE_URL` esté configurada correctamente
- Asegúrate de que la base de datos esté accesible desde Railway
- Si usas una base de datos externa, verifica el firewall y las IPs permitidas

### Error: "Prisma migration failed"

- Verifica que la base de datos esté vacía o que las migraciones sean compatibles
- Revisa los logs de Railway para más detalles

### El frontend no carga

- Verifica que el build del frontend se complete correctamente
- Asegúrate de que `VITE_API_URL` y `VITE_SOCKET_URL` estén configuradas
- Revisa la consola del navegador para errores

### Variables de entorno no funcionan

- Las variables `VITE_*` solo están disponibles durante el build
- Si cambias variables `VITE_*`, necesitas hacer un nuevo build
- Reinicia el servicio después de cambiar variables de entorno

## Configuración de Dominio Personalizado (Opcional)

1. Ve a tu servicio en Railway
2. Haz clic en "Settings" → "Domains"
3. Agrega tu dominio personalizado
4. Configura los registros DNS según las instrucciones de Railway

## Monitoreo y Logs

- **Logs en tiempo real:** Ve a tu servicio → "Deployments" → Selecciona un deployment → "View Logs"
- **Métricas:** Railway proporciona métricas básicas de CPU, memoria y red
- **Alertas:** Configura alertas en Railway para errores críticos

## Actualizar la Aplicación

Para actualizar la aplicación:

1. Haz push de tus cambios a GitHub
2. Railway detectará automáticamente los cambios
3. Iniciará un nuevo build y deployment
4. El servicio se actualizará automáticamente

## Rollback

Si necesitas volver a una versión anterior:

1. Ve a "Deployments"
2. Encuentra el deployment que funcionaba
3. Haz clic en "Redeploy"

## Costos

Railway ofrece un plan gratuito con:
- $5 de crédito gratuito por mes
- 500 horas de uso
- 1 servicio activo

Para más información sobre precios, visita: https://railway.app/pricing

## Soporte

- [Documentación de Railway](https://docs.railway.app)
- [Discord de Railway](https://discord.gg/railway)
- [GitHub Issues](https://github.com/railwayapp/cli/issues)

