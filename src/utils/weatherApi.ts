import { CityLocation, WeatherReport, DailyForecast } from "../types";

/**
 * Resolves a city name to a list of potential locations using Open-Meteo's free geocoding API.
 */
export async function searchCities(query: string): Promise<CityLocation[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query.trim()
  )}&count=5&language=en&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding service returned status ${response.status}`);
    }
    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((item: any) => ({
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      country: item.country,
      admin1: item.admin1,
      country_code: item.country_code,
    }));
  } catch (error) {
    console.error("Geocoding fetch error:", error);
    throw new Error("Unable to search for locations. Please check your network connection.");
  }
}

/**
 * Fetches current and 7-day weather forecast from Open-Meteo.
 */
export async function fetchWeather(location: CityLocation): Promise<WeatherReport> {
  const { latitude, longitude } = location;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset&timezone=auto`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather service returned status ${response.status}`);
    }
    const data = await response.json();

    const current = data.current;
    const daily = data.daily;

    const formattedDaily: DailyForecast[] = daily.time.map((time: string, idx: number) => ({
      date: time,
      weather_code: daily.weather_code[idx],
      temperature_max: daily.temperature_2m_max[idx],
      temperature_min: daily.temperature_2m_min[idx],
      apparent_temperature_max: daily.apparent_temperature_max[idx],
      apparent_temperature_min: daily.apparent_temperature_min[idx],
      precipitation_sum: daily.precipitation_sum[idx],
      precipitation_probability: daily.precipitation_probability_max[idx],
      wind_speed_max: daily.wind_speed_10m_max[idx],
      sunrise: daily.sunrise ? daily.sunrise[idx] : undefined,
      sunset: daily.sunset ? daily.sunset[idx] : undefined,
    }));

    return {
      location,
      current: {
        temperature: current.temperature_2m,
        apparent_temperature: current.apparent_temperature,
        relative_humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        wind_speed: current.wind_speed_10m,
        wind_direction: current.wind_direction_10m,
        weather_code: current.weather_code,
        time: current.time,
      },
      daily: formattedDaily,
      units: {
        temperature: data.current_units?.temperature_2m || "°C",
        wind_speed: data.current_units?.wind_speed_10m || "km/h",
        precipitation: data.current_units?.precipitation || "mm",
      },
    };
  } catch (error) {
    console.error("Weather fetch error:", error);
    throw new Error(`Failed to retrieve weather data for ${location.name}. Please try again later.`);
  }
}

/**
 * Maps WMO Weather Interpretation Codes to human-readable strings, icons, and tailwind colors.
 */
export function getWeatherDetails(code: number): {
  text: string;
  icon: string;
  bgGradient: string;
  cardBg: string;
} {
  // Mapping based on WMO Weather Interpretation Codes (WW)
  switch (code) {
    case 0:
      return {
        text: "Clear Sky",
        icon: "Sun",
        bgGradient: "from-amber-400 to-orange-500",
        cardBg: "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/30",
      };
    case 1:
      return {
        text: "Mainly Clear",
        icon: "SunDim",
        bgGradient: "from-amber-300 to-amber-500",
        cardBg: "bg-amber-50/40 dark:bg-amber-950/5 border-amber-100/50 dark:border-amber-900/20",
      };
    case 2:
      return {
        text: "Partly Cloudy",
        icon: "CloudSun",
        bgGradient: "from-blue-400 via-amber-300 to-blue-500",
        cardBg: "bg-slate-50/50 dark:bg-slate-900/10 border-slate-200/50 dark:border-slate-800/30",
      };
    case 3:
      return {
        text: "Overcast",
        icon: "Cloud",
        bgGradient: "from-slate-400 to-slate-600",
        cardBg: "bg-slate-100/60 dark:bg-slate-900/30 border-slate-300/40 dark:border-slate-800/50",
      };
    case 45:
    case 48:
      return {
        text: "Foggy",
        icon: "CloudFog",
        bgGradient: "from-gray-300 via-gray-400 to-gray-500",
        cardBg: "bg-gray-100/50 dark:bg-gray-900/20 border-gray-200/50 dark:border-gray-800/40",
      };
    case 51:
    case 53:
    case 55:
      return {
        text: "Drizzle",
        icon: "CloudDrizzle",
        bgGradient: "from-blue-300 to-indigo-400",
        cardBg: "bg-blue-50/40 dark:bg-blue-950/5 border-blue-100/40 dark:border-blue-900/20",
      };
    case 56:
    case 57:
      return {
        text: "Freezing Drizzle",
        icon: "CloudSnow",
        bgGradient: "from-cyan-300 to-blue-400",
        cardBg: "bg-cyan-50/40 dark:bg-cyan-950/5 border-cyan-100/40 dark:border-cyan-900/20",
      };
    case 61:
    case 63:
    case 65:
      return {
        text: "Rainy",
        icon: "CloudRain",
        bgGradient: "from-blue-500 to-indigo-600",
        cardBg: "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200/50 dark:border-blue-900/30",
      };
    case 66:
    case 67:
      return {
        text: "Freezing Rain",
        icon: "CloudHail",
        bgGradient: "from-cyan-400 to-blue-600",
        cardBg: "bg-cyan-50/50 dark:bg-cyan-950/10 border-cyan-200/50 dark:border-cyan-900/30",
      };
    case 71:
    case 73:
    case 75:
      return {
        text: "Snowing",
        icon: "Snowflake",
        bgGradient: "from-cyan-200 via-blue-200 to-sky-300",
        cardBg: "bg-sky-50/40 dark:bg-sky-950/10 border-sky-100/50 dark:border-sky-900/30",
      };
    case 77:
      return {
        text: "Snow Grains",
        icon: "Snowflake",
        bgGradient: "from-cyan-100 to-blue-200",
        cardBg: "bg-sky-50/30 dark:bg-sky-950/5 border-sky-100/40 dark:border-sky-900/20",
      };
    case 80:
    case 81:
    case 82:
      return {
        text: "Rain Showers",
        icon: "CloudRainWind",
        bgGradient: "from-blue-400 to-blue-700",
        cardBg: "bg-sky-50/50 dark:bg-sky-950/10 border-sky-200/50 dark:border-sky-900/30",
      };
    case 85:
    case 86:
      return {
        text: "Snow Showers",
        icon: "CloudSnow",
        bgGradient: "from-sky-300 to-indigo-400",
        cardBg: "bg-sky-50/40 dark:bg-sky-950/10 border-sky-100/50 dark:border-sky-900/30",
      };
    case 95:
      return {
        text: "Thunderstorm",
        icon: "CloudLightning",
        bgGradient: "from-amber-600 via-purple-700 to-slate-900",
        cardBg: "bg-purple-50/50 dark:bg-purple-950/10 border-purple-200/50 dark:border-purple-900/30",
      };
    case 96:
    case 99:
      return {
        text: "Thunderstorm with Hail",
        icon: "CloudLightning",
        bgGradient: "from-purple-700 via-slate-800 to-slate-950",
        cardBg: "bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-200/50 dark:border-indigo-900/30",
      };
    default:
      return {
        text: "Unknown Weather",
        icon: "HelpCircle",
        bgGradient: "from-slate-400 to-slate-500",
        cardBg: "bg-slate-50/40 dark:bg-slate-950/5 border-slate-200/30 dark:border-slate-800/20",
      };
  }
}
