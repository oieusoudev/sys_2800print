import { useState, useEffect, useCallback } from 'react';
import { TimeEntry } from '@/types/api';
import { toast } from 'sonner';
import { timeEntryService } from '@/services/timeEntryService';

export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [todayEntry, setTodayEntry] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load today's entry from backend
  const getTodayEntryFromBackend = useCallback(async (): Promise<TimeEntry | null> => {
    setIsLoading(true);
    try {
      const entry = await timeEntryService.getTodayEntry();
      setTodayEntry(entry);
      return entry;
    } catch (error) {
      console.error('Error fetching today entry:', error);
      setTodayEntry(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load current month entries from backend
  const getCurrentMonthEntriesFromBackend = useCallback(async (): Promise<TimeEntry[]> => {
    setIsLoading(true);
    try {
      const entries = await timeEntryService.getCurrentMonthEntries();
      setEntries(entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      return entries;
    } catch (error) {
      console.error('Error fetching current month entries:', error);
      setEntries([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load initial data
  const loadData = useCallback(async () => {
    await getTodayEntryFromBackend();
    await getCurrentMonthEntriesFromBackend();
  }, [getTodayEntryFromBackend, getCurrentMonthEntriesFromBackend]);

  // Initialize data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for storage changes
  useEffect(() => {
    // No need for custom event listener as data is fetched from backend
    // and components will trigger refreshData when needed.
  }, []);

  return {
    entries,
    todayEntry,
    isLoading,
    refreshData: loadData
  };
}