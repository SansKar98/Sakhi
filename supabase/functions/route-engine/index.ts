import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

interface Route {
  id: string;
  hasHighCrime?: boolean;
  hasConstruction?: boolean;
  isHighway?: boolean;
  isResidential?: boolean;
  nearSafeHaven?: boolean;
  hasBrokenStreetLight?: boolean;
}

interface RequestBody {
  routes: Route[];
}

serve(async (req: Request) => {
  try {
    const { routes }: RequestBody = await req.json();

    const currentHour = new Date().getHours();
    const isAfterSunset = currentHour >= 18 || currentHour <= 5;

    const updatedRoutes = routes.map((route) => {
      let score = 100;

      // 🚨 Risk penalties
      if (route.hasHighCrime) score -= 40;
      if (route.hasConstruction) score -= 25;
      if (route.isHighway) score -= 35;

      // 🌙 Time-of-Day Dynamic Street Light Logic
      if (route.hasBrokenStreetLight) {
        if (isAfterSunset) {
          score -= 50; // heavier penalty at night
        } else {
          score -= 15; // lighter penalty during day
        }
      }

      // 🏡 Safety bonuses
      if (route.isResidential) score += 15;
      if (route.nearSafeHaven) score += 20;

      // Prevent negative scores
      score = Math.max(score, 0);

      return { ...route, finalScore: score };
    });

    updatedRoutes.sort((a, b) => b.finalScore - a.finalScore);

    return new Response(
      JSON.stringify({
        safestRoute: updatedRoutes[0],
        allRoutesRanked: updatedRoutes
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