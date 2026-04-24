import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env.local manually
const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const file = readFileSync('C:/Users/Acer/Desktop/REMOTION VIDEA/out/PromoSnappy.mp4')

const { error } = await supabase.storage
  .from('brand-assets')
  .upload('landing/PromoSnappy.mp4', file, {
    contentType: 'video/mp4',
    cacheControl: '31536000',
    upsert: true,
  })

if (error) {
  console.error('Upload failed:', error)
  process.exit(1)
}

const { data } = supabase.storage.from('brand-assets').getPublicUrl('landing/PromoSnappy.mp4')
console.log('Public URL:', data.publicUrl)
