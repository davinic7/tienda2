import { AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
  noCancelar?: boolean;
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  isLoading = false,
  noCancelar = false,
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      button: 'btn-danger',
      borderColor: 'border-red-200',
    },
    warning: {
      icon: AlertCircle,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      borderColor: 'border-yellow-200',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      button: 'btn-primary',
      borderColor: 'border-blue-200',
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      button: 'bg-green-600 hover:bg-green-700 text-white',
      borderColor: 'border-green-200',
    },
  };

  const styles = variantStyles[variant];
  const Icon = styles.icon;

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading && !noCancelar) {
      onClose();
    } else if (e.key === 'Enter' && !isLoading) {
      handleConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={noCancelar ? undefined : onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 ${styles.iconBg} rounded-full p-3`}>
              <Icon className={`h-6 w-6 ${styles.iconColor}`} />
            </div>
            <div className="flex-1">
              <h3
                id="confirm-title"
                className="text-xl font-bold text-gray-900 mb-2"
              >
                {title}
              </h3>
              <p
                id="confirm-message"
                className="text-gray-600 mb-4"
              >
                {message}
              </p>
              <div className={`border ${styles.borderColor} rounded-lg p-3 bg-gray-50 mb-4`}>
                <p className="text-sm text-gray-600">
                  <strong>Presiona Enter</strong> para confirmar o <strong>Esc</strong> para cancelar
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={noCancelar ? `w-full ${styles.button} px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed` : `flex-1 ${styles.button} px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? 'Procesando...' : confirmText}
                </button>
                {!noCancelar && (
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="btn btn-secondary px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelText}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

