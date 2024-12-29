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
  Grid,
  Pagination,
  Select
} from "@shopify/polaris";

export function PokemonSearch() {
  const fetcher = useFetcher();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriceTypes, setSelectedPriceTypes] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [importingId, setImportingId] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // Changed to 9 items per page

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    setError('');
  }, []);

  const searchPokemonCards = async (query) => {
    try {
      const response = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=name:"${query}*"&pageSize=100&orderBy=-set.releaseDate`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch Pokemon cards');
      }

      const data = await response.json();
      
      return data.data.map(card => ({
        id: card.id,
        title: card.name,
        set: card.set.name,
        image: card.images.small,
        rarity: card.rarity,
        details: {
          number: card.number,
          series: card.set.series,
          printedTotal: card.set.printedTotal,
          releaseDate: card.set.releaseDate
        },
        hp: card.hp,
        types: card.types || [],
        artist: card.artist,
        tcgplayer: card.tcgplayer || null,
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
    setCurrentPage(1);

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

    const formData = {
      title: item.title,
      description: item.description,
      vendor: item.vendor,
      productType: item.type,
      cardNumber: item.cardNumber,
      setName: item.setName,
      rarity: item.rarity,
      imageUrl: item.image,
      hp: item.hp,
      types: JSON.stringify(item.types),
      artist: item.artist,
      selectedPriceType: selectedPriceTypes[item.id],
      tcgplayerUrl: item.tcgplayer?.url,
      tcgplayerPrices: JSON.stringify(item.tcgplayer?.prices)
    };

    fetcher.submit(formData, { method: 'POST' });
  }, [fetcher, selectedPriceTypes]);

  React.useEffect(() => {
    if (fetcher.data && importingId) {
      setImportSuccess({
        id: importingId,
        success: !fetcher.data.error,
        message: fetcher.data.error || 'Product successfully imported!',
        productUrl: fetcher.data.productUrl
      });
      setImportingId(null);
    }
  }, [fetcher.data, importingId]);

  const renderPriceTypeSelect = (tcgplayer, item) => {
    if (!tcgplayer || !tcgplayer.prices) {
      return null;
    }

    const priceTypes = Object.keys(tcgplayer.prices);
    const options = priceTypes.map(type => ({
      label: type.charAt(0).toUpperCase() + type.slice(1),
      value: type
    }));

    return (
      <Select
        label="Card Type"
        options={options}
        onChange={(value) => setSelectedPriceTypes(prev => ({ ...prev, [item.id]: value }))}
        value={selectedPriceTypes[item.id] || ''}
      />
    );
  };

  const renderCardDetails = (item) => (
    <Card key={item.id}>
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
            <Text variant="bodySm">Types: {item.types?.join(', ') || 'N/A'}</Text>
            <Text variant="bodySm">Artist: {item.artist || 'N/A'}</Text>
            <Text variant="bodySm">Card Number: {item.details.number}/{item.details.printedTotal}</Text>
            
            {item.tcgplayer && (
              <Box paddingBlockStart="400">
                {renderPriceTypeSelect(item.tcgplayer, item)}
              </Box>
            )}
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
                  <BlockStack gap="200">
                    <Text>{importSuccess.message}</Text>
                    {importSuccess.success && importSuccess.productUrl && (
                      <Button
                        plain
                        external
                        url={importSuccess.productUrl}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(importSuccess.productUrl, '_blank');
                        }}
                      >
                        Edit Product →
                      </Button>
                    )}
                  </BlockStack>
                </Banner>
              </Box>
            )}
          </Box>
        </BlockStack>
      </Box>
    </Card>
  );

  // Calculate pagination
  const totalPages = Math.ceil(results.length / itemsPerPage);
  const paginatedResults = results.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
      ) : paginatedResults.length > 0 ? (
        <BlockStack gap="400">
          <Grid gap="400">
            {paginatedResults.map((item) => (
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }} key={item.id}>
                {renderCardDetails(item)}
              </Grid.Cell>
            ))}
          </Grid>
          
          {totalPages > 1 && (
            <Box paddingBlockStart="400">
              <Pagination
                label={`Page ${currentPage} of ${totalPages}`}
                hasPrevious={currentPage > 1}
                onPrevious={() => setCurrentPage(currentPage - 1)}
                hasNext={currentPage < totalPages}
                onNext={() => setCurrentPage(currentPage + 1)}
              />
            </Box>
          )}
        </BlockStack>
      ) : searchTerm && !error && !isLoading ? (
        <Banner>No results found</Banner>
      ) : null}
    </BlockStack>
  );
}