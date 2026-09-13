// Quick probe of Cloudflare API endpoints for Containers
const accountId = "24e01fd9ec8cf5cfacdd3ec70623b9c0";
const token = process.env.CF_TOKEN || "";

const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const endpoints = [
  `/accounts/${accountId}/containers/builds`,
  `/accounts/${accountId}/containers/images`,
  `/accounts/${accountId}/containers/registry`,
  `/accounts/${accountId}/builds`,
  `/accounts/${accountId}/workers/builds`,
];

for (const endpoint of endpoints) {
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4${endpoint}`, { headers });
    const text = await res.text();
    const data = JSON.parse(text);
    console.log(`${endpoint} -> ${res.status} | ${JSON.stringify(data).slice(0, 300)}`);
  } catch (e) {
    console.log(`${endpoint} -> ERROR: ${e.message}`);
  }
}
