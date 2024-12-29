import { BaseApiService } from './BaseApiService.js';

export class PokemonTcgService extends BaseApiService {
    async search(query) {
      const response = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=name:"${query}*"&pageSize=100&orderBy=-set.releaseDate`
      );
      
      const data = await this.handleResponse(response);
      return data.data.map(this.transformToProduct);
    }
  
    transformToProduct(card) {
      return {
        id: card.id,
        title: card.name,
        set: card.set.name,
        image: card.images.small,
        rarity: card.rarity,
        details: {
          number: card.number,
          series: card.set.series,
          printedTotal: card.set.printedTotal,
          releaseDate: card.set.releaseDate
        },
        hp: card.hp,
        types: card.types || [],
        artist: card.artist,
        tcgplayer: card.tcgplayer || null,
        description: `${card.name} - ${card.rarity} Pokemon Card from ${card.set.name} Set`,
        vendor: 'Pokemon TCG',
        type: 'Trading Card',
        cardNumber: card.number,
        setName: card.set.name,
      };
    }
  }