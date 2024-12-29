// app/routes/app._index.jsx
import { Page, Layout, Card, BlockStack, Button, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function HomePage() {
  const navigate = useNavigate();

  const APIs = [
    {
      id: 'pokemon',
      title: 'Pokémon TCG',
      description: 'Search and import Pokémon trading cards',
      enabled: true,
    },
    {
      id: 'mtg',
      title: 'Magic: The Gathering',
      description: 'Search and import Magic: The Gathering cards',
      enabled: false,
    },
    {
      id: 'igdb',
      title: 'IGDB (Video Games)',
      description: 'Search and import video game products',
      enabled: false,
    },
  ];

  return (
    <Page>
      <TitleBar title="Rareport Import Center" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {APIs.map((api) => (
              <Card key={api.id}>
                <BlockStack gap="400" padding="400">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                      {api.title}
                    </Text>
                    <Text as="p" variant="bodyMd">
                      {api.description}
                    </Text>
                  </BlockStack>
                  <Button
                    onClick={() => navigate(`/app/${api.id}`)}
                    disabled={!api.enabled}
                    primary
                  >
                    {api.enabled ? 'Access API' : 'Coming Soon'}
                  </Button>
                </BlockStack>
              </Card>
            ))}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}