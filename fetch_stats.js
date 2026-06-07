async function getStats() {
  try {
    const res = await fetch('http://localhost:5000/api/dashboard/stats?timeframe=today', {
      headers: {
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMjQ1MmEwMWI3MzMxNzk4MjBkYTkwZSIsImlhdCI6MTc4MDgxOTI0MywiZXhwIjoxNzgzNDExMjQzfQ.FPNRUUkApmyjfCrrYAzY0zv8MOzZN-he2CpFGSGFKyo`
      }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

getStats();
