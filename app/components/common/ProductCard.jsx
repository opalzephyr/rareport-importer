import React, { useState } from 'react';
import { Card, BlockStack, Box, Text, Banner, Button, InlineStack } from "@shopify/polaris";

export function ProductCard({ 
  item, 
  onImport, 
  renderCustomFields,
  isImporting,
  importSuccess,
  importError
}) {
  const [selectedPriceType, setSelectedPriceType] = useState(null);
  
  // Process TCGPlayer prices to get available options
  const getPriceOptions = () => {
    if (!item.tcgplayer?.prices) return [];
    
    return Object.entries(item.tcgplayer.prices)
      .filter(([_, priceData]) => priceData?.market > 0)
      .map(([type, priceData]) => ({
        type,
        price: priceData.market,
        display: type.replace(/([A-Z])/g, ' $1').trim() // Add spaces before capital letters
      }))
      .sort((a, b) => b.price - a.price); // Sort by price descending
  };

  const priceOptions = getPriceOptions();

  const handleImport = () => {
    const importData = {
      ...item,
      selectedPrice: selectedPriceType ? 
        item.tcgplayer.prices[selectedPriceType].market : 
        item.price
    };
    onImport(importData);
  };

  return (
    <Card>
      <Box padding="400">
        <BlockStack gap="400">
          {/* Image */}
          <Box>
            <img 
              src={item.image} 
              alt={item.title}
              style={{ width: '100%', maxWidth: '250px' }}
            />
          </Box>

          {/* Details */}
          <BlockStack gap="200">
            <Text variant="headingMd" as="h3">{item.title}</Text>
            {renderCustomFields?.(item)}
          </BlockStack>

          {/* Price Selection */}
          {priceOptions.length > 0 && (
            <BlockStack gap="200">
              <Text variant="headingSm" as="h4">Select Price Point:</Text>
              <Box
                background="bg-surface-secondary"
                padding="300"
                borderRadius="200"
              >
                <BlockStack gap="200">
                  {priceOptions.map(({ type, price, display }) => (
                    <Button
                      key={type}
                      onClick={() => setSelectedPriceType(type)}
                      pressed={selectedPriceType === type}
                      fullWidth
                      textAlign="left"
                    >
                      <InlineStack gap="200" align="space-between">
                        <Text variant="bodyMd">{display}</Text>
                        <Text variant="bodyMd" color="success">
                          ${price.toFixed(2)}
                        </Text>
                      </InlineStack>
                    </Button>
                  ))}
                </BlockStack>
              </Box>
            </BlockStack>
          )}

          {/* Import Button & Status */}
          <Box>
            <Button
              onClick={handleImport}
              loading={isImporting}
              disabled={isImporting || (priceOptions.length > 0 && !selectedPriceType)}
              primary
              fullWidth
            >
              {priceOptions.length > 0 && !selectedPriceType 
                ? "Select a Price Option" 
                : "Import as Product"}
            </Button>

            {(importSuccess || importError) && (
              <Box paddingBlockStart="300">
                <Banner status={importError ? 'critical' : 'success'}>
                  <Text>{importError || importSuccess}</Text>
                </Banner>
              </Box>
            )}
          </Box>
        </BlockStack>
      </Box>
    </Card>
  );
}