import { useQuery } from '@tanstack/react-query';
import { protalkDb } from '@/integrations/protalk/client';

interface City {
  id: string;
  name: string;
  avg_salary: number | null;
}

export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async (): Promise<City[]> => {
      const { data, error } = await protalkDb
        .from('sav_cities')
        .select('id, name, avg_salary')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching cities:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 60,
  });
}

export async function syncCities(): Promise<{ synced: number; errors: number }> {
  const { data, error } = await protalkDb.functions.invoke('sav-sync-cities');

  if (error) {
    console.error('Error syncing cities:', error);
    throw error;
  }

  return data;
}
