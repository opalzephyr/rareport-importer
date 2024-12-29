// app/routes/app.setup.jsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, Text, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { setupPokemonStore } from "../mutations/setupPokemonStore";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  try {
    const result = await setupPokemonStore(admin);
    return json(result);
  } catch (error) {
    return json({
      success: false,
      error: error.message
    });
  }
};

export default function SetupPage() {
  const { success, error, metaobjectDefinition, metafieldDefinition, pinnedPage } = useLoaderData();

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
                    <Text>Successfully set up Pokemon TCG infrastructure!</Text>
                    {metaobjectDefinition && (
                      <Text>Created metaobject definition: {metaobjectDefinition.type}</Text>
                    )}
                    {metafieldDefinition && (
                      <Text>Created metafield definition: {metafieldDefinition.name}</Text>
                    )}
                    {pinnedPage && (
                      <Text>Created pinned page for Pokemon TCG products</Text>
                    )}
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