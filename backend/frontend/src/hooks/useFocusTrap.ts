import { useEffect, useRef, RefObject } from 'react';

/**
 * Hook para atrapar el focus dentro de un modal
 * @param isOpen - Si el modal está abierto
 * @param containerRef - Referencia al contenedor del modal
 */
export const useFocusTrap = (isOpen: boolean, containerRef: RefObject<HTMLElement>) => {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const firstFocusableElement = useRef<HTMLElement | null>(null);
  const lastFocusableElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // Guardar el elemento que tenía el focus antes de abrir el modal
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Obtener todos los elementos enfocables dentro del modal
    const getFocusableElements = (): HTMLElement[] => {
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      return Array.from(containerRef.current!.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => {
          // Filtrar elementos ocultos
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && !el.hasAttribute('disabled');
        }
      );
    };

    const focusableElements = getFocusableElements();

    if (focusableElements.length === 0) return;

    firstFocusableElement.current = focusableElements[0];
    lastFocusableElement.current = focusableElements[focusableElements.length - 1];

    // Enfocar el primer elemento (preferir inputs o botones)
    setTimeout(() => {
      // Buscar primero un input o textarea
      const inputElement = focusableElements.find(
        (el) => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
      );
      
      if (inputElement) {
        inputElement.focus();
      } else if (firstFocusableElement.current) {
        firstFocusableElement.current.focus();
      }
    }, 100);

    // Manejar Tab para atrapar el focus
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      // Si solo hay un elemento enfocable, mantener el focus ahí
      if (focusableElements.length === 1) {
        e.preventDefault();
        focusableElements[0].focus();
        return;
      }

      // Si está en el último elemento y presiona Tab (sin Shift), ir al primero
      if (document.activeElement === lastFocusableElement.current && !e.shiftKey) {
        e.preventDefault();
        firstFocusableElement.current?.focus();
        return;
      }

      // Si está en el primer elemento y presiona Shift+Tab, ir al último
      if (document.activeElement === firstFocusableElement.current && e.shiftKey) {
        e.preventDefault();
        lastFocusableElement.current?.focus();
        return;
      }
    };

    // Manejar Escape para cerrar el modal
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // El escape se maneja en el componente padre
        // Solo prevenimos el comportamiento por defecto si es necesario
      }
    };

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscape);

    // Cleanup: restaurar el focus al elemento anterior cuando se cierra el modal
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscape);
      
      // Restaurar el focus al elemento anterior
      if (previousActiveElement.current) {
        setTimeout(() => {
          previousActiveElement.current?.focus();
        }, 50);
      }
    };
  }, [isOpen, containerRef]);
};

