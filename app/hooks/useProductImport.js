// hooks/useProductImport.js
import { useState, useCallback, useEffect } from 'react';
import { useFetcher } from "@remix-run/react";

// Validation utilities
const validateFormData = (data) => {
  const requiredFields = ['title', 'setName', 'cardNumber'];
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  return true;
};

const sanitizeFormData = (data) => {
  // Helper to safely parse and stringify JSON fields
  const safeJsonStringify = (value) => {
    if (typeof value === 'string') {
      try {
        // Check if it's already a JSON string
        JSON.parse(value);
        return value;
      } catch {
        // Not a JSON string, stringify it
        return JSON.stringify(value);
      }
    }
    return JSON.stringify(value || []);
  };

  // Helper to sanitize numeric values
  const sanitizeNumber = (value, defaultValue = '0') => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num.toString();
  };

  return {
    title: (data.title || '').trim(),
    description: (data.description || '').trim(),
    vendor: (data.vendor || '').trim(),
    productType: (data.productType || 'Trading Card').trim(),
    cardNumber: (data.cardNumber || '').trim(),
    setName: (data.setName || '').trim(),
    rarity: (data.rarity || '').trim(),
    imageUrl: (data.imageUrl || '').trim(),
    hp: sanitizeNumber(data.hp, '0'),
    types: safeJsonStringify(data.types),
    artist: (data.artist || '').trim(),
    price: sanitizeNumber(data.price, '0'),
    tcgplayerUrl: (data.tcgplayerUrl || '').trim(),
    tcgplayerPrices: safeJsonStringify(data.tcgplayerPrices)
  };
};

export function useProductImport() {
  const fetcher = useFetcher();
  const [importingId, setImportingId] = useState(null);
  const [importStatus, setImportStatus] = useState({});
  const [errors, setErrors] = useState({});

  const handleImport = useCallback((item) => {
    console.log("Starting import with item:", item); // Log incoming item
    try {
      // Reset any previous errors
      setErrors({});

      // Validate the item data
      if (!item || !item.id) {
        throw new Error('Invalid item data');
      }

      setImportingId(item.id);
      setImportStatus(prev => ({
        ...prev,
        [item.id]: { loading: true }
      }));

      // Transform and validate the data
      const formData = new FormData();
      const validatedData = sanitizeFormData({
        title: item.title,
        description: item.description,
        vendor: item.vendor,
        productType: item.productType,
        cardNumber: item.cardNumber,
        setName: item.setName,
        rarity: item.rarity,
        imageUrl: item.imageUrl || item.image, // Support both formats
        hp: item.hp,
        types: item.types,
        artist: item.artist,
        price: item.price,
        tcgplayerUrl: item?.tcgplayer?.url,
        tcgplayerPrices: item?.tcgplayer?.prices
      });

      console.log("Validated data before submission:", validatedData); // Log processed data
      // Validate required fields
      validateFormData(validatedData);

      // Append validated data to FormData
      Object.entries(validatedData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Submit the form
      fetcher.submit(formData, { 
        method: 'post', 
        action: '/app/pokemon',
        encType: 'multipart/form-data'
      });

    } catch (err) {
      console.error('Import preparation error:', err);
      setErrors(prev => ({
        ...prev,
        [item.id]: err.message
      }));
      setImportStatus(prev => ({
        ...prev,
        [item.id]: {
          loading: false,
          success: false,
          error: err.message
        }
      }));
      setImportingId(null);
    }
  }, [fetcher]);

  // Handle import response
  useEffect(() => {
    if (fetcher.data && importingId) {
      setImportStatus(prev => ({
        ...prev,
        [importingId]: {
          loading: false,
          success: !fetcher.data.error,
          error: fetcher.data.error,
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

  // Get any errors for a specific item
  const getErrors = useCallback((itemId) => {
    return errors[itemId] || null;
  }, [errors]);

  return {
    importingId,
    importStatus,
    handleImport,
    isImporting,
    getImportStatus,
    getErrors,
    reset: () => {
      setImportingId(null);
      setImportStatus({});
      setErrors({});
    }
  };
}