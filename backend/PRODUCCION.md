# 🚀 Guía de Despliegue en Producción

## ⚠️ IMPORTANTE: Seguridad en Producción

Este sistema está configurado para **desarrollo**. Para producción, debes seguir estas prácticas de seguridad:

## 🔒 Checklist de Seguridad para Producción

### 1. Variables de Entorno

✅ **NUNCA** subas `.env` a Git
✅ Usa variables de entorno del servidor (Heroku, Railway, Vercel, etc.)
✅ Genera claves JWT únicas y seguras (mínimo 32 caracteres)
✅ Usa contraseñas fuertes para la base de datos

### 2. Base de Datos

✅ Usa una base de datos en la nube (no local)
✅ Habilita SSL/TLS para la conexión
✅ Configura backups automáticos
✅ Limita el acceso por IP si es posible

### 3. Servidor

✅ Usa HTTPS (no HTTP)
✅ Configura CORS correctamente (solo tu dominio)
✅ Habilita rate limiting más agresivo
✅ Configura firewall
✅ Usa un proceso manager (PM2, systemd, etc.)

### 4. Código

✅ No expongas mensajes de error detallados
✅ No muestres información de la base de datos en errores
✅ Valida todas las entradas
✅ Usa prepared statements (Prisma lo hace automáticamente)

### 5. Logs

✅ No loguees información sensible (passwords, tokens)
✅ Usa un servicio de logs (Sentry, LogRocket, etc.)
✅ Rota los logs regularmente

## 📋 Configuración para Producción

### Variables de Entorno Requeridas

```env
NODE_ENV=production
DATABASE_URL="mysql://usuario:password@host:3306/database"
JWT_SECRET="clave-super-segura-minimo-32-caracteres"
JWT_REFRESH_SECRET="otra-clave-super-segura-diferente"
FRONTEND_URL="https://tu-dominio.com"
```

### Cambios Automáticos en Producción

El sistema detecta `NODE_ENV=production` y automáticamente:

1. **CORS más restrictivo**: Solo acepta `FRONTEND_URL`
2. **Rate limiting más agresivo**: Menos intentos permitidos
3. **Errores menos detallados**: No expone mensajes internos
4. **Validación estricta**: Falla si faltan variables críticas
5. **Logs reducidos**: No muestra información sensible

## 🚀 Opciones de Despliegue

### Opción 1: Railway / Render / Fly.io

1. Conecta tu repositorio
2. Configura variables de entorno
3. Deploy automático

### Opción 2: VPS (DigitalOcean, AWS, etc.)

1. Instala Node.js y MySQL
2. Clona el repositorio
3. Configura variables de entorno
4. Usa PM2 para mantener el proceso corriendo:
   ```bash
   npm install -g pm2
   cd backend
   npm run build
   pm2 start dist/index.js --name pos-backend
   ```

### Opción 3: Docker

```dockerfile
# Ejemplo básico (mejora según necesidades)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

## 🔐 Generar Claves Seguras

```bash
# Opción 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opción 2: OpenSSL
openssl rand -hex 32

# Opción 3: Online (usa solo servicios confiables)
# https://randomkeygen.com/
```

## ✅ Verificación Post-Despliegue

1. ✅ Verifica que `NODE_ENV=production`
2. ✅ Verifica que HTTPS esté habilitado
3. ✅ Verifica que CORS solo acepte tu dominio
4. ✅ Prueba rate limiting
5. ✅ Verifica que los errores no expongan información sensible
6. ✅ Revisa los logs de seguridad

## 🛡️ Mejoras Adicionales Recomendadas

1. **Helmet.js**: Headers de seguridad HTTP
2. **Rate limiting global**: Más allá del login
3. **WAF (Web Application Firewall)**: Cloudflare, AWS WAF
4. **Monitoreo**: Sentry, DataDog, etc.
5. **Backups automáticos**: De base de datos
6. **SSL/TLS**: Certificados válidos
7. **CDN**: Para assets estáticos

## 📝 Notas Importantes

- **NUNCA** uses los valores de ejemplo en producción
- **SIEMPRE** usa HTTPS en producción
- **SIEMPRE** valida que las variables de entorno estén configuradas
- **NUNCA** expongas información sensible en logs públicos
- **SIEMPRE** mantén las dependencias actualizadas

