import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Twilio from "npm:twilio";
import { createClient } from "npm:@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    const { location, reason } = await req.json();

    if (!location) {
      return new Response(
        JSON.stringify({ error: "Location is required" }),
        { status: 400 }
      );
    }

    // Create Supabase client with user auth
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization")!,
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401 }
      );
    }

    // Fetch profile with guardian phone
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("phone, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404 }
      );
    }

    if (!profile.phone) {
      return new Response(
        JSON.stringify({ error: "Guardian phone number missing" }),
        { status: 400 }
      );
    }

    // Twilio Client
    const client = Twilio(
      Deno.env.get("TWILIO_ACCOUNT_SID")!,
      Deno.env.get("TWILIO_AUTH_TOKEN")!
    );

    const messageBody = `🚨 EMERGENCY ALERT 🚨

User: ${profile.full_name}
Reason: ${reason || "SOS Triggered"}
Location: ${location}

Immediate attention required.`;

    const message = await client.messages.create({
      body: messageBody,
      from: Deno.env.get("TWILIO_PHONE_NUMBER")!,
      to: profile.phone,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sid: message.sid,
        message: "SOS sent successfully",
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      { status: 400 }
    );
  }
});