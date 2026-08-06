import React, { createContext, useContext, useState } from 'react';

type CategoryContextType = {
  activeCategory: string;
  setActiveCategory: (id: string) => void;
};

const CategoryContext = createContext<CategoryContextType>({
  activeCategory: 'all',
  setActiveCategory: () => {},
});

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [activeCategory, setActiveCategory] = useState('all');
  return (
    <CategoryContext.Provider value={{ activeCategory, setActiveCategory }}>
      {children}
    </CategoryContext.Provider>
  );
}

export const useCategory = () => useContext(CategoryContext);