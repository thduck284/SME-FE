import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  loading, 
  variant = "primary", 
  size = "md", 
  className = "", 
  ...props 
}) => {
  const variantClass = (() => {
    switch (variant) {
      case "primary":
        return "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600";
      case "secondary":
        return "bg-gray-200 text-gray-900 hover:bg-gray-300 border border-gray-300";
      case "ghost":
        return "bg-transparent text-gray-700 hover:bg-gray-100 border border-gray-300";
      default:
        return "";
    }
  })();

  const sizeClass = (() => {
    switch (size) {
      case "sm":
        return "px-3 py-1 text-sm h-8";
      case "md":
        return "px-4 py-2 text-base h-10";
      case "lg":
        return "px-6 py-3 text-lg h-12";
      default:
        return "";
    }
  })();

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`
        inline-flex items-center justify-center
        rounded-md font-medium transition-all duration-200 
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${variantClass} 
        ${sizeClass} 
        ${className}
      `}
    >
      {loading ? (
        <>
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;