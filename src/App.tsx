import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, TrendingUp, TrendingDown, Info, Brain, RefreshCw, 
  ChevronRight, AlertTriangle, LineChart as ChartIcon, 
  LayoutDashboard, BarChart3, PieChart, Activity, 
  Settings, Bell, User, ArrowUpRight, ArrowDownRight,
  Zap, Shield, Target, Globe, Filter, Download, Plus, Trash2, ExternalLink, Newspaper, Calendar, ArrowRight, Check,
  MessageSquare, Send, X, Sparkles, Search as SearchIcon, Loader2, Star, ArrowLeftRight, Copy, Menu, Camera, Image
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell,
  PieChart as RePieChart, Pie
} from "recharts";
import { Stock, MarketSummary, AnalysisResult, MarketSentiment, NewsItem, PortfolioItem, ChatMessage, CorporateAction, HistoricalData } from "./types";
import { getTodayPrices, getMarketSummary, getNews, getCorporateActions, getStockHistory, getIndices, getStockDetails, getBrokers, getLiveTrades, getTrendingTopics } from "./services/nepseService";
import { analyzeStock, analyzeMarket, chatWithAi, deepResearch, getPreferredProvider, setPreferredProvider, AiProvider, analyzeImage, generateMarketImage } from "./lib/ai";
import { cn } from "./lib/utils";
import { TechnicalChart } from "./components/TechnicalChart";
import { auth, db, googleProvider } from "./firebase";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  query, 
  where,
  deleteDoc,
  serverTimestamp,
  getDocFromServer
} from "firebase/firestore";

// No mock functions here

function PortfolioModal({ isOpen, onClose, onSave, editingItem, stocks }: any) {
  const [symbol, setSymbol] = useState(editingItem?.symbol || "");
  const [quantity, setQuantity] = useState(editingItem?.quantity || 10);
  const [avgPrice, setAvgPrice] = useState(editingItem?.avgPrice || 0);

  useEffect(() => {
    if (editingItem) {
      setSymbol(editingItem.symbol);
      setQuantity(editingItem.quantity);
      setAvgPrice(editingItem.avgPrice);
    } else {
      setSymbol("");
      setQuantity(10);
      setAvgPrice(0);
    }
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(symbol, quantity, avgPrice);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="enterprise-card w-full max-w-md p-8 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display font-black tracking-tight">
            {editingItem ? "Edit Asset" : "Add Asset"}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Stock Symbol</label>
            <select 
              value={symbol}
              onChange={(e) => {
                const s = e.target.value;
                setSymbol(s);
                const stock = stocks.find((st: any) => st.symbol === s);
                if (stock && !editingItem) setAvgPrice(stock.ltp);
              }}
              disabled={!!editingItem}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-nepal-crimson transition-all"
              required
            >
              <option value="">Select a stock</option>
              {stocks.map((s: any) => (
                <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Quantity</label>
              <input 
                type="number" 
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-nepal-crimson transition-all"
                required
                min="1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Avg. Price (NPR)</label>
              <input 
                type="number" 
                value={avgPrice}
                onChange={(e) => setAvgPrice(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-nepal-crimson transition-all"
                required
                step="0.01"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-nepal-crimson text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-nepal-crimson/90 transition-all shadow-lg shadow-nepal-crimson/20"
          >
            {editingItem ? "Update Asset" : "Add to Portfolio"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function SectorHeatmap({ stocks }: { stocks: Stock[] }) {
  const sectorData = useMemo(() => {
    const sectors: Record<string, { totalChange: number; count: number; stocks: Stock[] }> = {};
    stocks.forEach(s => {
      const sector = s.sector || "Others";
      if (!sectors[sector]) sectors[sector] = { totalChange: 0, count: 0, stocks: [] };
      sectors[sector].totalChange += s.changePercent;
      sectors[sector].count++;
      sectors[sector].stocks.push(s);
    });
    return Object.entries(sectors).map(([name, data]) => ({
      name,
      avgChange: data.totalChange / data.count,
      count: data.count,
      stocks: data.stocks.sort((a, b) => b.changePercent - a.changePercent)
    })).sort((a, b) => b.avgChange - a.avgChange);
  }, [stocks]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {sectorData.map(sector => (
        <div key={sector.name} className="enterprise-card p-4 space-y-3 group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 truncate max-w-[80px]">{sector.name}</span>
            <span className={cn(
              "text-[10px] font-black px-2 py-0.5 rounded-full",
              sector.avgChange >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}>
              {sector.avgChange >= 0 ? "+" : ""}{sector.avgChange.toFixed(2)}%
            </span>
          </div>
          <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-zinc-800">
            {sector.stocks.slice(0, 5).map((s, i) => (
              <div 
                key={i}
                className={cn(
                  "h-full flex-1",
                  s.changePercent >= 0 ? "bg-emerald-500" : "bg-rose-500"
                )}
                title={`${s.symbol}: ${s.changePercent}%`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{sector.count} Assets</span>
            <div className="flex -space-x-1">
              {sector.stocks.slice(0, 3).map((s, i) => (
                <div key={i} className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-950 flex items-center justify-center text-[6px] font-black">
                  {s.symbol.slice(0, 1)}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [corporateActions, setCorporateActions] = useState<CorporateAction[]>([]);
  const [indices, setIndices] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [liveTrades, setLiveTrades] = useState<any[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [stockHistory, setStockHistory] = useState<HistoricalData[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [modalTab, setModalTab] = useState<"ai" | "technical" | "dividend" | "floorsheet" | "report">("ai");
  const [marketSentiment, setMarketSentiment] = useState<MarketSentiment | null>(null);
  const [analyzingMarket, setAnalyzingMarket] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [aiProvider, setAiProvider] = useState<AiProvider>(getPreferredProvider());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [screenerFilters, setScreenerFilters] = useState({
    sector: "All",
    priceMin: "",
    priceMax: "",
    changeMin: "",
    changeMax: "",
    volumeMin: ""
  });

  const handleProviderChange = (provider: AiProvider) => {
    setAiProvider(provider);
    setPreferredProvider(provider);
  };
  const [ipos, setIpos] = useState<CorporateAction[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem("nepse_portfolio");
    return saved ? JSON.parse(saved) : [];
  });
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem("nepse_watchlist");
    return saved ? JSON.parse(saved) : [];
  });

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<PortfolioItem | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Deep Research State
  const [researchQuery, setResearchQuery] = useState("");
  const [researchResult, setResearchResult] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [comparisonStocks, setComparisonStocks] = useState<string[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertType, setAlertType] = useState<"above" | "below">("above");
  const [chartTimeRange, setChartTimeRange] = useState<"1M" | "3M" | "1Y">("1M");

  // AI Vision State
  const [visionImage, setVisionImage] = useState<string | null>(null);
  const [visionMimeType, setVisionMimeType] = useState<string | null>(null);
  const [visionPrompt, setVisionPrompt] = useState("");
  const [visionResult, setVisionResult] = useState("");
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);

  // AI Studio State
  const [studioPrompt, setStudioPrompt] = useState("");
  const [studioAspectRatio, setStudioAspectRatio] = useState("16:9");
  const [studioSize, setStudioSize] = useState("1024x1024");
  const [studioQuality, setStudioQuality] = useState<"standard" | "high">("standard");
  const [studioResult, setStudioResult] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleAddAlert = () => {
    if (!selectedStock || !alertPrice) return;
    addAlert(selectedStock.symbol, parseFloat(alertPrice), alertType);
    setIsAlertModalOpen(false);
    setAlertPrice("");
  };
  const [alerts, setAlerts] = useState<{ symbol: string, price: number, type: "above" | "below" }[]>([]);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Sync user profile to Firestore
        const userRef = doc(db, "users", currentUser.uid);
        try {
          const docSnap = await getDoc(userRef);
          const isUserAdmin = currentUser.email === "theshivamsingh@gmail.com" || (docSnap.exists() && docSnap.data().role === 'admin');
          setIsAdmin(isUserAdmin);
          
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            role: isUserAdmin ? 'admin' : 'user',
            lastLogin: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error("Error syncing user profile:", error);
        }
      } else {
        setIsAdmin(false);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync: Portfolio
  useEffect(() => {
    if (!user) {
      setPortfolio([]);
      return;
    }
    const q = collection(db, "users", user.uid, "portfolio");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: PortfolioItem[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as PortfolioItem);
      });
      setPortfolio(items);
    }, (error) => {
      console.error("Firestore Portfolio Error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // Firestore Sync: Watchlist
  useEffect(() => {
    if (!user) {
      setWatchlist([]);
      return;
    }
    const q = collection(db, "users", user.uid, "watchlist");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: string[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data().symbol);
      });
      setWatchlist(items);
    }, (error) => {
      console.error("Firestore Watchlist Error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // Firestore Sync: Alerts
  useEffect(() => {
    if (!user) {
      setAlerts([]);
      return;
    }
    const q = collection(db, "users", user.uid, "alerts");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setAlerts(items);
    }, (error) => {
      console.error("Firestore Alerts Error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // Test Firestore Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleVisionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Extract base64 data and mime type
        const matches = base64String.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          setVisionMimeType(matches[1]);
          setVisionImage(matches[2]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVisionAnalyze = async () => {
    if (!visionImage || !visionMimeType) return;
    setIsAnalyzingVision(true);
    setVisionResult("");
    try {
      const result = await analyzeImage(visionImage, visionMimeType, visionPrompt);
      setVisionResult(result);
    } catch (error) {
      console.error(error);
      setVisionResult("Failed to analyze image.");
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  const handleStudioGenerate = async () => {
    if (!studioPrompt) return;
    setIsGeneratingImage(true);
    setStudioResult(null);
    try {
      const result = await generateMarketImage(studioPrompt, studioAspectRatio, studioSize, studioQuality);
      if (result) {
        setStudioResult(result);
      } else {
        alert("Failed to generate image.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate image.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pricesData, summaryData, newsData, actionsData, indicesData, brokersData, tradesData, topicsData] = await Promise.all([
        getTodayPrices(),
        getMarketSummary(),
        getNews(),
        getCorporateActions(),
        getIndices(),
        getBrokers(),
        getLiveTrades(),
        getTrendingTopics()
      ]);
      setStocks(pricesData);
      setSummary(summaryData);
      setNews(newsData);
      setCorporateActions(actionsData);
      setIndices(indicesData);
      setBrokers(brokersData);
      setLiveTrades(tradesData);
      setTrendingTopics(topicsData);
      setIpos(actionsData.filter((a: any) => a.type === "IPO" || a.type === "Right" || a.type === "FPO"));
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeStock = async (stock: Stock) => {
    setSelectedStock(stock);
    setAnalyzing(true);
    setAnalysis(null);
    setStockHistory([]);
    setModalTab("ai");
    
    try {
      const [analysisResult, historyData, detailsData, brokerData] = await Promise.all([
        analyzeStock(stock),
        getStockHistory(stock.symbol),
        getStockDetails(stock.symbol),
        getBrokers(stock.symbol)
      ]);
      
      setAnalysis(analysisResult);
      setStockHistory(historyData);
      setSelectedStock({ ...stock, ...detailsData, brokerData });
    } catch (error) {
      console.error("Analysis Error:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeMarket = async () => {
    if (!summary || stocks.length === 0) return;
    setAnalyzingMarket(true);
    const result = await analyzeMarket(summary, stocks);
    setMarketSentiment(result);
    setAnalyzingMarket(false);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    const response = await chatWithAi(chatMessages, chatInput);
    
    const aiMessage: ChatMessage = {
      role: "model",
      text: response,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, aiMessage]);
    setIsChatLoading(false);
  };

  const handleDeepResearch = async () => {
    if (!researchQuery.trim() || isResearching) return;
    setIsResearching(true);
    setResearchResult("");
    try {
      const result = await deepResearch(researchQuery);
      setResearchResult(result);
    } catch (error) {
      setResearchResult("An error occurred during deep research. Please check your API key or try again later.");
    } finally {
      setIsResearching(false);
    }
  };

  const exportPortfolio = () => {
    if (portfolio.length === 0) return;
    const headers = ["Symbol", "Quantity", "Avg Price", "Current Price", "Current Value", "Profit/Loss"];
    const rows = portfolio.map(item => {
      const stock = stocks.find(s => s.symbol === item.symbol);
      const ltp = stock?.ltp || 0;
      const currentVal = ltp * item.quantity;
      const profit = (ltp - item.avgPrice) * item.quantity;
      return [
        item.symbol,
        item.quantity,
        item.avgPrice,
        ltp,
        currentVal,
        profit
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `nepse_portfolio_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User intentionally closed the popup, no need to show an error
        console.log("Sign in was cancelled by the user.");
      } else {
        console.error("Sign In Error:", error);
        alert(`Sign In Error: ${error.message}`);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign Out Error:", error);
    }
  };

  const addToPortfolio = async (symbol: string, quantity: number = 10, avgPrice?: number) => {
    if (!user) {
      handleSignIn();
      return;
    }
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;
    
    const itemRef = doc(db, "users", user.uid, "portfolio", symbol);
    await setDoc(itemRef, {
      symbol,
      quantity,
      avgPrice: avgPrice || stock.ltp,
      updatedAt: serverTimestamp()
    });

    setIsPortfolioModalOpen(false);
    setEditingPortfolioItem(null);
  };

  const removeFromPortfolio = async (symbol: string) => {
    if (!user) return;
    const itemRef = doc(db, "users", user.uid, "portfolio", symbol);
    await deleteDoc(itemRef);
  };

  const toggleWatchlist = async (symbol: string) => {
    if (!user) {
      handleSignIn();
      return;
    }
    const itemRef = doc(db, "users", user.uid, "watchlist", symbol);
    const docSnap = await getDoc(itemRef);
    
    if (docSnap.exists()) {
      await deleteDoc(itemRef);
    } else {
      await setDoc(itemRef, {
        symbol,
        addedAt: serverTimestamp()
      });
    }
  };

  const toggleComparison = (symbol: string) => {
    setComparisonStocks(prev => 
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : 
      prev.length < 3 ? [...prev, symbol] : prev
    );
  };

  const addAlert = async (symbol: string, price: number, type: "above" | "below") => {
    if (!user) {
      handleSignIn();
      return;
    }
    const alertId = `${symbol}_${type}_${price}`;
    const alertRef = doc(db, "users", user.uid, "alerts", alertId);
    await setDoc(alertRef, {
      symbol,
      price,
      type,
      createdAt: serverTimestamp()
    });
  };

  const removeAlert = (index: number) => {
    setAlerts(alerts.filter((_, i) => i !== index));
  };

  const filteredStocks = useMemo(() => 
    stocks.filter(s => 
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [stocks, searchTerm]
  );

  const topMovers = useMemo(() => 
    [...stocks].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 4)
  , [stocks]);

  const mostActive = useMemo(() => 
    [...stocks].sort((a, b) => b.volume - a.volume).slice(0, 4)
  , [stocks]);

  const sectorPerformance = useMemo(() => {
    const sectors: Record<string, { count: number, totalChange: number }> = {};
    stocks.forEach(s => {
      const sector = s.sector || "Others";
      if (!sectors[sector]) sectors[sector] = { count: 0, totalChange: 0 };
      sectors[sector].count++;
      sectors[sector].totalChange += s.changePercent;
    });
    return Object.entries(sectors).map(([name, data]) => ({
      name,
      avgChange: data.totalChange / data.count,
      count: data.count
    })).sort((a, b) => b.avgChange - a.avgChange);
  }, [stocks]);

  useEffect(() => {
    const interval = setInterval(() => {
      alerts.forEach(alert => {
        const stock = stocks.find(s => s.symbol === alert.symbol);
        if (stock) {
          if (alert.type === "above" && stock.ltp >= alert.price) {
            console.log(`ALERT: ${alert.symbol} is above ${alert.price}`);
            // In a real app, we'd show a notification
          } else if (alert.type === "below" && stock.ltp <= alert.price) {
            console.log(`ALERT: ${alert.symbol} is below ${alert.price}`);
          }
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [alerts, stocks]);

  const portfolioValue = useMemo(() => {
    return portfolio.reduce((acc, item) => {
      const stock = stocks.find(s => s.symbol === item.symbol);
      return acc + (stock ? stock.ltp * item.quantity : 0);
    }, 0);
  }, [portfolio, stocks]);

  const portfolioProfit = useMemo(() => {
    return portfolio.reduce((acc, item) => {
      const stock = stocks.find(s => s.symbol === item.symbol);
      return acc + (stock ? (stock.ltp - item.avgPrice) * item.quantity : 0);
    }, 0);
  }, [portfolio, stocks]);

  const [apiKeySaved, setApiKeySaved] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[150] w-64 border-r border-zinc-800/50 bg-zinc-950/90 backdrop-blur-2xl flex flex-col p-6 space-y-8 transition-transform duration-300 lg:relative lg:translate-x-0 lg:bg-zinc-950/50",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between lg:justify-start gap-3 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-nepal-crimson to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-nepal-crimson/20">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight tracking-tight">NEPSE AI</h1>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Enterprise v3.0</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-zinc-900 rounded-lg">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          <SidebarItem icon={<LayoutDashboard />} label="Dashboard" active={activeTab === "dashboard"} onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<SearchIcon />} label="Deep Research" active={activeTab === "research"} onClick={() => { setActiveTab("research"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Camera />} label="AI Vision" active={activeTab === "aivision"} onClick={() => { setActiveTab("aivision"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Image />} label="AI Studio" active={activeTab === "aistudio"} onClick={() => { setActiveTab("aistudio"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<BarChart3 />} label="Market Analysis" active={activeTab === "market"} onClick={() => { setActiveTab("market"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Star />} label="Watchlist" active={activeTab === "watchlist"} onClick={() => { setActiveTab("watchlist"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<ArrowLeftRight />} label="Compare Stocks" active={activeTab === "compare"} onClick={() => { setActiveTab("compare"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Filter />} label="Stock Screener" active={activeTab === "screener"} onClick={() => { setActiveTab("screener"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Activity />} label="Broker Analysis" active={activeTab === "brokers"} onClick={() => { setActiveTab("brokers"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Newspaper />} label="Market News" active={activeTab === "news"} onClick={() => { setActiveTab("news"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Globe />} label="Market Heatmap" active={activeTab === "heatmap"} onClick={() => { setActiveTab("heatmap"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Calendar />} label="Market Calendar" active={activeTab === "calendar"} onClick={() => { setActiveTab("calendar"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Target />} label="IPO Tracker" active={activeTab === "ipos"} onClick={() => { setActiveTab("ipos"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Bell />} label="Corporate Actions" active={activeTab === "actions"} onClick={() => { setActiveTab("actions"); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<PieChart />} label="Portfolio" active={activeTab === "portfolio"} onClick={() => { setActiveTab("portfolio"); setIsSidebarOpen(false); }} />
          <SidebarItem 
            icon={<Activity />} 
            label={
              <div className="flex items-center gap-2">
                Live Feed
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
            } 
            active={activeTab === "live"} 
            onClick={() => { setActiveTab("live"); setIsSidebarOpen(false); }} 
          />
          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">System</div>
          <SidebarItem icon={<Settings />} label="Settings" active={activeTab === "settings"} onClick={() => { setActiveTab("settings"); setIsSidebarOpen(false); }} />
          {isAdmin && (
            <SidebarItem icon={<Shield />} label="Admin Panel" active={activeTab === "admin"} onClick={() => { setActiveTab("admin"); setIsSidebarOpen(false); }} />
          )}
        </nav>

        <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 space-y-3">
          {user ? (
            <>
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ""} className="w-8 h-8 rounded-full border border-zinc-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{user.displayName || "User"}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{isAdmin ? "Administrator" : "Pro Account"}</p>
                </div>
              </div>
              <button 
                onClick={handleSignOut}
                className="w-full py-2 text-[10px] font-black uppercase tracking-wider bg-zinc-800 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-all"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">Guest User</p>
                  <p className="text-[10px] text-zinc-500 truncate">Limited Access</p>
                </div>
              </div>
              <button 
                onClick={handleSignIn}
                className="w-full py-2 text-[10px] font-black uppercase tracking-wider bg-nepal-crimson text-white rounded-lg hover:bg-nepal-crimson/90 transition-all"
              >
                Sign In with Google
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 border-b border-zinc-800/50 bg-zinc-950/30 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-zinc-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative w-full max-w-md group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-nepal-crimson transition-colors" />
              <input 
                type="text" 
                placeholder="Search markets, stocks, or indices..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-nepal-crimson/20 focus:border-nepal-crimson/50 transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-full border border-zinc-800/50">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                summary?.status === "Open" ? "bg-emerald-500" : "bg-rose-500"
              )} />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider hidden sm:inline">
                {summary?.status || "Closed"} {lastUpdated && `• Updated ${lastUpdated.toLocaleTimeString()}`}
              </span>
            </div>
            {user && (
              <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                <div className="text-right">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Portfolio</p>
                  <p className="text-xs font-bold text-emerald-500">NPR {portfolioValue.toLocaleString()}</p>
                </div>
              </div>
            )}
            <button className="p-2.5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-zinc-400 hover:text-white transition-colors relative hidden sm:block">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-nepal-crimson rounded-full border-2 border-zinc-950" />
            </button>
            <button 
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              title="Refresh Market Data"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                {loading ? "Refreshing..." : "Refresh"}
              </span>
            </button>
            {user ? (
              <button className="w-10 h-10 rounded-xl border border-zinc-800 overflow-hidden hover:border-nepal-crimson transition-all">
                <img src={user.photoURL || ""} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ) : (
              <button 
                onClick={handleSignIn}
                className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-nepal-crimson transition-all"
              >
                <User className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
          {/* News Ticker */}
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-2 overflow-hidden relative">
            <div className="flex items-center gap-4 animate-marquee whitespace-nowrap">
              {news.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    item.sentiment === "positive" ? "bg-emerald-500" :
                    item.sentiment === "negative" ? "bg-rose-500" : "bg-zinc-500"
                  )} />
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{item.title}</span>
                  <span className="text-[10px] text-zinc-600 font-black px-4">|</span>
                </div>
              ))}
            </div>
          </div>

          {activeTab === "dashboard" && (
            <>
              {/* Bento Grid Header */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {summary ? (
                  <>
                    <div className="relative">
                      <BentoStatCard 
                        label="NEPSE Index" 
                        value={summary.index} 
                        change={summary.change} 
                        percent={summary.percentChange} 
                        isPositive={!summary.change.startsWith("-")}
                      />
                      <div className={cn(
                        "absolute top-4 right-4 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        summary.status === "Open" 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      )}>
                        {summary.status || "Closed"}
                      </div>
                    </div>
                    <BentoStatCard label="Daily Turnover" value={summary.turnover} subValue="NPR" />
                    <BentoStatCard label="Market Volume" value={summary.volume} subValue="Shares" />
                    <div className="enterprise-card p-6 flex flex-col justify-between relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-nepal-crimson/10 blur-3xl -mr-16 -mt-16 group-hover:bg-nepal-crimson/20 transition-all" />
                      <div className="flex items-center justify-between relative z-10">
                        <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">AI Intelligence</span>
                        <div className="p-2 bg-nepal-crimson/10 rounded-lg">
                          <Brain className="w-4 h-4 text-nepal-crimson" />
                        </div>
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-lg font-display font-bold mb-1">Market Pulse</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-4">Real-time AI Sentiment</p>
                        <button 
                          onClick={handleAnalyzeMarket}
                          disabled={analyzingMarket}
                          className="w-full py-2.5 bg-zinc-100 text-zinc-950 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-white transition-all disabled:opacity-50 shadow-lg shadow-white/5"
                        >
                          {analyzingMarket ? "Processing..." : "Run Analysis"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  Array(4).fill(0).map((_, i) => <div key={i} className="h-32 bg-zinc-900 animate-pulse rounded-2xl border border-zinc-800/50" />)
                )}
              </section>

              {/* Market Sentiment Gauge */}
              <section className="enterprise-card p-4 md:p-6 lg:p-8 bg-gradient-to-br from-zinc-900 to-zinc-950 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-nepal-crimson/5 blur-[120px] -mr-48 -mt-48 group-hover:bg-nepal-crimson/10 transition-all duration-700" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-nepal-crimson/10 rounded-lg">
                        <Activity className="w-4 h-4 text-nepal-crimson" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Market Sentiment Index</span>
                    </div>
                    <h2 className={cn(
                      "text-5xl font-display font-black tracking-tighter",
                      summary && summary.advancers > summary.decliners ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {summary && summary.advancers > summary.decliners ? "Bullish" : "Bearish"}
                    </h2>
                    <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
                      {marketSentiment ? marketSentiment.summary : (
                        summary && summary.advancers > summary.decliners 
                          ? "Market sentiment is currently positive with strong buying pressure observed across multiple sectors."
                          : "Market sentiment is currently cautious as selling pressure outweighs buying interest in major sectors."
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="64" cy="64" r="58" fill="none" stroke="#18181b" strokeWidth="12" />
                        <circle 
                          cx="64" cy="64" r="58" fill="none" stroke={summary && summary.advancers > summary.decliners ? "#10b981" : "#dc143c"} 
                          strokeWidth="12" 
                          strokeDasharray="364" 
                          strokeDashoffset={(() => {
                            if (!summary) return 364;
                            const total = summary.advancers + summary.decliners + summary.unchanged;
                            if (total === 0) return 182; // Halfway if no data
                            return 364 - (364 * (summary.advancers / total));
                          })()} 
                          strokeLinecap="round" 
                          className="transition-all duration-1000" 
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-display font-black">
                          {(() => {
                            if (!summary) return 0;
                            const total = summary.advancers + summary.decliners + summary.unchanged;
                            return total > 0 ? Math.round((summary.advancers / total) * 100) : 0;
                          })()}
                        </span>
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Strength</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          Buying: {(() => {
                            if (!summary) return 50;
                            const total = summary.advancers + summary.decliners + summary.unchanged;
                            return total > 0 ? Math.round((summary.advancers / total) * 100) : 50;
                          })()}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          Selling: {(() => {
                            if (!summary) return 50;
                            const total = summary.advancers + summary.decliners + summary.unchanged;
                            return total > 0 ? Math.round((summary.decliners / total) * 100) : 50;
                          })()}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Market Movers Section */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                <div className="enterprise-card p-4 md:p-6 lg:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Top Gainers</h3>
                    </div>
                    <button className="text-[10px] font-black text-nepal-blue uppercase tracking-widest hover:underline">View All</button>
                  </div>
                  <div className="space-y-4">
                    {stocks.sort((a, b) => b.changePercent - a.changePercent).slice(0, 5).map((stock, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 hover:border-emerald-500/30 transition-all cursor-pointer" onClick={() => handleAnalyzeStock(stock)}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center font-black text-xs text-emerald-500">
                            {stock.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{stock.symbol}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{stock.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">NPR {stock.ltp}</p>
                          <p className="text-[10px] font-bold text-emerald-500">+{stock.changePercent}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="enterprise-card p-4 md:p-6 lg:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-500/10 rounded-lg">
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Top Losers</h3>
                    </div>
                    <button className="text-[10px] font-black text-nepal-blue uppercase tracking-widest hover:underline">View All</button>
                  </div>
                  <div className="space-y-4">
                    {stocks.sort((a, b) => a.changePercent - b.changePercent).slice(0, 5).map((stock, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 hover:border-rose-500/30 transition-all cursor-pointer" onClick={() => handleAnalyzeStock(stock)}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center font-black text-xs text-rose-500">
                            {stock.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{stock.symbol}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{stock.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">NPR {stock.ltp}</p>
                          <p className="text-[10px] font-bold text-rose-500">{stock.changePercent}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Sub-Indices Section */}
              <section className="enterprise-card p-4 md:p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-nepal-blue/10 rounded-lg">
                      <LayoutDashboard className="w-4 h-4 text-nepal-blue" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Sub-Indices Performance</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {indices.map((idx, i) => (
                    <div key={i} className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl hover:border-zinc-700 transition-all">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 truncate">{idx.name}</p>
                      <p className="text-sm font-bold mb-1">{idx.value.toLocaleString()}</p>
                      <p className={cn(
                        "text-[10px] font-bold",
                        idx.change >= 0 ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {idx.change >= 0 ? "+" : ""}{idx.percentChange}%
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Market Breath Widget */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                <div className="lg:col-span-2 enterprise-card p-4 md:p-6 lg:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-nepal-blue/10 rounded-lg">
                        <ChartIcon className="w-4 h-4 text-nepal-blue" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Market Breath (A/D Ratio)</h3>
                    </div>
                    <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Total: {summary ? summary.advancers + summary.decliners + summary.unchanged : 0} Assets</div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex h-4 w-full rounded-full overflow-hidden bg-zinc-800">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: (() => {
                          if (!summary) return "0%";
                          const total = summary.advancers + summary.decliners + summary.unchanged;
                          return total > 0 ? `${(summary.advancers / total) * 100}%` : "0%";
                        })() }}
                        className="bg-emerald-500 h-full"
                      />
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: (() => {
                          if (!summary) return "0%";
                          const total = summary.advancers + summary.decliners + summary.unchanged;
                          return total > 0 ? `${(summary.unchanged / total) * 100}%` : "0%";
                        })() }}
                        className="bg-zinc-600 h-full"
                      />
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: (() => {
                          if (!summary) return "0%";
                          const total = summary.advancers + summary.decliners + summary.unchanged;
                          return total > 0 ? `${(summary.decliners / total) * 100}%` : "0%";
                        })() }}
                        className="bg-rose-500 h-full"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center space-y-1">
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Advancers</p>
                        <p className="text-xl font-display font-black text-emerald-500">{summary?.advancers || 0}</p>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Unchanged</p>
                        <p className="text-xl font-display font-black text-zinc-400">{summary?.unchanged || 0}</p>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Decliners</p>
                        <p className="text-xl font-display font-black text-rose-500">{summary?.decliners || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="enterprise-card p-4 md:p-6 lg:p-8 flex flex-col justify-center items-center text-center space-y-4 bg-gradient-to-br from-nepal-blue/10 to-transparent">
                  <div className="p-4 bg-nepal-blue/20 rounded-3xl">
                    <Target className="w-8 h-8 text-nepal-blue" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300">Market Phase</h3>
                    <p className="text-2xl font-display font-black tracking-tighter text-white">
                      {marketSentiment?.phase || "Accumulation"}
                    </p>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                    {marketSentiment?.summary.split('.')[0] || "Smart money is building positions in undervalued sectors."}.
                  </p>
                </div>
              </section>

              {/* Sector Heatmap */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-nepal-crimson/10 rounded-lg">
                        <Globe className="w-4 h-4 text-nepal-crimson" />
                      </div>
                      <h3 className="text-lg font-display font-bold tracking-tight">Sector Heatmap</h3>
                    </div>
                  </div>
                  <SectorHeatmap stocks={stocks} />
                </div>

                <div className="lg:col-span-4 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <Calendar className="w-4 h-4 text-amber-500" />
                      </div>
                      <h3 className="text-lg font-display font-bold tracking-tight">Market Calendar</h3>
                    </div>
                    <button onClick={() => setActiveTab("calendar")} className="text-[10px] font-black text-nepal-blue uppercase tracking-widest hover:underline">View All</button>
                  </div>
                  <div className="enterprise-card p-6 space-y-4">
                    {corporateActions.slice(0, 4).map((action, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl hover:bg-zinc-800/50 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-[8px] font-black uppercase",
                            action.type === "Dividend" ? "bg-emerald-500/10 text-emerald-500" :
                            action.type === "AGM" ? "bg-purple-500/10 text-purple-500" : "bg-amber-500/10 text-amber-500"
                          )}>
                            {action.type.slice(0, 3)}
                          </div>
                          <div>
                            <p className="text-xs font-bold">{action.symbol}</p>
                            <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">{action.date}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-zinc-600" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* AI Insights Section */}
              <AnimatePresence>
                {marketSentiment && (
                  <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="enterprise-card p-4 md:p-6 lg:p-8 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-nepal-crimson via-rose-500 to-nepal-blue" />
                    <div className="flex flex-col lg:flex-row gap-6 md:gap-8 relative z-10">
                      <div className="lg:w-1/3 space-y-4 md:space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 md:p-3 bg-zinc-800 rounded-2xl border border-zinc-700">
                            <Globe className="w-5 h-5 md:w-6 md:h-6 text-nepal-crimson" />
                          </div>
                          <div>
                            <h2 className="text-lg md:text-xl font-display font-bold tracking-tight">Market Intelligence</h2>
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Live Analysis</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className={cn(
                          "p-4 md:p-6 rounded-2xl border flex flex-col items-center text-center space-y-2",
                          marketSentiment.sentiment === "Bullish" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" :
                          marketSentiment.sentiment === "Bearish" ? "bg-rose-500/5 border-rose-500/20 text-rose-400" : "bg-zinc-800/50 border-zinc-700 text-zinc-300"
                        )}>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Overall Sentiment</span>
                          <span className="text-3xl md:text-4xl font-display font-black tracking-tighter">{marketSentiment.sentiment}</span>
                          <div className="px-3 py-1 bg-current/10 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Phase: {marketSentiment.phase}
                          </div>
                        </div>

                        <p className="text-sm text-zinc-400 leading-relaxed italic border-l-2 border-zinc-800 pl-4">
                          "{marketSentiment.summary}"
                        </p>
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                        <InsightList 
                          title="Strategic Buys" 
                          items={marketSentiment.topSectorsToBuy} 
                          icon={<TrendingUp className="text-emerald-500" />} 
                          color="emerald"
                        />
                        <InsightList 
                          title="Risk Zones" 
                          items={marketSentiment.topSectorsToAvoid} 
                          icon={<TrendingDown className="text-rose-500" />} 
                          color="rose"
                        />
                        <InsightList 
                          title="Critical Risks" 
                          items={marketSentiment.keyRisks} 
                          icon={<AlertTriangle className="text-amber-500" />} 
                          color="amber"
                        />
                      </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* Top News & IPOs Quick View */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                <div className="lg:col-span-2 enterprise-card p-4 md:p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Top Market News</h3>
                    <button onClick={() => setActiveTab("news")} className="text-[10px] font-black text-nepal-blue uppercase tracking-widest hover:underline">View All</button>
                  </div>
                  <div className="space-y-4">
                    {news.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 hover:bg-zinc-800/50 transition-all cursor-pointer">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5 shrink-0",
                          item.sentiment === "positive" ? "bg-emerald-500" :
                          item.sentiment === "negative" ? "bg-rose-500" : "bg-zinc-500"
                        )} />
                        <div>
                          <h4 className="text-xs md:text-sm font-bold leading-tight mb-1">{item.title}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{item.source}</span>
                            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">•</span>
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{item.date}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="enterprise-card p-4 md:p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Market Calendar</h3>
                    <button onClick={() => setActiveTab("calendar")} className="text-[10px] font-black text-nepal-blue uppercase tracking-widest hover:underline">View All</button>
                  </div>
                  <div className="space-y-4">
                    {corporateActions.filter(a => a.status !== "Closed").slice(0, 3).map((action, i) => (
                      <div key={i} className="p-3 md:p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 space-y-2 group hover:bg-zinc-800/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{action.symbol}</span>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                              action.type === "AGM" ? "bg-purple-500/10 text-purple-500" :
                              action.type === "BookClosure" ? "bg-amber-500/10 text-amber-500" :
                              "bg-nepal-blue/10 text-nepal-blue"
                            )}>
                              {action.type}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-zinc-500">{action.date}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 line-clamp-1">{action.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Main Grid: Movers & Table */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Movers & News */}
                <div className="xl:col-span-1 space-y-8">
                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-display font-bold tracking-tight">Top Movers</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {loading ? (
                        Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-zinc-900 animate-pulse rounded-2xl border border-zinc-800/50" />)
                      ) : (
                        topMovers.map((stock) => (
                          <MoverCard 
                            key={stock.symbol} 
                            stock={stock} 
                            onAnalyze={() => handleAnalyzeStock(stock)} 
                            onWatchlist={toggleWatchlist}
                            isWatched={watchlist.includes(stock.symbol)}
                          />
                        ))
                      )}
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-display font-bold tracking-tight">Most Active</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {loading ? (
                        Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-zinc-900 animate-pulse rounded-2xl border border-zinc-800/50" />)
                      ) : (
                        mostActive.map((stock) => (
                          <MoverCard 
                            key={stock.symbol} 
                            stock={stock} 
                            onAnalyze={() => handleAnalyzeStock(stock)} 
                            onWatchlist={toggleWatchlist}
                            isWatched={watchlist.includes(stock.symbol)}
                          />
                        ))
                      )}
                    </div>
                  </section>

                  {watchlist.length > 0 && (
                    <section className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-display font-bold tracking-tight">Watchlist Quick View</h2>
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      </div>
                      <div className="space-y-3">
                        {watchlist.slice(0, 3).map(symbol => {
                          const stock = stocks.find(s => s.symbol === symbol);
                          if (!stock) return null;
                          return (
                            <div key={symbol} className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center font-black text-[10px] text-zinc-500">
                                  {symbol.slice(0, 2)}
                                </div>
                                <span className="text-xs font-bold">{symbol}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black tracking-tight">NPR {stock.ltp}</p>
                                <p className={cn("text-[10px] font-bold", stock.change >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                  {stock.changePercent}%
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        {watchlist.length > 3 && (
                          <button 
                            onClick={() => setActiveTab("watchlist")}
                            className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            View All {watchlist.length} Assets
                          </button>
                        )}
                      </div>
                    </section>
                  )}

                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-display font-bold tracking-tight">Market News</h2>
                      <Newspaper className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="space-y-3 md:space-y-4">
                      {news.map((item, i) => (
                        <a 
                          key={i} 
                          href={item.link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="block p-3 md:p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl hover:bg-zinc-800/50 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <h4 className="text-[10px] md:text-xs font-bold text-zinc-200 group-hover:text-nepal-crimson transition-colors line-clamp-2">{item.title}</h4>
                            <ExternalLink className="w-3 h-3 text-zinc-600 shrink-0" />
                          </div>
                          <div className="flex items-center justify-between mt-2 md:mt-3">
                            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-zinc-600">{item.source}</span>
                            <span className="text-[7px] md:text-[8px] font-bold text-zinc-500">{item.date}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Right Column: Sector Heatmap & Table */}
                <div className="xl:col-span-2 space-y-8">
                  <section className="space-y-6">
                    <h2 className="text-lg font-display font-bold tracking-tight">Sector Heatmap</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {sectorPerformance.map(sector => (
                        <div key={sector.name} className="enterprise-card p-4 flex flex-col justify-between h-24 relative overflow-hidden group">
                          <div className={cn(
                            "absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20",
                            sector.avgChange >= 0 ? "bg-emerald-500" : "bg-rose-500"
                          )} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 relative z-10">{sector.name}</span>
                          <div className="flex items-end justify-between relative z-10">
                            <span className={cn(
                              "text-xl font-display font-black tracking-tighter",
                              sector.avgChange >= 0 ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {sector.avgChange >= 0 ? "+" : ""}{sector.avgChange.toFixed(2)}%
                            </span>
                            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{sector.count} Assets</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <h2 className="text-lg font-display font-bold tracking-tight">Market Assets</h2>
                      </div>
                    </div>

                    <div className="enterprise-card rounded-3xl overflow-hidden p-2">
                      <div className="space-y-1">
                        {loading ? (
                          Array(8).fill(0).map((_, i) => (
                            <div key={i} className="h-16 bg-zinc-900 animate-pulse rounded-2xl" />
                          ))
                        ) : filteredStocks.slice(0, 20).map((stock) => (
                          <StockRow 
                            key={stock.symbol} 
                            stock={stock} 
                            onAnalyze={handleAnalyzeStock}
                            onWatchlist={toggleWatchlist}
                            isWatched={watchlist.includes(stock.symbol)}
                            onCompare={toggleComparison}
                            isCompared={comparisonStocks.includes(stock.symbol)}
                          />
                        ))}
                      </div>
                      {filteredStocks.length > 20 && (
                        <div className="p-4 text-center border-t border-zinc-800/50">
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Showing top 20 results. Use search for more.</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}

          {activeTab === "research" && (
            <section className="space-y-6 md:space-y-8 max-w-4xl mx-auto">
              <div className="text-center space-y-3 md:space-y-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-nepal-crimson/10 rounded-2xl flex items-center justify-center mx-auto border border-nepal-crimson/20">
                  <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-nepal-crimson" />
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight">Deep AI Research</h2>
                <div className="flex items-center justify-center gap-2">
                  <button 
                    onClick={() => handleProviderChange("gemini")}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                      aiProvider === "gemini" ? "bg-nepal-blue text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                    )}
                  >
                    Gemini 3.1
                  </button>
                  <button 
                    onClick={() => handleProviderChange("groq")}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                      aiProvider === "groq" ? "bg-nepal-crimson text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                    )}
                  >
                    Groq (Llama3)
                  </button>
                </div>
                <p className="text-zinc-500 text-xs md:text-sm max-w-md mx-auto px-4">
                  Select your preferred LLM for high-speed, complex market queries and deep analysis.
                </p>
              </div>

              <div className="enterprise-card p-1.5 md:p-2 relative group mx-4 md:mx-0">
                <div className="absolute inset-0 bg-gradient-to-r from-nepal-crimson/20 to-nepal-blue/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative flex flex-col md:flex-row gap-2">
                  <input 
                    type="text" 
                    placeholder="Ask: 'Analyze NRB monetary policy impact'..." 
                    value={researchQuery}
                    onChange={(e) => setResearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDeepResearch()}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 md:px-6 py-3 md:py-4 focus:outline-none focus:border-nepal-crimson transition-all text-sm"
                  />
                  <button 
                    onClick={handleDeepResearch}
                    disabled={isResearching}
                    className="px-6 md:px-8 py-3 md:py-0 bg-nepal-crimson text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-nepal-crimson/90 transition-all disabled:opacity-50"
                  >
                    {isResearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <SearchIcon className="w-5 h-5" />}
                    <span className="text-sm">Research</span>
                  </button>
                </div>
              </div>

              {researchResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="enterprise-card p-4 md:p-6 lg:p-8 space-y-6 relative overflow-hidden mx-4 md:mx-0"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-nepal-blue/5 blur-[100px] -mr-32 -mt-32" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 gap-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-nepal-blue/10 rounded-lg">
                        <Shield className="w-4 h-4 text-nepal-blue" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Verified Research Report</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-mono text-zinc-600">Model: Llama3-70B</span>
                      <button 
                        onClick={() => {
                          const blob = new Blob([researchResult], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `NEPSE_Research_${new Date().toISOString().split('T')[0]}.txt`;
                          a.click();
                        }}
                        className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-all"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="prose prose-invert max-w-none text-zinc-300 text-xs md:text-sm leading-relaxed whitespace-pre-wrap relative z-10 bg-zinc-900/30 p-4 md:p-6 rounded-2xl border border-zinc-800/50">
                    {researchResult}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between pt-4 gap-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Grounding: High-Speed Inference Active</span>
                    </div>
                    <button className="text-[10px] font-black uppercase tracking-widest text-nepal-blue hover:underline text-left">
                      Download PDF Report
                    </button>
                  </div>
                </motion.div>
              )}
            </section>
          )}

          {activeTab === "aivision" && (
            <section className="space-y-6 md:space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight">AI Vision</h2>
                  <p className="text-zinc-500 text-xs md:text-sm">Analyze charts, financial documents, and market images.</p>
                </div>
              </div>

              <div className="enterprise-card p-6 md:p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="border-2 border-dashed border-zinc-800 hover:border-nepal-crimson rounded-2xl p-8 text-center transition-colors">
                        <Camera className="w-8 h-8 text-zinc-500 mx-auto mb-4" />
                        <span className="text-sm font-bold text-zinc-400">Click to upload image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleVisionUpload} />
                      </div>
                    </label>
                    {visionImage && (
                      <div className="w-32 h-32 rounded-2xl overflow-hidden border border-zinc-800 shrink-0">
                        <img src={`data:${visionMimeType};base64,${visionImage}`} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <input 
                      type="text" 
                      placeholder="What do you want to know about this image?" 
                      value={visionPrompt}
                      onChange={(e) => setVisionPrompt(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-nepal-crimson transition-all text-sm"
                    />
                    <button 
                      onClick={handleVisionAnalyze}
                      disabled={isAnalyzingVision || !visionImage}
                      className="px-6 py-3 bg-nepal-crimson text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-nepal-crimson/90 transition-all disabled:opacity-50"
                    >
                      {isAnalyzingVision ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      <span>Analyze</span>
                    </button>
                  </div>
                </div>

                {visionResult && (
                  <div className="relative group">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(visionResult);
                        // Optional: Add a toast notification here
                      }}
                      className="absolute top-4 right-4 p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <div className="prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                      {visionResult}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "aistudio" && (
            <section className="space-y-6 md:space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight">AI Studio</h2>
                  <p className="text-zinc-500 text-xs md:text-sm">Generate high-quality market visions and charts.</p>
                </div>
              </div>

              <div className="enterprise-card p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Aspect Ratio</label>
                    <select 
                      value={studioAspectRatio} 
                      onChange={(e) => setStudioAspectRatio(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-nepal-crimson transition-all text-sm"
                    >
                      <option value="1:1">1:1 (Square)</option>
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="9:16">9:16 (Portrait)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Size</label>
                    <select 
                      value={studioSize} 
                      onChange={(e) => setStudioSize(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-nepal-crimson transition-all text-sm"
                    >
                      <option value="1024x1024">1K (Standard)</option>
                      <option value="2048x2048">2K (High)</option>
                      <option value="4096x4096">4K (Ultra)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Quality</label>
                    <select 
                      value={studioQuality} 
                      onChange={(e) => setStudioQuality(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-nepal-crimson transition-all text-sm"
                    >
                      <option value="standard">Standard (Flash)</option>
                      <option value="high">Studio (Pro)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <input 
                    type="text" 
                    placeholder="Describe the market vision you want to generate..." 
                    value={studioPrompt}
                    onChange={(e) => setStudioPrompt(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-nepal-crimson transition-all text-sm"
                  />
                  <button 
                    onClick={handleStudioGenerate}
                    disabled={isGeneratingImage || !studioPrompt}
                    className="px-6 py-3 bg-nepal-crimson text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-nepal-crimson/90 transition-all disabled:opacity-50"
                  >
                    {isGeneratingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5" />}
                    <span>Generate</span>
                  </button>
                </div>

                {studioResult && (
                  <div className="mt-8 space-y-4">
                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = studioResult;
                          a.download = `NEPSE_Vision_${new Date().toISOString().split('T')[0]}.png`;
                          a.click();
                        }}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-xs flex items-center gap-2 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        Download Image
                      </button>
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/50">
                      <img src={studioResult} alt="Generated Market Vision" className="w-full h-auto" />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "portfolio" && (
            <section className="space-y-6 md:space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight">My Portfolio</h2>
                  <p className="text-zinc-500 text-xs md:text-sm">Track your holdings and performance in real-time.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
                  <div className="flex items-center gap-4 md:gap-8">
                    <div className="text-left md:text-right">
                      <p className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Investment</p>
                      <p className="text-lg md:text-2xl font-display font-black tracking-tighter">NPR {(portfolioValue - portfolioProfit).toLocaleString()}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Current Value</p>
                      <p className="text-lg md:text-2xl font-display font-black tracking-tighter">NPR {portfolioValue.toLocaleString()}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total P/L</p>
                      <p className={cn(
                        "text-lg md:text-2xl font-display font-black tracking-tighter",
                        portfolioProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {portfolioProfit >= 0 ? "+" : ""}NPR {portfolioProfit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={exportPortfolio}
                      className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-zinc-800 text-white rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                    <button 
                      onClick={() => {
                        setEditingPortfolioItem(null);
                        setIsPortfolioModalOpen(true);
                      }}
                      className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-nepal-crimson text-white rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-nepal-crimson/90 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Asset
                    </button>
                  </div>
                </div>
              </div>

              {portfolio.length === 0 ? (
                <div className="enterprise-card p-10 md:p-20 text-center space-y-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                    <PieChart className="w-8 h-8 md:w-10 md:h-10 text-zinc-700" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold">Your portfolio is empty</h3>
                    <p className="text-zinc-500 text-xs md:text-sm">Add stocks from the dashboard to start tracking your investments.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("dashboard")}
                    className="px-6 py-3 bg-nepal-crimson text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-nepal-crimson/90 transition-all"
                  >
                    Browse Markets
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  <div className="lg:col-span-2 space-y-3 md:space-y-4">
                    {portfolio.map(item => {
                      const stock = stocks.find(s => s.symbol === item.symbol);
                      if (!stock) return null;
                      const currentVal = stock.ltp * item.quantity;
                      const profit = (stock.ltp - item.avgPrice) * item.quantity;
                      return (
                        <div key={item.symbol} className="enterprise-card p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-800 rounded-2xl flex items-center justify-center font-black text-zinc-400 group-hover:bg-nepal-blue group-hover:text-white transition-all text-xs md:text-base">
                              {item.symbol.slice(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-bold text-base md:text-lg tracking-tight">{item.symbol}</h4>
                              <p className="text-[10px] md:text-xs text-zinc-500">{item.quantity} Shares @ {item.avgPrice}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-6 md:gap-12">
                            <div className="text-left sm:text-right">
                              <p className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Value</p>
                              <p className="text-sm md:text-lg font-display font-black tracking-tighter">NPR {currentVal.toLocaleString()}</p>
                            </div>
                            <div className="text-left sm:text-right min-w-[80px] md:min-w-[100px]">
                              <p className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">P/L</p>
                              <p className={cn(
                                "text-sm md:text-lg font-display font-black tracking-tighter",
                                profit >= 0 ? "text-emerald-400" : "text-rose-400"
                              )}>
                                {profit >= 0 ? "+" : ""}{profit.toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 md:gap-2">
                              <button 
                                onClick={() => {
                                  setEditingPortfolioItem(item);
                                  setIsPortfolioModalOpen(true);
                                }}
                                className="p-1.5 md:p-2 text-zinc-600 hover:text-nepal-blue transition-colors"
                              >
                                <Settings className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                              <button 
                                onClick={() => removeFromPortfolio(item.symbol)}
                                className="p-1.5 md:p-2 text-zinc-600 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-6">
                    <div className="enterprise-card p-6 space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Performance History</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={Array.from({ length: 7 }, (_, i) => {
                            const date = new Date();
                            date.setDate(date.getDate() - (6 - i));
                            return {
                              date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
                              value: portfolioValue * (0.95 + Math.random() * 0.1)
                            };
                          })}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                            <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                              itemStyle={{ color: '#fff', fontSize: '12px' }}
                            />
                            <Line type="monotone" dataKey="value" stroke="#dc143c" strokeWidth={3} dot={{ fill: '#dc143c', r: 4 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="enterprise-card p-6 space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Allocation</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={portfolio.map(p => ({ name: p.symbol, value: (stocks.find(s => s.symbol === p.symbol)?.ltp || 0) * p.quantity }))}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                            <XAxis dataKey="name" hide />
                            <YAxis hide />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                              itemStyle={{ color: '#fff', fontSize: '12px' }}
                            />
                            <Bar dataKey="value" fill="#003893" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === "news" && (
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-black tracking-tight">Market News</h2>
                  <p className="text-zinc-500 text-sm">AI-curated news and sentiment analysis from top sources.</p>
                </div>
                <div className="flex gap-2">
                  {["All", "Positive", "Negative", "Neutral"].map(filter => (
                    <button key={filter} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all">
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {news.map((item, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="enterprise-card p-6 flex flex-col md:flex-row gap-6 group hover:border-zinc-700 transition-all"
                      >
                        <div className="md:w-48 h-32 bg-zinc-900 rounded-2xl overflow-hidden shrink-0 relative">
                          <img 
                            src={`https://picsum.photos/seed/${item.title.slice(0, 5)}/400/300`} 
                            alt={item.title} 
                            className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-nepal-blue uppercase tracking-widest">{item.source}</span>
                              <div className="w-1 h-1 rounded-full bg-zinc-800" />
                              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{item.date}</span>
                            </div>
                            <div className={cn(
                              "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                              item.sentiment === "positive" ? "bg-emerald-500/10 text-emerald-500" :
                              item.sentiment === "negative" ? "bg-rose-500/10 text-rose-500" : "bg-zinc-800 text-zinc-400"
                            )}>
                              {item.sentiment || "Neutral"}
                            </div>
                          </div>
                          <h3 className="text-xl font-bold leading-tight group-hover:text-nepal-crimson transition-colors">{item.title}</h3>
                          <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">{item.summary}</p>
                          <div className="flex items-center justify-between pt-2">
                            <a 
                              href={item.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 hover:text-white transition-all"
                            >
                              Read Full Story <ArrowRight className="w-3 h-3" />
                            </a>
                            <div className="flex items-center gap-4">
                              <button className="text-zinc-600 hover:text-white transition-colors">
                                <Copy className="w-4 h-4" />
                              </button>
                              <button className="text-zinc-600 hover:text-white transition-colors">
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                  <div className="enterprise-card p-8 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Trending Topics</h3>
                    <div className="flex flex-wrap gap-2">
                      {trendingTopics.map(topic => (
                        <button key={topic} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-white hover:border-zinc-600 transition-all">
                          #{topic.replace(" ", "")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="enterprise-card p-8 space-y-6 bg-gradient-to-br from-nepal-blue/5 to-transparent">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Sentiment Overview</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400">Positive News</span>
                        <span className="text-xs font-black text-emerald-500">
                          {news.length > 0 ? Math.round((news.filter(n => n.sentiment === "positive").length / news.length) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${news.length > 0 ? (news.filter(n => n.sentiment === "positive").length / news.length) * 100 : 0}%` }} />
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-bold text-zinc-400">Negative News</span>
                        <span className="text-xs font-black text-rose-500">
                          {news.length > 0 ? Math.round((news.filter(n => n.sentiment === "negative").length / news.length) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500" style={{ width: `${news.length > 0 ? (news.filter(n => n.sentiment === "negative").length / news.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                      Market sentiment is currently leaning {news.filter(n => n.sentiment === "positive").length > news.filter(n => n.sentiment === "negative").length ? "positive" : "negative"} based on AI analysis of {news.length} news sources.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "heatmap" && (
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-black tracking-tight">Market Heatmap</h2>
                  <p className="text-zinc-500 font-medium">Visual performance map of all listed assets</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-rose-500 rounded-sm" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Negative</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-zinc-800 rounded-sm" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Neutral</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Positive</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                {stocks.map((stock, i) => {
                  const changePercent = stock.changePercent || 0;
                  const intensity = Math.min(Math.abs(changePercent) * 20, 100);
                  const color = changePercent >= 0 
                    ? `rgba(16, 185, 129, ${0.1 + (intensity / 100) * 0.9})`
                    : `rgba(244, 63, 94, ${0.1 + (intensity / 100) * 0.9})`;
                  
                  return (
                    <motion.div 
                      key={stock.symbol}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.01 }}
                      onClick={() => handleAnalyzeStock(stock)}
                      className="aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-white/20 transition-all group relative"
                      style={{ backgroundColor: color }}
                    >
                      <span className="text-[10px] font-black tracking-tighter group-hover:scale-110 transition-transform">{stock.symbol}</span>
                      <span className="text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">{stock.changePercent}%</span>
                      
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hidden group-hover:block z-50 pointer-events-none whitespace-nowrap shadow-2xl">
                        <p className="text-xs font-bold">{stock.name}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">LTP: NPR {stock.ltp}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === "calendar" && (
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-black tracking-tight">Market Calendar</h2>
                  <p className="text-zinc-500 font-medium">Upcoming AGMs, Book Closures, and Dividends</p>
                </div>
                <div className="flex gap-2">
                  {["All", "AGM", "BookClosure", "Dividend", "Bonus"].map(filter => (
                    <button key={filter} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all">
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {corporateActions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((action, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="enterprise-card p-6 space-y-4 relative overflow-hidden group"
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center font-black text-xs border border-zinc-800">
                          {action.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{action.symbol}</h4>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                            action.type === "AGM" ? "bg-purple-500/10 text-purple-500" :
                            action.type === "BookClosure" ? "bg-amber-500/10 text-amber-500" :
                            action.type === "Dividend" ? "bg-emerald-500/10 text-emerald-500" :
                            "bg-nepal-blue/10 text-nepal-blue"
                          )}>
                            {action.type}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Date</p>
                        <p className="text-xs font-bold text-zinc-300">{action.date}</p>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed relative z-10">{action.description}</p>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50 relative z-10">
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest",
                        action.status === "Open" ? "text-emerald-500" : "text-zinc-500"
                      )}>
                        Status: {action.status}
                      </span>
                      <button className="text-[8px] font-black uppercase tracking-widest text-nepal-blue hover:underline">
                        Add to Calendar
                      </button>
                    </div>

                    {/* Decorative background icon */}
                    <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                      <Calendar className="w-24 h-24" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "ipos" && (
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-black tracking-tight">IPO Tracker</h2>
                  <p className="text-zinc-500 text-sm">Upcoming and ongoing IPOs, FPOs, and Right Shares.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Issues</p>
                    <p className="text-2xl font-display font-black tracking-tighter">{ipos.filter(i => i.status === "Open").length}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ipos.map((ipo, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="enterprise-card p-6 space-y-6 relative overflow-hidden group hover:border-nepal-blue/30 transition-all"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-nepal-blue/5 blur-3xl -mr-16 -mt-16 group-hover:bg-nepal-blue/10 transition-colors" />
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center font-black text-sm text-nepal-blue shadow-lg">
                          {ipo.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-bold text-base tracking-tight">{ipo.symbol}</h4>
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{ipo.type}</span>
                        </div>
                      </div>
                      <div className={cn(
                        "px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm",
                        ipo.status === "Open" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                        ipo.status === "Upcoming" ? "bg-nepal-blue/10 text-nepal-blue border border-nepal-blue/20" : "bg-zinc-800 text-zinc-500"
                      )}>
                        {ipo.status}
                      </div>
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      <p className="text-xs text-zinc-400 leading-relaxed min-h-[40px]">{ipo.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 py-4 border-y border-zinc-800/50">
                        <div>
                          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Issue Date</p>
                          <p className="text-xs font-bold text-zinc-300">{ipo.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Units</p>
                          <p className="text-xs font-bold text-zinc-300">1,200,000</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map(j => (
                            <div key={j} className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center text-[8px] font-bold text-zinc-500">
                              {j}
                            </div>
                          ))}
                          <div className="w-6 h-6 rounded-full bg-zinc-900 border-2 border-zinc-950 flex items-center justify-center text-[8px] font-bold text-zinc-600">
                            +
                          </div>
                        </div>
                        <button className="px-6 py-2.5 bg-zinc-800 hover:bg-nepal-blue hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg">
                          Apply Now
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "actions" && (
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-display font-black tracking-tight">Corporate Actions</h2>
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <Filter className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-bold text-zinc-400">All Events</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {corporateActions.map((action, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="enterprise-card p-6 space-y-4 relative overflow-hidden group"
                  >
                    <div className={cn(
                      "absolute top-0 right-0 w-24 h-24 blur-3xl -mr-12 -mt-12 opacity-20 transition-opacity group-hover:opacity-40",
                      action.type === "Dividend" ? "bg-emerald-500" :
                      action.type === "IPO" ? "bg-nepal-blue" :
                      action.type === "Right" ? "bg-amber-500" : "bg-rose-500"
                    )} />
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center font-black text-xs text-zinc-400">
                          {action.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm tracking-tight">{action.symbol}</h4>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                            action.status === "Open" ? "bg-emerald-500/10 text-emerald-500" :
                            action.status === "Upcoming" ? "bg-amber-500/10 text-amber-500" : "bg-zinc-800 text-zinc-500"
                          )}>
                            {action.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">Type</span>
                        <span className="text-xs font-bold text-zinc-200">{action.type}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl relative z-10">
                      <p className="text-xs text-zinc-400 leading-relaxed">{action.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 relative z-10">
                      <div className="flex items-center gap-2">
                        <Bell className="w-3 h-3 text-zinc-600" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Event Date</span>
                      </div>
                      <span className="text-xs font-mono text-zinc-400">{action.date}</span>
                    </div>

                    <button className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all relative z-10">
                      Set Reminder
                    </button>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "compare" && (
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-black tracking-tight">Stock Comparison</h2>
                  <p className="text-zinc-500 text-sm">Compare up to 3 stocks side-by-side for deep technical analysis.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {comparisonStocks.map(symbol => (
                      <div key={symbol} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center text-[10px] font-black">
                        {symbol.slice(0, 2)}
                      </div>
                    ))}
                  </div>
                  {comparisonStocks.length > 0 && (
                    <button 
                      onClick={() => setComparisonStocks([])}
                      className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {comparisonStocks.length === 0 ? (
                <div className="enterprise-card p-20 text-center space-y-6">
                  <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                    <ArrowLeftRight className="w-10 h-10 text-zinc-700" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-xl font-bold">No stocks selected for comparison</h3>
                    <p className="text-zinc-500 text-sm mt-2">Use the search or dashboard to add stocks to your comparison terminal.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {comparisonStocks.map(symbol => {
                    const stock = stocks.find(s => s.symbol === symbol);
                    if (!stock) return null;
                    return (
                      <motion.div 
                        key={symbol}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="enterprise-card p-6 space-y-6 relative group"
                      >
                        <button 
                          onClick={() => toggleComparison(symbol)}
                          className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-nepal-blue rounded-2xl flex items-center justify-center font-black text-xl shadow-xl shadow-nepal-blue/20">
                            {symbol.slice(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-2xl font-display font-black tracking-tighter">{symbol}</h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{stock.name}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Price</p>
                            <p className="text-lg font-display font-black tracking-tight">NPR {stock.ltp}</p>
                          </div>
                          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Change</p>
                            <p className={cn(
                              "text-lg font-display font-black tracking-tight",
                              stock.change >= 0 ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {stock.changePercent}%
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">P/E Ratio</span>
                            <span className="text-xs font-bold">24.5x</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Dividend Yield</span>
                            <span className="text-xs font-bold text-emerald-500">4.2%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Market Cap</span>
                            <span className="text-xs font-bold">NPR 42.5B</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">52W High/Low</span>
                            <span className="text-xs font-bold">480 / 390</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleAnalyzeStock(stock)}
                          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Deep Analysis
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === "screener" && (
            <section className="space-y-6 md:space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight">Stock Screener</h2>
                  <p className="text-zinc-500 text-xs md:text-sm">Filter and find stocks based on your custom criteria.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setScreenerFilters({ sector: "All", priceMin: "", priceMax: "", changeMin: "", changeMax: "", volumeMin: "" })}
                    className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all text-zinc-400"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              <div className="enterprise-card p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sector</label>
                  <select 
                    value={screenerFilters.sector}
                    onChange={(e) => setScreenerFilters(prev => ({ ...prev, sector: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-nepal-blue transition-all text-sm"
                  >
                    <option value="All">All Sectors</option>
                    {Array.from(new Set(stocks.map(s => s.sector || "Others"))).map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Price Range (NPR)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      placeholder="Min"
                      value={screenerFilters.priceMin}
                      onChange={(e) => setScreenerFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-nepal-blue transition-all text-sm"
                    />
                    <span className="text-zinc-600">-</span>
                    <input 
                      type="number" 
                      placeholder="Max"
                      value={screenerFilters.priceMax}
                      onChange={(e) => setScreenerFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-nepal-blue transition-all text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Change %</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      placeholder="Min %"
                      value={screenerFilters.changeMin}
                      onChange={(e) => setScreenerFilters(prev => ({ ...prev, changeMin: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-nepal-blue transition-all text-sm"
                    />
                    <span className="text-zinc-600">-</span>
                    <input 
                      type="number" 
                      placeholder="Max %"
                      value={screenerFilters.changeMax}
                      onChange={(e) => setScreenerFilters(prev => ({ ...prev, changeMax: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-nepal-blue transition-all text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Min Volume</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 10000"
                    value={screenerFilters.volumeMin}
                    onChange={(e) => setScreenerFilters(prev => ({ ...prev, volumeMin: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-nepal-blue transition-all text-sm"
                  />
                </div>
              </div>

              <div className="enterprise-card rounded-3xl overflow-hidden p-2">
                <div className="space-y-1">
                  {(() => {
                    const filtered = stocks.filter(stock => {
                      if (screenerFilters.sector !== "All" && (stock.sector || "Others") !== screenerFilters.sector) return false;
                      if (screenerFilters.priceMin && stock.ltp < Number(screenerFilters.priceMin)) return false;
                      if (screenerFilters.priceMax && stock.ltp > Number(screenerFilters.priceMax)) return false;
                      if (screenerFilters.changeMin && stock.changePercent < Number(screenerFilters.changeMin)) return false;
                      if (screenerFilters.changeMax && stock.changePercent > Number(screenerFilters.changeMax)) return false;
                      if (screenerFilters.volumeMin && stock.volume < Number(screenerFilters.volumeMin)) return false;
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-10 text-center text-zinc-500">
                          No stocks match your current filters.
                        </div>
                      );
                    }

                    return filtered.map((stock) => (
                      <StockRow 
                        key={stock.symbol} 
                        stock={stock} 
                        onAnalyze={handleAnalyzeStock}
                        onWatchlist={toggleWatchlist}
                        isWatched={watchlist.includes(stock.symbol)}
                        onCompare={toggleComparison}
                        isCompared={comparisonStocks.includes(stock.symbol)}
                      />
                    ));
                  })()}
                </div>
              </div>
            </section>
          )}

          {activeTab === "watchlist" && (
            <section className="space-y-6 md:space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight">My Watchlist</h2>
                <div className="text-right">
                  <p className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tracked Assets</p>
                  <p className="text-xl md:text-2xl font-display font-black tracking-tighter">{watchlist.length}</p>
                </div>
              </div>

              {watchlist.length === 0 ? (
                <div className="enterprise-card p-10 md:p-20 text-center space-y-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                    <Star className="w-8 h-8 md:w-10 md:h-10 text-zinc-700" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold">Your watchlist is empty</h3>
                    <p className="text-zinc-500 text-xs md:text-sm">Star your favorite stocks to track them here.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("dashboard")}
                    className="px-6 py-3 bg-nepal-crimson text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-nepal-crimson/90 transition-all"
                  >
                    Explore Markets
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {watchlist.map(symbol => {
                    const stock = stocks.find(s => s.symbol === symbol);
                    if (!stock) return null;
                    return (
                      <div key={symbol} className="enterprise-card p-4 md:p-6 flex flex-col space-y-4 group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center font-black text-xs text-zinc-400">
                              {symbol.slice(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm tracking-tight">{symbol}</h4>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate max-w-[120px]">{stock.name}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => toggleWatchlist(symbol)}
                            className="text-amber-500"
                          >
                            <Star className="w-5 h-5 fill-amber-500" />
                          </button>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Price</p>
                            <p className="text-base md:text-lg font-display font-black tracking-tight">NPR {stock.ltp}</p>
                          </div>
                          <div className="h-8 w-20 opacity-50 group-hover:opacity-100 transition-opacity">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={Array.from({ length: 10 }, (_, i) => ({
                                value: stock.ltp * (1 - (stock.changePercent / 100) * (1 - i / 9) + (Math.random() * 0.01 - 0.005))
                              }))}>
                                <YAxis hide domain={['dataMin', 'dataMax']} />
                                <Line 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke={stock.change >= 0 ? "#10b981" : "#f43f5e"} 
                                  strokeWidth={2} 
                                  dot={false} 
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "text-xs md:text-sm font-black tracking-tighter",
                              stock.change >= 0 ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {stock.change >= 0 ? "+" : ""}{stock.changePercent}%
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleAnalyzeStock(stock)}
                            className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                          >
                            Analyze
                          </button>
                          <button 
                            onClick={() => toggleComparison(symbol)}
                            className={cn(
                              "px-3 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                              comparisonStocks.includes(symbol) ? "bg-nepal-blue text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                            )}
                          >
                            Compare
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === "brokers" && (
            <section className="space-y-6 md:space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight">Broker Analysis</h2>
                  <p className="text-zinc-500 text-xs md:text-sm">Top performing brokers and floor sheet insights.</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Brokers</p>
                  <p className="text-xl md:text-2xl font-display font-black tracking-tighter">58</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="enterprise-card p-6 space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Market Share by Volume</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={brokers.map(b => ({ name: b.name, value: parseFloat(b.volume) }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {brokers.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={["#dc143c", "#003893", "#10b981", "#f59e0b", "#8b5cf6", "#3f3f46"][index % 6]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {brokers.slice(0, 4).map((b, i) => (
                      <div key={b.name} className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", ["bg-nepal-crimson", "bg-nepal-blue", "bg-emerald-500", "bg-amber-500"][i % 4])} />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{b.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="enterprise-card p-6 space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Top Buying Brokers (Today)</h3>
                  <div className="space-y-4">
                    {brokers.sort((a, b) => parseFloat(b.buyAmount) - parseFloat(a.buyAmount)).slice(0, 5).map((broker, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center font-black text-xs text-zinc-500">
                            #{broker.id}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{broker.name}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Broker No. {broker.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">NPR {broker.buyAmount}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                            Active
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="enterprise-card p-6 space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Top Selling Brokers (Today)</h3>
                  <div className="space-y-4">
                    {brokers.sort((a, b) => parseFloat(b.sellAmount) - parseFloat(a.sellAmount)).slice(0, 5).map((broker, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center font-black text-xs text-zinc-500">
                            #{broker.id}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{broker.name}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Broker No. {broker.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">NPR {broker.sellAmount}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
                            Active
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="enterprise-card p-8 space-y-6 bg-gradient-to-br from-nepal-blue/5 to-transparent">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-nepal-blue" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Broker Sentiment Analysis</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Market Concentration</p>
                    <p className="text-2xl font-display font-black tracking-tighter">High (62%)</p>
                    <p className="text-xs text-zinc-500">Top 10 brokers account for 62% of today's volume.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Broker Buy/Sell Ratio</p>
                    <p className="text-2xl font-display font-black tracking-tighter text-emerald-500">1.12</p>
                    <p className="text-xs text-zinc-500">Slightly bullish sentiment among institutional brokers.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Retail Participation</p>
                    <p className="text-2xl font-display font-black tracking-tighter text-nepal-crimson">Moderate</p>
                    <p className="text-xs text-zinc-500">Retail volume is steady but not surging.</p>
                  </div>
                </div>
              </div>

              <div className="enterprise-card p-8 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Broker Leaderboard (Weekly)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="pb-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Rank</th>
                        <th className="pb-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Broker</th>
                        <th className="pb-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Volume (NPR)</th>
                        <th className="pb-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Market Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {brokers.sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume)).map((b, i) => (
                        <tr key={i} className="group hover:bg-zinc-900/30 transition-colors">
                          <td className="py-4 text-xs font-bold text-zinc-500">#{i + 1}</td>
                          <td className="py-4">
                            <p className="text-sm font-bold">{b.name}</p>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">No. {b.id}</p>
                          </td>
                          <td className="py-4 text-right text-sm font-bold">{b.volume}</td>
                          <td className="py-4 text-right">
                            <span className="px-2 py-1 bg-zinc-800 rounded text-[10px] font-black">{b.share}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeTab === "live" && (
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-black tracking-tight">Live Market Feed</h2>
                  <p className="text-zinc-500 text-sm">Real-time updates, block trades, and market announcements.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Connection Active</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="enterprise-card p-6 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Recent Transactions</h3>
                    <div className="space-y-4">
                      {liveTrades.map((trade, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs",
                              trade.type === "Buy" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                            )}>
                              {trade.symbol.slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{trade.symbol}</p>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{trade.time}</p>
                            </div>
                          </div>
                          <div className="text-center hidden sm:block">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Buyer</p>
                            <p className="text-xs font-bold text-emerald-500">#{trade.buyerBroker}</p>
                          </div>
                          <div className="text-center hidden sm:block">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Seller</p>
                            <p className="text-xs font-bold text-rose-500">#{trade.sellerBroker}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-bold">NPR {trade.price}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{trade.qty} Units</p>
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                            trade.type === "Buy" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-400"
                          )}>
                            {trade.type}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="enterprise-card p-6 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Market Alerts</h3>
                    <div className="space-y-4">
                      {alerts.length === 0 ? (
                        <div className="text-center py-8">
                          <Bell className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                          <p className="text-xs text-zinc-500">No active alerts. Set alerts from stock details.</p>
                        </div>
                      ) : (
                        alerts.map((alert, i) => (
                          <div key={i} className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold">{alert.symbol}</p>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                {alert.type === "above" ? "Price >" : "Price <"} NPR {alert.price}
                              </p>
                            </div>
                            <button onClick={() => removeAlert(i)} className="text-rose-500 hover:text-rose-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="enterprise-card p-6 space-y-6 bg-gradient-to-br from-nepal-crimson/10 to-transparent">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-nepal-crimson" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">System Status</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">NEPSE API</span>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Operational</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Gemini AI</span>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Operational</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Latency</span>
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">42ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "settings" && (
            <section className="space-y-6 md:space-y-8 max-w-2xl">
              <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight">System Settings</h2>
              
              <div className="space-y-4 md:space-y-6">
                <div className="enterprise-card p-4 md:p-6 space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                      <div>
                        <p className="text-sm font-bold">Push Notifications</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Get alerted for price movements</p>
                      </div>
                      <div className="w-12 h-6 bg-nepal-crimson rounded-full p-1 flex justify-end">
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                      <div>
                        <p className="text-sm font-bold">AI Thinking Mode</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Enable deeper research reasoning</p>
                      </div>
                      <div className="w-12 h-6 bg-nepal-crimson rounded-full p-1 flex justify-end">
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="enterprise-card p-4 md:p-6 space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Data Management</h3>
                  <div className="space-y-4">
                    <button 
                      onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                      }}
                      className="w-full py-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                    >
                      Reset All Local Data
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
          {activeTab === "admin" && isAdmin && (
            <section className="space-y-6 md:space-y-8 max-w-2xl">
              <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-nepal-crimson">Admin Panel</h2>
              
              <div className="space-y-4 md:space-y-6">
                <div className="enterprise-card p-4 md:p-6 space-y-6 border-nepal-crimson/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-5 h-5 text-nepal-crimson" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300">AI Configuration</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">Groq API Key</label>
                      <div className="relative">
                        <input 
                          type="password" 
                          placeholder="gsk_..."
                          className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-nepal-crimson/20 focus:border-nepal-crimson/50 transition-all font-mono text-sm"
                          defaultValue={localStorage.getItem('GROQ_API_KEY') || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              localStorage.setItem('GROQ_API_KEY', e.target.value);
                              setApiKeySaved(true);
                              setTimeout(() => setApiKeySaved(false), 2000);
                            } else {
                              localStorage.removeItem('GROQ_API_KEY');
                            }
                          }}
                        />
                        {apiKeySaved && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-right-2">
                            <Check className="w-3 h-3" />
                            Saved
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-2">Changes take effect immediately on the next AI request.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="mt-20 py-12 border-t border-zinc-900/50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-nepal-crimson fill-nepal-crimson" />
                  <span className="text-xl font-display font-black tracking-tighter">NEPSE AI</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Advanced AI-powered analytics for the Nepal Share Market. Empowering retail investors with institutional-grade insights.
                </p>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Platform</h4>
                <ul className="space-y-3 text-xs text-zinc-600 font-bold">
                  <li className="hover:text-nepal-crimson cursor-pointer transition-colors" onClick={() => setActiveTab("dashboard")}>Market Dashboard</li>
                  <li className="hover:text-nepal-crimson cursor-pointer transition-colors" onClick={() => setActiveTab("research")}>AI Research</li>
                  <li className="hover:text-nepal-crimson cursor-pointer transition-colors" onClick={() => setActiveTab("portfolio")}>Portfolio Manager</li>
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Resources</h4>
                <ul className="space-y-3 text-xs text-zinc-600 font-bold">
                  <li className="hover:text-nepal-crimson cursor-pointer transition-colors">Market Tutorials</li>
                  <li className="hover:text-nepal-crimson cursor-pointer transition-colors">API Documentation</li>
                  <li className="hover:text-nepal-crimson cursor-pointer transition-colors">Risk Disclosure</li>
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Legal</h4>
                <ul className="space-y-3 text-xs text-zinc-600 font-bold">
                  <li className="hover:text-nepal-crimson cursor-pointer transition-colors">Privacy Policy</li>
                  <li className="hover:text-nepal-crimson cursor-pointer transition-colors">Terms of Service</li>
                  <li className="hover:text-nepal-crimson cursor-pointer transition-colors">Contact Support</li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-zinc-900/30 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                © 2026 NEPSE AI Terminal. All rights reserved.
              </p>
              <div className="flex gap-6">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-white cursor-pointer transition-colors">Twitter</span>
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-white cursor-pointer transition-colors">LinkedIn</span>
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-white cursor-pointer transition-colors">GitHub</span>
              </div>
            </div>
          </footer>
        </div>
      </main>

      {/* Floating Chatbot */}
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[60]">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-16 right-0 w-[calc(100vw-2rem)] sm:w-96 h-[500px] max-h-[calc(100vh-8rem)] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-nepal-crimson rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">NEPSE AI Assistant</h4>
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Online</span>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-zinc-800 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <MessageSquare className="w-12 h-12 text-zinc-800" />
                    <p className="text-sm text-zinc-500">Ask me anything about the Nepal Share Market, stocks, or market trends.</p>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={cn(
                    "flex flex-col max-w-[80%]",
                    m.role === "user" ? "ml-auto items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl text-sm",
                      m.role === "user" ? "bg-nepal-crimson text-white rounded-tr-none" : "bg-zinc-900 text-zinc-200 rounded-tl-none border border-zinc-800"
                    )}>
                      {m.text}
                    </div>
                    <span className="text-[8px] text-zinc-600 mt-1 font-bold uppercase">{m.timestamp}</span>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex items-start gap-2">
                    <div className="bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-2xl rounded-tl-none">
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Type your message..." 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-nepal-crimson transition-all"
                />
                <button type="submit" disabled={isChatLoading} className="p-2 bg-nepal-crimson text-white rounded-xl hover:bg-nepal-crimson/90 transition-all disabled:opacity-50">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-12 h-12 md:w-14 md:h-14 bg-nepal-crimson text-white rounded-full flex items-center justify-center shadow-2xl shadow-nepal-crimson/40 hover:scale-110 transition-all active:scale-95"
        >
          <Brain className="w-6 h-6 md:w-7 md:h-7" />
        </button>
      </div>

      {/* Advanced Analysis Modal */}
      <AnimatePresence>
        {selectedStock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStock(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className="relative w-full max-w-6xl h-full bg-zinc-950 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row"
            >
              {/* Modal Sidebar (Stock Info) */}
              <div className="lg:w-80 border-r border-zinc-800 bg-zinc-900/30 p-8 flex flex-col space-y-8 shrink-0">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-nepal-blue rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-nepal-blue/20">
                    {selectedStock.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-3xl font-display font-black tracking-tighter">{selectedStock.symbol}</h2>
                    <p className="text-sm text-zinc-500 font-medium leading-tight">{selectedStock.name}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <ModalStat label="Current Price" value={`NPR ${selectedStock.ltp}`} />
                  <ModalStat label="Day Change" value={`${selectedStock.changePercent}%`} isPositive={selectedStock.change >= 0} />
                  <ModalStat label="Day High" value={selectedStock.high.toString()} />
                  <ModalStat label="Day Low" value={selectedStock.low.toString()} />
                </div>

                <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-nepal-crimson" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Price Alert</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setAlertType("above")}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all",
                          alertType === "above" ? "bg-nepal-crimson text-white" : "bg-zinc-800 text-zinc-500"
                        )}
                      >
                        Above
                      </button>
                      <button 
                        onClick={() => setAlertType("below")}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all",
                          alertType === "below" ? "bg-nepal-crimson text-white" : "bg-zinc-800 text-zinc-500"
                        )}
                      >
                        Below
                      </button>
                    </div>
                    <input 
                      type="number" 
                      placeholder="Target Price" 
                      value={alertPrice}
                      onChange={(e) => setAlertPrice(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-nepal-crimson"
                    />
                    <button 
                      onClick={handleAddAlert}
                      className="w-full py-3 bg-zinc-100 text-zinc-950 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-white transition-all"
                    >
                      Set Alert
                    </button>
                  </div>
                </div>

                <div className="flex-1" />

                <button 
                  onClick={() => setSelectedStock(null)}
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Close Terminal
                </button>
              </div>

              {/* Modal Main (Analysis) */}
              <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
                <div className="h-20 border-b border-zinc-800 flex items-center justify-between px-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-nepal-crimson/10 rounded-lg">
                      <Shield className="w-4 h-4 text-nepal-crimson" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">AI Risk Assessment Terminal</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-zinc-600">ID: {Math.random().toString(36).slice(2, 10).toUpperCase()}</span>
                    <div className="w-px h-4 bg-zinc-800" />
                    <span className="text-[10px] font-mono text-zinc-600">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  {/* Modal Tabs */}
                  <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
                    <button 
                      onClick={() => setModalTab("ai")}
                      className={cn(
                        "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg",
                        modalTab === "ai" ? "bg-nepal-crimson text-white" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      AI Analysis
                    </button>
                    <button 
                      onClick={() => setModalTab("technical")}
                      className={cn(
                        "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg",
                        modalTab === "technical" ? "bg-nepal-blue text-white" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      Technical Analysis
                    </button>
                    <button 
                      onClick={() => setModalTab("dividend")}
                      className={cn(
                        "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg",
                        modalTab === "dividend" ? "bg-amber-500 text-white" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      Dividends
                    </button>
                    <button 
                      onClick={() => setModalTab("floorsheet")}
                      className={cn(
                        "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg",
                        modalTab === "floorsheet" ? "bg-purple-500 text-white" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      Floor Sheet
                    </button>
                    <button 
                      onClick={() => setModalTab("report")}
                      className={cn(
                        "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg",
                        modalTab === "report" ? "bg-zinc-100 text-zinc-950" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      AI Report
                    </button>
                  </div>

                  {modalTab === "ai" ? (
                    <>
                      {/* Chart Section */}
                      <div className="enterprise-card p-6 h-64 relative overflow-hidden">
                        <div className="absolute top-4 left-6 z-10">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Intraday Volatility</h3>
                          <p className="text-xl font-display font-bold">NPR {selectedStock.ltp}</p>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stockHistory.length > 0 ? stockHistory : [{ price: selectedStock.ltp, date: 'Now' }]}>
                            <defs>
                              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#003893" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#003893" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                              itemStyle={{ color: '#fff', fontSize: '12px' }}
                            />
                            <Area type="monotone" dataKey="price" stroke="#003893" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {analyzing ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-6">
                          <div className="relative">
                            <div className="w-20 h-20 border-4 border-zinc-800 rounded-full" />
                            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-nepal-crimson border-t-transparent rounded-full animate-spin" />
                            <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-nepal-crimson animate-pulse" />
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-display font-bold tracking-tight">Synthesizing Market Data</p>
                            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">Consulting Gemini 3.1 Flash Lite Engine</p>
                          </div>
                        </div>
                      ) : analysis ? (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                        >
                          {/* Left Column: Signal & Reasoning */}
                          <div className="lg:col-span-7 space-y-8">
                            <div className="grid grid-cols-3 gap-4">
                              <SignalBox label="Signal" value={analysis.signal} type="signal" />
                              <SignalBox label="Target" value={`NPR ${analysis.targetPrice}`} />
                              <SignalBox label="Stop Loss" value={`NPR ${analysis.stopLoss}`} />
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Strategic Reasoning</h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-zinc-500">Confidence</span>
                                  <span className="text-[10px] font-black text-nepal-crimson">{analysis.confidenceScore}%</span>
                                </div>
                              </div>
                              <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl relative">
                                <div className="absolute -left-1 top-6 w-1 h-12 bg-nepal-crimson rounded-full" />
                                <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                                  {analysis.reasoning}
                                </p>
                              </div>
                            </div>

                            <div className="p-6 bg-nepal-blue/5 border border-nepal-blue/20 rounded-3xl">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-nepal-blue mb-3">Nepal Market Context</h4>
                              <p className="text-xs text-zinc-400 leading-relaxed italic">
                                {analysis.nepaleseContext}
                              </p>
                            </div>
                          </div>

                          {/* Right Column: Lists & Gauges */}
                          <div className="lg:col-span-5 space-y-8">
                            <div className="space-y-4">
                              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Growth Catalysts</h3>
                              <div className="space-y-2">
                                {analysis.catalysts.map((c, i) => (
                                  <div key={i} className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-xs font-bold text-emerald-400">{c}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Risk Vectors</h3>
                              <div className="space-y-2">
                                {analysis.risks.map((r, i) => (
                                  <div key={i} className="flex items-center gap-3 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    <span className="text-xs font-bold text-rose-400">{r}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="p-6 enterprise-card bg-gradient-to-br from-zinc-900 to-zinc-950">
                              <div className="flex items-center gap-3 mb-4">
                                <Target className="w-5 h-5 text-zinc-400" />
                                <span className="text-xs font-black uppercase tracking-widest">Investment Horizon</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-2xl font-display font-black tracking-tight uppercase text-white">
                                  {analysis.timeHorizon.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <div className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                  Verified
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="py-20 text-center text-zinc-500 font-display text-xl">System Error: Analysis Failed</div>
                      )}
                    </>
                  ) : modalTab === "technical" ? (
                    <div className="space-y-8">
                      {stockHistory.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">RSI (14)</p>
                                <p className={cn(
                                  "text-lg font-display font-black",
                                  stockHistory[stockHistory.length - 1].rsi! > 70 ? "text-rose-500" : 
                                  stockHistory[stockHistory.length - 1].rsi! < 30 ? "text-emerald-500" : "text-white"
                                )}>
                                  {stockHistory[stockHistory.length - 1].rsi?.toFixed(2)}
                                </p>
                              </div>
                              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">MACD</p>
                                <p className={cn(
                                  "text-lg font-display font-black",
                                  stockHistory[stockHistory.length - 1].macd!.histogram > 0 ? "text-emerald-500" : "text-rose-500"
                                )}>
                                  {stockHistory[stockHistory.length - 1].macd?.value.toFixed(2)}
                                </p>
                              </div>
                              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">EMA (20)</p>
                                <p className="text-lg font-display font-black text-white">
                                  {stockHistory[stockHistory.length - 1].ema?.toFixed(2)}
                                </p>
                              </div>
                              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Volatility</p>
                                <p className="text-lg font-display font-black text-amber-500">High</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              <button onClick={() => setChartTimeRange("1M")} className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all", chartTimeRange === "1M" ? "bg-nepal-blue text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}>1M</button>
                              <button onClick={() => setChartTimeRange("3M")} className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all", chartTimeRange === "3M" ? "bg-nepal-blue text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}>3M</button>
                              <button onClick={() => setChartTimeRange("1Y")} className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all", chartTimeRange === "1Y" ? "bg-nepal-blue text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}>1Y</button>
                            </div>
                          </div>
                          <TechnicalChart data={stockHistory} symbol={selectedStock.symbol} timeRange={chartTimeRange} />
                        </>
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center space-y-6">
                          <Loader2 className="w-12 h-12 text-nepal-blue animate-spin" />
                          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading Historical Data...</p>
                        </div>
                      )}
                    </div>
                  ) : modalTab === "dividend" ? (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="enterprise-card p-6 space-y-6">
                          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Dividend History</h3>
                          <div className="space-y-4">
                            {selectedStock.dividendHistory?.map((div, i) => (
                              <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                                <div>
                                  <p className="text-sm font-bold">{div.year}</p>
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Fiscal Year</p>
                                </div>
                                <div className="flex gap-8">
                                  <div className="text-right">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Bonus</p>
                                    <p className="text-sm font-bold text-emerald-500">{div.bonus}%</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cash</p>
                                    <p className="text-sm font-bold text-nepal-blue">{div.cash}%</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="enterprise-card p-6 space-y-4 bg-gradient-to-br from-amber-500/10 to-transparent">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Yield Analysis</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Dividend Yield</p>
                                <p className="text-xl font-display font-black text-white">
                                  {((selectedStock.dividendHistory?.[0]?.cash || 0) / (selectedStock.ltp / 100)).toFixed(2)}%
                                </p>
                              </div>
                              <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Total Yield</p>
                                <p className="text-xl font-display font-black text-emerald-500">
                                  {(((selectedStock.dividendHistory?.[0]?.cash || 0) + (selectedStock.dividendHistory?.[0]?.bonus || 0)) / (selectedStock.ltp / 100)).toFixed(2)}%
                                </p>
                              </div>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                              Yield is calculated based on the latest dividend and current market price.
                            </p>
                          </div>

                          <div className="enterprise-card p-6 space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Dividend Trend</h3>
                            <div className="h-40 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={selectedStock.dividendHistory?.slice().reverse()}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                                  <XAxis dataKey="year" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                  <YAxis hide />
                                  <Tooltip 
                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                                  />
                                  <Bar dataKey="bonus" fill="#10b981" radius={[4, 4, 0, 0]} name="Bonus" />
                                  <Bar dataKey="cash" fill="#003893" radius={[4, 4, 0, 0]} name="Cash" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : modalTab === "floorsheet" ? (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="enterprise-card p-6 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Top Buying Brokers</h3>
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div className="space-y-4">
                            {selectedStock.brokerData?.topBuyers.map((b, i) => (
                              <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center font-black text-xs text-emerald-500">
                                    {b.broker}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold">Broker {b.broker}</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Top Buyer</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Quantity</p>
                                  <p className="text-sm font-bold text-white">{b.quantity.toLocaleString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="enterprise-card p-6 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Top Selling Brokers</h3>
                            <TrendingDown className="w-4 h-4 text-rose-500" />
                          </div>
                          <div className="space-y-4">
                            {selectedStock.brokerData?.topSellers.map((b, i) => (
                              <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center font-black text-xs text-rose-500">
                                    {b.broker}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold">Broker {b.broker}</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Top Seller</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Quantity</p>
                                  <p className="text-sm font-bold text-white">{b.quantity.toLocaleString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="enterprise-card p-8 bg-gradient-to-br from-purple-500/10 to-transparent flex flex-col items-center text-center space-y-4">
                        <div className="p-4 bg-purple-500/20 rounded-3xl">
                          <Activity className="w-8 h-8 text-purple-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300">Broker Sentiment</h3>
                          <p className="text-2xl font-display font-black tracking-tighter text-white">Accumulation by Top Brokers</p>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed max-w-md">
                          {selectedStock.brokerData && selectedStock.brokerData.topBuyers.length > 0 
                            ? `Brokers ${selectedStock.brokerData.topBuyers.map(b => b.broker).join(", ")} are consistently building positions, suggesting institutional interest in ${selectedStock.symbol}.`
                            : `Analyzing broker accumulation patterns for ${selectedStock.symbol} based on recent floor sheet data.`
                          }
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="enterprise-card p-12 flex flex-col items-center text-center space-y-8 bg-gradient-to-b from-zinc-900 to-zinc-950">
                        <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center shadow-2xl shadow-white/10">
                          <Download className="w-10 h-10 text-zinc-950" />
                        </div>
                        <div className="space-y-4 max-w-xl">
                          <h3 className="text-3xl font-display font-black tracking-tight">Generate Enterprise Investment Thesis</h3>
                          <p className="text-zinc-500 font-medium leading-relaxed">
                            Our AI engine will synthesize technical indicators, fundamental data, dividend history, and broker sentiment into a comprehensive 5-page investment report.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
                          <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 text-center">
                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Format</p>
                            <p className="text-xs font-bold">PDF / MD</p>
                          </div>
                          <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 text-center">
                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Charts</p>
                            <p className="text-xs font-bold">Included</p>
                          </div>
                          <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 text-center">
                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Sentiment</p>
                            <p className="text-xs font-bold">Deep Scan</p>
                          </div>
                          <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 text-center">
                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Confidence</p>
                            <p className="text-xs font-bold">{analysis?.confidenceScore || "0.0"}%</p>
                          </div>
                        </div>
                        <button className="px-12 py-5 bg-zinc-100 text-zinc-950 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-white transition-all shadow-xl shadow-white/5 flex items-center gap-3 group">
                          Generate Report
                          <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-12 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-8 text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600">
                  <span>Engine: {analysis?.provider || "Gemini 3.1 Flash Lite"}</span>
                  <span>© 2026 NEPSE AI ENTERPRISE</span>
                  <span>Status: Secure Terminal</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Portfolio Modal */}
      <PortfolioModal 
        isOpen={isPortfolioModalOpen}
        onClose={() => {
          setIsPortfolioModalOpen(false);
          setEditingPortfolioItem(null);
        }}
        onSave={addToPortfolio}
        editingItem={editingPortfolioItem}
        stocks={stocks}
      />
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn("sidebar-item w-full", active && "active")}
    >
      {React.cloneElement(icon, { className: "w-5 h-5" })}
      <span className="text-sm font-bold tracking-tight">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-nepal-crimson" />}
    </button>
  );
}

function BentoStatCard({ label, value, change, percent, isPositive, subValue, trend }: any) {
  return (
    <div className="enterprise-card p-6 space-y-4 relative overflow-hidden group hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between relative z-10">
        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{label}</span>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-black uppercase tracking-wider",
            isPositive ? "text-emerald-500" : "text-rose-500"
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {percent}
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-2 relative z-10">
        <span className="text-3xl font-display font-black tracking-tighter">{value}</span>
        {subValue && <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{subValue}</span>}
      </div>

      {trend && (
        <div className="h-12 w-full absolute bottom-0 left-0 opacity-20 group-hover:opacity-40 transition-opacity">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={isPositive ? "#10b981" : "#f43f5e"} 
                fill={isPositive ? "#10b981" : "#f43f5e"} 
                strokeWidth={2} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function MoverCard({ stock, onAnalyze, onWatchlist, isWatched }: any) {
  const isPositive = stock.change >= 0;
  return (
    <div className="enterprise-card p-5 flex items-center justify-between group hover:bg-zinc-800/50 transition-all cursor-pointer" onClick={onAnalyze}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-lg transition-transform group-hover:scale-110",
          isPositive ? "bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10" : "bg-rose-500/10 text-rose-500 shadow-rose-500/10"
        )}>
          {stock.symbol.slice(0, 2)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm tracking-tight">{stock.symbol}</h4>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onWatchlist(stock.symbol);
              }}
              className={cn("transition-colors", isWatched ? "text-amber-500" : "text-zinc-700 hover:text-zinc-500")}
            >
              <Star className={cn("w-3 h-3", isWatched && "fill-amber-500")} />
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{stock.ltp} NPR</p>
        </div>
      </div>
      <div className="text-right">
        <div className={cn(
          "text-sm font-black tracking-tighter",
          isPositive ? "text-emerald-500" : "text-rose-500"
        )}>
          {isPositive ? "+" : ""}{stock.changePercent}%
        </div>
        <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Vol: {(stock.volume / 1000).toFixed(1)}K</div>
      </div>
    </div>
  );
}

function StockRow({ stock, onAnalyze, onWatchlist, isWatched, onCompare, isCompared }: any) {
  const isPositive = stock.change >= 0;
  return (
    <div className="flex items-center justify-between p-3 md:p-4 hover:bg-zinc-900/50 rounded-2xl transition-all group border border-transparent hover:border-zinc-800">
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
        <div className={cn(
          "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black text-[10px] md:text-xs shrink-0",
          isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
        )}>
          {stock.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-xs md:text-sm tracking-tight truncate">{stock.symbol}</h4>
          <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">{stock.name}</p>
        </div>
      </div>
      
      <div className="flex-1 text-center hidden sm:block">
        <p className="text-xs md:text-sm font-display font-black tracking-tight">NPR {stock.ltp}</p>
      </div>

      <div className="flex-1 hidden md:block h-8 px-4 opacity-50 group-hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={Array.from({ length: 10 }, (_, i) => ({
            value: stock.ltp * (1 - (stock.changePercent / 100) * (1 - i / 9) + (Math.random() * 0.01 - 0.005))
          }))}>
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={isPositive ? "#10b981" : "#f43f5e"} 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 text-right sm:text-center">
        <p className={cn(
          "text-xs md:text-sm font-black tracking-tighter",
          isPositive ? "text-emerald-500" : "text-rose-500"
        )}>
          {isPositive ? "+" : ""}{stock.changePercent}%
        </p>
      </div>

      <div className="flex items-center gap-1 md:gap-2 ml-2 md:ml-4">
        <button 
          onClick={() => onWatchlist(stock.symbol)}
          className={cn("p-1.5 md:p-2 rounded-lg transition-colors", isWatched ? "bg-amber-500/10 text-amber-500" : "text-zinc-600 hover:bg-zinc-800")}
          title="Add to Watchlist"
        >
          <Star className={cn("w-3.5 h-3.5 md:w-4 md:h-4", isWatched && "fill-amber-500")} />
        </button>
        <button 
          onClick={() => onCompare(stock.symbol)}
          className={cn("p-1.5 md:p-2 rounded-lg transition-colors hidden md:flex", isCompared ? "bg-nepal-blue/10 text-nepal-blue" : "text-zinc-600 hover:bg-zinc-800")}
          title="Compare Stock"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>
        <button 
          onClick={() => onAnalyze(stock)}
          className="px-3 py-1.5 md:px-4 md:py-2 bg-nepal-crimson hover:bg-nepal-crimson/90 text-white rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-nepal-crimson/20"
        >
          Analyze
        </button>
      </div>
    </div>
  );
}

function InsightList({ title, items, icon, color }: any) {
  const colorClasses: any = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20"
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center gap-2">
        {React.cloneElement(icon, { className: "w-3.5 h-3.5 md:w-4 md:h-4" })}
        <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item: string, i: number) => (
          <div key={i} className={cn("px-3 py-2.5 md:px-4 md:py-3 rounded-xl border text-[10px] md:text-xs font-bold transition-transform hover:translate-x-1", colorClasses[color])}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function ModalStat({ label, value, isPositive }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[8px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest">{label}</p>
      <p className={cn(
        "text-lg md:text-xl font-display font-black tracking-tight",
        isPositive === true ? "text-emerald-500" : isPositive === false ? "text-rose-500" : "text-zinc-100"
      )}>
        {value}
      </p>
    </div>
  );
}

function SignalBox({ label, value, type }: any) {
  const isBuy = value.toLowerCase().includes("buy");
  const isSell = value.toLowerCase().includes("sell");
  
  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      <span className={cn(
        "text-sm font-black uppercase tracking-tighter",
        type === "signal" && isBuy ? "text-emerald-400" : 
        type === "signal" && isSell ? "text-rose-400" : "text-white"
      )}>
        {value.replace(/([A-Z])/g, ' $1').trim()}
      </span>
    </div>
  );
}
