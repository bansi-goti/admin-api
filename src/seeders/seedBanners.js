require('dotenv').config();
const connectDB = require('../config/db');
const Advertisement = require('../models/Advertisement');

const sampleBanners = [
  {
    title: 'TIMELESS ELEGANCE',
    startDate: '2026-01-01',
    startTime: '00:00',
    endDate: '2030-12-31',
    endTime: '23:59',
    status: 'Active',
    type: 'Video',
    media: [
      {
        url: '/hero_video.mp4',
        type: 'video',
      },
    ],
  },
  {
    title: 'ROYAL SPLENDOR',
    startDate: '2026-01-01',
    startTime: '00:00',
    endDate: '2030-12-31',
    endTime: '23:59',
    status: 'Active',
    type: 'Image',
    media: [
      {
        url: '/hero.png',
        type: 'image',
      },
    ],
  },
  {
    title: 'GOLDEN HERITAGE',
    startDate: '2026-01-01',
    startTime: '00:00',
    endDate: '2030-12-31',
    endTime: '23:59',
    status: 'Active',
    type: 'Image',
    media: [
      {
        url: '/hero_bg.png',
        type: 'image',
      },
    ],
  },
];

async function seedBanners() {
  try {
    await connectDB();
    console.log('🌱 Starting Banners Seeder...');

    await Advertisement.deleteMany({});
    console.log('🧹 Cleared previous Advertisements collection.');

    await Advertisement.insertMany(sampleBanners);
    console.log('🎉 Banners Seeder completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Banners Seeder failed:', error);
    process.exit(1);
  }
}

seedBanners();
