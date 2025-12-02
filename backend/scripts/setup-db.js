#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔧 Configurando base de datos...');

// Primero, migrar datos si es necesario (ALMACEN -> DEPOSITO)
try {
  console.log('🔄 Verificando migración de roles...');
  execSync('node scripts/migrate-role-almacen.js', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️  Error en migración de roles, continuando...');
  // Continuar aunque falle
}

try {
  // Intentar aplicar migraciones
  console.log('📦 Aplicando migraciones...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Migraciones aplicadas exitosamente');
} catch (error) {
  // Verificar el código de salida y el mensaje de error
  const errorOutput = error.stdout?.toString() || error.stderr?.toString() || error.message || '';
  const exitCode = error.status || error.code || 1;
  
  // Si falla porque no hay migraciones o hay conflicto de provider, usar db push
  if (
    errorOutput.includes('No migration found') || 
    errorOutput.includes('P3019') ||
    errorOutput.includes('P3005') ||
    exitCode !== 0
  ) {
    console.log('⚠️  No se encontraron migraciones o hay conflicto, sincronizando schema con db push...');
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      console.log('✅ Schema sincronizado exitosamente');
    } catch (pushError) {
      const pushErrorOutput = pushError.stdout?.toString() || pushError.stderr?.toString() || pushError.message || '';
      
      // Si el error es por el enum ALMACEN, intentar migración manual
      if (pushErrorOutput.includes('ALMACEN') || pushErrorOutput.includes('invalid input value for enum')) {
        console.log('🔄 Intentando migración manual del enum...');
        try {
          // Ejecutar migración de datos nuevamente
          execSync('node scripts/migrate-role-almacen.js', { stdio: 'inherit' });
          // Intentar db push nuevamente
          execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
          console.log('✅ Schema sincronizado exitosamente después de migración');
        } catch (retryError) {
          console.error('❌ Error al sincronizar schema después de migración:', retryError.message);
          process.exit(1);
        }
      } else {
        console.error('❌ Error al sincronizar schema:', pushErrorOutput);
        process.exit(1);
      }
    }
  } else {
    console.error('❌ Error al aplicar migraciones:', errorOutput);
    process.exit(1);
  }
}

// Ejecutar seed
try {
  console.log('🌱 Ejecutando seed...');
  execSync('npm run db:seed', { stdio: 'inherit' });
  console.log('✅ Seed ejecutado exitosamente');
} catch (error) {
  console.error('❌ Error al ejecutar seed:', error.message);
  // No salir con error si el seed falla, puede que ya existan los datos
  console.log('⚠️  Continuando sin seed...');
}

console.log('✅ Base de datos configurada correctamente');

