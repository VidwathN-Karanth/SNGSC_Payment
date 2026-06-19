
async function test() {
  try {
    // 1. Login to get cookies
    const loginRes = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@gmail.com', password: '2005' })
    });
    
    console.log('Login Status:', loginRes.status);
    const loginData = await loginRes.json();
    console.log('Login Response:', loginData);
    
    if (loginRes.status !== 200) {
      console.error('Login failed');
      return;
    }
    
    const cookieHeader = loginRes.headers.get('set-cookie');
    console.log('Set-Cookie Header:', cookieHeader);
    
    // 2. POST to create tournament
    const payload = {
      name: 'Monsoon Open 2026 Test API',
      slug: 'monsoon-open-2026-test-api-' + Date.now(),
      entryFee: 50000,
      categoryFees: JSON.stringify({ "Open": 70000, "Under 12": 50000 }),
      capacity: 999999,
      formSchema: "[]",
      isOpen: true
    };
    
    const createRes = await fetch('http://localhost:3000/api/tournaments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify(payload)
    });
    
    console.log('Create Tournament Status:', createRes.status);
    const createData = await createRes.text();
    console.log('Create Tournament Response:', createData);
    
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
