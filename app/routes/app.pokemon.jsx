import { json } from "@remix-run/node";
import { Page, Layout, Text, Card, BlockStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useCallback, useState } from "react";
import { ApiSearch } from "../components/common/ApiSearch";
import { ResultsGrid } from "../components/common/ResultsGrid";
import { ProductCard } from "../components/common/ProductCard";
import { useProductImport } from "../hooks/useProductImport";

const POKEMON_NAMESPACE = "pokemon_tcg";
const COLLECTION_TITLE = "Collectible Trading Cards";

// Utility functions for data validation and transformation
const validateMetafieldValue = (value, type) => {
  switch (type) {
    case 'single_line_text_field':
      return String(value || '').trim();
    case 'number_integer':
      const num = parseInt(value, 10);
      return isNaN(num) ? '0' : num.toString();
    case 'list.single_line_text_field':
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return JSON.stringify(Array.isArray(parsed) ? parsed : []);
      } catch {
        return '[]';
      }
    case 'json':
      try {
        return JSON.stringify(value || {});
      } catch {
        return '{}';
      }
    case 'url':  // Added url type handling
      return String(value || '').trim();
    default:
      return String(value || '');
  }
};

const constructMetafields = (data) => {
  const metafieldDefinitions = [
    { key: "set_name", type: "single_line_text_field", value: data.setName },
    { key: "card_number", type: "single_line_text_field", value: data.cardNumber },
    { key: "rarity", type: "single_line_text_field", value: data.rarity },
    { key: "hp", type: "number_integer", value: data.hp },
    { key: "types", type: "list.single_line_text_field", value: data.types },
    { key: "artist", type: "single_line_text_field", value: data.artist },
    { key: "tcgplayer_url", type: "url", value: data.tcgplayerUrl },
    { key: "tcgplayer_prices", type: "json", value: data.tcgplayerPrices }
  ];

  return metafieldDefinitions.map(field => ({
    namespace: POKEMON_NAMESPACE,
    key: field.key,
    value: validateMetafieldValue(field.value, field.type),
    type: field.type
  }));
};

const sanitizeFilename = (str) => {
  return str
    .replace(/[^a-z0-9-_]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
};

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ ok: true });
};

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());
    console.log("Received form data on server:", data); // Log received data

    // Validate required fields
    const requiredFields = ['title', 'setName', 'cardNumber'];
    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    console.log("Validated data:", data);

    // 1. Query the category ID with error handling
    const categoryResponse = await admin.graphql(
      `#graphql
      query GetCategoryId($title: String!) {
        collections(first: 1, query: $title) {
          edges {
            node {
              id
            }
          }
        }
      }`,
      {
        variables: {
          title: COLLECTION_TITLE
        }
      }
    );
    
    const categoryResult = await categoryResponse.json();
    const categoryId = categoryResult.data.collections.edges[0]?.node.id;
    if (!categoryId) {
      throw new Error(`Collection "${COLLECTION_TITLE}" not found`);
    }

    // 2. Create the product with validated data
    const productInput = {
      title: data.title,
      descriptionHtml: data.description,
      vendor: data.vendor || 'Pokemon TCG',
      productType: data.productType || 'Trading Card',
      tags: ['Pokemon TCG'],
      status: 'DRAFT',
      collectionsToJoin: [categoryId]
    };

    const productResponse = await admin.graphql(
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
          input: productInput
        }
      }
    );

    const productResult = await productResponse.json();
    
    if (productResult.data.productCreate.userErrors.length > 0) {
      throw new Error(productResult.data.productCreate.userErrors[0].message);
    }

    const productId = productResult.data.productCreate.product.id;

    // 3. Handle image upload with proper error handling
    if (data.imageUrl) {
      try {
        // Prepare staged upload
        const stagedUploadsResponse = await admin.graphql(
          `#graphql
          mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
            stagedUploadsCreate(input: $input) {
              stagedTargets {
                resourceUrl
                url
                parameters {
                  name
                  value
                }
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              input: [
                {
                  filename: sanitizeFilename(`${data.title || 'pokemon'}.jpg`),
                  mimeType: "image/jpeg",
                  httpMethod: "POST",
                  resource: "IMAGE"
                }
              ]
            }
          }
        );

        const stagedUploadsResult = await stagedUploadsResponse.json();
        if (stagedUploadsResult.data.stagedUploadsCreate.userErrors.length > 0) {
          throw new Error(stagedUploadsResult.data.stagedUploadsCreate.userErrors[0].message);
        }

        const { url, parameters, resourceUrl } = stagedUploadsResult.data.stagedUploadsCreate.stagedTargets[0];

        // Fetch and upload the image
        const imageResponse = await fetch(data.imageUrl);
        if (!imageResponse.ok) {
          throw new Error('Failed to fetch image from source');
        }

        const imageBlob = await imageResponse.blob();
        const uploadFormData = new FormData();
        parameters.forEach(({ name, value }) => {
          uploadFormData.append(name, value);
        });
        uploadFormData.append('file', imageBlob);

        const uploadResponse = await fetch(url, {
          method: 'POST',
          body: uploadFormData
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image to Shopify');
        }

        // Attach the image to the product
        const createMediaResponse = await admin.graphql(
          `#graphql
          mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
            productCreateMedia(media: $media, productId: $productId) {
              media {
                alt
                mediaContentType
                status
              }
              mediaUserErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              productId: productId,
              media: [{
                alt: `${data.title} - ${data.setName}`,
                mediaContentType: "IMAGE",
                originalSource: resourceUrl
              }]
            }
          }
        );

        const createMediaResult = await createMediaResponse.json();
        if (createMediaResult.data?.productCreateMedia?.mediaUserErrors?.length > 0) {
          throw new Error(createMediaResult.data.productCreateMedia.mediaUserErrors[0].message);
        }
      } catch (imageError) {
        console.error("Image upload error:", imageError);
        // Continue with product creation even if image upload fails
      }
    }

    // 4. Set up metafields with validated data
    const metafields = constructMetafields(data);
    const metafieldsResponse = await admin.graphql(
      `#graphql
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          metafields: metafields.map(metafield => ({
            ...metafield,
            ownerId: productId
          }))
        }
      }
    );

    const metafieldsResult = await metafieldsResponse.json();
    if (metafieldsResult.data?.metafieldsSet?.userErrors?.length > 0) {
      console.error("Metafields set error:", metafieldsResult.data.metafieldsSet.userErrors);
      // Continue with product creation even if metafields fail
    }

    // 5. Update variant prices with proper validation
    try {
      const variantResponse = await admin.graphql(
        `#graphql
        query GetAllVariantIds($id: ID!) {
          product(id: $id) {
            variants(first: 100) {
              nodes {
                id
              }
            }
          }
        }`,
        {
          variables: {
            id: productId
          }
        }
      );

      const variantResult = await variantResponse.json();
      const variantIds = variantResult.data.product.variants.nodes.map(variant => variant.id);
      
      if (variantIds.length > 0 && data.price) {
        const price = parseFloat(data.price);
        if (!isNaN(price)) {
          const variantsInput = variantIds.map(variantId => ({
            id: variantId,
            price: price.toString()
          }));

          const bulkUpdateResponse = await admin.graphql(
            `#graphql
            mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                userErrors {
                  field
                  message
                }
              }
            }`,
            {
              variables: {
                productId: productId,
                variants: variantsInput
              }
            }
          );

          const bulkUpdateResult = await bulkUpdateResponse.json();
          if (bulkUpdateResult.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
            console.error("Variant bulk update error:", bulkUpdateResult.data.productVariantsBulkUpdate.userErrors);
          }
        }
      }
    } catch (priceError) {
      console.error("Price update error:", priceError);
      // Continue with product creation even if price update fails
    }

    return json({
      success: true,
      productId,
      productHandle: productResult.data.productCreate.product.handle,
      productUrl: `/admin/products/${productResult.data.productCreate.product.handle}`
    });

  } catch (error) {
    console.error("Product import error:", error);
    return json({ 
      error: error.message,
      details: error.stack
    }, {
      status: 400
    });
  }
}

export default function PokemonPage() {
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    handleImport,
    isImporting,
    getImportStatus,
    getErrors
  } = useProductImport();
  
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
        hp: card.hp || '0',  // Add HP from card data
        types: card.types || [],
        artist: card.artist,
        tcgplayer: card.tcgplayer, // Add full tcgplayer object
        price: card.cardmarket?.prices?.averageSellPrice || 
               card.tcgplayer?.prices?.holofoil?.market || 
               card.tcgplayer?.prices?.normal?.market || 
               0
      })).filter(card => card.title && card.set); // Filter out invalid cards

      console.log("Transformed search results:", transformedResults[0]); // Log first result
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
      <Text variant="bodySm">Set: {item.set || 'N/A'}</Text>
      <Text variant="bodySm">Rarity: {item.rarity || 'N/A'}</Text>
      <Text variant="bodySm">Types: {item.types?.join(', ') || 'N/A'}</Text>
      <Text variant="bodySm">Artist: {item.artist || 'N/A'}</Text>
      <Text variant="bodySm">Card Number: {item.details.number || 'N/A'}/{item.details.printedTotal || 'N/A'}</Text>
      <Text variant="bodySm">Price: ${item.price ? item.price.toFixed(2) : '0.00'}</Text>
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
                      importSuccess={getImportStatus(result.id)?.message}
                      importError={getErrors(result.id)}
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