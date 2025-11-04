"use client";

import React, { createContext, useState, useEffect, useContext } from 'react';
import { generateUID } from '@/lib/utils';

interface UserContextType {
  userId: string | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType>({
  userId: null,
  isLoading: true,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let storedUserId = localStorage.getItem('fluxopro-userid');
    if (!storedUserId) {
      storedUserId = generateUID();
      localStorage.setItem('fluxopro-userid', storedUserId);
    }
    setUserId(storedUserId);
    document.cookie = `fluxopro-userid=${storedUserId}; path=/; max-age=31536000; SameSite=Lax`;
    setIsLoading(false);
  }, []);

  return (
    <UserContext.Provider value={{ userId, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
