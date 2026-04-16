import axios from 'axios';
import * as cheerio from 'cheerio';

async function testFloorsheet() {
  console.log("Testing Floorsheet...");
  try {
    const res = await axios.get("https://www.sharesansar.com/floorsheet", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      timeout: 10000
    });
    const $ = cheerio.load(res.data);
    $("script").each((i, el) => {
      const text = $(el).html();
      if (text && text.includes("ajax")) {
        console.log("Found ajax script:", text.substring(1000, 2000));
      }
    });
  } catch (e: any) {
    console.log("Floorsheet failed:", e.message);
  }
}

testFloorsheet();
