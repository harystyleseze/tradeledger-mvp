import 'dotenv/config';
import { getElectricityProviders } from './src/nomba/vas.js';
async function run() {
  try {
    const p = await getElectricityProviders();
    console.log("Providers:", JSON.stringify(p, null, 2));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
