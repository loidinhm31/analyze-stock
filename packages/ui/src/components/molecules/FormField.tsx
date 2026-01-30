import { ReactNode } from "react";
import { Label, Input } from "@/components/atoms";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label: string;
  id: string;
  icon?: ReactNode;
  required?: boolean;
  error?: string;
  className?: string;
  children?: ReactNode;
  // Input props when not using children
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  list?: string;
}

export function FormField({
  label,
  id,
  icon,
  required,
  error,
  className,
  children,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  list,
}: FormFieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className="flex items-center gap-2">
        {icon}
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children || (
        <Input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          list={list}
          required={required}
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
