// src/context/SandpackContext.tsx
import React, { createContext, useContext, useState } from 'react';

type SandpackContextType = {
  sandpackResult: string | null;
  setSandpackResult: (result: string | null) => void;
};

const SandpackContext = createContext<SandpackContextType>({
  sandpackResult: null,
  setSandpackResult: () => {},
});

export const SandpackProvider = ({ children }: { children: React.ReactNode }) => {
  const [sandpackResult, setSandpackResult] = useState<string | null>(null);

  return (
    <SandpackContext.Provider value={{ sandpackResult, setSandpackResult }}>
      {children}
    </SandpackContext.Provider>
  );
};

export const useSandpackContext = () => useContext(SandpackContext);