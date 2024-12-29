// hooks/usePagination.js
import { useState, useMemo } from 'react';

export function usePagination(items, itemsPerPage = 9) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const paginatedItems = items.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    return {
      totalPages,
      paginatedItems,
      hasPrevious: currentPage > 1,
      hasNext: currentPage < totalPages,
    };
  }, [items, currentPage, itemsPerPage]);

  return {
    currentPage,
    setCurrentPage,
    ...paginationData,
  };
}