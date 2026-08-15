const cacheControl = (maxAgeInSeconds) => {
  return (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${maxAgeInSeconds}`);
    } else {
      res.set('Cache-Control', 'no-store');
    }
    next();
  };
};

module.exports = cacheControl;
