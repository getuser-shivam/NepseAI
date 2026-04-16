import * as nepse from 'nepse-api-unofficial';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function test() {
  try {
    console.log("Exports:", Object.keys(nepse));
    const summary = await nepse.getSummary();
    console.log("Summary:", summary);
    
    // Let's see if there's a broker method
    // 'getTopTenTradeScrips', 'getTopTenTransactions', 'getTopTenTurnover'
    // There doesn't seem to be a direct getBrokers method, but maybe we can fetch floorsheet?
    // Let's check what other methods are there.
  } catch (e) {
    console.error(e);
  } finally {
    await nepse.shutdownWorkerPool();
  }
}
test();
