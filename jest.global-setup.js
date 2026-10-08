// Run every test in a time zone with daylight saving, so DST bugs show up wherever the tests run.
module.exports = () => {
  process.env.TZ = 'America/New_York';
};
