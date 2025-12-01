# Script para generar secretos seguros para JWT
# Ejecuta este script en PowerShell para generar los secretos necesarios

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Generador de Secretos para Render" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Generar JWT_SECRET
$jwtSecret = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
Write-Host "JWT_SECRET:" -ForegroundColor Green
Write-Host $jwtSecret -ForegroundColor Yellow
Write-Host ""

# Generar JWT_REFRESH_SECRET
$jwtRefreshSecret = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
Write-Host "JWT_REFRESH_SECRET:" -ForegroundColor Green
Write-Host $jwtRefreshSecret -ForegroundColor Yellow
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTRUCCIONES:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Copia los valores generados arriba" -ForegroundColor White
Write-Host "2. Ve a https://dashboard.render.com" -ForegroundColor White
Write-Host "3. Selecciona tu Web Service" -ForegroundColor White
Write-Host "4. Ve a la pestaña 'Environment'" -ForegroundColor White
Write-Host "5. Agrega las siguientes variables:" -ForegroundColor White
Write-Host ""
Write-Host "   Variable: JWT_SECRET" -ForegroundColor Yellow
Write-Host "   Valor: (pega el primer secreto generado)" -ForegroundColor Gray
Write-Host ""
Write-Host "   Variable: JWT_REFRESH_SECRET" -ForegroundColor Yellow
Write-Host "   Valor: (pega el segundo secreto generado)" -ForegroundColor Gray
Write-Host ""
Write-Host "   Variable: FRONTEND_URL" -ForegroundColor Yellow
Write-Host "   Valor: https://tu-frontend.onrender.com" -ForegroundColor Gray
Write-Host "   (o la URL de tu frontend)" -ForegroundColor Gray
Write-Host ""
Write-Host "   Variable: DATABASE_URL" -ForegroundColor Yellow
Write-Host "   Valor: (URL de tu base de datos PostgreSQL)" -ForegroundColor Gray
Write-Host ""
Write-Host "   Variable: NODE_ENV" -ForegroundColor Yellow
Write-Host "   Valor: production" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Guarda los cambios" -ForegroundColor White
Write-Host "7. Render reiniciará automáticamente el servicio" -ForegroundColor White
Write-Host ""

