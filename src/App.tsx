import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sun,
  SunDim,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudHail,
  Snowflake,
  CloudRainWind,
  CloudLightning,
  HelpCircle,
  Search,
  MapPin,
  Wind,
  Droplets,
  Umbrella,
  Compass,
  AlertTriangle,
  Briefcase,
  Plane,
  TrendingUp,
  Loader2,
  X,
  Sparkles,
  Calendar,
  Star,
  RefreshCw,
  Info,
  Sunrise,
  Sunset
} from "lucide-react";
import { CityLocation, WeatherReport, PlanningInsight } from "./types";
import { searchCities, fetchWeather, getWeatherDetails } from "./utils/weatherApi";

// Utility component to render Lucide weather icons dynamically
function WeatherIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "Sun":
      return <Sun className={className} />;
    case "SunDim":
      return <SunDim className={className} />;
    case "CloudSun":
      return <CloudSun className={className} />;
    case "Cloud":
      return <Cloud className={className} />;
    case "CloudFog":
      return <CloudFog className={className} />;
    case "CloudDrizzle":
      return <CloudDrizzle className={className} />;
    case "CloudRain":
      return <CloudRain className={className} />;
    case "CloudSnow":
      return <CloudSnow className={className} />;
    case "CloudHail":
      return <CloudHail className={className} />;
    case "Snowflake":
      return <Snowflake className={className} />;
    case "CloudRainWind":
      return <CloudRainWind className={className} />;
    case "CloudLightning":
      return <CloudLightning className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
}

// Utility component for planning insight icons
function InsightCategoryIcon({ category, className }: { category: string; className?: string }) {
  switch (category) {
    case "travel":
      return <Plane className={className} />;
    case "work":
      return <Briefcase className={className} />;
    case "outdoor":
      return <Compass className={className} />;
    default:
      return <TrendingUp className={className} />;
  }
}

export default function App() {
  // Application states
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CityLocation[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingSuggestions, setSearchingSuggestions] = useState(false);
  const [recentCities, setRecentCities] = useState<CityLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<CityLocation | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherReport | null>(null);
  const [insights, setInsights] = useState<PlanningInsight[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Default preset cities for quick start
  const defaultPresets: CityLocation[] = [
    { name: "London", latitude: 51.5074, longitude: -0.1278, country: "United Kingdom", country_code: "GB" },
    { name: "New York", latitude: 40.7128, longitude: -74.0060, country: "United States", country_code: "US" },
    { name: "Tokyo", latitude: 35.6762, longitude: 139.6503, country: "Japan", country_code: "JP" },
    { name: "Sydney", latitude: -33.8688, longitude: 151.2093, country: "Australia", country_code: "AU" },
  ];

  // Load recent cities and fetch initial weather for London on mount
  useEffect(() => {
    const saved = localStorage.getItem("weather_recent_cities");
    if (saved) {
      try {
        setRecentCities(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load recent cities:", e);
      }
    }
    
    // Auto-fetch London on first load so the dashboard is instantly populated
    handleSelectLocation(defaultPresets[0]);
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions as search query changes
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setSearchingSuggestions(false);
      return;
    }

    setSearchingSuggestions(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await searchCities(searchQuery);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Error fetching geocoding suggestions:", err);
        setSuggestions([]);
        setShowSuggestions(true);
      } finally {
        setSearchingSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Main coordinator: Select a location and trigger loading weather and insights
  const handleSelectLocation = async (loc: CityLocation) => {
    setSelectedLocation(loc);
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    setLoadingWeather(true);
    setLoadingInsights(true);

    // Save to recents
    setRecentCities((prev) => {
      const filtered = prev.filter((item) => item.name !== loc.name);
      const updated = [loc, ...filtered].slice(0, 5);
      localStorage.setItem("weather_recent_cities", JSON.stringify(updated));
      return updated;
    });

    try {
      // 1. Fetch current weather and 7-day forecast
      const report = await fetchWeather(loc);
      setWeatherData(report);
      setLoadingWeather(false);

      // 2. Fetch AI Insights using full-stack API route
      const insightRes = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weatherReport: report }),
      });

      if (!insightRes.ok) {
        throw new Error("Unable to retrieve forecast insights");
      }

      const data = await insightRes.json();
      setInsights(data.insights || []);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoadingWeather(false);
      setLoadingInsights(false);
    }
  };

  // Helper functions to format dates
  const formatDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "short" });
  };

  const formatMonthDay = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatUpdateTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {
      return timeStr;
    }
  };

  // Get current weather code details
  const activeWeather = weatherData ? getWeatherDetails(weatherData.current.weather_code) : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      
      {/* Background ambient accents */}
      <div className="absolute top-0 left-0 w-full h-[320px] bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Top Navigation / App Branding */}
      <header className="relative max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between border-b border-slate-200/60 dark:border-slate-800/50 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Weather Intelligence
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AI-Augmented Meteorological Advisory
            </p>
          </div>
        </div>

        {/* Dynamic Preset Cities */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Quick Presets:</span>
          <div className="flex flex-wrap gap-1">
            {defaultPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleSelectLocation(preset)}
                className={`px-2.5 py-1 rounded-md font-medium border transition-all ${
                  selectedLocation?.name === preset.name
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-800 dark:text-indigo-400"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Search & Settings, Favorites, Current Details */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Search Box Component */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" /> Search Location
            </h2>
            
            <div className="relative" ref={suggestionRef}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter city name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(suggestions.length > 0)}
                  className="w-full px-4 py-3 pl-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                />
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown list */}
              <AnimatePresence>
                {showSuggestions && searchQuery.trim().length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden max-h-60 overflow-y-auto"
                  >
                    {searchingSuggestions ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        <span>Searching locations...</span>
                      </div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((item, idx) => (
                        <button
                          key={`${item.name}-${idx}`}
                          onClick={() => handleSelectLocation(item)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-850 border-b border-slate-100 dark:border-slate-800/40 last:border-0 flex flex-col transition-colors cursor-pointer"
                        >
                          <span className="text-sm font-semibold text-slate-950 dark:text-white">
                            {item.name}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {item.admin1 ? `${item.admin1}, ` : ""}{item.country || ""}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center flex flex-col items-center justify-center">
                        <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-full mb-2">
                          <MapPin className="w-5 h-5 text-slate-400" />
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          No matching locations found
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[220px] mx-auto leading-normal">
                          Check the spelling of "{searchQuery}" or search for a larger nearby city.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Empty Search / Recents helper */}
            {!searchQuery && recentCities.length > 0 && (
              <div className="mt-4">
                <span className="text-xs text-slate-400 font-medium block mb-2">Recent Searches:</span>
                <div className="flex flex-wrap gap-1.5">
                  {recentCities.map((city, idx) => (
                    <button
                      key={`recent-${idx}`}
                      onClick={() => handleSelectLocation(city)}
                      className="px-2 py-1 text-xs font-medium rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current weather primary details card */}
          <div className="flex flex-col gap-4">
            {loadingWeather ? (
              // Current weather card skeleton loader
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-6 animate-pulse flex flex-col gap-4 h-[350px]">
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="flex justify-between items-center my-4">
                  <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-full w-16" />
                  <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded w-24" />
                </div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
            ) : error ? (
              // Friendly error display
              <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 rounded-2xl p-6 text-center">
                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-400 mb-1">
                  Weather Advisory Retrieval Failed
                </h3>
                <p className="text-xs text-red-700 dark:text-red-300 mb-4">{error}</p>
                <button
                  onClick={() => selectedLocation && handleSelectLocation(selectedLocation)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-xl transition-colors shadow-sm"
                >
                  Retry Connection
                </button>
              </div>
            ) : weatherData && activeWeather ? (
              // Current Weather Card
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 overflow-hidden shadow-sm"
              >
                {/* Colored visual header based on current weather code */}
                <div className={`p-6 bg-gradient-to-br ${activeWeather.bgGradient} text-white relative`}>
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md rounded-full px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </div>
                  
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
                    Current Conditions
                  </span>
                  
                  <div className="mt-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight">
                        {weatherData.location.name}
                      </h3>
                      <p className="text-xs text-white/85 mt-0.5 font-medium">
                        {weatherData.location.admin1 ? `${weatherData.location.admin1}, ` : ""}{weatherData.location.country}
                      </p>
                    </div>
                    <WeatherIcon name={activeWeather.icon} className="w-14 h-14 text-white" />
                  </div>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-black tracking-tighter">
                      {Math.round(weatherData.current.temperature)}
                    </span>
                    <span className="text-2xl font-semibold">{weatherData.units.temperature}</span>
                  </div>

                  <p className="text-sm font-semibold mt-1 text-white/90">
                    {activeWeather.text}
                  </p>
                </div>

                {/* Grid details (humidity, pressure, wind etc.) */}
                <div className="p-5 grid grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 rounded-lg">
                      <SunDim className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">Feels Like</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">
                        {Math.round(weatherData.current.apparent_temperature)}{weatherData.units.temperature}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg">
                      <Wind className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">Wind Speed</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">
                        {weatherData.current.wind_speed} <span className="text-[10px] text-slate-400">{weatherData.units.wind_speed}</span>
                      </span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">Humidity</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">
                        {weatherData.current.relative_humidity}%
                      </span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      <Umbrella className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">Precipitation</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">
                        {weatherData.current.precipitation} <span className="text-[10px] text-slate-400">{weatherData.units.precipitation}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sun cycle section */}
                {weatherData.daily[0]?.sunrise && weatherData.daily[0]?.sunset && (
                  <div className="px-5 py-4 bg-amber-500/5 dark:bg-amber-500/5 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                        <Sunrise className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">Sunrise</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          {formatUpdateTime(weatherData.daily[0].sunrise)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Visual arc divider */}
                    <div className="flex-1 mx-4 h-[2px] bg-slate-100 dark:bg-slate-800/60 relative flex items-center justify-center">
                      <div className="absolute w-2 h-2 rounded-full bg-amber-400" />
                    </div>

                    <div className="flex items-center gap-2.5 text-right">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">Sunset</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          {formatUpdateTime(weatherData.daily[0].sunset)}
                        </span>
                      </div>
                      <div className="p-2 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl">
                        <Sunset className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer with updated timestamp */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Open-Meteo Core API
                  </span>
                  <span>Updated: {formatUpdateTime(weatherData.current.time)}</span>
                </div>
              </motion.div>
            ) : (
              // Idle state / Welcome state
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-6 text-center">
                <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  No Location Selected
                </h3>
                <p className="text-xs text-slate-500">
                  Search above or tap a quick preset city to fetch meteorological reports.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: AI Planning Insights & 7-Day Forecast */}
        <section className="lg:col-span-8 flex flex-col gap-8">
          
          {/* AI Planning Insights Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-6 shadow-sm relative overflow-hidden">
            {/* Glowing neon top bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" /> Intelligent Planning Insights
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI analysis recommending optimal work, travel, and outdoor actions based on the forecast.
                </p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900 flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 self-start sm:self-auto">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Gemini 3.5 Advisory</span>
              </div>
            </div>

            {loadingInsights ? (
              // AI insights skeleton loader
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-900 animate-pulse flex gap-4">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : insights.length > 0 ? (
              // List of AI insights
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                {insights.map((insight, idx) => {
                  // Badge color mapping
                  let badgeClass = "";
                  switch (insight.impactLevel) {
                    case "favorable":
                      badgeClass = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/35";
                      break;
                    case "caution":
                      badgeClass = "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/35";
                      break;
                    case "critical":
                      badgeClass = "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/35";
                      break;
                  }

                  return (
                    <motion.div
                      key={`insight-${idx}`}
                      variants={{
                        hidden: { opacity: 0, y: 12 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      className="p-5 bg-slate-50/40 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-850 flex flex-col justify-between hover:shadow-md hover:border-slate-200 dark:hover:border-slate-800 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className={`p-2.5 rounded-xl ${
                            insight.category === "travel" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" :
                            insight.category === "work" ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400" :
                            "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
                          }`}>
                            <InsightCategoryIcon category={insight.category} className="w-5 h-5" />
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass} uppercase tracking-wider`}>
                            {insight.impactLevel}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-950 dark:text-white leading-tight mb-2">
                          {insight.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                          {insight.recommendation}
                        </p>
                      </div>

                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                        Category: {insight.category}
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <div className="p-8 text-center bg-slate-50/30 dark:bg-slate-950/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ready to compute AI Insights
                </h3>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                  Once a location report is successfully resolved, Gemini will formulate specific actions.
                </p>
              </div>
            )}
          </div>

          {/* 7-Day Forecast Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" /> 7-Day Meteorological Forecast
            </h2>

            {loadingWeather ? (
              // Forecast skeletons
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {[1, 2, 3, 4, 5, 6, 7].map((idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-900 animate-pulse flex flex-col items-center gap-3 h-44">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full my-1" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-4/5 mt-auto" />
                  </div>
                ))}
              </div>
            ) : weatherData ? (
              // Interactive 7-Day Forecast Grid
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {weatherData.daily.map((day, idx) => {
                  const details = getWeatherDetails(day.weather_code);
                  const isToday = idx === 0;

                  return (
                    <motion.div
                      key={day.date}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      whileHover={{ y: -4, transition: { duration: 0.15 } }}
                      className={`p-4 rounded-xl border flex flex-col items-center transition-all cursor-default ${
                        isToday
                          ? "bg-indigo-50/40 border-indigo-200/60 dark:bg-indigo-950/10 dark:border-indigo-800/45"
                          : "bg-slate-50/50 border-slate-100 dark:bg-slate-950/20 dark:border-slate-900"
                      } ${details.cardBg}`}
                    >
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                        {isToday ? "Today" : formatDayName(day.date)}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                        {formatMonthDay(day.date)}
                      </span>

                      <div className="my-3 p-1 rounded-full bg-white/40 dark:bg-slate-900/30">
                        <WeatherIcon name={details.icon} className="w-8 h-8 text-slate-700 dark:text-indigo-400" />
                      </div>

                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center truncate max-w-full leading-tight">
                        {details.text}
                      </span>

                      {/* Min/Max Temperature Display */}
                      <div className="mt-auto pt-3 flex items-baseline justify-center gap-1.5 border-t border-slate-200/40 dark:border-slate-800/40 w-full">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {Math.round(day.temperature_max)}°
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          {Math.round(day.temperature_min)}°
                        </span>
                      </div>

                      {/* Rain Probability Meter */}
                      <div className="mt-2 flex items-center justify-between w-full text-[9px] text-blue-500 dark:text-blue-400 font-bold">
                        <span className="flex items-center gap-1">
                          <Umbrella className="w-3 h-3" />
                          <span>{day.precipitation_probability}%</span>
                        </span>
                      </div>

                      {/* Sunrise/Sunset compact info */}
                      {day.sunrise && day.sunset && (
                        <div className="mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between w-full text-[8px] text-slate-400 dark:text-slate-500 font-medium">
                          <span className="flex items-center gap-0.5">
                            <Sunrise className="w-2.5 h-2.5 text-amber-500/75" />
                            {formatUpdateTime(day.sunrise).replace(/\s?[AP]M/i, "")}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Sunset className="w-2.5 h-2.5 text-orange-500/75" />
                            {formatUpdateTime(day.sunset).replace(/\s?[AP]M/i, "")}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : null}
          </div>

        </section>

      </main>

      {/* Aesthetic minimalist footer */}
      <footer className="max-w-7xl mx-auto px-4 py-8 border-t border-slate-200/50 dark:border-slate-800/40 text-center">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          Weather Intelligence App &copy; 2026. Data sourced from Open-Meteo Public API. Analytics processed via Google Gemini 3.5 AI.
        </p>
      </footer>
    </div>
  );
}
