import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { FirmSettings, Employee, MonthSchedule, Position, Shift } from '@/types/schedule';
import type { FirmListItem, SavedFirmData } from '@/types/electron';
import {
  getAllFirms,
  loadFirm,
  saveFirm,
  deleteFirm as deleteFirmFromStorage,
  getConfig,
  setConfig,
  createNewFirm,
  migrateOldStorage,
  exportFirmToJson,
  importFirmFromJson,
  setServerConfig,
  isServerMode,
} from '@/utils/persistence';

interface AppState {
  firmSettings: FirmSettings;
  employees: Employee[];
  schedule: MonthSchedule | null;
  selectedMonth: number;
  selectedYear: number;
}

interface AppContextType extends AppState {
  // Current firm ID
  currentFirmId: string | null;
  // List of all saved firms
  firmsList: FirmListItem[];
  // Loading state
  isLoading: boolean;
  // Firm management
  switchFirm: (firmId: string) => Promise<void>;
  createFirm: (name?: string) => Promise<string>;
  deleteFirm: (firmId: string) => Promise<void>;
  renameFirm: (firmId: string, newName: string) => Promise<void>;
  refreshFirmsList: () => Promise<FirmListItem[]>;
  exportCurrentFirm: () => void;
  importFirm: (file: File) => Promise<string>;
  // Settings management
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
  operatingDays: [1, 2, 3, 4, 5], // Monday-Friday default
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

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [currentFirmId, setCurrentFirmId] = useState<string | null>(null);
  const [firmsList, setFirmsList] = useState<FirmListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load firms list
  const refreshFirmsList = useCallback(async () => {
    const firms = await getAllFirms();
    setFirmsList(firms);
    return firms;
  }, []);

  // Save current firm data (debounced)
  const saveCurrentFirm = useCallback(async (firmId: string, currentState: AppState) => {
    if (!firmId) return;

    const firmData: SavedFirmData = {
      id: firmId,
      firmSettings: currentState.firmSettings,
      employees: currentState.employees,
      selectedMonth: currentState.selectedMonth,
      selectedYear: currentState.selectedYear,
      createdAt: new Date().toISOString(), // Will be preserved by saveFirm if exists
      updatedAt: new Date().toISOString(),
    };

    await saveFirm(firmData);
    await refreshFirmsList();
  }, [refreshFirmsList]);

  // Debounced save effect
  useEffect(() => {
    if (!currentFirmId || isLoading) return;

    // Clear previous timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout for debounced save
    const timeout = setTimeout(() => {
      saveCurrentFirm(currentFirmId, state);
    }, 500);

    setSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [state, currentFirmId, isLoading]);

  // Initialize on mount
  useEffect(() => {
    async function initialize() {
      setIsLoading(true);

      // Try to migrate old storage first
      const migratedFirmId = await migrateOldStorage();

      // Load config and firms list, fallback to local mode if server fails
      let config;
      let firms;
      try {
        [config, firms] = await Promise.all([getConfig(), getAllFirms()]);
      } catch (err) {
        console.error('Failed to connect to server, falling back to local mode:', err);
        if (isServerMode()) {
          setServerConfig(null);
        }
        [config, firms] = await Promise.all([getConfig(), getAllFirms()]);
      }
      setFirmsList(firms);

      // Determine which firm to load
      const firmIdToLoad = migratedFirmId || config.lastFirmId;

      if (firmIdToLoad && firms.some(f => f.id === firmIdToLoad)) {
        // Load existing firm
        const firmData = await loadFirm(firmIdToLoad);
        if (firmData) {
          setState({
            firmSettings: firmData.firmSettings,
            employees: firmData.employees,
            schedule: null,
            selectedMonth: firmData.selectedMonth,
            selectedYear: firmData.selectedYear,
          });
          setCurrentFirmId(firmIdToLoad);
        }
      } else if (firms.length > 0) {
        // Load most recent firm
        const firmData = await loadFirm(firms[0].id);
        if (firmData) {
          setState({
            firmSettings: firmData.firmSettings,
            employees: firmData.employees,
            schedule: null,
            selectedMonth: firmData.selectedMonth,
            selectedYear: firmData.selectedYear,
          });
          setCurrentFirmId(firms[0].id);
          await setConfig({ lastFirmId: firms[0].id });
        }
      } else {
        // No firms exist, create a new one
        const newFirm = createNewFirm();
        await saveFirm(newFirm);
        setState({
          firmSettings: newFirm.firmSettings,
          employees: newFirm.employees,
          schedule: null,
          selectedMonth: newFirm.selectedMonth,
          selectedYear: newFirm.selectedYear,
        });
        setCurrentFirmId(newFirm.id);
        await setConfig({ lastFirmId: newFirm.id });
        await refreshFirmsList();
      }

      setIsLoading(false);
    }

    initialize();
  }, []);

  // Switch to a different firm
  const switchFirm = async (firmId: string) => {
    if (firmId === currentFirmId) return;

    setIsLoading(true);

    // Save current firm before switching
    if (currentFirmId) {
      await saveCurrentFirm(currentFirmId, state);
    }

    // Load new firm
    const firmData = await loadFirm(firmId);
    if (firmData) {
      setState({
        firmSettings: firmData.firmSettings,
        employees: firmData.employees,
        schedule: null,
        selectedMonth: firmData.selectedMonth,
        selectedYear: firmData.selectedYear,
      });
      setCurrentFirmId(firmId);
      await setConfig({ lastFirmId: firmId });
    }

    setIsLoading(false);
  };

  // Create a new firm
  const createFirm = async (name?: string): Promise<string> => {
    // Save current firm before creating new one
    if (currentFirmId) {
      await saveCurrentFirm(currentFirmId, state);
    }

    const newFirm = createNewFirm();
    if (name) {
      newFirm.firmSettings.firmName = name;
    }

    await saveFirm(newFirm);
    await refreshFirmsList();

    // Switch to new firm
    setState({
      firmSettings: newFirm.firmSettings,
      employees: newFirm.employees,
      schedule: null,
      selectedMonth: newFirm.selectedMonth,
      selectedYear: newFirm.selectedYear,
    });
    setCurrentFirmId(newFirm.id);
    await setConfig({ lastFirmId: newFirm.id });

    return newFirm.id;
  };

  // Delete a firm
  const deleteFirmHandler = async (firmId: string) => {
    await deleteFirmFromStorage(firmId);
    const updatedFirms = await refreshFirmsList();

    // If we deleted the current firm, switch to another or create new
    if (firmId === currentFirmId) {
      if (updatedFirms.length > 0) {
        await switchFirm(updatedFirms[0].id);
      } else {
        // Create a new firm if none exist
        await createFirm();
      }
    }
  };

  // Rename a firm
  const renameFirm = async (firmId: string, newName: string) => {
    const firmData = await loadFirm(firmId);
    if (firmData) {
      firmData.firmSettings.firmName = newName;
      await saveFirm(firmData);
      await refreshFirmsList();

      // Update local state if this is the current firm
      if (firmId === currentFirmId) {
        setState(prev => ({
          ...prev,
          firmSettings: { ...prev.firmSettings, firmName: newName },
        }));
      }
    }
  };

  // Export current firm
  const exportCurrentFirm = () => {
    if (!currentFirmId) return;

    const firmData: SavedFirmData = {
      id: currentFirmId,
      firmSettings: state.firmSettings,
      employees: state.employees,
      selectedMonth: state.selectedMonth,
      selectedYear: state.selectedYear,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    exportFirmToJson(firmData);
  };

  // Import firm from file
  const importFirm = async (file: File): Promise<string> => {
    const importedFirm = await importFirmFromJson(file);
    await saveFirm(importedFirm);
    await refreshFirmsList();
    await switchFirm(importedFirm.id);
    return importedFirm.id;
  };

  // State setters
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
        currentFirmId,
        firmsList,
        isLoading,
        switchFirm,
        createFirm,
        deleteFirm: deleteFirmHandler,
        renameFirm,
        refreshFirmsList,
        exportCurrentFirm,
        importFirm,
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
