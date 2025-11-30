import { Router } from 'express';
import authRoutes from './auth.routes';
import productosRoutes from './productos.routes';
import ventasRoutes from './ventas.routes';
import clientesRoutes from './clientes.routes';
import stockRoutes from './stock.routes';
import localesRoutes from './locales.routes';
import usuariosRoutes from './usuarios.routes';
import reportesRoutes from './reportes.routes';
import depositosRoutes from './depositos.routes';
import stockDepositoRoutes from './stock-deposito.routes';
import pedidosAlmacenRoutes from './pedidos-almacen.routes';
import movimientosStockRoutes from './movimientos-stock.routes';
import cajaRoutes from './caja.routes';
import combosRoutes from './combos.routes';
import notificacionesRoutes from './notificaciones.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/productos', productosRoutes);
router.use('/ventas', ventasRoutes);
router.use('/clientes', clientesRoutes);
router.use('/stock', stockRoutes);
router.use('/locales', localesRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/reportes', reportesRoutes);
router.use('/depositos', depositosRoutes);
router.use('/stock-deposito', stockDepositoRoutes);
router.use('/pedidos-almacen', pedidosAlmacenRoutes);
router.use('/movimientos-stock', movimientosStockRoutes);
router.use('/caja', cajaRoutes);
router.use('/combos', combosRoutes);
router.use('/notificaciones', notificacionesRoutes);

export default router;

