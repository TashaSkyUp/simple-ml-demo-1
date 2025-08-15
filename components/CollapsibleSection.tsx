import React, { useState, ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  badge?: string | number;
  sectionId?: string;
  isOpen?: boolean;
  onToggle?: (sectionId: string) => void;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = true,
  icon,
  className = "",
  headerClassName = "",
  contentClassName = "",
  badge,
  sectionId,
  isOpen: controlledIsOpen,
  onToggle,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);

  // Use controlled state if provided, otherwise use internal state
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const toggleOpen = () => {
    if (onToggle && sectionId) {
      onToggle(sectionId);
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  return (
    <div
      className={`dark-glass rounded-lg shadow-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-all duration-200 ${className}`}
    >
      <button
        onClick={toggleOpen}
        className={`section-header w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-700 active:bg-gray-600 transition-all duration-200 focus-visible focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-inset transform hover:scale-[1.01] ${headerClassName}`}
        aria-expanded={isOpen}
        aria-controls={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="text-lg" role="img" aria-hidden="true">
              {icon}
            </span>
          )}
          <h2 className="text-lg font-semibold text-gray-100 transition-colors duration-200 hover:text-cyan-300">
            {title}
          </h2>
          {badge && (
            <span className="bg-cyan-600 text-cyan-100 text-xs font-medium px-2 py-1 rounded-full badge-pulse">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {isOpen ? "Collapse" : "Expand"}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-all duration-300 ${
              isOpen ? "rotate-180 text-cyan-400" : "hover:text-gray-300"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      <div
        id={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
        className={`transition-all duration-500 ease-in-out transform ${
          isOpen
            ? "max-h-screen opacity-100 translate-y-0"
            : "max-h-0 opacity-0 overflow-hidden -translate-y-2"
        }`}
      >
        <div
          className={`p-3 space-y-3 transition-all duration-300 ${
            isOpen ? "animate-fade-in" : ""
          } ${contentClassName}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
