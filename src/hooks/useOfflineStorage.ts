import { useState, useEffect } from 'react';

interface OfflineData {
  rentals: any[];
  clients: any[];
  stockCategories: any[];
  lastSync: string;
}

export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline data from localStorage
    const stored = localStorage.getItem('rental-offline-data');
    if (stored) {
      try {
        setOfflineData(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing offline data:', error);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveOfflineData = (data: Partial<OfflineData>) => {
    const updated = {
      ...offlineData,
      ...data,
      lastSync: new Date().toISOString(),
    };
    setOfflineData(updated);
    localStorage.setItem('rental-offline-data', JSON.stringify(updated));
  };

  const clearOfflineData = () => {
    setOfflineData(null);
    localStorage.removeItem('rental-offline-data');
  };

  const syncOfflineData = async () => {
    // Implementation for syncing offline data when back online
    if (isOnline && offlineData) {
      try {
        // Sync logic here
        console.log('Syncing offline data...');
        clearOfflineData();
      } catch (error) {
        console.error('Error syncing offline data:', error);
      }
    }
  };

  return {
    isOnline,
    offlineData,
    saveOfflineData,
    clearOfflineData,
    syncOfflineData,
  };
}