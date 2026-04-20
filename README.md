# Lumen — AI Brand Publishing

Autonomous Instagram post generation and publishing powered by AI. Give Lumen your brand identity once, and it generates, designs, and publishes daily Instagram posts on autopilot.

---

## Prerequisites

Install these before anything else:

- [Node.js 18+](https://nodejs.org/) — download and install the LTS version
- [Git](https://git-scm.com/) — to clone the repo
- A code editor (e.g. [VS Code](https://code.visualstudio.com/))

---

## Step 1 — Clone and install

```bash
git clone <repo-url>
cd app
npm install
```

---

## Step 2 — Create accounts and get API keys

You need accounts on 6 external services. All have free tiers or trials.

### 1. Supabase (database + auth + storage)
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (pick any name, set a database password)
3. Once the project is ready, go to **Settings → API**
4. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. OpenAI (post captions)
1. Go to [platform.openai.com](https://platform.openai.com) and sign up
2. Go to **API Keys → Create new secret key**
3. Copy the key → `OPENAI_API_KEY`
4. Make sure you have credits (add a payment method or use free trial)

### 3. Anthropic (image prompts)
1. Go to [console.anthropic.com](https://console.anthropic.com) and sign up
2. Go to **API Keys → Create Key**
3. Copy the key → `ANTHROPIC_API_KEY`

### 4. NanoBanana (AI image generation)
1. Go to [nanobananaapi.ai](https://nanobananaapi.ai) and create an account
2. Find your API key in the dashboard
3. Copy it → `NANOBANANA_API_KEY`

### 5. Templated (post design templates)
1. Go to [templated.io](https://templated.io) and create an account
2. **Create a base template** in the dashboard with these exact named layers:
   - `background-image` (image layer)
   - `title` (text layer)
   - `subtitle` (text layer)
   - `cta` (text layer)
   - `brand-name` (text layer)
3. Save the template and copy its ID → `TEMPLATED_BASE_TEMPLATE_ID`
4. Go to **Settings → API** and copy your API key → `TEMPLATED_API_KEY`
5. Create an **Embed Config** in Templated settings → copy the config ID → `NEXT_PUBLIC_TEMPLATED_EMBED_CONFIG_ID`
6. **Duplicate your base template 13 times** — you'll need all 13 IDs in Step 6

### 6. Meta / Instagram (publishing)
1. Go to [developers.facebook.com](https://developers.facebook.com) and create a developer account
2. Create a new App → choose **Business** type
3. Add the **Instagram Graph API** product
4. Go to **Settings → Basic**:
   - Copy `App ID` → `INSTAGRAM_APP_ID`
   - Copy `App Secret` → `INSTAGRAM_APP_SECRET`
5. Add this to your app's **Valid OAuth Redirect URIs**:
   ```
   http://localhost:3000/api/instagram/callback
   ```

> **Note:** To publish to Instagram, your account must be a **Business or Creator** account connected to a Facebook Page. Personal accounts won't work.

---

## Step 3 — Set up environment variables

Copy the example file and fill in your keys:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in every value:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# NanoBanana
NANOBANANA_API_KEY=...

# Templated
TEMPLATED_API_KEY=...
TEMPLATED_BASE_TEMPLATE_ID=...
NEXT_PUBLIC_TEMPLATED_EMBED_CONFIG_ID=...

# Instagram / Meta
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=any-random-string-you-make-up
```

---

## Step 4 — Set up the database

Go to your Supabase project → **SQL Editor** and run the following migrations **in order**. Copy each block and click **Run**.

### Migration 1 — User profiles
```sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  plan          TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Migration 2 — Brand Brain
```sql
CREATE TABLE brand_brains (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brand_name        TEXT NOT NULL,
  website_url       TEXT,
  industry          TEXT NOT NULL,
  location          TEXT NOT NULL,
  language          TEXT NOT NULL DEFAULT 'en',
  brand_description TEXT NOT NULL,
  products          TEXT NOT NULL,
  slogans           TEXT,
  tone_keywords     TEXT[] DEFAULT '{}',
  tone_description  TEXT NOT NULL,
  target_audience   TEXT NOT NULL,
  audience_problem  TEXT NOT NULL,
  post_topics       TEXT NOT NULL,
  post_avoid        TEXT NOT NULL,
  content_ratio     TEXT,
  materials_link    TEXT,
  platforms         TEXT[] DEFAULT '{"instagram"}',
  posting_frequency TEXT,
  posting_time      TEXT,
  scraped_about     TEXT,
  scraped_products  TEXT,
  scraped_taglines  TEXT[],
  ai_brand_profile  TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  status            TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);
```

### Migration 3 — Brand Assets
```sql
CREATE TABLE brand_assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT,
  storage_path TEXT NOT NULL,
  public_url   TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('photo', 'logo', 'icon', 'other')),
  tags         TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration 4 — Instagram Connections
```sql
CREATE TABLE instagram_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  username          TEXT,
  access_token      TEXT NOT NULL,
  token_expires_at  TIMESTAMPTZ,
  page_id           TEXT,
  connected_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);
```

### Migration 5 — Posts
```sql
CREATE TABLE posts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  caption              TEXT,
  hashtags             TEXT,
  image_prompt         TEXT,
  image_url            TEXT,
  template_layers      JSONB,
  render_url           TEXT,
  templated_render_id  TEXT,
  status               TEXT DEFAULT 'generating'
                       CHECK (status IN ('generating','pending_review','approved','published','failed')),
  instagram_post_id    TEXT,
  instagram_permalink  TEXT,
  published_at         TIMESTAMPTZ,
  analytics            JSONB DEFAULT '{}',
  analytics_updated_at TIMESTAMPTZ,
  scheduled_for        TIMESTAMPTZ,
  generation_metadata  JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_user_status ON posts (user_id, status, created_at DESC);
```

### Migration 6 — Template Pool
```sql
CREATE TABLE templated_template_pool (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_index            INT UNIQUE NOT NULL,
  templated_template_id TEXT UNIQUE NOT NULL,
  is_occupied           BOOLEAN DEFAULT FALSE,
  occupied_by_user_id   UUID REFERENCES profiles(id),
  occupied_at           TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ
);
```

### Migration 7 — Row Level Security
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE brand_brains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own brand brain" ON brand_brains USING (auth.uid() = user_id);

ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assets" ON brand_assets USING (auth.uid() = user_id);

ALTER TABLE instagram_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own IG" ON instagram_connections USING (auth.uid() = user_id);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own posts" ON posts USING (auth.uid() = user_id);
```

### Migration 8 — Slot acquisition function
```sql
CREATE OR REPLACE FUNCTION acquire_template_slot(p_user_id UUID)
RETURNS templated_template_pool AS $$
DECLARE
  slot templated_template_pool;
BEGIN
  UPDATE templated_template_pool
  SET is_occupied         = TRUE,
      occupied_by_user_id = p_user_id,
      occupied_at         = NOW(),
      expires_at          = NOW() + INTERVAL '30 minutes'
  WHERE id = (
    SELECT id FROM templated_template_pool
    WHERE is_occupied = FALSE
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO slot;
  RETURN slot;
END;
$$ LANGUAGE plpgsql;
```

---

## Step 5 — Create storage buckets

In Supabase, go to **Storage** and create two buckets:

| Bucket name | Public |
|---|---|
| `brand-assets` | **No** (private) |
| `generated-images` | **Yes** (public) |

---

## Step 6 — Add template slots to the database

You created 13 duplicate templates in Templated earlier. Now insert their IDs. In the Supabase SQL Editor, replace each placeholder with the real Templated template ID:

```sql
INSERT INTO templated_template_pool (slot_index, templated_template_id, is_occupied)
VALUES
  (1,  'templated_id_for_slot_1',  false),
  (2,  'templated_id_for_slot_2',  false),
  (3,  'templated_id_for_slot_3',  false),
  (4,  'templated_id_for_slot_4',  false),
  (5,  'templated_id_for_slot_5',  false),
  (6,  'templated_id_for_slot_6',  false),
  (7,  'templated_id_for_slot_7',  false),
  (8,  'templated_id_for_slot_8',  false),
  (9,  'templated_id_for_slot_9',  false),
  (10, 'templated_id_for_slot_10', false),
  (11, 'templated_id_for_slot_11', false),
  (12, 'templated_id_for_slot_12', false),
  (13, 'templated_id_for_slot_13', false);
```

---

## Step 7 — Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Using Lumen

1. **Sign up** with your email and password
2. **Complete the Brand Brain setup** — 5-step form about your brand (takes ~5 minutes)
3. On the **Dashboard**, click **Generate New Post** — generation takes 30–90 seconds
4. **Review the post** — edit the caption, tweak the design in the built-in designer
5. **Connect Instagram** under Brand Brain → Settings, then publish directly from the post page

---

## Troubleshooting

**"Missing credentials" error on startup**
→ Check that `.env.local` exists in the `app/` folder and all values are filled in. No empty strings.

**Login/signup returns an error**
→ Confirm all 8 migrations ran successfully. Check **Table Editor** in Supabase — you should see `profiles`, `brand_brains`, `posts`, etc.

**Image generation times out or hangs**
→ NanoBanana takes 30–90 seconds. The dashboard polls automatically — keep the tab open and wait.

**Instagram connection fails**
→ Your Instagram must be a Business or Creator account linked to a Facebook Page. Go to Instagram settings → Switch to Professional Account if needed.

**"All editing slots are busy"**
→ The Templated editor slots are in use. Wait about 30 seconds and try again — slots auto-release after 30 minutes of inactivity.

**Build errors after pulling updates**
→ Run `npm install` again, then `npm run build` to check for TypeScript errors.
