// app/mutations/setupPokemonStore.js
import { setupPokemonMetaobjects } from "./setupPokemonMetaobjects";
import { setupPokemonMetafields } from "./setupPokemonMetafields";

export const POKEMON_CONFIG = {
    NAMESPACE: "pokemon_tcg",
    METAOBJECT_TYPE: "pokemon_trading_card",
    METAFIELD_KEY: "card_details"
  };
  
  export async function setupPokemonStore(admin) {
    try {
      // 1. Set up metaobject definition first
      const metaobjectResult = await setupPokemonMetaobjects(admin);
      if (!metaobjectResult.success) {
        throw new Error(`Metaobject setup failed: ${metaobjectResult.error}`);
      }
  
      // 2. Set up metafield definition that references the metaobject
      const metafieldResult = await setupPokemonMetafields(admin);
      if (!metafieldResult.success) {
        throw new Error(`Metafield setup failed: ${metafieldResult.error}`);
      }
  
      return {
        success: true,
        metaobjectDefinition: metaobjectResult.definition,
        metafieldDefinition: metafieldResult.metafieldDefinition,
        pinnedPage: metafieldResult.pinnedPage
      };
    } catch (error) {
      console.error('Pokemon store setup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Helper to check GraphQL response for errors
  export function checkGraphQLResponse(response, operation) {
    if (!response?.data) {
      throw new Error(`${operation} failed: No data returned`);
    }
    
    const userErrors = response.data[operation]?.userErrors;
    if (userErrors?.length > 0) {
      throw new Error(`${operation} failed: ${JSON.stringify(userErrors)}`);
    }
    
    return response.data[operation];
  }