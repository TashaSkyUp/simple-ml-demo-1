import React, { useState, ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: string;
  content: ReactNode;
  badge?: string | number;
}

interface TabbedInterfaceProps {
  tabs: Tab[];
  defaultActiveTab?: string;
  className?: string;
  onTabChange?: (tabId: string) => void;
}

export const TabbedInterface: React.FC<TabbedInterfaceProps> = ({
  tabs,
  defaultActiveTab,
  className = "",
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState(
    defaultActiveTab || tabs[0]?.id || "",
  );

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div className={`w-full ${className}`}>
      {/* Tab Headers */}
      <div className="border-b border-gray-700 bg-gray-800 rounded-t-lg">
        <nav className="flex space-x-0" aria-label="Tabs">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                group relative px-6 py-4 text-sm font-medium transition-all duration-200
                ${
                  activeTab === tab.id
                    ? "bg-gray-900 text-cyan-400 border-b-2 border-cyan-400"
                    : "text-gray-300 hover:text-gray-100 hover:bg-gray-700"
                }
                ${index === 0 ? "rounded-tl-lg" : ""}
                ${index === tabs.length - 1 ? "rounded-tr-lg" : ""}
                focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-inset
              `}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              <div className="flex items-center gap-3">
                {tab.icon && (
                  <span className="text-lg" role="img" aria-hidden="true">
                    {tab.icon}
                  </span>
                )}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="bg-cyan-600 text-cyan-100 text-xs font-medium px-2 py-1 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Active tab indicator */}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
              )}

              {/* Hover effect */}
              <div className="absolute inset-0 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-10 bg-cyan-400" />
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-900 rounded-b-lg min-h-96">
        <div
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="p-6 space-y-6 animate-fade-in"
        >
          {activeTabContent}
        </div>
      </div>
    </div>
  );
};

export default TabbedInterface;
