import axios from "axios";
import { MarketSummary, Stock } from "../types";

export async function getIndices(): Promise<any[]> {
  const response = await axios.get("/api/nepse/indices");
  return response.data;
}

export async function getTodayPrices(): Promise<Stock[]> {
  const response = await axios.get("/api/nepse/today");
  return response.data;
}

export async function getMarketSummary(): Promise<MarketSummary> {
  const response = await axios.get("/api/nepse/summary");
  return response.data;
}

export async function getNews(): Promise<any[]> {
  const response = await axios.get("/api/nepse/news");
  return response.data;
}

export async function getCorporateActions(): Promise<any[]> {
  const response = await axios.get("/api/nepse/corporate-actions");
  return response.data;
}

export async function getStockHistory(symbol: string): Promise<any[]> {
  const response = await axios.get(`/api/nepse/history/${symbol}`);
  return response.data;
}

export async function getBrokers(symbol?: string): Promise<any> {
  const url = symbol ? `/api/nepse/brokers?symbol=${symbol}` : "/api/nepse/brokers";
  const response = await axios.get(url);
  return response.data;
}

export async function getLiveTrades(): Promise<any[]> {
  const response = await axios.get("/api/nepse/live-trades");
  return response.data;
}

export async function getTrendingTopics(): Promise<any[]> {
  const response = await axios.get("/api/nepse/trending-topics");
  return response.data;
}

export async function getStockDetails(symbol: string): Promise<any> {
  const response = await axios.get(`/api/nepse/stock/${symbol}`);
  return response.data;
}
