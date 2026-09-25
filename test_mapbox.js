const fetch = require('node-fetch');
async function run() {
  const token = 'YOUR_MAPBOX_TOKEN_HERE';
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/73.9315,18.5529;73.9452,18.5478?alternatives=true&geometries=geojson&steps=true&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(JSON.stringify(data.routes[0].geometry.coordinates.slice(0, 2)));
  console.log(JSON.stringify(data.routes[0].legs[0].steps[0]));
}
run().catch(console.error);
