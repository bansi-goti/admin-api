const Country = require('../models/Country');

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
        totalData: total,
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

    const country = await Country.create({
      name,
      status,
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

    country = await Country.findByIdAndUpdate(
      req.params.id,
      { name, status },
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
};
