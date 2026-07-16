import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Simple rule-based fallback engine for when Gemini API key is not set or fails
function getFallbackInsights(weatherReport: any) {
  const insights = [];
  const daily = weatherReport.daily || [];
  
  // Rule 1: Rain/Precipitation analysis
  const rainDays = daily.filter((d: any) => d.precipitation_probability > 40);
  if (rainDays.length > 0) {
    const nextRainyDay = rainDays[0];
    insights.push({
      category: "travel",
      title: "Wet Weather Commute Plan",
      recommendation: `Precipitation probability reaches ${nextRainyDay.precipitation_probability}% on ${nextRainyDay.date}. Plan for potential traffic delays and carry an umbrella. Consider scheduling important travel during dry windows.`,
      impactLevel: nextRainyDay.precipitation_probability > 75 ? "critical" : "caution",
    });
  } else {
    insights.push({
      category: "travel",
      title: "Optimal Commuting Week",
      recommendation: "Minimal to zero precipitation expected over the next 7 days. Perfect conditions for transit, highway travel, and outdoor commuting with zero rain-related delays.",
      impactLevel: "favorable",
    });
  }

  // Rule 2: Heat/Cold work efficiency analysis
  const maxTemps = daily.map((d: any) => d.temperature_max);
  const highestTemp = Math.max(...maxTemps);
  const lowestTemps = daily.map((d: any) => d.temperature_min);
  const lowestTemp = Math.min(...lowestTemps);

  if (highestTemp > 30) {
    insights.push({
      category: "work",
      title: "Heat Exposure Planning",
      recommendation: `Peak temperature is forecast to hit ${highestTemp}°C. For physical or outdoor work, schedule heavy tasks in the early morning (before 11 AM) to prevent heat fatigue. Keep indoor work areas ventilated.`,
      impactLevel: highestTemp > 35 ? "critical" : "caution",
    });
  } else if (lowestTemp < 5) {
    insights.push({
      category: "work",
      title: "Cold Weather Advisory",
      recommendation: `Temperatures will drop as low as ${lowestTemp}°C. Ensure heating systems are active. Wear layered clothing if working in outdoor or unheated spaces, and inspect water pipes for frost protection.`,
      impactLevel: "caution",
    });
  } else {
    insights.push({
      category: "work",
      title: "Comfortable Work Climate",
      recommendation: "Mild temperature ranges (between 10°C and 25°C) are forecasted. Ideal conditions for both indoor and outdoor work operations, with very high thermal comfort levels.",
      impactLevel: "favorable",
    });
  }

  // Rule 3: Outdoor activities/recreation analysis
  const pleasantDays = daily.filter((d: any) => d.precipitation_probability < 20 && d.temperature_max >= 16 && d.temperature_max <= 26);
  if (pleasantDays.length > 0) {
    insights.push({
      category: "outdoor",
      title: "Prime Outdoor Window",
      recommendation: `Excellent outdoor weather is projected for ${pleasantDays[0].date} with a high of ${pleasantDays[0].temperature_max}°C and low rain chance. Ideal for field audits, construction, deliveries, or recreation.`,
      impactLevel: "favorable",
    });
  } else {
    const windyDays = daily.filter((d: any) => d.wind_speed_max > 25);
    if (windyDays.length > 0) {
      insights.push({
        category: "outdoor",
        title: "High Wind Alert",
        recommendation: `Wind gusts up to ${windyDays[0].wind_speed_max} km/h are expected. Avoid high-altitude tasks, secure loose outdoor items, and expect minor flight or tall-vehicle travel disruptions.`,
        impactLevel: "caution",
      });
    } else {
      insights.push({
        category: "outdoor",
        title: "Standard Outdoor Checklist",
        recommendation: "Moderate, consistent weather expected. Ideal for everyday outdoor errands or routine site activities. Review local UV index before long exposures.",
        impactLevel: "favorable",
      });
    }
  }

  return { insights: insights.slice(0, 3) };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing requests
  app.use(express.json());

  // API Endpoint for generating intelligent planning recommendations
  app.post("/api/insights", async (req, res) => {
    try {
      const { weatherReport } = req.body;
      
      if (!weatherReport || !weatherReport.current || !weatherReport.daily) {
        return res.status(400).json({ error: "Invalid weather report provided" });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      // Safe check for the API key to avoid crashing the server if it's missing or a placeholder
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        console.warn("GEMINI_API_KEY is not configured or placeholder. Using rule-based fallback.");
        const fallback = getFallbackInsights(weatherReport);
        return res.json(fallback);
      }

      // Lazy initialization of GoogleGenAI SDK to prevent load-time exceptions
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `
You are a highly capable Meteorological Planner and Planning Insights AI. Analyze the weather data below and generate exactly 3 practical planning insights for travel, work, and outdoor activities over the next week.

Location: ${weatherReport.location.name}, ${weatherReport.location.country || "Unknown Country"}
Current Temperature: ${weatherReport.current.temperature}${weatherReport.units.temperature} (Feels like: ${weatherReport.current.apparent_temperature}${weatherReport.units.temperature})
Current Weather Code: ${weatherReport.current.weather_code}
Current Wind Speed: ${weatherReport.current.wind_speed} ${weatherReport.units.wind_speed}

7-Day Forecast:
${weatherReport.daily
  .map(
    (day: any) =>
      `- Date: ${day.date}, Max Temp: ${day.temperature_max}${weatherReport.units.temperature}, Min Temp: ${day.temperature_min}${weatherReport.units.temperature}, Precipitation Prob: ${day.precipitation_probability}%, Max Wind Speed: ${day.wind_speed_max}${weatherReport.units.wind_speed}, Weather Code: ${day.weather_code}`
  )
  .join("\n")}

Guidelines for recommendations:
1. Provide exactly 3 insights.
2. Structure them with categories: "travel", "work", or "outdoor".
3. Keep the "title" concise and professional (maximum 5 words).
4. Make the "recommendation" specific, actionable, and derived from the forecast (e.g., recommend a specific day for travel due to lower rain probability, suggest optimal times for concrete outdoor work, advise on wardrobe and hydration).
5. Map "impactLevel" based on weather intensity:
   - "favorable": smooth conditions, great for activities
   - "caution": mild disturbances, prepare or adjust timing
   - "critical": dangerous or highly disruptive weather (heavy snow/storms/extreme heat/extreme wind).
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              insights: {
                type: Type.ARRAY,
                description: "List of exactly 3 planning insights.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: {
                      type: Type.STRING,
                      description: "Category of planning insight. Must be 'travel', 'work', or 'outdoor'."
                    },
                    title: {
                      type: Type.STRING,
                      description: "A short, catchy title (e.g., 'Rain Advisory' or 'Ideal Commute Window')."
                    },
                    recommendation: {
                      type: Type.STRING,
                      description: "A practical, specific, and actionable recommendation based on the forecast."
                    },
                    impactLevel: {
                      type: Type.STRING,
                      description: "Impact level. Must be 'favorable', 'caution', or 'critical'."
                    }
                  },
                  required: ["category", "title", "recommendation", "impactLevel"]
                }
              }
            },
            required: ["insights"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No text response received from Gemini");
      }

      const parsedResponse = JSON.parse(responseText);
      return res.json(parsedResponse);
    } catch (error) {
      console.error("Error generating Gemini insights:", error);
      // Fallback to rule-based insights on any server-side failure
      try {
        const fallback = getFallbackInsights(req.body.weatherReport);
        return res.json(fallback);
      } catch (err) {
        return res.status(500).json({ error: "Failed to generate planning insights" });
      }
    }
  });

  // Serve static assets / Vite in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
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
