import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

interface Report {
  type: string;
}

interface RequestBody {
  reports: Report[];
}

serve(async (req: Request) => {
  try {
    const { reports }: RequestBody = await req.json();

    const currentHour = new Date().getHours();
    const isNight = currentHour >= 18 || currentHour <= 5;

    let score = 100;

    for (const report of reports) {
      switch (report.type) {
        case "broken_street_light":
          score -= isNight ? 30 : 8;
          break;
        case "harassment":
          score -= 35;
          break;
        case "high_crime":
          score -= 40;
          break;
        case "construction":
          score -= 20;
          break;
      }
    }

    return new Response(
      JSON.stringify({
        safetyScore: Math.max(score, 0),
        isNight,
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400 }
    );
  }
});