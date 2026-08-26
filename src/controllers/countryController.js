const Country = require('../models/Country');
const axios = require('axios');

const COUNTRY_CURRENCY_MAP = {
  'india': { code: 'INR', name: 'Indian Rupee', symbol: '₹', exchangeRate: 1 },
  'united states': { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 0.012 },
  'usa': { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 0.012 },
  'united kingdom': { code: 'GBP', name: 'British Pound', symbol: '£', exchangeRate: 0.0094 },
  'uk': { code: 'GBP', name: 'British Pound', symbol: '£', exchangeRate: 0.0094 },
  'european union': { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 0.011 },
  'germany': { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 0.011 },
  'france': { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 0.011 },
  'italy': { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 0.011 },
  'spain': { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 0.011 },
  'united arab emirates': { code: 'AED', name: 'UAE Dirham', symbol: 'AED', exchangeRate: 0.044 },
  'uae': { code: 'AED', name: 'UAE Dirham', symbol: 'AED', exchangeRate: 0.044 },
  'canada': { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', exchangeRate: 0.016 },
  'australia': { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', exchangeRate: 0.018 },
  'singapore': { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', exchangeRate: 0.016 },
  'saudi arabia': { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', exchangeRate: 0.045 },
  'qatar': { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', exchangeRate: 0.044 },
  'japan': { code: 'JPY', name: 'Japanese Yen', symbol: '¥', exchangeRate: 1.8 },
};

// Helper: fetch currency info for a country name via restcountries API with dictionary fallback
const fetchCurrencyForCountry = async (countryName) => {
  const normalized = (countryName || '').toLowerCase().trim();
  if (COUNTRY_CURRENCY_MAP[normalized]) {
    return COUNTRY_CURRENCY_MAP[normalized];
  }

  try {
    const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true&fields=currencies`;
    const resp = await axios.get(url, { timeout: 3500 });
    const data = Array.isArray(resp.data) ? resp.data[0] : null;
    if (data?.currencies) {
      const firstKey = Object.keys(data.currencies)[0];
      if (firstKey) {
        return {
          code: firstKey,
          name: data.currencies[firstKey]?.name || '',
          symbol: data.currencies[firstKey]?.symbol || '',
        };
      }
    }
  } catch (e) {}

  return { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 0.012 };
};

// @desc Get live exchange rates endpoint for admin panel
const getLiveRates = async (req, res, next) => {
  try {
    let rates = {
      INR: 1,
      USD: 0.012,
      GBP: 0.0094,
      EUR: 0.011,
      AED: 0.044,
      CAD: 0.016,
      AUD: 0.018,
      SGD: 0.016,
      SAR: 0.045,
      QAR: 0.044,
      JPY: 1.8,
    };

    try {
      const resp = await axios.get('https://open.er-api.com/v6/latest/INR', { timeout: 4000 });
      if (resp.data && resp.data.rates) {
        rates = { ...rates, ...resp.data.rates };
      }
    } catch (e) {}

    res.status(200).json({
      success: true,
      data: rates,
      rates: rates,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all countries (with pagination & search)
// @route   GET /api/countries
// @access  Private
const getAllCountries = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.page_size) || 10;
    const search = req.query.search || '';

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const startIndex = (page - 1) * limit;
    const total = await Country.countDocuments(query);

    const countries = await Country.find(query)
      .populate('seller', 'name email')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: countries,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single country
// @route   GET /api/countries/:id
// @access  Private
const getCountryById = async (req, res, next) => {
  try {
    const country = await Country.findById(req.params.id).populate('seller', 'name email');

    if (!country) {
      return res.status(404).json({ success: false, message: 'Country not found' });
    }

    res.status(200).json({
      success: true,
      data: country,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new country
// @route   POST /api/countries
// @access  Private
const createCountry = async (req, res, next) => {
  try {
    const { name, status } = req.body;

    const existingCountry = await Country.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCountry) {
      return res.status(400).json({ success: false, message: 'Country already exists' });
    }

    // Auto-fetch currency info
    const currency = await fetchCurrencyForCountry(name);

    const country = await Country.create({
      name,
      status,
      currency: currency || { code: '', name: '', symbol: '' },
      seller: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: country,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update country
// @route   PUT /api/countries/:id
// @access  Private
const updateCountry = async (req, res, next) => {
  try {
    const { name, status } = req.body;

    let country = await Country.findById(req.params.id);

    if (!country) {
      return res.status(404).json({ success: false, message: 'Country not found' });
    }

    if (name && name !== country.name) {
      const existingCountry = await Country.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (existingCountry && existingCountry._id.toString() !== req.params.id) {
        return res.status(400).json({ success: false, message: 'Country name already exists' });
      }
    }

    // Re-fetch currency if name changed or currency is missing
    let currency = country.currency;
    if ((name && name !== country.name) || !country.currency?.code) {
      const fetched = await fetchCurrencyForCountry(name || country.name);
      if (fetched) currency = fetched;
    }

    country = await Country.findByIdAndUpdate(
      req.params.id,
      { name, status, currency },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: country,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete country
// @route   DELETE /api/countries/:id
// @access  Private
const deleteCountry = async (req, res, next) => {
  try {
    const country = await Country.findById(req.params.id);

    if (!country) {
      return res.status(404).json({ success: false, message: 'Country not found' });
    }

    await country.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Country deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCountries,
  getCountryById,
  createCountry,
  updateCountry,
  deleteCountry,
  getLiveRates,
};
