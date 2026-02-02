import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FirmSettings, Employee, MonthSchedule, Shift } from '@/types/schedule';

interface AppState {
  firmSettings: FirmSettings;
  employees: Employee[];
  schedule: MonthSchedule | null;
  selectedMonth: number;
  selectedYear: number;
}

interface AppContextType extends AppState {
  setFirmSettings: (settings: FirmSettings) => void;
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
  shifts: [],
};

const defaultState: AppState = {
  firmSettings: defaultFirmSettings,
  employees: [],
  schedule: null,
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: 2026,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);

  const setFirmSettings = (settings: FirmSettings) => {
    setState((prev) => ({ ...prev, firmSettings: settings }));
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
