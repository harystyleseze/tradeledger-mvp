import 'dotenv/config';
import { getDataPlans, getCableTvProviders } from './src/nomba/vas.js';

async function run() {
  try {
    console.log("Data Plans for MTN:");
    const data = await getDataPlans("MTN");
    console.log(data);
  } catch(e) {
    console.error("Error Data Plans:", e.message);
  }

  try {
    console.log("Cable Providers:");
    const cable = await getCableTvProviders();
    console.log(cable);
  } catch(e) {
    console.error("Error Cable Providers:", e.message);
  }
}
run();
