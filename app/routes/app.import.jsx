// app/routes/app.import.jsx
import { json } from "@remix-run/node";
import { Box, Layout, Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import ApiSearch from "../components/ApiSearch";

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
    // 1. First create the product without images
    const productResponse = await admin.graphql(
      `#graphql
        mutation productCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              title
              handle
              variants(first: 1) {
                edges {
                  node {
                    id
                  }
                }
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
          input: {
            title: formData.get("title"),
            descriptionHtml: formData.get("description"),
            vendor: formData.get("vendor"),
            productType: formData.get("productType"),
            status: "ACTIVE"
          },
        },
      }
    );

    const productResult = await productResponse.json();

    if (productResult.data?.productCreate?.userErrors?.length > 0) {
      throw new Error(productResult.data.productCreate.userErrors[0].message);
    }

    const productId = productResult.data?.productCreate?.product?.id;
    //const variantId = productResult.data?.productCreate?.product?.variants?.edges[0]?.node?.id;

    if (!productId) {
      throw new Error("Failed to create product");
    }

    // 2. If we have an image URL, handle the image upload
    if (formData.get("imageUrl")) {
      // First get a staged upload URL
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

      // Fetch the image from the provided URL
      const imageResponse = await fetch(formData.get("imageUrl"));
      const imageBlob = await imageResponse.blob();

      // Create form data for the upload
      const uploadFormData = new FormData();
      parameters.forEach(({ name, value }) => {
        uploadFormData.append(name, value);
      });
      uploadFormData.append('file', imageBlob);

      // Upload to the staged URL
      const uploadResponse = await fetch(url, {
        method: 'POST',
        body: uploadFormData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      // Attach the image to the product using createMediaInput
      const createMediaResponse = await admin.graphql(
        `mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
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
            product {
              id
              title
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
      if (createMediaResult.data?.createMediaInput?.userErrors?.length > 0) {
        throw new Error(createMediaResult.data.createMediaInput.userErrors[0].message);
      }
    }

    // 3. Update the product variant prices
    const getAllVariantIdsResponse = await admin.graphql(
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

    const getAllVariantIdsResult = await getAllVariantIdsResponse.json();
    const variantIds = getAllVariantIdsResult.data.product.variants.nodes.map(variant => variant.id);

    // Prepare the variants input for bulk update
    const variantsInput = variantIds.map(variantId => ({
      id: variantId,
      price: parseFloat(formData.get("price"))
    }));

    // 4. Bulk update variant prices
    const bulkUpdateResponse = await admin.graphql(
      `#graphql
        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            product {
              id
            }
            productVariants {
              id
              metafields(first: 2) {
                edges {
                  node {
                    namespace
                    key
                    value
                  }
                }
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
          productId: productId,
          variants: variantsInput
        }
      }
    );

    const bulkUpdateResult = await bulkUpdateResponse.json();
    if (bulkUpdateResult.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
      throw new Error(bulkUpdateResult.data.productVariantsBulkUpdate.userErrors[0].message);
    }

    // 4. Add metafields
    const metafieldsResponse = await admin.graphql(
      `#graphql
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
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
          metafields: [
            {
              ownerId: productId,
              namespace: "custom",
              key: "card_number",
              type: "single_line_text_field",
              value: formData.get("cardNumber")
            },
            {
              ownerId: productId,
              namespace: "custom",
              key: "set_name",
              type: "single_line_text_field",
              value: formData.get("setName")
            },
            {
              ownerId: productId,
              namespace: "custom",
              key: "rarity",
              type: "single_line_text_field",
              value: formData.get("rarity")
            }
          ]
        }
      }
    );

    const metafieldsResult = await metafieldsResponse.json();
    if (metafieldsResult.data?.metafieldsSet?.userErrors?.length > 0) {
      throw new Error(metafieldsResult.data.metafieldsSet.userErrors[0].message);
    }

    return json({
      success: true,
      productId
    });

  } catch (error) {
    console.error('Product creation error:', error);
    return json({
      success: false,
      error: error.message
    });
  }
};

export default function ImportPage() {
  return (
    <Page>
      <TitleBar title="Import Products" />
      <Layout>
        <Layout.Section>
          <Box padding="400">
            <ApiSearch />
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}