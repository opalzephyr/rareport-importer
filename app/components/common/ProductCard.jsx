// components/common/ProductCard.jsx
import React from 'react';
import { Card, BlockStack, Box, Text, Banner, Button } from "@shopify/polaris";

export function ProductCard({ 
  item, 
  onImport, 
  renderCustomFields,
  isImporting,
  importSuccess,
  importError,
  priceTypeSelect 
}) {
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
            
            {/* Price Type Select if provided */}
            {priceTypeSelect && (
              <Box paddingBlockStart="400">
                {priceTypeSelect}
              </Box>
            )}
          </BlockStack>

          {/* Import Button & Status */}
          <Box>
            <Button
              onClick={() => onImport(item)}
              loading={isImporting}
              disabled={isImporting}
            >
              Import as Product
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