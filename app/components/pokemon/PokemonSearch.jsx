import React, { useState, useCallback } from 'react';
import { BlockStack, Text, Box, Pagination } from "@shopify/polaris";
import { ApiSearch } from '../common/ApiSearch';
import { ResultsGrid } from '../common/ResultsGrid';
import { ProductCard } from '../common/ProductCard';
import { useApiSearch } from '../../hooks/useApiSearch';
import { useProductImport } from '../../hooks/useProductImport';
import { usePagination } from '../../hooks/usePagination';

// Utility functions
const sanitizeNumber = (value) => {
  if (!value) return '';
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? '' : parsed.toString();
};

export function PokemonSearch() {
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
        title: `Pokémon TCG | ${card.name} | ${card.set?.name} / ${card.number}`,
        image: card.images?.small,
        description: `${card.name} - ${card.rarity || 'Unknown'} Pokemon Card from ${card.set?.name} Set`,
        set: card.set?.name,
        rarity: card.rarity,
        details: {
          number: card.number,
          series: card.set?.series,
          printedTotal: card.set?.printedTotal,
          releaseDate: card.set?.releaseDate
        },
        hp: sanitizeNumber(card.hp),
        types: Array.isArray(card.types) ? card.types : [],
        artist: card.artist,
        tcgplayer: card.tcgplayer,
        // Default price will be automatically handled by the ProductCard
        price: card.cardmarket?.prices?.averageSellPrice || 0
      })).filter(card => card.title && card.set);
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

  const {
    currentPage,
    paginatedItems,
    hasPrevious,
    hasNext,
    setCurrentPage,
    totalPages
  } = usePagination(results);

  const {
    handleImport,
    isImporting,
    getImportStatus
  } = useProductImport();

  const renderCustomFields = useCallback((item) => (
    <BlockStack gap="200">
      <Text variant="bodySm">Set: {item.set || 'N/A'}</Text>
      <Text variant="bodsSm">Rarity: {item.rarity || 'N/A'}</Text>
      <Text variant="bodySm">Types: {item.types?.join(', ') || 'N/A'}</Text>
      <Text variant="bodySm">Artist: {item.artist || 'N/A'}</Text>
      <Text variant="bodySm">Card Number: {item.details.number || 'N/A'}/{item.details.printedTotal || 'N/A'}</Text>
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
                renderCustomFields={renderCustomFields}
                isImporting={isImporting(item.id)}
                importSuccess={getImportStatus(item.id)?.success}
                importError={getImportStatus(item.id)?.error}
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