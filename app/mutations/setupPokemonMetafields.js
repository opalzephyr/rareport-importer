// app/mutations/setupPokemonMetafields.js

const POKEMON_METAFIELD_NAMESPACE = "pokemon_tcg";

const setupPokemonMetafields = async (admin) => {
  try {
    // Create the metafield definition
    const defineMetafieldsResponse = await admin.graphql(`#graphql
      mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            name
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
      {
        variables: {
          definition: {
            name: "Pokemon Card Details",
            namespace: POKEMON_METAFIELD_NAMESPACE,
            key: "card_details",
            description: "Reference to the Pokemon card metaobject",
            type: "metaobject_reference",
            ownerType: "PRODUCT",
            pin: true,
            metaobject: {
              type: "pokemon_trading_card"
            },
            access: {
              admin: "PUBLIC_READ_WRITE",
              storefront: "PUBLIC_READ"
            }
          }
        }
      }
    );

    const metafieldResult = await defineMetafieldsResponse.json();
    
    if (metafieldResult.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
      throw new Error(JSON.stringify(metafieldResult.data.metafieldDefinitionCreate.userErrors));
    }

    // Create a pinned page in the admin UI for Pokemon TCG products
    const createPinnedPageResponse = await admin.graphql(`#graphql
      mutation CreatePinnedPage($url: URL!, $type: String!, $resourceType: String!) {
        adminPinnedPageCreate(input: {
          url: $url,
          type: $type,
          resourceType: $resourceType
        }) {
          pinnedPage {
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
          url: "/admin/products?type=Trading+Card&tag=Pokemon+TCG",
          type: "LIST_FILTERED",
          resourceType: "PRODUCT"
        }
      }
    );

    const pinnedPageResult = await createPinnedPageResponse.json();
    
    if (pinnedPageResult.data?.adminPinnedPageCreate?.userErrors?.length > 0) {
      throw new Error(JSON.stringify(pinnedPageResult.data.adminPinnedPageCreate.userErrors));
    }

    return {
      success: true,
      metafieldDefinition: metafieldResult.data?.metafieldDefinitionCreate?.createdDefinition,
      pinnedPage: pinnedPageResult.data?.adminPinnedPageCreate?.pinnedPage
    };

  } catch (error) {
    console.error('Error setting up Pokemon metafields:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export { setupPokemonMetafields, POKEMON_METAFIELD_NAMESPACE };