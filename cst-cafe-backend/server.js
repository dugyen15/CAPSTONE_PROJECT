const app = require('./app');

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CST Cafe backend running on port ${PORT}`);
  console.log(`CST Cafe backend running on http://localhost:${PORT}`);
  if (!process.env.STAFF_INVITE_CODE) {
    console.log('Note: STAFF_INVITE_CODE is not set, so staff signup is turned off.');
  }
});
