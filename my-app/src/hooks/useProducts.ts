import { useMemo } from "react";
import { staticProducts } from "@/data/products";

const CATEGORY_MAP: Record<string, string> = {
  "rau-la": "leaf",
  cu: "root",
  qua: "fruit",
  "rau-thom": "herb",
  nam: "mushroom",
};

export function useProducts(category: string = "all") {
  const products = useMemo(
    () => {
      const mappedCategory = CATEGORY_MAP[category] ?? category;
      return mappedCategory === "all" ? staticProducts : staticProducts.filter((product) => product.cat === mappedCategory);
    },
    [category],
  );

  return { products, loading: false, error: null };
}
