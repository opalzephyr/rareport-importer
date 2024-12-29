// app/components/pokemon/PokemonSearch.jsx
import React, { useState, useCallback } from 'react';
import { useFetcher } from "@remix-run/react";
import {
  TextField,
  Button,
  BlockStack,
  Box,
  Text,
  Banner,
  Card,
} from "@shopify/polaris";

export function PokemonSearch() {
  const fetcher = useFetcher();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [importingId, setImportingId] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    setError('');
  }, []);

  const searchPokemonCards = async (query) => {
    try {
      const response = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=name:"${query}*"&pageSize=10&orderBy=-set.releaseDate`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch Pokemon cards');
      }

      const data = await response.json();
      
      return data.data.map(card => ({
        id: card.id,
        title: card.name,
        set: card.set.name,
        price: card.cardmarket?.prices?.averageSellPrice || 'Price not available',
        image: card.images.small,
        rarity: card.rarity,
        details: {
          number: card.number,
          series: card.set.series,
          printedTotal: card.set.printedTotal,
          releaseDate: card.set.releaseDate
        },
        description: `${card.name} - ${card.rarity} Pokemon Card from ${card.set.name} Set`,
        vendor: 'Pokemon TCG',
        type: 'Trading Card',
        cardNumber: card.number,
        setName: card.set.name,
      }));
    } catch (err) {
      console.error('Pokemon API Error:', err);
      throw new Error('Failed to fetch Pokemon cards');
    }
  };

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsLoading(true);
    setError('');
    setResults([]);
    setImportSuccess(null);

    try {
      const searchResults = await searchPokemonCards(searchTerm);
      setResults(searchResults);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  const handleImport = useCallback((item) => {
    setImportingId(item.id);
    setImportSuccess(null);

    fetcher.submit(
      {
        title: item.title,
        description: item.description,
        vendor: item.vendor,
        productType: item.type,
        price: typeof item.price === 'number' ? item.price.toFixed(2) : '0.00',
        cardNumber: item.cardNumber,
        setName: item.setName,
        rarity: item.rarity,
        imageUrl: item.image,
      },
      { method: 'POST' }
    );
  }, [fetcher]);

  React.useEffect(() => {
    if (fetcher.data && importingId) {
      setImportSuccess({
        id: importingId,
        success: !fetcher.data.error,
        message: fetcher.data.error || 'Product successfully imported!'
      });
      setImportingId(null);
    }
  }, [fetcher.data, importingId]);

  const renderCardDetails = (item) => (
    <Box padding="400">
      <BlockStack gap="400">
        <Box>
          <img 
            src={item.image} 
            alt={item.title}
            style={{ width: '100%', maxWidth: '250px' }}
          />
        </Box>
        <BlockStack gap="200">
          <Text variant="headingMd" as="h3">{item.title}</Text>
          <Text variant="bodySm">Set: {item.set}</Text>
          <Text variant="bodySm">Rarity: {item.rarity}</Text>
          <Text variant="bodySm">
            Price: {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : item.price}
          </Text>
          <Text variant="bodySm">Card Number: {item.details.number}/{item.details.printedTotal}</Text>
          <Text variant="bodySm">Series: {item.details.series}</Text>
          <Text variant="bodySm">Release Date: {item.details.releaseDate}</Text>
        </BlockStack>
        <Box>
          <Button
            onClick={() => handleImport(item)}
            loading={importingId === item.id}
            disabled={importingId !== null}
          >
            Import as Product
          </Button>
          {importSuccess?.id === item.id && (
            <Box paddingBlockStart="300">
              <Banner status={importSuccess.success ? 'success' : 'critical'}>
                <p>{importSuccess.message}</p>
              </Banner>
            </Box>
          )}
        </Box>
      </BlockStack>
    </Box>
  );

  return (
    <BlockStack gap="400">
      <TextField
        label="Search Term"
        value={searchTerm}
        onChange={handleSearchChange}
        autoComplete="off"
        placeholder="Enter card name..."
        clearButton
        onClearButtonClick={() => setSearchTerm('')}
      />

      <Button onClick={handleSearch} loading={isLoading} primary>
        Search
      </Button>

      {error && (
        <Banner status="critical">
          <p>{error}</p>
        </Banner>
      )}

      {isLoading ? (
        <Text>Loading...</Text>
      ) : results.length > 0 ? (
        <BlockStack gap="400">
          {results.map((item) => (
            <Card key={item.id}>
              {renderCardDetails(item)}
            </Card>
          ))}
        </BlockStack>
      ) : searchTerm && !error && !isLoading ? (
        <Banner>No results found</Banner>
      ) : null}
    </BlockStack>
  );
}