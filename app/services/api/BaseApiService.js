// services/api/BaseApiService.js
export class BaseApiService {
    constructor(config = {}) {
      this.config = config;
    }
  
    async handleResponse(response) {
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      return response.json();
    }
  
    async search(query) {
      throw new Error('search method must be implemented');
    }
  
    transformToProduct(item) {
      throw new Error('transformToProduct method must be implemented');
    }
  }