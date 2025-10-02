import React from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  ...props
}) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={props.id}
          className="block text-sm font-medium text-foreground/90"
        >
          {label}
        </label>
      )}

      <input
        {...props}
        className={clsx(
          "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
          "placeholder:text-muted-foreground/60 focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-60 transition-all",
          error && "border-destructive focus-visible:ring-destructive/60",
          className
        )}
      />

      {error && (
        <p className="text-xs text-destructive mt-1 font-medium">{error}</p>
      )}
    </div>
  );
};

export default Input;
