import { LiveForecast } from "@/components/LiveForecast";
import { Section, Eyebrow } from "@/components/ui";

/**
 * Weekly sky-forecast page. Renders REAL conditions for the observatory via
 * <LiveForecast> (fetches /api/forecast: Open-Meteo + 7Timer + local moon).
 */
export default function ForecastPage() {
  return (
    <Section>
      <div className="mb-6">
        <Eyebrow>Conditions</Eyebrow>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          When to shoot this week
        </h1>
      </div>
      <LiveForecast />
    </Section>
  );
}
