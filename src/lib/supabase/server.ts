import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function makeClient() {
  return cookies().then(cookieStore =>
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // setAll called from Server Component — can be ignored
            }
          },
        },
      }
    )
  )
}

// For Server Components: deduplicates within a single React render tree
export const createClient = cache(makeClient)

// For Route Handlers: always creates a fresh client (React.cache() is not
// request-scoped outside the React render tree, so we use the raw factory)
export const createRouteClient = makeClient

export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
