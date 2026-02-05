import AsyncStorage from "@react-native-async-storage/async-storage";

export type Item = {
  id: string;
  title: string;
  price: string;
};

const STORAGE_KEY = "ITEMS";

export const getItems = async (): Promise<Item[]> => {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
};

export const saveItem = async (item: Item) => {
  const existing = await getItems();
  existing.push(item);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
};
