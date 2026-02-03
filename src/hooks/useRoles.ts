import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'admin' | 'moderator' | 'user';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export function useRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserStatus = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setIsAdmin(false);
      setIsApproved(false);
      setLoading(false);
      return;
    }

    try {
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      const userRoles = (rolesData?.map(r => r.role) || []) as AppRole[];
      setRoles(userRoles);
      setIsAdmin(userRoles.includes('admin'));

      // Fetch approval status
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      setIsApproved(profileData?.is_approved || false);
    } catch (err) {
      console.error('Error fetching user status:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserStatus();
  }, [fetchUserStatus]);

  return {
    roles,
    isAdmin,
    isApproved,
    loading,
    refetch: fetchUserStatus,
  };
}

export function useAdminUsers() {
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!user) {
      setPendingUsers([]);
      setApprovedUsers([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const profiles = (data || []) as UserProfile[];
      setPendingUsers(profiles.filter(p => !p.is_approved));
      setApprovedUsers(profiles.filter(p => p.is_approved));
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const approveUser = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error approving user:', error);
      return false;
    }

    await fetchUsers();
    return true;
  };

  const revokeApproval = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: false })
      .eq('user_id', userId);

    if (error) {
      console.error('Error revoking approval:', error);
      return false;
    }

    await fetchUsers();
    return true;
  };

  return {
    pendingUsers,
    approvedUsers,
    loading,
    approveUser,
    revokeApproval,
    refetch: fetchUsers,
  };
}
