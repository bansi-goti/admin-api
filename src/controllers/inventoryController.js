const Product = require('../models/Product');

exports.getInventoryOverview = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    // Base filter
    const query = {};
    if (req.user && req.user.role !== 'admin') {
      query.seller = req.user._id;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Fetch Products
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalItems = await Product.countDocuments(query);

    // Calculate Stats across ALL products (ignoring search filter for global stats)
    const baseQuery = {};
    if (req.user && req.user.role !== 'admin') {
      baseQuery.seller = req.user._id;
    }
    const allProducts = await Product.find(baseQuery).populate('category', 'name');
    
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValue = 0;
    const LOW_STOCK_THRESHOLD = 10; // Can be dynamic

    const alerts = [];
    const categoryMap = {};

    allProducts.forEach(p => {
      const stock = p.stock || 0;
      const price = p.price || 0;
      totalValue += (stock * price);

      let status = 'In Stock';
      if (stock === 0) {
        status = 'Out of Stock';
        outOfStockCount++;
      } else if (stock <= LOW_STOCK_THRESHOLD) {
        status = 'Low Stock';
        lowStockCount++;
      } else {
        inStockCount++;
      }

      // Collect alerts
      if (status !== 'In Stock') {
        alerts.push({
          name: p.name,
          sku: p.sku,
          status,
          stock: stock.toString(),
          updated: p.updatedAt,
          image: p.mainImage || (p.images && p.images[0]) || ''
        });
      }

      // Collect category stats
      const catName = (p.category && p.category.name) ? p.category.name : 'Uncategorized';
      if (!categoryMap[catName]) categoryMap[catName] = 0;
      categoryMap[catName]++;
    });

    // Format products for table
    const inventory = products.map(p => {
      let status = 'In Stock';
      const stock = p.stock || 0;
      if (stock === 0) status = 'Out of Stock';
      else if (stock <= LOW_STOCK_THRESHOLD) status = 'Low Stock';

      return {
        id: p._id,
        name: p.name,
        subtitle: p.subcategory || '',
        sku: p.sku,
        category: (p.category && p.category.name) ? p.category.name : 'Uncategorized',
        qty: stock,
        status,
        value: `₹${((p.price || 0) * stock).toLocaleString()}`,
        updated: new Date(p.updatedAt).toLocaleDateString('en-GB') + '\n' + new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image: p.mainImage || (p.images && p.images[0]) || 'https://placehold.co/150'
      };
    });

    const totalProducts = allProducts.length;

    const stats = [
      { label: "Total Products", value: totalProducts.toString() },
      { label: "In Stock", value: inStockCount.toString(), subtitle: totalProducts ? `${((inStockCount/totalProducts)*100).toFixed(1)}% of total` : '0%' },
      { label: "Low Stock", value: lowStockCount.toString(), subtitle: totalProducts ? `${((lowStockCount/totalProducts)*100).toFixed(1)}% of total` : '0%' },
      { label: "Out of Stock", value: outOfStockCount.toString(), subtitle: totalProducts ? `${((outOfStockCount/totalProducts)*100).toFixed(1)}% of total` : '0%' },
      { label: "Inventory Value", value: `₹${totalValue.toLocaleString()}` }
    ];

    const pieData = [
      { name: "In Stock", value: inStockCount, color: "#10b981" },
      { name: "Low Stock", value: lowStockCount, color: "#f59e0b" },
      { name: "Out of Stock", value: outOfStockCount, color: "#ef4444" }
    ];

    // Format category stock
    const categoryStock = Object.keys(categoryMap).map(cat => ({
      name: cat,
      count: categoryMap[cat],
      percentage: totalProducts ? ((categoryMap[cat] / totalProducts) * 100).toFixed(1) : 0,
      barWidth: totalProducts ? ((categoryMap[cat] / totalProducts) * 100) : 0,
      color: "#8b5cf6"
    })).sort((a, b) => b.count - a.count).slice(0, 6); // Top 6

    res.status(200).json({
      success: true,
      data: {
        inventory,
        stats,
        pieData,
        alerts: alerts.slice(0, 10), // Send top 10 alerts
        categoryStock,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / limitNum),
          currentPage: pageNum
        }
      }
    });

  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({ success: false, message: 'Server error fetching inventory stats' });
  }
};
