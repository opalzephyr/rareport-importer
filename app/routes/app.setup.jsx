// app/routes/app.setup.jsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, Text, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { setupPokemonMetafields } from "../mutations/setupPokemonMetafields";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  try {
    const result = await setupPokemonMetafields(admin);
    return json(result);
  } catch (error) {
    return json({
      success: false,
      error: error.message
    });
  }
};

export default function SetupPage() {
  const { success, error, definitions } = useLoaderData();

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400" padding="400">
              <Text as="h2" variant="headingMd">
                Pokemon TCG Setup
              </Text>
              
              {success ? (
                <Banner status="success">
                  <BlockStack gap="400">
                    <Text>Successfully set up Pokemon TCG metafields!</Text>
                    <Text>Created {definitions.length} metafield definitions for Pokemon cards.</Text>
                    <Text>These fields will be visible on all products tagged with "Pokemon TCG".</Text>
                  </BlockStack>
                </Banner>
              ) : (
                <Banner status="critical">
                  <Text>Setup failed: {error}</Text>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}