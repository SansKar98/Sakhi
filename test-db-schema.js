import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1]
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1]

const supabase = createClient(url, key)

async function run() {
  const { data, error } = await supabase.from('safety_reports').insert({
    user_id: '123e4567-e89b-12d3-a456-426614174000', // dummy uuid
    report_type: 'other',
    description: 'test',
    latitude: 0,
    longitude: 0,
    severity: 5,
    status: 'pending'
  })
  console.log("Insert Error:", error)
}
run()
