import { SkyForecast } from "@/components/SkyForecast";
import { demoForecast } from "@/data/demoForecast";
import { Section, Eyebrow } from "@/components/ui";

/**
 * Preview of the weekly sky-forecast grid (demo data).
 * Swap `demoForecast` for live data by fetching /api/forecast.
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
      <SkyForecast days={demoForecast} />
    </Section>
  );
}
