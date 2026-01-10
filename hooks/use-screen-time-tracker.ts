import { useRef, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ScreenTimeTrackerOptions {
  userId: string | undefined;
  contentSlug: string;
  saveIntervalMs?: number;
  onSave?: (timeSeconds: number) => Promise<void>;
}

interface ScreenTimeState {
  accumulatedSeconds: number;
  lastSaveTime: number;
}

const STORAGE_KEY_PREFIX = 'lesson_time_';

export function useScreenTimeTracker({
  userId,
  contentSlug,
  saveIntervalMs = 30000,
  onSave,
}: ScreenTimeTrackerOptions) {
  const startTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSavingRef = useRef<boolean>(false);

  const storageKey = `${STORAGE_KEY_PREFIX}${userId}_${contentSlug}`;

  // Load any unsaved time from previous session (crash recovery)
  useEffect(() => {
    const loadUnsavedTime = async () => {
      if (!userId) return;

      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const state: ScreenTimeState = JSON.parse(stored);
          accumulatedTimeRef.current = state.accumulatedSeconds;
          console.log(`Recovered ${state.accumulatedSeconds}s for lesson ${contentSlug}`);
        }
      } catch (error) {
        console.error('Failed to load unsaved time:', error);
      }
    };

    loadUnsavedTime();
  }, [userId, storageKey, contentSlug]);

  // Save time to local storage (for crash recovery)
  const saveToLocalStorage = useCallback(async () => {
    if (!userId) return;

    try {
      const state: ScreenTimeState = {
        accumulatedSeconds: accumulatedTimeRef.current,
        lastSaveTime: Date.now(),
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save time to storage:', error);
    }
  }, [userId, storageKey]);

  // Save time to server
  const saveToServer = useCallback(async () => {
    if (!userId || !onSave || isSavingRef.current) return;

    const timeToSave = accumulatedTimeRef.current;
    if (timeToSave <= 0) return;

    isSavingRef.current = true;

    try {
      await onSave(timeToSave);
      accumulatedTimeRef.current = 0;
      await AsyncStorage.removeItem(storageKey);
      console.log(`Saved ${timeToSave}s for lesson ${contentSlug}`);
    } catch (error) {
      console.error('Failed to save time to server:', error);
      // Keep local storage for retry
      await saveToLocalStorage();
    } finally {
      isSavingRef.current = false;
    }
  }, [userId, onSave, storageKey, saveToLocalStorage, contentSlug]);

  // Start tracking
  const startTracking = useCallback(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
  }, []);

  // Pause tracking and accumulate time
  const pauseTracking = useCallback(() => {
    if (startTimeRef.current !== null) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      accumulatedTimeRef.current += elapsed;
      startTimeRef.current = null;
      saveToLocalStorage();
    }
  }, [saveToLocalStorage]);

  // Handle AppState changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // Going to background - pause tracking
        pauseTracking();
      } else if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Coming to foreground - resume tracking
        startTracking();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [pauseTracking, startTracking]);

  // Start tracking on mount
  useEffect(() => {
    if (userId) {
      startTracking();
    }

    return () => {
      pauseTracking();
    };
  }, [userId, startTracking, pauseTracking]);

  // Periodic save interval
  useEffect(() => {
    if (!userId || !onSave) return;

    intervalRef.current = setInterval(async () => {
      // Calculate current session time
      if (startTimeRef.current !== null) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const totalTime = accumulatedTimeRef.current + elapsed;

        // Only save if we have meaningful time (> 5 seconds)
        if (totalTime > 5 && !isSavingRef.current) {
          // Temporarily pause to accumulate
          pauseTracking();
          await saveToServer();
          // Resume tracking after save
          startTracking();
        }
      }
    }, saveIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId, onSave, saveIntervalMs, pauseTracking, saveToServer, startTracking]);

  // Get total accumulated time (including current session)
  const getTotalTime = useCallback(() => {
    let total = accumulatedTimeRef.current;
    if (startTimeRef.current !== null) {
      total += Math.floor((Date.now() - startTimeRef.current) / 1000);
    }
    return total;
  }, []);

  // Force save (call on unmount or completion)
  const forceSave = useCallback(async () => {
    pauseTracking();
    await saveToServer();
  }, [pauseTracking, saveToServer]);

  return {
    getTotalTime,
    forceSave,
    pauseTracking,
    startTracking,
  };
}
