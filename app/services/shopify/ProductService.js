// services/shopify/ProductService.js
export class ShopifyProductService {
    constructor(admin) {
      this.admin = admin;
    }
  
    async createProduct(productData) {
      const categoryId = await this.getCategoryId(productData.category);
      const product = await this.createBaseProduct(productData, categoryId);
      
      if (productData.imageUrl) {
        await this.attachProductImage(product.id, productData);
      }
      
      if (productData.metafields) {
        await this.createMetafields(product.id, productData.metafields);
      }
      
      if (productData.price) {
        await this.updateVariantPrices(product.id, productData.price);
      }
  
      return product;
    }
  
    // Implementation of individual methods...
    async getCategoryId(categoryTitle) {
      const response = await this.admin.graphql(
        `#graphql
        query GetCategoryId($title: String!) {
          collections(first: 1, query: $title) {
            edges {
              node {
                id
              }
            }
          }
        }`,
        {
          variables: { title: categoryTitle }
        }
      );
      
      const result = await response.json();
      return result.data.collections.edges[0]?.node.id;
    }
  
    // ... other methods
}