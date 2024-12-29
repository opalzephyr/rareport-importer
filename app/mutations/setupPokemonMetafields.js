// app/mutations/setupPokemonMetafields.js

const POKEMON_NAMESPACE = "pokemon_tcg";

// Define the metafields we want to create
const METAFIELD_DEFINITIONS = [
  {
    name: "Set Name",
    key: "set_name",
    type: "single_line_text_field",
    description: "The name of the card set",
  },
  {
    name: "Card Number",
    key: "card_number",
    type: "single_line_text_field",
    description: "The card number within the set",
  },
  {
    name: "Rarity",
    key: "rarity",
    type: "single_line_text_field",
    description: "Card rarity level",
  },
  {
    name: "HP",
    key: "hp",
    type: "number_integer",
    description: "Pokemon HP value",
  },
  {
    name: "Card Types",
    key: "types",
    type: "list.single_line_text_field",
    description: "Pokemon card types",
  },
  {
    name: "Artist",
    key: "artist",
    type: "single_line_text_field",
    description: "Card artist name",
  },
  {
    name: "Market Price",
    key: "market_price",
    type: "number_decimal",
    description: "Current market price",
  },
  {
    name: "TCGPlayer URL",
    key: "tcgplayer_url",
    type: "url",
    description: "Link to TCGPlayer listing",
  }
];

export const setupPokemonMetafields = async (admin) => {
  try {
    // Create metafield definitions
    const createdDefinitions = await Promise.all(
      METAFIELD_DEFINITIONS.map(async (definition) => {
        const response = await admin.graphql(
          `#graphql
          mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
            metafieldDefinitionCreate(definition: $definition) {
              createdDefinition {
                id
                name
                key
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
                name: definition.name,
                namespace: POKEMON_NAMESPACE,
                key: definition.key,
                description: definition.description,
                type: definition.type,
                ownerType: "PRODUCT",
                visibleToStorefrontApi: true,
                pin: true
              }
            }
          }
        );

        const result = await response.json();
        if (result.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
          throw new Error(JSON.stringify(result.data.metafieldDefinitionCreate.userErrors));
        }

        return result.data?.metafieldDefinitionCreate?.createdDefinition;
      })
    );

    return {
      success: true,
      definitions: createdDefinitions
    };

  } catch (error) {
    console.error('Error setting up Pokemon metafields:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to create metafields for a product
export const createPokemonMetafields = async (admin, productId, cardData) => {
    try {
      // Ensure types is a proper array before stringifying
      const types = Array.isArray(cardData.types) ? cardData.types : [];
      
      const response = await admin.graphql(
        `#graphql
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
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
            metafields: [
              {
                ownerId: productId,
                namespace: POKEMON_NAMESPACE,
                key: "set_name",
                value: cardData.setName || "",
                type: "single_line_text_field"
              },
              {
                ownerId: productId,
                namespace: POKEMON_NAMESPACE,
                key: "card_number",
                value: cardData.cardNumber || "",
                type: "single_line_text_field"
              },
              {
                ownerId: productId,
                namespace: POKEMON_NAMESPACE,
                key: "rarity",
                value: cardData.rarity || "",
                type: "single_line_text_field"
              },
              {
                ownerId: productId,
                namespace: POKEMON_NAMESPACE,
                key: "hp",
                value: (cardData.hp || "0").toString(),
                type: "number_integer"
              },
              {
                ownerId: productId,
                namespace: POKEMON_NAMESPACE,
                key: "types",
                value: cardData.types || "[]", // Use the JSON string directly
                type: "list.single_line_text_field"
              },
              {
                ownerId: productId,
                namespace: POKEMON_NAMESPACE,
                key: "artist",
                value: cardData.artist || "",
                type: "single_line_text_field"
              },
              {
                ownerId: productId,
                namespace: POKEMON_NAMESPACE,
                key: "market_price",
                value: (cardData.marketPrice || "0").toString(),
                type: "number_decimal"
              },
              {
                ownerId: productId,
                namespace: POKEMON_NAMESPACE,
                key: "tcgplayer_url",
                value: cardData.tcgplayerUrl || "",
                type: "url"
              }
            ]
          }
        }
      );
  
      const result = await response.json();
      if (result.data?.metafieldsSet?.userErrors?.length > 0) {
        throw new Error(JSON.stringify(result.data.metafieldsSet.userErrors));
      }
  
      return {
        success: true,
        metafields: result.data?.metafieldsSet?.metafields
      };
  
    } catch (error) {
      console.error('Error creating Pokemon metafields:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };