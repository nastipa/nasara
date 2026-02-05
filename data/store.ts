// data/store.ts
export type Item = {
  id: string;
  title: string;
  price: string;
};

export const items: Item[] = [];

export function addItem(title: string, price: string) {
  items.unshift({
    id: Date.now().toString(),
    title,
    price,
  });
}
