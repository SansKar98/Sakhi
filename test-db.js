import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1]
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1]

const supabase = createClient(url, key)

async function run() {
  const { data, error } = await supabase.from('safety_reports').select('*')
  console.log("Safety Reports:", data)
  console.log("Error:", error)
}
run()
