// app/mutations/setupPokemonMetaobjects.js

const POKEMON_CARD_TYPE = "pokemon_trading_card";

const pokemonCardDefinition = {
  name: "Pokemon Trading Card",
  type: POKEMON_CARD_TYPE,
  fieldDefinitions: [
    {
      name: "Card Number",
      key: "card_number",
      type: "single_line_text_field",
      description: "The card number within its set",
      required: true
    },
    {
      name: "Set Name",
      key: "set_name",
      type: "single_line_text_field",
      description: "The name of the card set",
      required: true
    },
    {
      name: "Rarity",
      key: "rarity",
      type: "single_line_text_field",
      description: "Card rarity level",
      required: true
    },
    {
      name: "Subtypes",
      key: "subtypes",
      type: "list.single_line_text_field",
      description: "Card subtypes"
    },
    {
      name: "HP",
      key: "hp",
      type: "number_integer",
      description: "Pokemon HP value"
    },
    {
      name: "Types",
      key: "types",
      type: "list.single_line_text_field",
      description: "Pokemon card types"
    },
    {
      name: "Artist",
      key: "artist",
      type: "single_line_text_field",
      description: "Card artist name"
    },
    {
      name: "National Pokedex Numbers",
      key: "national_pokedex_numbers",
      type: "list.number_integer",
      description: "National Pokedex entry numbers"
    },
    {
      name: "TCGPlayer Market Price",
      key: "market_price",
      type: "number_decimal",
      description: "Current market price on TCGPlayer"
    },
    {
      name: "TCGPlayer URL",
      key: "url",
      type: "url",
      description: "Link to TCGPlayer listing"
    },
    {
      name: "Associated Product",
      key: "product",
      type: "product_reference",
      description: "Link to the Shopify product",
      required: true
    }
  ]
};

const setupPokemonMetaobjects = async (admin) => {
  const errors = [];
  
  try {
    // 1. First delete the existing definition if it exists
    try {
      await admin.graphql(
        `#graphql
        mutation deleteMetaobjectDefinition($type: String!) {
          metaobjectDefinitionDelete(type: $type) {
            deletedDefinitionId
            userErrors {
              field
              message
              code
            }
          }
        }`,
        {
          variables: {
            type: POKEMON_CARD_TYPE
          }
        }
      );
    } catch (error) {
      console.log('Definition may not exist, continuing with creation');
    }

    // Wait a moment for deletion to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Create the new definition
    const createDefinitionResponse = await admin.graphql(
      `#graphql
      mutation CreateMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
        metaobjectDefinitionCreate(definition: $definition) {
          metaobjectDefinition {
            id
            type
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
            name: pokemonCardDefinition.name,
            type: pokemonCardDefinition.type,
            fieldDefinitions: pokemonCardDefinition.fieldDefinitions.map(field => ({
              name: field.name,
              key: field.key,
              type: field.type,
              description: field.description,
              required: field.required || false,
              validations: []
            }))
          }
        }
      }
    );

    const definitionResult = await createDefinitionResponse.json();
    
    if (definitionResult.data?.metaobjectDefinitionCreate?.userErrors?.length > 0) {
      throw new Error(JSON.stringify(definitionResult.data.metaobjectDefinitionCreate.userErrors));
    }

    return {
      success: true,
      definition: definitionResult.data?.metaobjectDefinitionCreate?.metaobjectDefinition
    };

  } catch (error) {
    console.error('Error setting up Pokemon metaobject definition:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to create a Pokemon card metaobject instance
const createPokemonCardMetaobject = async (admin, cardData) => {
  try {
    const response = await admin.graphql(
      `#graphql
      mutation CreateMetaobject($input: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $input) {
          metaobject {
            id
            handle
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
          input: {
            type: POKEMON_CARD_TYPE,
            fields: [
              { key: "card_number", value: cardData.cardNumber },
              { key: "set_name", value: cardData.setName },
              { key: "rarity", value: cardData.rarity },
              { key: "subtypes", value: JSON.stringify(cardData.subtypes) },
              { key: "hp", value: cardData.hp?.toString() || "0" },
              { key: "types", value: JSON.stringify(cardData.types) },
              { key: "artist", value: cardData.artist || "" },
              { key: "national_pokedex_numbers", value: JSON.stringify(cardData.nationalPokedexNumbers) },
              { key: "market_price", value: cardData.marketPrice?.toString() || "0" },
              { key: "url", value: cardData.tcgplayerUrl || "" },
              { key: "product", value: cardData.productId }
            ]
          }
        }
      }
    );

    const result = await response.json();
    
    if (result.data?.metaobjectCreate?.userErrors?.length > 0) {
      throw new Error(JSON.stringify(result.data.metaobjectCreate.userErrors));
    }

    return {
      success: true,
      metaobject: result.data?.metaobjectCreate?.metaobject
    };

  } catch (error) {
    console.error('Error creating Pokemon card metaobject:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export { setupPokemonMetaobjects, createPokemonCardMetaobject, POKEMON_CARD_TYPE };