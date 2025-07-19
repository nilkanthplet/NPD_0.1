import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeStock() {
  const [stockUpdates, setStockUpdates] = useState<any[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const stockChannel = supabase
      .channel('stock-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_items',
        },
        (payload) => {
          setStockUpdates(prev => [...prev, payload]);
        }
      )
      .subscribe();

    setChannel(stockChannel);

    return () => {
      if (stockChannel) {
        supabase.removeChannel(stockChannel);
      }
    };
  }, []);

  return { stockUpdates, channel };
}

export function useRealtimeRentals() {
  const [rentalUpdates, setRentalUpdates] = useState<any[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const rentalChannel = supabase
      .channel('rental-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rentals',
        },
        (payload) => {
          setRentalUpdates(prev => [...prev, payload]);
        }
      )
      .subscribe();

    setChannel(rentalChannel);

    return () => {
      if (rentalChannel) {
        supabase.removeChannel(rentalChannel);
      }
    };
  }, []);

  return { rentalUpdates, channel };
}