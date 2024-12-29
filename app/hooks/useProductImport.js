// hooks/useProductImport.js
import { useState, useCallback, useEffect } from 'react';
import { useFetcher } from "@remix-run/react";

export function useProductImport(transformData) {
  const fetcher = useFetcher();
  const [importingId, setImportingId] = useState(null);
  const [importStatus, setImportStatus] = useState({});

  const handleImport = useCallback((item) => {
    setImportingId(item.id);
    setImportStatus(prev => ({ 
      ...prev, 
      [item.id]: { loading: true } 
    }));

    // Transform the data using the provided transformer function
    const formData = transformData ? transformData(item) : item;
    fetcher.submit(formData, { method: 'POST' });
  }, [fetcher, transformData]);

  // Handle import response
  useEffect(() => {
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

  // Check if a specific item is currently being imported
  const isImporting = useCallback((itemId) => {
    return importingId === itemId;
  }, [importingId]);

  // Get the import status for a specific item
  const getImportStatus = useCallback((itemId) => {
    return importStatus[itemId] || {};
  }, [importStatus]);

  return {
    importingId,
    importStatus,
    handleImport,
    isImporting,
    getImportStatus,
    reset: () => {
      setImportingId(null);
      setImportStatus({});
    }
  };
}