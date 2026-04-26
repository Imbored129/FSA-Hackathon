const amazonScraper = require('amazon-buddy');

module.exports = async (req, res) => {
  const { asin } = req.query;
  if (!asin) return res.status(400).json({ error: 'asin required' });

  try {
    const result = await amazonScraper.asin({ asin, randomUa: true, cookie: '' });
    const p = result.result?.[0];
    if (!p) return res.status(404).json({ error: 'not found' });

    return res.json({
      price: p.price?.current_price || 0,
      beforePrice: p.price?.before_price || 0,
      discounted: p.price?.discounted || false,
      title: p.title?.trim() || '',
      rating: p.reviews?.rating || 0,
      image: p.main_image || '',
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
