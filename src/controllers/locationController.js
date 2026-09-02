const Location = require('../models/Location');

// @desc    Get all states in India
// @route   GET /api/locations/states
// @access  Public
const getStates = async (req, res, next) => {
  try {
    const locations = await Location.find({}, 'state').sort({ state: 1 });
    const states = locations.map((loc) => loc.state);
    res.status(200).json({
      success: true,
      data: states,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get cities by state
// @route   GET /api/locations/cities
// @access  Public
const getCitiesByState = async (req, res, next) => {
  try {
    const { state } = req.query;
    if (!state) {
      return res.status(400).json({
        success: false,
        message: 'State query parameter is required',
      });
    }

    const location = await Location.findOne({
      state: { $regex: new RegExp('^' + state.trim() + '$', 'i') },
    });

    if (!location) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const sortedCities = (location.cities || []).sort((a, b) => a.localeCompare(b));

    res.status(200).json({
      success: true,
      data: sortedCities,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Seed locations
// @route   POST /api/locations/seed
// @access  Public
const seedLocations = async (req, res, next) => {
  try {
    const locationsData = req.body.locations || [];
    if (!Array.isArray(locationsData) || locationsData.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid locations data array' });
    }

    for (const loc of locationsData) {
      await Location.findOneAndUpdate(
        { state: loc.state },
        { state: loc.state, cities: loc.cities },
        { upsert: true, new: true, returnDocument: 'after' }
      );
    }

    res.status(200).json({ success: true, message: `Successfully seeded ${locationsData.length} states and cities!` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStates,
  getCitiesByState,
  seedLocations,
};
