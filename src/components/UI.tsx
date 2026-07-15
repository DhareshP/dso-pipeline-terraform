import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[maxWidth];

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className={`modal-content ${maxWidthClass} animate-slide-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    outline: 'btn-outline',
    danger: 'btn-danger',
  }[variant];

  const sizeClass = {
    sm: 'btn-sm',
    md: '',
    lg: 'px-6 py-3 text-base',
  }[size];

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export function Input({ label, error, helpText, className = '', ...props }: InputProps) {
  return (
    <div className="form-group">
      {label && <label className="label">{label}</label>}
      <input
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      {helpText && !error && <p className="text-sm text-gray-500 mt-1">{helpText}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="form-group">
      {label && <label className="label">{label}</label>}
      <select
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-header ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-body ${className}`}>{children}</div>;
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'warning' | 'error' | 'gray';
  className?: string;
}

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  const variantClass = {
    primary: 'badge-primary',
    secondary: 'badge-secondary',
    warning: 'badge-warning',
    error: 'badge-error',
    gray: 'badge-gray',
  }[variant];

  return <span className={`badge ${variantClass} ${className}`}>{children}</span>;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-gray-500 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div className="flex items-center justify-center py-8">
      <svg
        className={`animate-spin ${sizeClass} text-blue-600`}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <p className="text-gray-600">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          {cancelText}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
