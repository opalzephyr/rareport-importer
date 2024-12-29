// hooks/useApiSearch.js
import { useState, useCallback } from 'react';

export function useApiSearch(searchFunction) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearch = useCallback(async (searchTerm) => {
    setIsLoading(true);
    setError('');
    setResults([]);
    setCurrentPage(1);

    try {
      const searchResults = await searchFunction(searchTerm);
      setResults(searchResults);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [searchFunction]);

  return {
    isLoading,
    results,
    error,
    currentPage,
    setCurrentPage,
    handleSearch
  };
}

// hooks/useProductImport.js
import { useState, useCallback } from 'react';
import { useFetcher } from "@remix-run/react";

export function useProductImport() {
  const fetcher = useFetcher();
  const [importingId, setImportingId] = useState(null);
  const [importStatus, setImportStatus] = useState({});

  const handleImport = useCallback((item, formDataTransformer) => {
    setImportingId(item.id);
    setImportStatus(prev => ({ ...prev, [item.id]: { loading: true } }));

    const formData = formDataTransformer(item);
    fetcher.submit(formData, { method: 'POST' });
  }, [fetcher]);

  // Handle import response
  React.useEffect(() => {
    if (fetcher.data && importingId) {
      setImportStatus(prev => ({
        ...prev,
        [importingId]: {
          success: !fetcher.data.error,
          message: fetcher.data.error || 'Product successfully imported!',
          productUrl: fetcher.data.productUrl
        }
      }));
      setImportingId(null);
    }
  }, [fetcher.data, importingId]);

  return {
    importingId,
    importStatus,
    handleImport
  };
}

// hooks/usePagination.js
export function usePagination(items, itemsPerPage = 9) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages
  };
}