// components/pokemon/PokemonSearch.jsx
import React, { useState, useCallback } from 'react';
import { BlockStack, Text, Box, Select, Pagination } from "@shopify/polaris";
import { ApiSearch } from '../common/ApiSearch';
import { ResultsGrid } from '../common/ResultsGrid';
import { ProductCard } from '../common/ProductCard';
import { useApiSearch } from '../../hooks/useApiSearch';
import { useProductImport } from '../../hooks/useProductImport';
import { usePagination } from '../../hooks/usePagination';

// Utility functions for data validation and transformation
const sanitizeNumber = (value) => {
  if (!value) return '';
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? '' : parsed.toString();
};

const getCardPrice = (card) => {
  let price = 0;
  
  // Try TCGPlayer prices first
  if (card.tcgplayer?.prices) {
    const prices = card.tcgplayer.prices;
    // Priority order: holofoil > normal > reverseHolofoil > firstEdition
    price = prices.holofoil?.market || 
            prices.normal?.market || 
            prices.reverseHolofoil?.market || 
            prices.firstEdition?.market || 0;
  }
  
  // Fallback to CardMarket if TCGPlayer price is 0
  if (price === 0 && card.cardmarket?.prices?.averageSellPrice) {
    price = card.cardmarket.prices.averageSellPrice;
  }
  
  return price;
};

export function PokemonSearch() {
  const [selectedPriceTypes, setSelectedPriceTypes] = useState({});
  
  // Enhanced Pokemon card search with proper data validation
  const searchPokemonCards = async (query) => {
    try {
      const response = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=name:"${query}*"&pageSize=100&orderBy=-set.releaseDate`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch Pokemon cards');
      }

      const data = await response.json();
      console.log("API Response:", data);
      
      return data.data.map(card => {
        // Validate and transform card data
        const cardPrice = getCardPrice(card);
        
        return {
          id: card.id || '',
          title: card.name || '',
          set: card.set?.name || '',
          image: card.images?.small || '',
          rarity: card.rarity || '',
          details: {
            number: card.number || '',
            series: card.set?.series || '',
            printedTotal: card.set?.printedTotal || '',
            releaseDate: card.set?.releaseDate || ''
          },
          hp: sanitizeNumber(card.hp),
          types: Array.isArray(card.types) ? card.types : [],
          artist: card.artist || '',
          tcgplayer: card.tcgplayer || null,
          description: `${card.name || 'Unknown'} - ${card.rarity || 'Unknown'} Pokemon Card from ${card.set?.name || 'Unknown'} Set`,
          vendor: 'Pokemon TCG',
          type: 'Trading Card',
          cardNumber: sanitizeNumber(card.number),
          setName: card.set?.name || '',
          price: cardPrice,
          // Store raw pricing data for price type selection
          priceData: {
            tcgplayer: card.tcgplayer?.prices || null,
            cardmarket: card.cardmarket?.prices || null
          }
        };
      }).filter(card => card.title && card.setName); // Filter out cards with missing required data
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

  // Enhanced form data transformation with validation
  const transformFormData = useCallback((item) => {
    // Validate required fields
    if (!item.title || !item.setName || !item.cardNumber) {
      throw new Error('Missing required card information');
    }

    const selectedPriceType = selectedPriceTypes[item.id];
    let finalPrice = item.price;

    // Update price based on selected price type if available
    if (selectedPriceType && item.priceData?.tcgplayer?.[selectedPriceType]?.market) {
      finalPrice = item.priceData.tcgplayer[selectedPriceType].market;
    }

    return {
      title: `Pokémon TCG | ${item.title} | ${item.setName} / ${item.cardNumber}`,
      description: item.description || '',
      vendor: item.vendor || 'Pokemon TCG',
      productType: item.type || 'Trading Card',
      cardNumber: item.cardNumber,
      setName: item.setName,
      rarity: item.rarity || '',
      imageUrl: item.image || '',
      hp: sanitizeNumber(item.hp),
      types: JSON.stringify(item.types || []),
      artist: item.artist || '',
      price: finalPrice || 0,
      tcgplayerUrl: item.tcgplayer?.url || '',
      tcgplayerPrices: JSON.stringify(item.priceData?.tcgplayer || {})
    };
  }, [selectedPriceTypes]);

  const {
    handleImport,
    isImporting,
    getImportStatus
  } = useProductImport(transformFormData);

  // Enhanced price type select with validation
  const renderPriceTypeSelect = useCallback((item) => {
    if (!item.priceData?.tcgplayer) {
      return null;
    }

    const priceTypes = Object.keys(item.priceData.tcgplayer).filter(type => 
      item.priceData.tcgplayer[type]?.market
    );

    if (priceTypes.length === 0) {
      return null;
    }

    const options = priceTypes.map(type => ({
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} - $${item.priceData.tcgplayer[type].market.toFixed(2)}`,
      value: type
    }));

    return (
      <Select
        label="Card Type & Price"
        options={options}
        onChange={(value) => setSelectedPriceTypes(prev => ({ ...prev, [item.id]: value }))}
        value={selectedPriceTypes[item.id] || ''}
      />
    );
  }, [selectedPriceTypes]);

  // Enhanced custom fields display
  const renderPokemonFields = useCallback((item) => (
    <BlockStack gap="200">
      <Text variant="bodySm">Set: {item.set || 'N/A'}</Text>
      <Text variant="bodsSm">Rarity: {item.rarity || 'N/A'}</Text>
      <Text variant="bodySm">Types: {item.types?.join(', ') || 'N/A'}</Text>
      <Text variant="bodySm">Artist: {item.artist || 'N/A'}</Text>
      <Text variant="bodySm">Card Number: {item.details.number || 'N/A'}/{item.details.printedTotal || 'N/A'}</Text>
      <Text variant="bodySm">Base Price: ${item.price.toFixed(2)}</Text>
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