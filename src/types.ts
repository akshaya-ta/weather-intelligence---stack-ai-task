export interface CityLocation {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string; // state/region
  country_code?: string;
}

export interface CurrentWeather {
  temperature: number;
  apparent_temperature: number;
  relative_humidity: number;
  precipitation: number;
  wind_speed: number;
  wind_direction: number;
  weather_code: number;
  time: string;
}

export interface DailyForecast {
  date: string;
  temperature_max: number;
  temperature_min: number;
  apparent_temperature_max: number;
  apparent_temperature_min: number;
  precipitation_sum: number;
  precipitation_probability: number;
  wind_speed_max: number;
  weather_code: number;
  sunrise?: string;
  sunset?: string;
}

export interface WeatherReport {
  location: CityLocation;
  current: CurrentWeather;
  daily: DailyForecast[];
  units: {
    temperature: string;
    wind_speed: string;
    precipitation: string;
  };
}

export interface PlanningInsight {
  category: "travel" | "work" | "outdoor";
  title: string;
  recommendation: string;
  impactLevel: "favorable" | "caution" | "critical";
}

export interface InsightResponse {
  insights: PlanningInsight[];
}
