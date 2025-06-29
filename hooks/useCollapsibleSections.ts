import React, { useState, useCallback } from "react";

interface SectionState {
  [sectionId: string]: boolean;
}

interface UseCollapsibleSectionsOptions {
  defaultStates?: SectionState;
  persistToLocalStorage?: boolean;
  storageKey?: string;
}

interface UseCollapsibleSectionsReturn {
  sectionStates: SectionState;
  toggleSection: (sectionId: string) => void;
  openSection: (sectionId: string) => void;
  closeSection: (sectionId: string) => void;
  openAllSections: () => void;
  closeAllSections: () => void;
  isSectionOpen: (sectionId: string) => boolean;
}

export const useCollapsibleSections = (
  options: UseCollapsibleSectionsOptions = {},
): UseCollapsibleSectionsReturn => {
  const {
    defaultStates = {},
    persistToLocalStorage = true,
    storageKey = "cnn-trainer-section-states",
  } = options;

  // Load initial states from localStorage or use defaults
  const getInitialStates = (): SectionState => {
    if (persistToLocalStorage) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsedStored = JSON.parse(stored);
          // Merge with defaults, giving preference to stored values
          return { ...defaultStates, ...parsedStored };
        }
      } catch (error) {
        console.warn("Failed to load section states from localStorage:", error);
      }
    }
    return defaultStates;
  };

  const [sectionStates, setSectionStates] =
    useState<SectionState>(getInitialStates);

  // Save to localStorage whenever states change
  const updateStates = useCallback(
    (updater: (prev: SectionState) => SectionState) => {
      setSectionStates((prev) => {
        const newStates = updater(prev);

        if (persistToLocalStorage) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(newStates));
          } catch (error) {
            console.warn(
              "Failed to save section states to localStorage:",
              error,
            );
          }
        }

        return newStates;
      });
    },
    [persistToLocalStorage, storageKey],
  );

  const toggleSection = useCallback(
    (sectionId: string) => {
      updateStates((prev: SectionState) => ({
        ...prev,
        [sectionId]: !prev[sectionId],
      }));
    },
    [updateStates],
  );

  const openSection = useCallback(
    (sectionId: string) => {
      updateStates((prev: SectionState) => ({
        ...prev,
        [sectionId]: true,
      }));
    },
    [updateStates],
  );

  const closeSection = useCallback(
    (sectionId: string) => {
      updateStates((prev: SectionState) => ({
        ...prev,
        [sectionId]: false,
      }));
    },
    [updateStates],
  );

  const openAllSections = useCallback(() => {
    updateStates((prev: SectionState) => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach((key) => {
        newStates[key] = true;
      });
      return newStates;
    });
  }, [updateStates]);

  const closeAllSections = useCallback(() => {
    updateStates((prev: SectionState) => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach((key) => {
        newStates[key] = false;
      });
      return newStates;
    });
  }, [updateStates]);

  const isSectionOpen = useCallback(
    (sectionId: string): boolean => {
      return sectionStates[sectionId] ?? true; // Default to open if not specified
    },
    [sectionStates],
  );

  return {
    sectionStates,
    toggleSection,
    openSection,
    closeSection,
    openAllSections,
    closeAllSections,
    isSectionOpen,
  };
};

// Predefined section configurations for common use cases
export const createResponsiveSectionDefaults = (
  screenSize: "mobile" | "tablet" | "desktop" | "wide",
): SectionState => {
  switch (screenSize) {
    case "mobile":
      return {
        "network-architecture": true,
        "data-collection": true,
        "training-prediction": true,
        "gpu-performance": false,
        "neural-network-visualization": false,
        "inference-input": true,
        "inference-results": true,
        "audio-alerts": false,
        "inference-visualization": false,
        "inference-performance": false,
      };
    case "tablet":
      return {
        "network-architecture": true,
        "data-collection": true,
        "training-prediction": true,
        "gpu-performance": false,
        "neural-network-visualization": true,
        "inference-input": true,
        "inference-results": true,
        "audio-alerts": true,
        "inference-visualization": true,
        "inference-performance": false,
      };
    case "desktop":
      return {
        "network-architecture": true,
        "data-collection": true,
        "training-prediction": true,
        "gpu-performance": true,
        "neural-network-visualization": true,
        "inference-input": true,
        "inference-results": true,
        "audio-alerts": true,
        "inference-visualization": true,
        "inference-performance": true,
      };
    case "wide":
      return {
        "network-architecture": true,
        "data-collection": true,
        "training-prediction": true,
        "gpu-performance": true,
        "neural-network-visualization": true,
        "inference-input": true,
        "inference-results": true,
        "audio-alerts": true,
        "inference-visualization": true,
        "inference-performance": true,
      };
    default:
      return {};
  }
};

// Hook to detect screen size and provide appropriate defaults
export const useResponsiveDefaults = (): SectionState => {
  const [screenSize, setScreenSize] = useState<
    "mobile" | "tablet" | "desktop" | "wide"
  >("desktop");

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize("mobile");
      } else if (width < 1024) {
        setScreenSize("tablet");
      } else if (width < 1280) {
        setScreenSize("desktop");
      } else {
        setScreenSize("wide");
      }
    };

    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  return createResponsiveSectionDefaults(screenSize);
};
