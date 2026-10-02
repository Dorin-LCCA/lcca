import { createContext, useContext, useState, useCallback } from "react";

const PlanTripContext = createContext(null);

export function PlanTripProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState({});

  const openPlanner = useCallback((source = "unknown", data = {}) => {
    setPrefill({ source, ...data });
    setOpen(true);
  }, []);

  const closePlanner = useCallback(() => setOpen(false), []);

  return (
    <PlanTripContext.Provider value={{ open, prefill, openPlanner, closePlanner }}>
      {children}
    </PlanTripContext.Provider>
  );
}

export function usePlanTrip() {
  return useContext(PlanTripContext);
}
