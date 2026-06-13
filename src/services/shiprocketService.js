const axios = require('axios');

class ShiprocketService {
  constructor() {
    this.baseURL = 'https://apiv2.shiprocket.in/v1/external';
    this.email = process.env.SHIPROCKET_EMAIL;
    this.password = process.env.SHIPROCKET_PASSWORD;
    this.token = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    // Return early if we have a valid token
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    // If no credentials, we use mock mode
    if (!this.email || !this.password) {
      console.warn('SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD not found. Running Shiprocket Service in MOCK mode.');
      return 'MOCK_TOKEN';
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email: this.email,
        password: this.password
      });

      this.token = response.data.token;
      // Tokens usually expire in 10 days, setting a safe 24-hour expiry to auto-refresh
      this.tokenExpiry = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); 
      return this.token;
    } catch (error) {
      console.error('Shiprocket Auth Error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Shiprocket API');
    }
  }

  async getServiceability(params) {
    const {
      pickup_postcode,
      delivery_postcode,
      delivery_country, // E.g., 'US', 'GB', 'IN'
      weight,           // in kg
      cod = 0
    } = params;

    const token = await this.authenticate();

    // MOCK MODE if no token or mock token is used
    if (token === 'MOCK_TOKEN') {
      return this.getMockServiceability(delivery_country, weight);
    }

    try {
      // Check if International
      const isInternational = delivery_country && delivery_country.toUpperCase() !== 'IN';
      
      let endpoint = '';
      let queryParams = {};

      if (isInternational) {
        endpoint = `${this.baseURL}/courier/international/serviceability`;
        queryParams = {
          pickup_postcode: pickup_postcode || '110001', // Fallback to a default warehouse origin
          delivery_country,
          weight: weight || 0.5,
          delivery_postcode: delivery_postcode || ''
        };
      } else {
        endpoint = `${this.baseURL}/courier/serviceability/`;
        queryParams = {
          pickup_postcode: pickup_postcode || '110001',
          delivery_postcode,
          weight: weight || 0.5,
          cod
        };
      }

      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: queryParams
      });

      return this.parseShiprocketResponse(response.data, isInternational);

    } catch (error) {
      console.error('Shiprocket Serviceability Error:', error.response?.data || error.message);
      
      // Fallback to MOCK data if API fails so checkout doesn't break entirely
      console.warn('Shiprocket API failed. Returning mock shipping rates fallback.');
      return this.getMockServiceability(delivery_country, weight);
    }
  }

  parseShiprocketResponse(data, isInternational) {
    // Extract the cheapest or fastest available courier
    let shippingData = null;

    if (isInternational) {
      // Shiprocket international response structure
      if (data.data && data.data.available_courier_companies && data.data.available_courier_companies.length > 0) {
        const couriers = data.data.available_courier_companies;
        // Sort by lowest rate
        couriers.sort((a, b) => a.freight_charge - b.freight_charge);
        
        shippingData = {
          rate: couriers[0].freight_charge,
          courier_name: couriers[0].courier_name,
          eta: couriers[0].etd || '7-14 Days',
          is_international: true
        };
      }
    } else {
      // Shiprocket domestic response structure
      if (data.data && data.data.available_courier_companies && data.data.available_courier_companies.length > 0) {
        const couriers = data.data.available_courier_companies;
        couriers.sort((a, b) => a.rate - b.rate);

        shippingData = {
          rate: couriers[0].rate,
          courier_name: couriers[0].courier_name,
          eta: couriers[0].etd || '3-5 Days',
          is_international: false
        };
      }
    }

    if (!shippingData) {
      throw new Error('No courier serviceability found for the given location.');
    }

    return shippingData;
  }

  getMockServiceability(delivery_country, weight) {
    const isInternational = delivery_country && delivery_country.toUpperCase() !== 'IN';
    const baseWeight = weight || 0.5;

    if (isInternational) {
      return {
        rate: 1200 + (baseWeight > 0.5 ? 500 : 0), // Mock ₹1200 base + ₹500/extra kg
        courier_name: 'Mock DHL Express',
        eta: '7-10 Days',
        is_international: true
      };
    } else {
      return {
        rate: 80 + (baseWeight > 0.5 ? 40 : 0), // Mock ₹80 base + ₹40/extra kg
        courier_name: 'Mock Delhivery Surface',
        eta: '3-5 Days',
        is_international: false
      };
    }
  }
}

module.exports = new ShiprocketService();
