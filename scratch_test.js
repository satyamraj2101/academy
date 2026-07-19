import fs from 'fs';

async function test() {
  const email = 'satyamraj620@gmail.com';
  const password = 'Spot2026$';

  const loginRes = await fetch('https://spotclm-academy.pages.dev/api/academy/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!loginRes.ok) {
    console.log('Login failed:', loginRes.status, await loginRes.text());
    return;
  }

  const loginData = await loginRes.json();
  const cookies = loginRes.headers.getSetCookie();

  const treeRes = await fetch('https://spotclm-academy.pages.dev/api/academy/referrals/tree', {
    headers: { 'Cookie': cookies.join('; ') }
  });

  const text = await treeRes.text();
  console.log('Tree status:', treeRes.status);
  console.log('Tree response:', text);
}

test().catch(console.error);
