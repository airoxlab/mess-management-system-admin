'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    className,
    inputClassName,
    icon,
    iconRight,
    required,
    disabled,
    type = 'text',
    ...props
  },
  ref
) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{icon}</span>
          </div>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          className={cn(
            'block w-full rounded-lg border-gray-300 shadow-sm',
            'focus:ring-primary-500 focus:border-primary-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'text-sm',
            error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            icon && 'pl-10',
            iconRight && 'pr-10',
            inputClassName
          )}
          {...props}
        />
        {iconRight && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-400">{iconRight}</span>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

export const TextArea = forwardRef(function TextArea(
  {
    label,
    error,
    helperText,
    className,
    required,
    disabled,
    rows = 3,
    ...props
  },
  ref
) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={cn(
          'block w-full rounded-lg border-gray-300 shadow-sm',
          'focus:ring-primary-500 focus:border-primary-500',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          'text-sm',
          error && 'border-red-500 focus:ring-red-500 focus:border-red-500'
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    className,
    required,
    disabled,
    options = [],
    placeholder,
    ...props
  },
  ref
) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        disabled={disabled}
        className={cn(
          'block w-full rounded-lg border-gray-300 shadow-sm',
          'focus:ring-primary-500 focus:border-primary-500',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          'text-sm',
          error && 'border-red-500 focus:ring-red-500 focus:border-red-500'
        )}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

export default Input;
