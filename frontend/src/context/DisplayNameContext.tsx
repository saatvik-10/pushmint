import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import {
  DISPLAY_NAME_STORAGE_KEY,
  getDisplayName,
  saveDisplayName,
} from "../lib/deployments";

type DisplayNameContextValue = {
  displayName: string;
  updateDisplayName: (displayName: string) => void;
};

const DisplayNameContext = createContext<DisplayNameContextValue | null>(null);

export function DisplayNameProvider({ children }: PropsWithChildren) {
  const [displayName, setDisplayName] = useState(getDisplayName);

  const updateDisplayName = useCallback((value: string) => {
    setDisplayName(saveDisplayName(value));
  }, []);

  useEffect(() => {
    const syncDisplayName = (event: StorageEvent) => {
      if (event.key === DISPLAY_NAME_STORAGE_KEY) {
        setDisplayName(getDisplayName());
      }
    };

    window.addEventListener("storage", syncDisplayName);
    return () => window.removeEventListener("storage", syncDisplayName);
  }, []);

  return (
    <DisplayNameContext.Provider value={{ displayName, updateDisplayName }}>
      {children}
    </DisplayNameContext.Provider>
  );
}

export function useDisplayName() {
  const context = useContext(DisplayNameContext);
  if (!context) {
    throw new Error("useDisplayName must be used inside DisplayNameProvider.");
  }
  return context;
}
