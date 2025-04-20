import { createContext } from "react";

type ActionContextType = {
  doSomething: () => void;
};

export const ActionContext = createContext<ActionContextType | null>(null);
