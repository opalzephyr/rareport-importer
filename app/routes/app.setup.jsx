//app/routes/app.setup.jsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, Text, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { setupPokemonMetaobjects } from "../mutations/setupPokemonMetaobjects";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  try {
    const result = await setupPokemonMetaobjects(admin);
    return json({
      success: result.success,
      error: result.error,
      definition: result.definition
    });
  } catch (error) {
    return json({
      success: false,
      error: error.message
    });
  }
};

export default function SetupPage() {
  const { success, error, definition } = useLoaderData();

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
                  <p>Successfully set up Pokemon TCG metaobject definition!</p>
                  {definition && (
                    <p>Created definition type: {definition.type}</p>
                  )}
                </Banner>
              ) : (
                <Banner status="critical">
                  <p>Failed to set up Pokemon TCG definition:</p>
                  <p>{error}</p>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}