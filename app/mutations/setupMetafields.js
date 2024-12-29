// app/mutations/setupMetafields.js

const metafieldDefinitions = [
    {
      name: "Card Number",
      namespace: "pokemon_tcg",
      key: "card_number",
      description: "The card number within its set",
      type: "single_line_text_field",
      ownerType: "PRODUCT"
    },
    {
      name: "Set Name",
      namespace: "pokemon_tcg",
      key: "set_name",
      description: "The name of the card set",
      type: "single_line_text_field",
      ownerType: "PRODUCT"
    },
    {
      name: "Rarity",
      namespace: "pokemon_tcg",
      key: "rarity",
      description: "Card rarity level",
      type: "single_line_text_field",
      ownerType: "PRODUCT"
    },
    {
      name: "Subtypes",
      namespace: "pokemon_tcg",
      key: "subtypes",
      description: "Card subtypes",
      type: "list.single_line_text_field",
      ownerType: "PRODUCT"
    },
    {
      name: "HP",
      namespace: "pokemon_tcg",
      key: "hp",
      description: "Pokemon HP value",
      type: "number_integer",
      ownerType: "PRODUCT"
    },
    {
      name: "Types",
      namespace: "pokemon_tcg",
      key: "types",
      description: "Pokemon card types",
      type: "list.single_line_text_field",
      ownerType: "PRODUCT"
    },
    {
      name: "Artist",
      namespace: "pokemon_tcg",
      key: "artist",
      description: "Card artist name",
      type: "single_line_text_field",
      ownerType: "PRODUCT"
    },
    {
      name: "National Pokedex Numbers",
      namespace: "pokemon_tcg",
      key: "national_pokedex_numbers",
      description: "National Pokedex entry numbers",
      type: "list.number_integer",
      ownerType: "PRODUCT"
    },
    {
      name: "TCGPlayer Market Price",
      namespace: "tcgplayer",
      key: "market_price",
      description: "Current market price on TCGPlayer",
      type: "number_decimal",
      ownerType: "PRODUCT"
    },
    {
      name: "TCGPlayer URL",
      namespace: "tcgplayer",
      key: "url",
      description: "Link to TCGPlayer listing",
      type: "url",
      ownerType: "PRODUCT"
    }
  ];
  
  const setupStructuredMetafields = async (admin) => {
    const createdDefinitions = [];
    const errors = [];
  
    // First, try to delete existing definitions
    for (const definition of metafieldDefinitions) {
      try {
        await admin.graphql(
          `#graphql
          mutation deleteMetafieldDefinition($input: MetafieldDefinitionDeleteInput!) {
            metafieldDefinitionDelete(input: $input) {
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
              input: {
                ownerType: "PRODUCT",
                namespace: definition.namespace,
                key: definition.key
              }
            }
          }
        );
      } catch (error) {
        console.log(`Failed to delete definition ${definition.namespace}.${definition.key}`, error);
      }
    }
  
    // Wait a moment for deletions to process
    await new Promise(resolve => setTimeout(resolve, 1000));
  
    // Now create new definitions
    for (const definition of metafieldDefinitions) {
      try {
        // Create the metafield definition
        const createDefinitionResponse = await admin.graphql(
          `#graphql
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
                name: definition.name,
                namespace: definition.namespace,
                key: definition.key,
                description: definition.description,
                type: definition.type,
                ownerType: definition.ownerType,
                pin: true
              }
            }
          }
        );
  
        const definitionResult = await createDefinitionResponse.json();
        
        if (definitionResult.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
          errors.push({
            field: definition.key,
            errors: definitionResult.data.metafieldDefinitionCreate.userErrors
          });
          continue;
        }
  
        const createdDefinition = definitionResult.data?.metafieldDefinitionCreate?.createdDefinition;
        if (!createdDefinition) {
          errors.push({
            field: definition.key,
            error: 'Failed to create definition'
          });
          continue;
        }
  
        createdDefinitions.push(createdDefinition);
  
      } catch (error) {
        console.error('Error processing definition for', definition.key, ':', error);
        errors.push({
          field: definition.key,
          error: error.message
        });
      }
    }
  
    return {
      successful: createdDefinitions,
      errors: errors
    };
  };
  
  export default setupStructuredMetafields;