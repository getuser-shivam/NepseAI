
import axios from 'axios';
import * as cheerio from 'cheerio';

async function testNepaliPaisa() {
  console.log("Testing Nepali Paisa...");
  try {
    const res = await axios.get("https://www.nepalipaisa.com/", {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);
    const index = $(".nepse-index").text().trim() || $(".index-value").text().trim();
    console.log("Nepali Paisa Index:", index);
    if (!index) {
      console.log("HTML snippet:", res.data.substring(0, 500));
    }
  } catch (e: any) {
    console.log("Nepali Paisa failed:", e.message);
  }
}

testNepaliPaisa();
