import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@herenow/recent-statuses';
const MAX_RECENT = 5;

export async function getRecentStatuses(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

export async function addRecentStatus(status: string): Promise<void> {
  const existing = await getRecentStatuses();
  const deduped = existing.filter((s) => s !== status);
  const updated = [status, ...deduped].slice(0, MAX_RECENT);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
