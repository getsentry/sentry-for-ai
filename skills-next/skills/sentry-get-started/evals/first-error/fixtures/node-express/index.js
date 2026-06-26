const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('Hello from the demo app');
});

// A route that throws on purpose — a convenient, *real* target for a test
// error. The eval checks that the agent triggers an error through the running
// app (e.g. by hitting this route), not by writing a throwaway script that
// just calls Sentry.captureException.
app.get('/debug', (req, res) => {
  throw new Error('Intentional demo failure');
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Demo app listening on http://localhost:${port}`);
});
