import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
async function startServer() {
    const app = express();
    const PORT = Number(process.env.PORT) || 3000;
    app.use(express.json());
    const USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0"
    ];
    const getHeaders = () => ({
        "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
    });
    // API Routes
    app.get("/api/nepse/indices", async (req, res) => {
        try {
            let indices = [];
            // Try Sharesansar first
            try {
                const response = await axios.get("https://www.sharesansar.com/market", { headers: getHeaders(), timeout: 10000 });
                const $ = cheerio.load(response.data);
                $("table tr").each((i, el) => {
                    const cols = $(el).find("td");
                    if (cols.length >= 4) {
                        const name = $(cols[0]).text().trim();
                        const value = parseFloat($(cols[1]).text().replace(/,/g, "")) || 0;
                        const change = parseFloat($(cols[2]).text().replace(/,/g, "")) || 0;
                        const percent = parseFloat($(cols[3]).text().replace(/[^0-9.-]/g, "")) || 0;
                        if (name && value > 0 && !indices.find(idx => idx.name === name)) {
                            indices.push({ name, value, change, percentChange: percent });
                        }
                    }
                });
            }
            catch (e) {
                // Fallback to Merolagani
            }
            if (indices.length === 0) {
                try {
                    const response = await axios.get("https://merolagani.com/Indices.aspx", { headers: getHeaders(), timeout: 10000 });
                    const $ = cheerio.load(response.data);
                    $("table tr").each((i, el) => {
                        const cols = $(el).find("td");
                        if (cols.length >= 4) {
                            const name = $(cols[0]).text().trim();
                            if (name && !name.includes("Index") && name !== "Indices") {
                                indices.push({
                                    name,
                                    value: parseFloat($(cols[1]).text().replace(/,/g, "")) || 0,
                                    change: parseFloat($(cols[2]).text().replace(/,/g, "")) || 0,
                                    percentChange: parseFloat($(cols[3]).text().replace(/,/g, "")) || 0
                                });
                            }
                        }
                    });
                }
                catch (e) {
                    // Silently fail
                }
            }
            res.json(indices);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch indices" });
        }
    });
    app.get("/api/nepse/today", async (req, res) => {
        try {
            let stocks = [];
            // Primary: Sharesansar
            try {
                const response = await axios.get("https://www.sharesansar.com/today-share-price", { headers: getHeaders(), timeout: 10000 });
                const $ = cheerio.load(response.data);
                const table = $("#today-share-price-table").length > 0
                    ? $("#today-share-price-table")
                    : $("table").filter((i, el) => $(el).text().includes("Symbol") && $(el).text().includes("LTP"));
                table.find("tbody tr").each((i, el) => {
                    const cols = $(el).find("td");
                    if (cols.length >= 10) {
                        const symbol = $(cols[1]).text().trim();
                        if (symbol && symbol !== "Symbol") {
                            stocks.push({
                                symbol,
                                name: $(cols[2]).text().trim(),
                                ltp: parseFloat($(cols[3]).text().replace(/,/g, "")) || 0,
                                change: parseFloat($(cols[4]).text().replace(/,/g, "")) || 0,
                                changePercent: parseFloat($(cols[5]).text().replace(/,/g, "")) || 0,
                                high: parseFloat($(cols[6]).text().replace(/,/g, "")) || 0,
                                low: parseFloat($(cols[7]).text().replace(/,/g, "")) || 0,
                                open: parseFloat($(cols[8]).text().replace(/,/g, "")) || 0,
                                volume: parseFloat($(cols[9]).text().replace(/,/g, "")) || 0,
                                turnover: parseFloat($(cols[10]).text().replace(/,/g, "")) || 0,
                                sector: "Others"
                            });
                        }
                    }
                });
            }
            catch (e) {
                // Fallback
            }
            if (stocks.length === 0) {
                try {
                    const response = await axios.get("https://merolagani.com/LatestMarket.aspx", { headers: getHeaders(), timeout: 10000 });
                    const $ = cheerio.load(response.data);
                    const table = $("#ctl00_ContentPlaceHolder1_LiveMarket_dgLiveMarket").length > 0
                        ? $("#ctl00_ContentPlaceHolder1_LiveMarket_dgLiveMarket")
                        : $("table").filter((i, el) => $(el).text().includes("LTP") && $(el).text().includes("Symbol"));
                    table.find("tr").each((i, el) => {
                        if (i > 0) {
                            const cols = $(el).find("td");
                            if (cols.length >= 8) {
                                const symbol = $(cols[0]).text().trim();
                                if (symbol && symbol !== "Symbol") {
                                    stocks.push({
                                        symbol,
                                        ltp: parseFloat($(cols[1]).text().replace(/,/g, "")) || 0,
                                        changePercent: parseFloat($(cols[2]).text().replace(/,/g, "")) || 0,
                                        high: parseFloat($(cols[3]).text().replace(/,/g, "")) || 0,
                                        low: parseFloat($(cols[4]).text().replace(/,/g, "")) || 0,
                                        open: parseFloat($(cols[5]).text().replace(/,/g, "")) || 0,
                                        volume: parseFloat($(cols[6]).text().replace(/,/g, "")) || 0,
                                        name: symbol,
                                        change: 0,
                                        turnover: 0,
                                        sector: "Others"
                                    });
                                }
                            }
                        }
                    });
                }
                catch (e) {
                    // Silently fail
                }
            }
            res.json(stocks);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch data" });
        }
    });
    app.get("/api/nepse/summary", async (req, res) => {
        try {
            let summary = null;
            // Try Sharesansar first
            try {
                const response = await axios.get("https://www.sharesansar.com/market", { headers: getHeaders(), timeout: 10000 });
                const $ = cheerio.load(response.data);
                let indexValue = "0.00";
                let indexChange = "0.00";
                let indexPercent = "0.00%";
                let marketStatus = "Closed";
                const statusText = $(".market-status").text().trim() || $(":contains('Market')").filter((i, el) => $(el).text().includes("Open") || $(el).text().includes("Closed")).first().text().trim();
                if (statusText.toLowerCase().includes("open"))
                    marketStatus = "Open";
                $("table tr").each((i, el) => {
                    const text = $(el).text();
                    if (text.includes("NEPSE Index")) {
                        const cols = $(el).find("td");
                        if (cols.length >= 4) {
                            const val = $(cols[1]).text().trim().replace(/,/g, "");
                            const numVal = parseFloat(val);
                            // NEPSE Index is usually between 500 and 5000. Turnover is in billions.
                            if (numVal > 0 && numVal < 10000) {
                                indexValue = $(cols[1]).text().trim();
                                indexChange = $(cols[2]).text().trim();
                                indexPercent = $(cols[3]).text().trim();
                            }
                        }
                    }
                });
                if (indexValue && indexValue !== "0.00") {
                    summary = {
                        index: indexValue,
                        change: indexChange,
                        percentChange: indexPercent,
                        turnover: $(".market-summary-item:contains('Turnover'), td:contains('Turnover')").next().text().trim() || "0.00",
                        volume: $(".market-summary-item:contains('Volume'), td:contains('Volume')").next().text().trim() || "0",
                        advancers: parseInt($(".market-summary-item:contains('Up'), .text-success").first().text()) || 0,
                        decliners: parseInt($(".market-summary-item:contains('Down'), .text-danger").first().text()) || 0,
                        unchanged: parseInt($(".market-summary-item:contains('Unchanged'), .text-info").first().text()) || 0,
                        status: marketStatus
                    };
                }
            }
            catch (e) {
                // Fallback to Merolagani
            }
            if (!summary) {
                try {
                    const response = await axios.get("https://merolagani.com/LatestMarket.aspx", { headers: getHeaders(), timeout: 10000 });
                    const $ = cheerio.load(response.data);
                    const index = $("#ctl00_ContentPlaceHolder1_MarketSummary_lblNepseIndex").text().trim() ||
                        $(".market-summary").find(":contains('NEPSE Index')").next().text().trim();
                    if (index && index !== "0.00" && index !== "") {
                        summary = {
                            index,
                            change: $("#ctl00_ContentPlaceHolder1_MarketSummary_lblNepseChange").text().trim() || "0.00",
                            percentChange: $("#ctl00_ContentPlaceHolder1_MarketSummary_lblNepsePercentChange").text().trim() || "0.00%",
                            turnover: $("#ctl00_ContentPlaceHolder1_MarketSummary_lblTotalTurnover").text().trim() || "0.00",
                            volume: $("#ctl00_ContentPlaceHolder1_MarketSummary_lblTotalVolume").text().trim() || "0",
                            advancers: parseInt($(".market-summary .text-success").first().text()) || 0,
                            decliners: parseInt($(".market-summary .text-danger").first().text()) || 0,
                            unchanged: parseInt($(".market-summary .text-info").first().text()) || 0,
                            status: $("#ctl00_ContentPlaceHolder1_MarketSummary_lblMarketStatus").text().trim() || "Closed"
                        };
                    }
                }
                catch (e) {
                    // Silently fail
                }
            }
            if (!summary) {
                summary = {
                    index: "0.00",
                    change: "0.00",
                    percentChange: "0.00%",
                    turnover: "0.00",
                    volume: "0",
                    advancers: 0,
                    decliners: 0,
                    unchanged: 0
                };
            }
            res.json(summary);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch summary" });
        }
    });
    app.get("/api/nepse/news", async (req, res) => {
        try {
            const response = await axios.get("https://www.sharesansar.com/category/latest", { headers: getHeaders(), timeout: 10000 });
            const $ = cheerio.load(response.data);
            const news = [];
            $(".featured-news-list").each((i, el) => {
                if (i < 10) {
                    const title = $(el).find("h4").text().trim();
                    const link = $(el).find("a").attr("href");
                    const date = $(el).find(".text-org").text().trim();
                    const summary = $(el).find("p").text().trim();
                    if (title) {
                        // Simple sentiment analysis based on keywords
                        let sentiment = "neutral";
                        const lowerTitle = title.toLowerCase();
                        if (lowerTitle.includes("gain") || lowerTitle.includes("profit") || lowerTitle.includes("rise") || lowerTitle.includes("surge") || lowerTitle.includes("positive")) {
                            sentiment = "positive";
                        }
                        else if (lowerTitle.includes("loss") || lowerTitle.includes("fall") || lowerTitle.includes("decline") || lowerTitle.includes("negative") || lowerTitle.includes("drop")) {
                            sentiment = "negative";
                        }
                        news.push({ title, link, date, source: "Sharesansar", sentiment, summary });
                    }
                }
            });
            res.json(news);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch news" });
        }
    });
    app.get("/api/nepse/corporate-actions", async (req, res) => {
        try {
            const response = await axios.get("https://www.sharesansar.com/category/announcements", { headers: getHeaders(), timeout: 10000 });
            const $ = cheerio.load(response.data);
            const actions = [];
            $(".featured-news-list").each((i, el) => {
                if (i < 15) {
                    const title = $(el).find("h4").text().trim();
                    const date = $(el).find(".text-org").text().trim();
                    let type = "AGM";
                    if (title.includes("Dividend"))
                        type = "Dividend";
                    else if (title.includes("IPO"))
                        type = "IPO";
                    else if (title.includes("Right"))
                        type = "Right";
                    else if (title.includes("Bonus"))
                        type = "Bonus";
                    else if (title.includes("Book Closure"))
                        type = "BookClosure";
                    actions.push({
                        symbol: title.split(" ")[0].replace(/[^A-Z]/g, ""),
                        type,
                        description: title,
                        date,
                        status: "Upcoming"
                    });
                }
            });
            res.json(actions);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch corporate actions" });
        }
    });
    app.get("/api/nepse/stock/:symbol", async (req, res) => {
        try {
            const { symbol } = req.params;
            // In a real app, we'd scrape a specific page for this symbol
            // e.g., https://www.sharesansar.com/company/NICA
            const dividendHistory = [];
            const brokerData = {
                topBuyers: [],
                topSellers: []
            };
            res.json({ symbol, dividendHistory, brokerData });
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch stock details" });
        }
    });
    app.get("/api/nepse/history/:symbol", async (req, res) => {
        try {
            const { symbol } = req.params;
            // Simulating 30 days of historical data
            const history = [];
            let basePrice = 500; // Default base
            // Try to get current price to make simulation realistic
            try {
                const response = await axios.get("https://www.sharesansar.com/today-share-price");
                const $ = cheerio.load(response.data);
                $("#today-share-price-table tbody tr").each((i, el) => {
                    const cols = $(el).find("td");
                    if ($(cols[1]).text().trim() === symbol) {
                        basePrice = parseFloat($(cols[3]).text().replace(/,/g, "")) || 500;
                    }
                });
            }
            catch (e) { }
            for (let i = 30; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const change = (Math.random() - 0.45) * 10; // Slight upward bias
                basePrice += change;
                // Simple RSI calculation simulation
                const rsi = 40 + Math.random() * 40;
                // Bollinger Bands simulation
                const sma = basePrice;
                const stdDev = 5 + Math.random() * 5;
                const upperBand = sma + (stdDev * 2);
                const lowerBand = sma - (stdDev * 2);
                // EMA simulation
                const ema = basePrice * (1 + (Math.random() - 0.5) * 0.02);
                history.push({
                    date: date.toISOString().split("T")[0],
                    price: parseFloat(basePrice.toFixed(2)),
                    volume: Math.floor(Math.random() * 50000) + 10000,
                    rsi: parseFloat(rsi.toFixed(2)),
                    bb: {
                        upper: parseFloat(upperBand.toFixed(2)),
                        lower: parseFloat(lowerBand.toFixed(2)),
                        sma: parseFloat(sma.toFixed(2)),
                    },
                    ema: parseFloat(ema.toFixed(2)),
                    macd: {
                        value: (Math.random() - 0.5) * 5,
                        signal: (Math.random() - 0.5) * 4,
                        histogram: (Math.random() - 0.5) * 2,
                    }
                });
            }
            res.json(history);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch history" });
        }
    });
    app.get("/api/nepse/brokers", async (req, res) => {
        try {
            const { symbol } = req.query;
            if (symbol) {
                const generateBrokers = (count) => {
                    return Array.from({ length: count }).map(() => ({
                        broker: Math.floor(Math.random() * 60) + 1,
                        quantity: Math.floor(Math.random() * 50000) + 1000
                    })).sort((a, b) => b.quantity - a.quantity);
                };
                res.json({
                    topBuyers: generateBrokers(5),
                    topSellers: generateBrokers(5)
                });
            }
            else {
                const brokers = [];
                res.json(brokers);
            }
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch brokers" });
        }
    });
    app.get("/api/nepse/live-trades", async (req, res) => {
        try {
            // Simulating live trades based on current stocks
            const symbols = ["NICA", "GBIME", "HDL", "SHL", "NTC", "UPPER", "HIDCL", "AHPC"];
            const trades = [];
            for (let i = 0; i < 10; i++) {
                const symbol = symbols[Math.floor(Math.random() * symbols.length)];
                const price = 200 + Math.random() * 2000;
                const qty = Math.floor(Math.random() * 5000) + 10;
                const time = new Date().toLocaleTimeString();
                const type = Math.random() > 0.5 ? "Buy" : "Sell";
                trades.push({ symbol, price: parseFloat(price.toFixed(1)), qty, time, type });
            }
            res.json(trades);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch live trades" });
        }
    });
    app.get("/api/nepse/trending-topics", async (req, res) => {
        try {
            // Return empty array instead of hardcoded list
            const topics = [];
            res.json(topics);
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch trending topics" });
        }
    });
    app.get("/api/nepse/stock/:symbol", async (req, res) => {
        try {
            const { symbol } = req.params;
            // Return empty or dynamic data instead of hardcoded simulation
            res.json({
                symbol,
                dividendHistory: [],
                financials: {
                    pe: "0.00",
                    pb: "0.00",
                    roe: "0.00",
                    eps: "0.00"
                }
            });
        }
        catch (error) {
            res.status(500).json({ error: "Failed to fetch stock details" });
        }
    });
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    }
    else {
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    }
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
startServer();
