import type { ReactNode } from "react";

interface FormFieldProps {
  children: ReactNode;
  description?: string;
  error?: string;
  htmlFor: string;
  label: string;
  optional?: boolean;
}

export function FormField({
  children,
  description,
  error,
  htmlFor,
  label,
  optional = false,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
          {label}
        </label>
        {optional ? <span className="text-xs text-muted-foreground">Facultatif</span> : null}
      </div>
      {children}
      {description && !error ? (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
      {error ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
