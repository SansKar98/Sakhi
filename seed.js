import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1]
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1]

const supabase = createClient(url, key)

async function run() {
  const email = `test-${Date.now()}@example.com`
  const password = 'password123'
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  })
  
  if (authError) {
    console.error("Auth Error:", authError)
    return
  }
  
  console.log("User created:", authData.user.id)
  
  // Wait a sec for auth trigger to create profile maybe?
  await new Promise(r => setTimeout(r, 1000))
  
  // Coordinates near Ashta (from user's screenshot: ~23.01, 76.72)
  const baseLat = 23.01
  const baseLng = 76.72

  const { error: insertError } = await supabase.from('safety_reports').insert([
    {
      user_id: authData.user.id,
      report_type: 'unsafe_area',
      description: 'Mock high danger zone',
      latitude: baseLat + 0.005,
      longitude: baseLng + 0.005,
      severity: 5,
      status: 'verified'
    },
    {
      user_id: authData.user.id,
      report_type: 'broken_light',
      description: 'Mock medium danger zone',
      latitude: baseLat - 0.004,
      longitude: baseLng + 0.006,
      severity: 3,
      status: 'verified'
    },
    {
      user_id: authData.user.id,
      report_type: 'unsafe_area',
      description: 'Mock low danger zone',
      latitude: baseLat + 0.004,
      longitude: baseLng - 0.004,
      severity: 1,
      status: 'verified'
    }
  ])
  
  if (insertError) {
    console.error("Insert Error:", insertError)
  } else {
    console.log("Mock data inserted successfully!")
  }
}
run()
