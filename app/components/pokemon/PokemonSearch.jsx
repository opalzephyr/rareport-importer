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
  Select,
  DataTable
} from "@shopify/polaris";

export function PokemonSearch() {
  const fetcher = useFetcher();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriceType, setSelectedPriceType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [importingId, setImportingId] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
        price: card.cardmarket?.prices?.averageSellPrice || 'Price not available',
        image: card.images.small,
        rarity: card.rarity,
        details: {
          number: card.number,
          series: card.set.series,
          printedTotal: card.set.printedTotal,
          releaseDate: card.set.releaseDate
        },
        // Additional card details
        subtypes: card.subtypes || [],
        hp: card.hp,
        types: card.types || [],
        evolvesTo: card.evolvesTo || [],
        artist: card.artist,
        number: card.number,
        nationalPokedexNumbers: card.nationalPokedexNumbers,
        // TCGPlayer pricing data
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
        price: typeof item.price === 'number' ? item.price.toFixed(2) : '0.00',
        cardNumber: item.cardNumber,
        setName: item.setName,
        rarity: item.rarity,
        imageUrl: item.image,
        // Additional metadata
        subtypes: JSON.stringify(item.subtypes),
        hp: item.hp,
        types: JSON.stringify(item.types),
        evolvesTo: JSON.stringify(item.evolvesTo),
        artist: item.artist,
        nationalPokedexNumbers: JSON.stringify(item.nationalPokedexNumbers),
        // TCGPlayer data
        tcgplayerUrl: item.tcgplayer?.url,
        tcgplayerUpdatedAt: item.tcgplayer?.updatedAt,
        tcgplayerPrices: JSON.stringify(item.tcgplayer?.prices)
      };
  
      fetcher.submit(formData, { method: 'POST' });
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

  const renderPriceTable = (tcgplayer) => {
    if (!tcgplayer || !tcgplayer.prices) {
      return <Text>No price data available</Text>;
    }

    const priceTypes = Object.keys(tcgplayer.prices);
    const options = priceTypes.map(type => ({
      label: type.charAt(0).toUpperCase() + type.slice(1),
      value: type
    }));

    const selectedPrices = selectedPriceType && tcgplayer.prices[selectedPriceType];
    
    return (
      <BlockStack gap="300">
        <Select
          label="Price Type"
          options={options}
          onChange={setSelectedPriceType}
          value={selectedPriceType}
        />
        
        {selectedPrices && (
          <DataTable
            columnContentTypes={['text', 'numeric']}
            headings={['Price Type', 'Value']}
            rows={[
              ['Market', `$${selectedPrices.market?.toFixed(2) || 'N/A'}`],
              ['Low', `$${selectedPrices.low?.toFixed(2) || 'N/A'}`],
              ['Mid', `$${selectedPrices.mid?.toFixed(2) || 'N/A'}`],
              ['High', `$${selectedPrices.high?.toFixed(2) || 'N/A'}`],
              ['Direct Low', `$${selectedPrices.directLow?.toFixed(2) || 'N/A'}`]
            ]}
          />
        )}
        
        <Text variant="bodySm">
          Last Updated: {tcgplayer.updatedAt || 'N/A'}
        </Text>
      </BlockStack>
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
            <Text variant="bodySm">HP: {item.hp || 'N/A'}</Text>
            <Text variant="bodySm">Types: {item.types?.join(', ') || 'N/A'}</Text>
            <Text variant="bodySm">Artist: {item.artist || 'N/A'}</Text>
            <Text variant="bodySm">Card Number: {item.details.number}/{item.details.printedTotal}</Text>
            <Text variant="bodySm">Series: {item.details.series}</Text>
            <Text variant="bodySm">Release Date: {item.details.releaseDate}</Text>
            
            {item.tcgplayer && (
              <Box paddingBlockStart="400">
                <Text variant="headingMd">Pricing Information</Text>
                {renderPriceTable(item.tcgplayer)}
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
                  <p>{importSuccess.message}</p>
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
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 3, xl: 3 }} key={item.id}>
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