import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DBFirm {
  id: string;
  user_id: string;
  name: string;
  owner_name: string;
  operating_hours_start: string;
  operating_hours_end: string;
  works_on_holidays: boolean;
  break_duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface DBPosition {
  id: string;
  firm_id: string;
  name: string;
  min_per_day: number;
  created_at: string;
}

export interface DBShift {
  id: string;
  firm_id: string;
  name: string;
  abbreviation: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface DBEmployee {
  id: string;
  firm_id: string;
  first_name: string;
  last_name: string;
  egn: string;
  position_id: string | null;
  contract_hours: number;
  is_minor: boolean;
  birth_date: string | null;
  created_at: string;
}

export function useFirms() {
  const { user } = useAuth();
  const [firms, setFirms] = useState<DBFirm[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFirms = useCallback(async () => {
    if (!user) {
      setFirms([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('firms')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setFirms((data as DBFirm[]) || []);
    } catch (err) {
      console.error('Error fetching firms:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFirms();
  }, [fetchFirms]);

  const createFirm = async (firm: Omit<DBFirm, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('firms')
      .insert({
        ...firm,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating firm:', error);
      return null;
    }

    await fetchFirms();
    return data as DBFirm;
  };

  const updateFirm = async (id: string, updates: Partial<DBFirm>) => {
    const { error } = await supabase
      .from('firms')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating firm:', error);
      return false;
    }

    await fetchFirms();
    return true;
  };

  const deleteFirm = async (id: string) => {
    const { error } = await supabase
      .from('firms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting firm:', error);
      return false;
    }

    await fetchFirms();
    return true;
  };

  return {
    firms,
    loading,
    createFirm,
    updateFirm,
    deleteFirm,
    refetch: fetchFirms,
  };
}

export function usePositions(firmId: string | null) {
  const [positions, setPositions] = useState<DBPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = useCallback(async () => {
    if (!firmId) {
      setPositions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('firm_id', firmId);

      if (error) throw error;
      setPositions((data as DBPosition[]) || []);
    } catch (err) {
      console.error('Error fetching positions:', err);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const createPosition = async (position: Omit<DBPosition, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('positions')
      .insert(position)
      .select()
      .single();

    if (error) {
      console.error('Error creating position:', error);
      return null;
    }

    await fetchPositions();
    return data as DBPosition;
  };

  const deletePosition = async (id: string) => {
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting position:', error);
      return false;
    }

    await fetchPositions();
    return true;
  };

  return { positions, loading, createPosition, deletePosition, refetch: fetchPositions };
}

export function useShifts(firmId: string | null) {
  const [shifts, setShifts] = useState<DBShift[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShifts = useCallback(async () => {
    if (!firmId) {
      setShifts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('firm_id', firmId);

      if (error) throw error;
      setShifts((data as DBShift[]) || []);
    } catch (err) {
      console.error('Error fetching shifts:', err);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const createShift = async (shift: Omit<DBShift, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('shifts')
      .insert(shift)
      .select()
      .single();

    if (error) {
      console.error('Error creating shift:', error);
      return null;
    }

    await fetchShifts();
    return data as DBShift;
  };

  const deleteShift = async (id: string) => {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting shift:', error);
      return false;
    }

    await fetchShifts();
    return true;
  };

  return { shifts, loading, createShift, deleteShift, refetch: fetchShifts };
}

export function useEmployees(firmId: string | null) {
  const [employees, setEmployees] = useState<DBEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    if (!firmId) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('firm_id', firmId);

      if (error) throw error;
      setEmployees((data as DBEmployee[]) || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const createEmployee = async (employee: Omit<DBEmployee, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('employees')
      .insert(employee)
      .select()
      .single();

    if (error) {
      console.error('Error creating employee:', error);
      return null;
    }

    await fetchEmployees();
    return data as DBEmployee;
  };

  const updateEmployee = async (id: string, updates: Partial<DBEmployee>) => {
    const { error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating employee:', error);
      return false;
    }

    await fetchEmployees();
    return true;
  };

  const deleteEmployee = async (id: string) => {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting employee:', error);
      return false;
    }

    await fetchEmployees();
    return true;
  };

  return { employees, loading, createEmployee, updateEmployee, deleteEmployee, refetch: fetchEmployees };
}
