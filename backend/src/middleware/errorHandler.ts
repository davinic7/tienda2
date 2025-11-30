import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('═══════════════════════════════════════════════════════');
  console.error('❌ ERROR:', err.message || err);
  console.error('📍 URL:', req.method, req.url);
  console.error('📦 Body:', JSON.stringify(req.body, null, 2));
  if (err.stack) {
    console.error('📚 Stack:', err.stack);
  }
  console.error('═══════════════════════════════════════════════════════');

  // Errores de validación Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Error de validación',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Error personalizado con status code
  if ('statusCode' in err) {
    res.status((err as any).statusCode).json({
      error: err.message,
    });
    return;
  }

  // Error genérico
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

