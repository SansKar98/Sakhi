import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RoutePoint {
  lat: number;
  lng: number;
}

interface SafetyFactors {
  safeHavensNearby: number;
  unsafeReportsNearby: number;
  verifiedSafeSpots: number;
  routeLength: number;
}

function calculateDistance(point1: RoutePoint, point2: RoutePoint): number {
  const R = 6371;
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLon = ((point2.lng - point1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateSafetyScore(factors: SafetyFactors): number {
  let score = 50;

  score += Math.min(30, factors.safeHavensNearby * 5);
  score += Math.min(20, factors.verifiedSafeSpots * 10);
  score -= Math.min(40, factors.unsafeReportsNearby * 8);

  if (factors.routeLength < 2) {
    score += 10;
  } else if (factors.routeLength > 5) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { routePoints } = await req.json();

    if (!routePoints || routePoints.length < 2) {
      throw new Error("Invalid route points");
    }

    const startPoint = routePoints[0];
    const endPoint = routePoints[routePoints.length - 1];
    const searchRadius = 1.0;

    const { data: safeHavens } = await supabase
      .from("safe_havens")
      .select("*")
      .eq("is_verified", true);

    const { data: safetyReports } = await supabase
      .from("safety_reports")
      .select("*")
      .in("status", ["verified", "resolved"]);

    let safeHavensNearby = 0;
    let unsafeReportsNearby = 0;
    let verifiedSafeSpots = 0;

    if (safeHavens) {
      for (const haven of safeHavens) {
        const distance = calculateDistance(startPoint, {
          lat: Number(haven.latitude),
          lng: Number(haven.longitude),
        });
        if (distance <= searchRadius) {
          safeHavensNearby++;
        }
      }
    }

    if (safetyReports) {
      for (const report of safetyReports) {
        const distance = calculateDistance(startPoint, {
          lat: Number(report.latitude),
          lng: Number(report.longitude),
        });
        if (distance <= searchRadius) {
          if (report.report_type === "safe_spot") {
            verifiedSafeSpots++;
          } else if (report.report_type === "unsafe_area" || report.report_type === "broken_light") {
            unsafeReportsNearby++;
          }
        }
      }
    }

    const routeLength = calculateDistance(startPoint, endPoint);

    const factors: SafetyFactors = {
      safeHavensNearby,
      unsafeReportsNearby,
      verifiedSafeSpots,
      routeLength,
    };

    const safetyScore = calculateSafetyScore(factors);

    const response = {
      safetyScore,
      factors,
      recommendation: safetyScore >= 70 ? "Safe route" : safetyScore >= 40 ? "Moderate caution advised" : "Consider alternative route",
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
