import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FirmSettings, Employee, MonthSchedule, Position, Shift } from '@/types/schedule';

interface AppState {
  firmSettings: FirmSettings;
  employees: Employee[];
  schedule: MonthSchedule | null;
  selectedMonth: number;
  selectedYear: number;
}

interface AppContextType extends AppState {
  setFirmSettings: (settings: FirmSettings) => void;
  addPosition: (position: Position) => void;
  updatePosition: (id: string, position: Partial<Position>) => void;
  removePosition: (id: string) => void;
  addShift: (shift: Shift) => void;
  updateShift: (id: string, shift: Partial<Shift>) => void;
  removeShift: (id: string) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  setSchedule: (schedule: MonthSchedule | null) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  resetAll: () => void;
}

const defaultFirmSettings: FirmSettings = {
  firmName: '',
  ownerName: '',
  operatingHoursStart: '08:00',
  operatingHoursEnd: '20:00',
  worksOnHolidays: false,
  positions: [],
  shifts: [],
};

const defaultState: AppState = {
  firmSettings: defaultFirmSettings,
  employees: [],
  schedule: null,
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: 2026,
};

const STORAGE_KEY = 'schedule-generator-data';

const loadFromStorage = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultState, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return defaultState;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadFromStorage);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        firmSettings: state.firmSettings,
        employees: state.employees,
        selectedMonth: state.selectedMonth,
        selectedYear: state.selectedYear,
        // Don't persist schedule - regenerate as needed
      }));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [state.firmSettings, state.employees, state.selectedMonth, state.selectedYear]);

  const setFirmSettings = (settings: FirmSettings) => {
    setState((prev) => ({ ...prev, firmSettings: settings }));
  };

  const addPosition = (position: Position) => {
    setState((prev) => ({
      ...prev,
      firmSettings: {
        ...prev.firmSettings,
        positions: [...prev.firmSettings.positions, position],
      },
    }));
  };

  const updatePosition = (id: string, positionUpdate: Partial<Position>) => {
    setState((prev) => ({
      ...prev,
      firmSettings: {
        ...prev.firmSettings,
        positions: prev.firmSettings.positions.map((p) =>
          p.id === id ? { ...p, ...positionUpdate } : p
        ),
      },
    }));
  };

  const removePosition = (id: string) => {
    setState((prev) => ({
      ...prev,
      firmSettings: {
        ...prev.firmSettings,
        positions: prev.firmSettings.positions.filter((p) => p.id !== id),
      },
      // Also remove positionId from employees with this position
      employees: prev.employees.map((e) =>
        e.positionId === id ? { ...e, positionId: '' } : e
      ),
    }));
  };

  const addShift = (shift: Shift) => {
    setState((prev) => ({
      ...prev,
      firmSettings: {
        ...prev.firmSettings,
        shifts: [...prev.firmSettings.shifts, shift],
      },
    }));
  };

  const updateShift = (id: string, shiftUpdate: Partial<Shift>) => {
    setState((prev) => ({
      ...prev,
      firmSettings: {
        ...prev.firmSettings,
        shifts: prev.firmSettings.shifts.map((s) =>
          s.id === id ? { ...s, ...shiftUpdate } : s
        ),
      },
    }));
  };

  const removeShift = (id: string) => {
    setState((prev) => ({
      ...prev,
      firmSettings: {
        ...prev.firmSettings,
        shifts: prev.firmSettings.shifts.filter((s) => s.id !== id),
      },
    }));
  };

  const addEmployee = (employee: Employee) => {
    setState((prev) => ({
      ...prev,
      employees: [...prev.employees, employee],
    }));
  };

  const updateEmployee = (id: string, employeeUpdate: Partial<Employee>) => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((e) =>
        e.id === id ? { ...e, ...employeeUpdate } : e
      ),
    }));
  };

  const removeEmployee = (id: string) => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== id),
    }));
  };

  const setSchedule = (schedule: MonthSchedule | null) => {
    setState((prev) => ({ ...prev, schedule }));
  };

  const setSelectedMonth = (month: number) => {
    setState((prev) => ({ ...prev, selectedMonth: month }));
  };

  const setSelectedYear = (year: number) => {
    setState((prev) => ({ ...prev, selectedYear: year }));
  };

  const resetAll = () => {
    setState(defaultState);
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        setFirmSettings,
        addPosition,
        updatePosition,
        removePosition,
        addShift,
        updateShift,
        removeShift,
        addEmployee,
        updateEmployee,
        removeEmployee,
        setSchedule,
        setSelectedMonth,
        setSelectedYear,
        resetAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
