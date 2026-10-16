const app = require('./app');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`CST Cafe backend running on http://localhost:${PORT}`);
  if (!process.env.STAFF_INVITE_CODE) {
    console.log('Note: STAFF_INVITE_CODE is not set, so staff signup is turned off.');
  }
});
