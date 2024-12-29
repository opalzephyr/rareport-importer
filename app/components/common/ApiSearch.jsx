// components/common/ApiSearch.jsx
import React, { useState, useCallback } from 'react';
import { TextField, Button, BlockStack, Banner } from "@shopify/polaris";

export function ApiSearch({ onSearch, placeholder = "Search...", loading = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }
    setError('');
    try {
      await onSearch(searchTerm);
    } catch (err) {
      setError(err.message);
    }
  }, [searchTerm, onSearch]);

  return (
    <BlockStack gap="400">
      <TextField
        label="Search Term"
        value={searchTerm}
        onChange={setSearchTerm}
        autoComplete="off"
        placeholder={placeholder}
        clearButton
        onClearButtonClick={() => setSearchTerm('')}
      />

      <Button onClick={handleSearch} loading={loading} primary>
        Search
      </Button>

      {error && (
        <Banner status="critical">
          <p>{error}</p>
        </Banner>
      )}
    </BlockStack>
  );
}