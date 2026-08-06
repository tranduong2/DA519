import { useEffect, useState } from "react";
import { getProducts, getProductsByCategory } from "@/services/api";
import { imageMap } from "@/data/products";

export function useProducts(category: string = "all") {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetcher = category === "all"
      ? getProducts()
      : getProductsByCategory(category);

    fetcher
      .then((data) => {
        const mapped = data.map((item: any) => ({
          ...item,
          id:    String(item.id),
          image: imageMap[item.imageUrl] ?? require("../assets/img5.jpg"),
        }));
        setProducts(mapped);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category]);

  return { products, loading, error };
}