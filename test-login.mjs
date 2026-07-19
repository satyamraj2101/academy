fetch('https://spotclm-academy.pages.dev/api/academy/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'satyamraj620@gmail.com', password: 'Spot2026$' })
}).then(async r => {
  console.log(r.status);
  console.log(await r.text());
});
