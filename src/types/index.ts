export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  plan: 'free' | 'starter' | 'growth' | 'agency' | 'pro'
  created_at: string
  updated_at: string
}

export interface BrandBrain {
  id: string
  user_id: string
  brand_name: string
  website_url?: string
  industry: string
  location: string
  language: string
  brand_description: string
  products: string
  slogans?: string
  tone_keywords: string[]
  tone_description: string
  target_audience: string
  audience_problem: string
  post_topics: string
  post_avoid: string
  content_ratio?: string
  special_offer?: string
  discount?: string
  include_people?: boolean
  materials_link?: string
  platforms: string[]
  posting_frequency?: string
  posting_time?: string
  scraped_about?: string
  scraped_products?: string
  scraped_taglines?: string[]
  ai_brand_profile?: string
  onboarding_complete: boolean
  status: 'active' | 'paused'
  created_at: string
  updated_at: string
}

export interface BrandAsset {
  id: string
  user_id: string
  name?: string
  storage_path: string
  public_url: string
  type: 'product_photo' | 'place_photo' | 'label' | 'logo' | 'photo' | 'screenshot' | 'icon' | 'other'
  tags: string[]
  description?: string
  created_at: string
}

export interface InstagramConnection {
  id: string
  user_id: string
  instagram_user_id: string
  username?: string
  access_token: string
  token_expires_at?: string
  page_id?: string
  connected_at: string
}

export type PostStatus = 'generating' | 'pending_review' | 'approved' | 'published' | 'failed'

export interface Post {
  id: string
  user_id: string
  caption?: string
  hashtags?: string
  image_prompt?: string
  image_url?: string
  template_id?: string
  template_layers?: Record<string, unknown>
  canvas_overrides?: Record<string, unknown>
  render_url?: string
  templated_render_id?: string
  status: PostStatus
  instagram_post_id?: string
  instagram_permalink?: string
  published_at?: string
  analytics?: Record<string, unknown>
  analytics_updated_at?: string
  scheduled_for?: string
  generation_metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}


export interface SceneElement {
  id: string
  name: string
}

export interface SceneSettings {
  // Lighting
  lightingIntensity: number              // 0–100
  lightingDirection: number              // 0–359 (0=top, 90=right, 180=bottom, 270=left)
  lightingType: 'soft' | 'hard' | 'diffused'
  // Color & Tone
  colorTemperature: number               // -100 (warm) to 100 (cool)
  saturation: number                     // -100 to 100
  contrast: number                       // -100 to 100
  exposure: number                       // -100 to 100
  // Scene / Environment
  sceneType: 'studio' | 'outdoor' | 'interior' | 'custom'
  sceneCustom: string
  backgroundType: 'color' | 'gradient' | 'ai' | 'photo'
  backgroundColor: string               // hex
  backgroundGradientFrom: string        // hex
  backgroundGradientTo: string          // hex
  backgroundAiPrompt: string
  backgroundPhotoUrl: string
  backgroundPhotoName: string
  // Composition
  productPosition: 'center' | 'left' | 'right'
  zoom: number                          // 50–150
  viewAngle: 'front' | 'three-quarter' | 'side' | 'top' | 'low'
  // Scene elements (props)
  elements: SceneElement[]
  // Custom prompt
  customPrompt: string
}

export type ProductPhotoStatus = 'generating' | 'done' | 'failed'

export interface ProductPhoto {
  id: string
  user_id: string
  status: ProductPhotoStatus
  image_url?: string
  image_prompt?: string
  settings: Partial<SceneSettings>
  asset_mode?: 'asset' | 'composite'
  asset_url?: string
  asset_name?: string
  asset_description?: string
  scenic_asset_url?: string
  scenic_asset_name?: string
  scenic_asset_description?: string
  product_asset_url?: string
  product_asset_name?: string
  product_asset_description?: string
  canvas_json?: any
  created_at: string
}

export interface BrandBrainForm {
  brand_name: string
  website_url: string
  industry: string
  location: string
  language: string
  brand_description: string
  products: string
  slogans: string
  tone_keywords: string[]
  tone_description: string
  target_audience: string
  audience_problem: string
  post_topics: string
  post_avoid: string
  content_ratio: string
  materials_link: string
  platforms: string[]
  posting_frequency: string
  posting_time: string
  scraped_about?: string
  scraped_products?: string
  scraped_taglines?: string[]
}
