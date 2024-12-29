import { json } from "@remix-run/node";
import { Layout, Page, Card, Text, BlockStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { PokemonSearch } from "../components/pokemon/PokemonSearch";
//import { POKEMON_CONFIG, checkGraphQLResponse, createPokemonCardMetaobject } from "../mutations/setupPokemonStore";


export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

function sanitizeFilename(str) {
  return str
    .replace(/[^a-z0-9-_]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    // 1. Query the category ID
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
          title: "Collectible Trading Cards"
        }
      }
    );
    
    const categoryResult = await categoryResponse.json();
    const categoryId = categoryResult.data.collections.edges[0]?.node.id;
    if (!categoryId) {
      throw new Error("Could not find Collectible Trading Cards collection");
    }

    // 2. Create the product
    const productResponse = await admin.graphql(
      `#graphql
      mutation productCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
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
            title: `Pokémon TCG | ${formData.get("title")} | ${formData.get("setName")} / ${formData.get("cardNumber")}`,
            descriptionHtml: formData.get("description"),
            vendor: formData.get("vendor"),
            productType: "Trading Card",
            tags: ["Pokemon TCG"],
            status: "ACTIVE",
            collectionsToJoin: [categoryId]
          },
        }
      }
    );

    const productResult = await productResponse.json();

    if (productResult.data?.productCreate?.userErrors?.length > 0) {
      throw new Error(productResult.data.productCreate.userErrors[0].message);
    }

    const productId = productResult.data?.productCreate?.product?.id;
    if (!productId) {
      throw new Error("Failed to create product");
    }

    // 3. Handle image upload if provided
    if (formData.get("imageUrl")) {
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
          }
        }`,
        {
          variables: {
            input: [
              {
                filename: sanitizeFilename(`${formData.get("title")}.jpg`),
                mimeType: "image/jpeg",
                httpMethod: "POST",
                resource: "IMAGE"
              }
            ]
          }
        }
      );

      const stagedUploadsResult = await stagedUploadsResponse.json();
      const { url, parameters, resourceUrl } = stagedUploadsResult.data.stagedUploadsCreate.stagedTargets[0];

      // Fetch and upload the image
      const imageResponse = await fetch(formData.get("imageUrl"));
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
        throw new Error('Failed to upload image');
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
              alt: `${formData.get("title")} - ${formData.get("setName")}`,
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
    }

    // 4. Create Pokemon card metaobject
    /*const metaobjectResult = await createPokemonCardMetaobject(admin, {
      cardNumber: formData.get("cardNumber"),
      setName: formData.get("setName"),
      rarity: formData.get("rarity"),
      subtypes: JSON.parse(formData.get("subtypes") || "[]"),
      hp: formData.get("hp"),
      types: JSON.parse(formData.get("types") || "[]"),
      artist: formData.get("artist"),
      nationalPokedexNumbers: JSON.parse(formData.get("nationalPokedexNumbers") || "[]"),
      marketPrice: parseFloat(formData.get("price")),
      tcgplayerUrl: formData.get("tcgplayerUrl"),
      productId: productId
    });

    if (!metaobjectResult.success) {
      throw new Error(`Failed to create card metaobject: ${metaobjectResult.error}`);
    }

    // 5. Link the metaobject to the product using metafield
    // Add this after creating the metaobject in your action function
    const setMetafieldResponse = await admin.graphql(`#graphql
      mutation productMetafieldsSet($productId: ID!, $metafields: [MetafieldsSetInput!]!) {
        productMetafieldsSet(productId: $productId, metafields: $metafields) {
          metafields {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          productId: productId,
          metafields: [{
            namespace: POKEMON_CONFIG.NAMESPACE,
            key: POKEMON_CONFIG.METAFIELD_KEY,
            type: "metaobject_reference",
            value: metaobjectResult.metaobject.id
          }]
        }
      }
    ).then(response => response.json())
     .then(result => checkGraphQLResponse(result, 'productMetafieldsSet'));

    const metafieldSetResult = await setMetafieldResponse.json();
    if (metafieldSetResult.data?.productMetafieldsSet?.userErrors?.length > 0) {
      throw new Error(metafieldSetResult.data.productMetafieldsSet.userErrors[0].message);
    }
    */

    // 6. Update variant prices if needed
    const variantUpdateResponse = await admin.graphql(
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

    const variantResult = await variantUpdateResponse.json();
    const variantIds = variantResult.data.product.variants.nodes.map(variant => variant.id);

    const variantsInput = variantIds.map(variantId => ({
      id: variantId,
      price: parseFloat(formData.get("price"))
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
      throw new Error(bulkUpdateResult.data.productVariantsBulkUpdate.userErrors[0].message);
    }
    
    return json({
      success: true,
      productId,
      metaobjectId: metaobjectResult.metaobject.id
    });

  } catch (error) {
    console.error('Product creation error:', error);
    return json({
      success: false,
      error: error.message
    });
  }
};

export default function PokemonPage() {
  return (
    <Page>
      <TitleBar title="Pokémon TCG Import" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400" padding="400">
              <Text as="h2" variant="headingMd">
                Search Pokémon Cards
              </Text>
              <Text as="p" variant="bodyMd">
                Search for Pokémon trading cards and import them directly to your store.
              </Text>
              <PokemonSearch />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}