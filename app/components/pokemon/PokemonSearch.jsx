// components/pokemon/PokemonSearch.jsx
import React, { useState, useCallback } from 'react';
import { BlockStack, Text, Box, Select, Pagination } from "@shopify/polaris";
import { ApiSearch } from '../common/ApiSearch';
import { ResultsGrid } from '../common/ResultsGrid';
import { ProductCard } from '../common/ProductCard';
import { useApiSearch } from '../../hooks/useApiSearch';
import { useProductImport } from '../../hooks/useProductImport';
import { usePagination } from '../../hooks/usePagination';

export function PokemonSearch() {
  const [selectedPriceTypes, setSelectedPriceTypes] = useState({});
  
  // Initialize search functionality
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

  const { 
    isLoading, 
    results, 
    handleSearch 
  } = useApiSearch(searchPokemonCards);

  // Initialize pagination
  const {
    currentPage,
    paginatedItems,
    hasPrevious,
    hasNext,
    setCurrentPage,
    totalPages
  } = usePagination(results);

  // Initialize product import functionality
  const transformFormData = (item) => ({
    title: `Pokémon TCG | ${item.title} | ${item.setName} / ${item.cardNumber}`,
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
  });

  const {
    handleImport,
    isImporting,
    getImportStatus
  } = useProductImport(transformFormData);

  // Render price type select for TCGPlayer prices
  const renderPriceTypeSelect = useCallback((item) => {
    if (!item.tcgplayer?.prices) {
      return null;
    }

    const priceTypes = Object.keys(item.tcgplayer.prices);
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
  }, [selectedPriceTypes]);

  // Render custom fields for Pokemon cards
  const renderPokemonFields = useCallback((item) => (
    <BlockStack gap="200">
      <Text variant="bodySm">Set: {item.set}</Text>
      <Text variant="bodySm">Rarity: {item.rarity}</Text>
      <Text variant="bodySm">Types: {item.types?.join(', ') || 'N/A'}</Text>
      <Text variant="bodySm">Artist: {item.artist || 'N/A'}</Text>
      <Text variant="bodySm">Card Number: {item.details.number}/{item.details.printedTotal}</Text>
    </BlockStack>
  ), []);

  return (
    <BlockStack gap="400">
      <ApiSearch 
        onSearch={handleSearch}
        loading={isLoading}
        placeholder="Enter Pokemon card name..."
      />

      {paginatedItems.length > 0 && (
        <BlockStack gap="400">
          <ResultsGrid>
            {paginatedItems.map(item => (
              <ProductCard
                key={item.id}
                item={item}
                onImport={handleImport}
                renderCustomFields={renderPokemonFields}
                isImporting={isImporting(item.id)}
                importSuccess={getImportStatus(item.id)?.success}
                importError={getImportStatus(item.id)?.error}
                priceTypeSelect={renderPriceTypeSelect(item)}
              />
            ))}
          </ResultsGrid>
          
          {totalPages > 1 && (
            <Box padding="400">
              <Pagination
                label={`Page ${currentPage} of ${totalPages}`}
                hasPrevious={hasPrevious}
                onPrevious={() => setCurrentPage(currentPage - 1)}
                hasNext={hasNext}
                onNext={() => setCurrentPage(currentPage + 1)}
              />
            </Box>
          )}
        </BlockStack>
      )}
    </BlockStack>
  );
}