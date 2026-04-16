import nepse from 'nepse-api-helper';
import { nepseAxios, BASE_URL } from 'nepse-api-helper';

async function test() {
  try {
    console.log("Initializing...");
    await nepse.initialize();
    
    console.log("Getting Market Summary...");
    const response = await nepseAxios.get(`${BASE_URL}/nots/market-summary/`);
    console.log("Summary:", response.data);
  } catch (e) {
    console.error(e);
  }
}
test();
