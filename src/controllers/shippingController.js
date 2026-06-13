const Product = require('../models/Product');
const shiprocketService = require('../services/shiprocketService');

// @desc    Calculate Shipping & Final Price
// @route   POST /api/shipping/calculate
// @access  Public
const calculateShippingAndPrice = async (req, res, next) => {
  try {
    const { 
      productId, 
      country, 
      pincode, 
      weight, 
      basePrice // optional if productId is passed
    } = req.body;

    if (!country) {
      return res.status(400).json({ success: false, message: 'Country is required' });
    }

    let actualWeight = weight || 0.5; // Default 500g
    let actualBasePrice = basePrice || 0;
    let indiaShippingIncluded = true;
    let intlShippingType = 'dynamic';

    // If Product ID is provided, fetch weight and price from DB
    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      
      actualWeight = product.weight || actualWeight;
      actualBasePrice = product.price || actualBasePrice;
      indiaShippingIncluded = product.indiaShippingIncluded !== false; // Default true
      intlShippingType = product.intlShippingType || 'dynamic';
    }

    const isIndia = country.toUpperCase() === 'IN' || country.toUpperCase() === 'INDIA';

    // Get Shiprocket Serviceability (Mock or Real)
    const shiprocketData = await shiprocketService.getServiceability({
      pickup_postcode: '110001', // Your origin warehouse pincode
      delivery_postcode: isIndia ? pincode : '',
      delivery_country: isIndia ? 'IN' : country.toUpperCase(),
      weight: actualWeight
    });

    let finalPrice = actualBasePrice;
    let displayShippingCost = 0;
    let message = '';

    // Apply the Pricing Model Logic
    if (isIndia) {
      if (indiaShippingIncluded) {
        // Option A: FREE SHIPPING Strategy for India
        displayShippingCost = 0;
        finalPrice = actualBasePrice; // Price already includes the shipping buffer
        message = 'Free Shipping applied';
      } else {
        // Option B: Charge shipping separately for India
        displayShippingCost = shiprocketData.rate;
        finalPrice = actualBasePrice + displayShippingCost;
        message = 'Standard Shipping applied';
      }
    } else {
      // International
      if (intlShippingType === 'dynamic') {
        displayShippingCost = shiprocketData.rate;
        finalPrice = actualBasePrice + displayShippingCost;
        message = 'Dynamic International Shipping applied';
      } else if (intlShippingType === 'flat') {
        displayShippingCost = 1500; // Flat example
        finalPrice = actualBasePrice + displayShippingCost;
        message = 'Flat International Shipping applied';
      } else if (intlShippingType === 'free') {
        displayShippingCost = 0;
        finalPrice = actualBasePrice;
        message = 'Free International Shipping applied';
      }
    }

    res.status(200).json({
      success: true,
      data: {
        isIndia,
        basePrice: actualBasePrice,
        shippingCost: displayShippingCost,
        finalPrice,
        currency: isIndia ? 'INR' : 'INR', // Or convert to USD dynamically
        courier: shiprocketData.courier_name,
        eta: shiprocketData.eta,
        internal_actual_shipping_cost: shiprocketData.rate // For admin to see actual cost even if giving "Free Shipping"
      },
      message
    });

  } catch (error) {
    console.error('Shipping Calc Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error calculating shipping' });
  }
};

module.exports = {
  calculateShippingAndPrice
};
