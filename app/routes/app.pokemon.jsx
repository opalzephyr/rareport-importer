// app/routes/app.pokemon.jsx
import { Page, Layout, Text, Card, BlockStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { ApiSearch } from "../components/common/ApiSearch";
import { ResultsGrid } from "../components/common/ResultsGrid";
import { ProductCard } from "../components/common/ProductCard";
import { useCallback, useState } from "react";
import { useProductImport } from "../hooks/useProductImport";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ ok: true });
};

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  
  try {
    const formData = await request.json();
    
    // Create the product in Shopify
    const response = await admin.graphql(
      `#graphql
        mutation productCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              handle
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          input: {
            title: formData.title,
            descriptionHtml: formData.description,
            vendor: formData.vendor,
            productType: formData.productType,
            images: [
              {
                src: formData.imageUrl,
                altText: formData.title
              }
            ],
            metafields: [
              {
                namespace: "pokemon",
                key: "card_number",
                value: formData.cardNumber,
                type: "single_line_text_field"
              },
              {
                namespace: "pokemon",
                key: "set_name",
                value: formData.setName,
                type: "single_line_text_field"
              },
              {
                namespace: "pokemon",
                key: "rarity",
                value: formData.rarity,
                type: "single_line_text_field"
              },
              {
                namespace: "pokemon",
                key: "types",
                value: formData.types,
                type: "multi_line_text_field"
              },
              {
                namespace: "pokemon",
                key: "artist",
                value: formData.artist,
                type: "single_line_text_field"
              }
            ]
          }
        }
      }
    );

    const responseJson = await response.json();
    
    if (responseJson.data.productCreate.userErrors.length > 0) {
      return json({
        error: responseJson.data.productCreate.userErrors[0].message
      });
    }

    return json({
      success: true,
      productId: responseJson.data.productCreate.product.id,
      productHandle: responseJson.data.productCreate.product.handle
    });

  } catch (error) {
    console.error("Product import error:", error);
    return json({ error: error.message });
  }
}

export default function PokemonPage() {
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize the product import hook
  const transformFormData = (item) => ({
    title: `Pokémon TCG | ${item.title} | ${item.set}`,
    description: item.description,
    vendor: "Pokemon TCG",
    productType: "Trading Card",
    imageUrl: item.image,
    cardNumber: item.details.number,
    setName: item.set,
    rarity: item.rarity,
    types: JSON.stringify(item.types),
    artist: item.artist
  });

  const {
    handleImport,
    isImporting,
    getImportStatus
  } = useProductImport(transformFormData);
  
  const handleSearch = useCallback(async (searchTerm) => {
    console.log("Searching for:", searchTerm);
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=name:"${searchTerm}*"&pageSize=12&orderBy=-set.releaseDate`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch Pokemon cards');
      }

      const data = await response.json();
      
      const transformedResults = data.data.map(card => ({
        id: card.id,
        title: card.name,
        image: card.images.small,
        description: `${card.name} - ${card.rarity || 'Unknown'} Pokemon Card from ${card.set.name} Set`,
        set: card.set.name,
        rarity: card.rarity,
        details: {
          number: card.number,
          series: card.set.series,
          printedTotal: card.set.printedTotal,
          releaseDate: card.set.releaseDate
        },
        types: card.types || [],
        artist: card.artist
      }));

      setSearchResults(transformedResults);
    } catch (err) {
      console.error("Search error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderCustomFields = useCallback((item) => (
    <BlockStack gap="200">
      <Text variant="bodySm">Set: {item.set}</Text>
      <Text variant="bodySm">Rarity: {item.rarity}</Text>
      <Text variant="bodySm">Types: {item.types?.join(', ') || 'N/A'}</Text>
      <Text variant="bodySm">Artist: {item.artist || 'N/A'}</Text>
      <Text variant="bodySm">Card Number: {item.details.number}/{item.details.printedTotal}</Text>
    </BlockStack>
  ), []);

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400" padding="400">
              <Text as="h1" variant="headingLg">Pokemon TCG Import</Text>
              
              <ApiSearch 
                onSearch={handleSearch}
                loading={isLoading}
                placeholder="Search Pokemon cards..."
              />

              {searchResults.length > 0 && (
                <ResultsGrid>
                  {searchResults.map(result => (
                    <ProductCard
                      key={result.id}
                      item={result}
                      onImport={handleImport}
                      renderCustomFields={renderCustomFields}
                      isImporting={isImporting(result.id)}
                      importSuccess={getImportStatus(result.id)?.success}
                      importError={getImportStatus(result.id)?.error}
                    />
                  ))}
                </ResultsGrid>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}