import type { Variant } from "./store";
export type EditableVariant = {
  id?: string;
  size: string;
  color: string;
  stock: number;
  version?: number;
};
export type VariantEdit = {
  id?: string;
  size: string;
  color: string;
  stock?: number;
  version?: number;
};
export function variantEdits(
  current: EditableVariant[],
  baseline: Variant[],
): VariantEdit[] {
  return current.map(({ id, size, color, stock }) => {
    const previous = id ? baseline.find((v) => v.id === id) : undefined;
    if (!previous) return { id, size, color, stock };
    return {
      id,
      size,
      color,
      ...(stock === previous.stock ? {} : { stock, version: previous.version }),
    };
  });
}
