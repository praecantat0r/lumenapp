-- ============================================================
-- Lumen: prompt_examples table
-- Purpose: stores curated seed examples (source='seed') and
--          learned examples from user-approved/published posts
--          (source='user_approved' | 'user_published').
--          Used by buildBrandContext() to inject few-shot
--          examples into Claude and GPT-4o at generation time.
-- ============================================================

CREATE TABLE IF NOT EXISTS prompt_examples (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Categorisation
  industry         text        NOT NULL,
  tone_tags        text[]      NOT NULL DEFAULT '{}',
  source           text        NOT NULL CHECK (source IN ('seed', 'user_approved', 'user_published')),
  -- NULL for seed rows; set to the owner for user rows
  user_id          uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Content
  image_prompt     text        NOT NULL,
  visual_concept   text        NOT NULL,
  caption          text        NOT NULL,
  hashtags         text        NOT NULL DEFAULT '',
  template_layers  jsonb,
  -- Scoring (0–1); seed rows have a fixed bootstrap score;
  -- user rows are updated when analytics arrive
  performance_score float      NOT NULL DEFAULT 0,
  approved         boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup at generation time: match on industry, filter by user
CREATE INDEX IF NOT EXISTS prompt_examples_industry
  ON prompt_examples (industry);

CREATE INDEX IF NOT EXISTS prompt_examples_user_source
  ON prompt_examples (user_id, source)
  WHERE user_id IS NOT NULL;

-- GIN index for tone_tags overlap queries
CREATE INDEX IF NOT EXISTS prompt_examples_tone_tags
  ON prompt_examples USING GIN (tone_tags);

-- RLS: users can only read their own examples + all seed examples
ALTER TABLE prompt_examples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seed examples are public" ON prompt_examples;
CREATE POLICY "seed examples are public"
  ON prompt_examples FOR SELECT
  USING (source = 'seed');

DROP POLICY IF EXISTS "users read own examples" ON prompt_examples;
CREATE POLICY "users read own examples"
  ON prompt_examples FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "service role full access" ON prompt_examples;
CREATE POLICY "service role full access"
  ON prompt_examples FOR ALL
  USING (true)
  WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_prompt_examples_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prompt_examples_updated_at ON prompt_examples;
CREATE TRIGGER prompt_examples_updated_at
  BEFORE UPDATE ON prompt_examples
  FOR EACH ROW EXECUTE FUNCTION update_prompt_examples_updated_at();


-- ============================================================
-- SEED DATA
-- Industry-calibrated, tone-tagged example posts hand-crafted
-- during development. performance_score pre-set by industry
-- demand / example quality.
-- ============================================================

INSERT INTO prompt_examples
  (industry, tone_tags, source, user_id, image_prompt, visual_concept, caption, hashtags, template_layers, performance_score)
VALUES

-- ── Food & Beverage · Luxurious + Warm ────────────────────────
(
  'Food & Beverage',
  ARRAY['Luxurious', 'Warm', 'Minimal'],
  'seed', NULL,
  'A single wheel-thrown stoneware flat white cup — the exterior finished in a dual-dipped matte ivory glaze, its surface showing the compression marks of the potter''s hands and faint glaze-crawl variations where thickness accumulated near the foot ring — stands dead-centered on a reclaimed old-growth oak serving board, the timber surface deep walnut-brown with age-darkened grain lines running diagonally across the lower half of the frame. The matching oversized stoneware saucer grounds the composition with quiet weight. On the milk surface: a precisely executed five-ring rosette in deep espresso-brown, the concentric rings tight and crisp at center, the final pour-sweep creating a clean pointed tail at twelve o''clock. A single whole Ethiopian Yirgacheffe coffee bean rests on the saucer at two o''clock. Tight vertical portrait composition, camera at exact cup-rim height so the latte art surface is visible at a gentle foreshortened angle — the interior depth subtly readable, the upper third of the frame the oak surface dissolving into shallow focus. Lighting: a 2×1m north-facing diffused daylight window from the upper left, overcast sky, casting soft directional fill with no hard shadow edges; a slim white reflector card at the lower right returns a warm bounce fill into the shadow side of the cup; a razor-thin specular arc catches along the upper rim of the ceramic. The room beyond the light falls to warm shadow. Color grading in the warmth and micro-grain of Kodak Portra 400 pushed half a stop — elevated shadow warmth, amber in the deepest wood tones, warm cream on the highest glaze points, grain visible in shadow areas. Color palette: warm ivory glaze, deep walnut-brown timber, espresso-dark froth patterning, pale straw specular, warm charcoal mid-shadow. Mood: pre-opening intimacy, artisanal precision, unhurried craft. Art style: ultra-photorealistic luxury beverage product photography with analogue editorial warmth. Shot on Hasselblad H6D-400C, HC 100mm f/2.2, aperture f/2.8, shallow depth of field — cup and latte art in complete focus, background oak gently dissolving. Ultra-high resolution, no text, no words, no labels, no logos.',
  'A ceramic flat white coffee cup with latte art on a dark wooden surface, lit by warm morning light evoking artisan café warmth.',
  'Some mornings deserve more than a rush.

This is your signal to slow down. Pull a chair. Let the steam rise.

Every cup we roast carries the hands of the farmers who grew it — and the quiet craft of the barista who pulled the shot just right.

Come in. The morning isn''t going anywhere.',
  '#artisancoffee #coffeetime #morningritual #latteart #slowmorning #specialtycoffee #coffeelovers #baristalife #craftcoffee #espresso #flatwhite #coffeephotography #thirdwavecoffee #coffeeshop #coffeeculture',
  '{"title": "Start Slow", "subtitle": "Every cup, a craft", "cta": "Find Us", "brand_name": ""}',
  0.88
),

(
  'Food & Beverage',
  ARRAY['Warm', 'Passionate', 'Minimal'],
  'seed', NULL,
  'A wide-mouthed amber hexagonal glass honey jar — 400ml, its thick faceted walls each catching warm light at different angles, creating a tessellating mosaic of amber, cognac, and liquid gold across the glass surface — sits centered on a surface of undyed raw slub linen, the weave irregular with natural thick-and-thin weft variations and organic off-white variation in the yarns, the fabric faintly rumpled at the frame edges to give organic weight. The jar''s gold metal lid leans against the lower-right exterior, its concave interior showing a small disc of reflected warm light. A hand-carved olivewood honey dipper hangs suspended 14 centimetres directly above the open jar mouth, horizontal in the frame. From the lowest tine of the dipper, a continuous column of wildflower honey descends — 5mm diameter at its origin point, necking smoothly to 3mm over 11 centimetres before entering the pool below. The thread is mid-fall, freeze-framed: intact, taut, showing no dripping or side stream, captured at 1/800s. Optically: semi-translucent amber-gold in the upper length where warm backlight passes through fully, deepening to rich dark honey-cognac in the lower section as optical density increases with thread thickness. A bright continuous specular ribbon runs the full left face of the thread. Inside the jar: a shallow mirror-smooth honey pool reflecting warm overhead light. Surrounding the jar: a rough-broken beeswax honeycomb section at upper-left, a dried lavender sprig at three o''clock, three dried chamomile heads at lower-right, petals preserved in pale straw-yellow. Background: warm raw ecru at center graduating to deep raw umber and muted clay-red at the outer frame edges. Lighting: a 2×1.2m octabank softbox overhead at 3000K as primary fill; a narrow strip backlight behind the jar at bench level illuminating the honey column from within; a 30% diffusion silver reflector returning soft fill to the shadow side. Color grading emulating Fuji Pro 400H — warm shadow lift, slightly desaturated highlights, rich amber saturation in mid-tones. Color palette: wildflower amber, raw honey gold, burnt sienna, ecru linen, deep umber vignette, pale dried-lavender grey. Mood: ancient craft, slow harvest, pure material abundance. Art style: high-end commercial food photography with fine-art still life sensibility. Shot on Phase One IQ4 150MP, Schneider Kreuznach 80mm LS f/2.8, aperture f/5.6, deep field holding the honey thread, jar, and foreground props all in sharp focus. Ultra-high resolution, no text, no words, no labels, no logos.',
  'Raw wildflower honey dripping from a wooden honey dipper into an amber glass jar, surrounded by honeycomb and dried wildflowers on linen.',
  'Straight from the hive. Nothing added, nothing removed.

This is honey the way it has always been — harvested slowly, left wild, bottled before it has a chance to forget where it came from.

Spread it. Stir it. Eat it straight from the spoon. We won''t judge.

Nature did the work. We just kept it whole.',
  '#rawhoney #naturalhoney #wildflowerhoney #honeylover #beekeeping #naturalfood #cleaneating #farmtotable #organic #realfood #slowfood #honeyphotography #artisanfood #naturalliving #beekeeper',
  '{"title": "Pure Harvest", "subtitle": "Nothing added, nothing lost", "cta": "Shop Now", "brand_name": ""}',
  0.85
),

-- ── Fashion · Luxurious + Minimal ─────────────────────────────
(
  'Fashion',
  ARRAY['Luxurious', 'Minimal', 'Professional'],
  'seed', NULL,
  'A single folded Grade-A Mongolian cashmere sweater — cream-white, 12-gauge two-ply knit, the individual fibers visible under directional light as a fine, slightly napped surface with a natural warm ivory cast — rests on a slab of honed Calacatta Borghini marble, the stone surface cool bright-white with fine parallel warm-grey veining running diagonally left-to-right across the mid-frame. The sweater is folded into a clean low rectangle: the collar edge crisply aligned with the near marble edge, the ribbed 2x2-rib cuffs folded back once over themselves in a single deliberate tuck, the fold crease sharp and intentional. A single dried pampas grass stem is placed diagonally across the upper-right corner of the sweater — its full feathery ivory plume extends 8cm beyond the sweater edge, the individual seed filaments each catching the light as a fine back-lit halo fringe. Tight vertical portrait composition, sweater occupying the lower two-thirds of the frame with the marble surface continuing above into soft upper-frame focus. Camera positioned directly overhead at a 5-degree forward tilt to give the marble surface a sense of receding depth. Lighting: a large overhead diffused daylight source — a 2×2m softbox at 5500K — positioned directly above and slightly forward, creating flat even fill across the knit surface with minimal shadow, allowing the individual fiber nap and 2x2 rib texture to read clearly in self-shadowing relief; a second narrow 1K×200mm strip light at 45 degrees from upper-left skims the ribbed cuff texture, picking out each rib ridge in gentle side-light relief. No harsh shadows anywhere. Color grading referencing expired Kodak Ektachrome — slightly elevated whites, clean neutral-to-warm colour transition, fine grain visible in the marble shadow areas. Color palette: warm ivory cashmere, cool alabaster marble, fine warm-grey veining, pale dried-ivory pampas plume, soft diffuse shadow. Mood: restrained material luxury, Nordic quiet, seasonal permanence. Art style: high-end fashion editorial photography with precise product focus, the spare visual language of luxury print advertising. Shot on Fujifilm GFX 100S, GF 100-200mm f/5.6 R LM OIS WR at 120mm, aperture f/4.5, medium depth of field — sweater and pampas grass pin-sharp, marble background softening at upper edge. Ultra-high resolution, no text, no words, no labels, no logos.',
  'A folded ivory cashmere sweater on white marble with a dried pampas grass stem, lit by natural diffused daylight.',
  'The piece that stays.

Not the trend. Not the season. The piece that stays in your wardrobe for the next decade without asking permission.

Cashmere doesn''t shout. It simply outlasts everything around it.

New arrival. Limited run.',
  '#cashmere #minimalistfashion #luxuryfashion #slowfashion #knitwear #capsulewardrobe #quietluxury #neutralaesthetic #timelessstyle #fashion #style #minimalstyle #sustainablefashion #luxuryknitwear #fashionphotography',
  '{"title": "The Piece That Stays", "subtitle": "Cashmere. New arrival.", "cta": "Shop Now", "brand_name": ""}',
  0.83
),

(
  'Fashion',
  ARRAY['Bold', 'Minimal', 'Professional'],
  'seed', NULL,
  'A slim rectangular Italian vegetable-tanned full-grain leather bifold wallet — cognac-amber with a natural surface patina developing toward deeper saddle-tan at the fold spine and corners where handling pressure has burnished the open grain — lies flat on a slab of poured dark-grey architectural concrete, the aggregate visible in the surface as fine black and charcoal mineral points set in a smooth matrix with occasional air-bubble pores creating micro-surface variation. The wallet is placed slightly right of center in a vertical portrait frame, its long axis vertical, the fold spine facing the viewer at a gentle three-quarter angle. A single matte white business card is half-inserted into the right card slot, its sharp white face creating a precise tonal contrast against the amber leather. The stitching is visible in full relief: natural ecru waxed linen thread, a 5mm-pitch saddle stitch running along both long edges, the thread thickness and wax sheen catching the directional light and throwing micro-shadows into each stitch indent. A razor-thin specular highlight runs the full length of the fold spine. The surface leather shows open pore structure in the brightest-lit areas — the natural grain of full-grain hide, distinct from corrected leather. Lighting: a single 600W Fresnel hard light from the upper left at 35-degree elevation and 20-degree horizontal offset, creating a precise specular highlight ridge on the stitching thread and a clean diagonal shadow of the wallet body falling to the lower right across the concrete — the concrete aggregate texture reads in sharp relief within the shadow zone. Absolute zero fill — deep shadows under the card slot tabs and along the base edge. Color grading referencing high-contrast commercial still life: rich unclipped blacks, uncompressed highlights, the concrete cooled to a near-neutral grey, the leather amber saturated without haze. Color palette: cognac amber, saddle tan at creases, ash-grey concrete, ecru waxed linen thread, matte white card, deep charcoal shadow. Mood: honest material craft, masculine restraint, slow provenance. Art style: precision commercial still life photography, the visual vocabulary of luxury leather goods advertising. Shot on Nikon Z9, NIKKOR Z MC 105mm f/2.8 VR S macro, aperture f/5.6, full depth of field with the complete wallet surface and concrete texture sharp throughout. Ultra-high resolution, no text, no words, no labels, no logos.',
  'A cognac vegetable-tanned leather wallet on dark concrete, lit with dramatic side lighting to reveal the leather grain and stitching.',
  'Leather remembers.

Every crease, every fold — the mark of somewhere you''ve been. Vegetable-tanned, it darkens where you carry it, lightens where you hold it. No two age the same.

This is what handmade means.

Made to last 20 years. Starts with you.',
  '#leathergoods #vegetabletanned #handmade #leatherwallet #craftedleather #minimalistaccessories #mensfashion #leatherwork #slowfashion #artisancrafts #edc #everydaycarry #leathercraft #luxuryaccessories #timelesscraft',
  '{"title": "Leather Remembers", "subtitle": "Handmade. Vegetable-tanned.", "cta": "Discover More", "brand_name": ""}',
  0.80
),

-- ── Beauty / Skincare · Luxurious + Warm ──────────────────────
(
  'Beauty',
  ARRAY['Luxurious', 'Warm', 'Minimal'],
  'seed', NULL,
  'A slim 30ml rectangular clear borosilicate glass dropper bottle — walls 2mm thick, the glass water-clear with zero green tint, filled with a warm golden rosehip and jojoba face oil that occupies 85% of the interior volume, the oil luminous and semi-translucent — stands upright, perfectly centered in a vertical 4:5 frame on a honed travertine slab, the stone warm bone-white with natural fossilized vein striations in pale taupe and raw ivory running horizontally across the mid-frame. The glass dropper pipette tip holds a single suspended droplet at its absolute lowest point — the droplet is a perfect oblate sphere, 6mm diameter, its lower meniscus just beginning to neck before release, the surface tension visible as a tight convex dome. The droplet refracts warm backlight internally: its center glows luminous amber-gold, its lower curvature holds a tiny white specular point, and it casts a warm micro-caustic spot on the travertine surface directly below. A single dried Rosa damascena petal — pale dusty-rose pink, its edges translucent where the cell walls have thinned — rests on the travertine at the lower-left, 3cm from the bottle base. Subtle frosted etching on the glass body suggests branding without interrupting the optical clarity. Background: warm bone-white at center transitioning to soft neutral grey at the outer frame edges, entirely out of focus. Lighting: dual-source — primary warm backlight from a 150W LED panel positioned directly behind the bottle at bench height, creating a corona halo effect that illuminates the oil from within and outlines the bottle silhouette in amber-gold edge light; secondary 2×1m softbox above and slightly left at 5500K providing cool daylight fill for the stone surface; a narrow silver reflector beneath the bottle returns a warm upward fill. Color grading referencing Fuji Provia 100F — clean, saturated, fine grain, warm shadow lift in the amber range. Color palette: amber liquid gold, water-clear borosilicate glass, warm bone travertine, pale dusty rose, warm ivory stone, soft neutral-grey background. Mood: skin-first ritualism, botanical precision, sensory luxury. Art style: high-end luxury cosmetics editorial photography with ultra-precision product visualization. Shot on Sony Alpha 1, Sony FE 90mm f/2.8 Macro G OSS, aperture f/3.2, shallow depth of field with the bottle in complete tack focus, petal and background in smooth cinematic bokeh. Ultra-high resolution, no text, no words, no labels, no logos.',
  'A glass dropper bottle of golden face oil on travertine stone with a rose petal, backlit to show the luminous amber oil.',
  'Your skin is not a problem to solve.

It''s an organ that breathes, shifts, and reflects everything you carry. We made this oil for what your skin actually needs — not what the ad industry decided to sell you.

Four ingredients. Pressed cold. Nothing extracted that shouldn''t be.

Ritual first. Results follow.',
  '#skincare #naturalbeauty #faceoil #cleanbeauty #rosehipoil #glowingskin #botanicalskincare #naturalskincare #skinfirst #luxuryskincare #beautyroutine #organicskincare #skincareobsessed #crueltyfree #serum',
  '{"title": "Ritual First", "subtitle": "Pure. Cold-pressed. Yours.", "cta": "Learn More", "brand_name": ""}',
  0.82
),

(
  'Beauty',
  ARRAY['Bold', 'Professional', 'Inspiring'],
  'seed', NULL,
  'A sculptural matte-black glass perfume bottle — geometric hexagonal cross-section, each of the six facets ground to a flat plane creating precise angular transitions, the glass finished in a matte acid-etch that absorbs light rather than reflecting it — stands precisely centered on a polished black obsidian stone plinth, the stone so highly polished that the base of the bottle creates a mirror-perfect vertical reflection below, symmetrical to within a millimetre. The bottle stands 12cm tall with a matte black machined aluminium cap, its top face showing fine concentric turned-ring texture. A single Phalaenopsis orchid bloom — pure white petals with a central labellum in pale violet and cadmium yellow, the petals semi-translucent at their edges — is placed on the obsidian surface at lower-left, two petals resting flat against the polished stone, the orchid''s 15cm stem curving upward out of frame. A fine mist of fragrance particles occupies the upper atmosphere — rendered as a silver-white crystalline haze, each particle catching the hard backlight as a tiny bright specular point — concentrated in a 30cm radius above the bottle, thinning and dispersing toward the frame edges. Background: absolute velvet black, featureless, infinite depth — the bottle and its reflection float in a void with no spatial reference. Lighting: a 600W Fresnel hard light from upper-right at 40-degree elevation, throwing cold white directional light that creates angular highlight planes on the three visible bottle facets while leaving the other three in complete shadow, resulting in a dramatic faceted light-and-dark geometry across the hexagonal form; a second narrow hard backlight from directly behind at 20cm elevation creating a cold white rim-corona around the bottle silhouette and energizing the fragrance mist into a crystalline haze. Absolute zero fill — deep uncompromised shadow. Color grading: maximum contrast, cold shadows with near-zero lift, matte surfaces rendered near-neutral, the orchid providing the only warm color accent in the composition. Color palette: matte charcoal black, polished obsidian mirror, pure white orchid petals, pale violet labellum, cold silver fragrance mist, near-black deep shadow. Mood: dark sculptural luxury, architectural commanding presence, theatrical restraint. Art style: cinematic high-end fragrance editorial photography. Shot on Canon EOS R5, Canon RF 85mm f/1.2L, aperture f/2.0, selective focus holding the bottle body and orchid bloom, the mist dissolving into soft atmospheric haze. Ultra-high resolution, no text, no words, no labels, no logos.',
  'A geometric matte black perfume bottle on obsidian stone with a white orchid and a fine mist of fragrance caught in hard backlight.',
  'A scent is not a detail.

It''s the first thing people remember and the last thing they forget. It arrives before you do and lingers long after you''ve left the room.

This one was made for exactly that.

New fragrance. In stores now.',
  '#perfume #fragrance #luxuryperfume #scentoftheday #nicheperfume #beautyluxury #fragrancecommunity #parfum #darkbeauty #editorialbeauty #newlaunch #beautyproduct #fragrancelover #luxuryfragrance #scentaddict',
  '{"title": "Before You Arrive", "subtitle": "New fragrance. In stores now.", "cta": "Discover More", "brand_name": ""}',
  0.79
),

-- ── Fitness / Wellness · Bold + Inspiring ────────────────────
(
  'Fitness',
  ARRAY['Bold', 'Inspiring', 'Passionate'],
  'seed', NULL,
  'A pair of high-performance road running shoes — matte black engineered mesh upper with a subtle hexagonal geometric structure woven into the fabric, a thick stacked foam midsole in deep charcoal grey with a carbon fibre plate visible at the lateral edge as a thin dark stripe, black rubber outsole with a circular directional lug pattern — stands upright on a wet urban asphalt road surface at 2 AM, the pavement glistening with a thin film of recent rain. The shoes are positioned in a tight V-shape, toes pointing toward the viewer at a 20-degree spread, photographed from a camera position 8cm above the road surface — an extreme low-angle three-quarter view that makes the midsole stack tower dramatically upward in the frame. The asphalt surface in the foreground shows the full wet-mirror effect: the shoe base creates a compressed reflection in the standing water, the reflection distorted by tiny surface ripples each catching a point of the overhead streetlamp. Individual water droplets bead on the hydrophobic mesh upper — each droplet 3–4mm, holding a tiny specular point of the streetlamp. A shallow elongated puddle of electric cobalt-blue reflected light stretches from the outsole toward the camera along the bottom third of the frame. Lighting: a single high-pressure sodium streetlamp directly overhead at 6m height, casting a hard top-down pool of warm amber-white light that bleaches the upper shoe surface and creates deep under-arch shadows; a secondary LED streetlamp at 40m to the left contributing cold electric blue ambient fill that reflects across the wet road surface. Purely practical street sources, no additional lighting. Color grading referencing Cinestill 800T pushed one stop — elevated grain in shadows, cyan-shifted blues in ambient areas, warm halos around practical light sources. Color palette: matte black mesh, deep charcoal midsole, wet asphalt charcoal, electric cobalt blue reflection, warm amber-white streetlamp, cold water silver. Mood: pre-dawn urban grit, chosen solitude, unwitnessed effort. Art style: cinematic nocturnal sports editorial photography, the visual language of elite athletic brand campaigns. Shot on Sony Alpha 1, Sony FE 24mm f/1.4 GM, aperture f/2.0, wide-angle exaggerating the low perspective, full shoe in sharp focus, background street dissolving to atmospheric depth. Ultra-high resolution, no text, no words, no labels, no logos.',
  'Black running shoes on wet night asphalt reflecting electric blue light, photographed from a low dramatic angle.',
  'No one is watching at 5 AM.

That''s the point.

This is the version no one posts about — the wet pavement, the cold air, the alarm you actually answered. The miles that add up before anyone else opens their eyes.

We build gear for that version of you.',
  '#running #fitness #runnersofinstagram #runningshoes #morningrun #athleticgear #performancegear #trainhard #runner #fitnessmotivation #runningcommunity #5amclub #streetrunning #runninglife #nocturnal',
  '{"title": "5 AM Version", "subtitle": "No one is watching. Run anyway.", "cta": "Shop Gear", "brand_name": ""}',
  0.86
),

(
  'Fitness',
  ARRAY['Bold', 'Professional', 'Inspiring'],
  'seed', NULL,
  'A single 24kg competition-grade cast iron kettlebell — the body spherical, finished in matte black powder coat with a fine sand texture visible in the hard directional light, the handle a precisely machined 33mm-diameter chrome bar with cross-hatched knurling running its full width, a white kilogram stamp pressed into the iron at the front face — stands centered on a polished brushed-concrete gym floor, the floor mid-grey with fine aggregate visible and a low-sheen sealed finish that gives a muted compressed reflection at the base. Tight vertical portrait, the kettlebell centered just below mid-frame allowing the floor surface and industrial background to recede behind it. A scatter of white gym chalk coats the handle from repeated training sessions — heaviest at the inner handle radius, lighter on the outer flats, and a fine atmospheric chalk haze is visible in the 15cm sphere around the handle, backlit into a crystalline cloud. On the floor at the base: a faint halo of chalk residue in the grey concrete surface, its edge gradating outward over 20cm. Background: a high-bay industrial gym wall at 4 metres in soft focus — deep charcoal with exposed ventilation ductwork barely legible as a ghost form. Lighting: a single 650W hard Fresnel light from the upper right at 50-degree elevation and 30-degree horizontal offset, casting one hard diagonal shadow of the kettlebell body across the floor to the lower left and picking out every knurl point on the chrome handle in sharp specular relief — the chrome shows a brilliant white highlight ridge along its full upper arc. Absolute zero fill — the shadow side of the iron body in near-complete darkness, the powder-coat texture only readable at the terminator edge. Color grading referencing Ilford HP5 pushed to ISO 1600 emulation in color — elevated shadow grain, high micro-contrast, cold shadow tone, slightly compressed highlights. Color palette: matte charcoal-black iron, chrome satin-silver handle, white chalk dust, polished mid-grey concrete, near-black industrial shadow. Mood: industrial discipline, serious craft, earned weight. Art style: high-contrast strength equipment photography, the aesthetic of elite training facilities. Shot on Nikon Z9, NIKKOR Z 85mm f/1.8 S, aperture f/4.0, medium field with the full kettlebell body in sharp focus. Ultra-high resolution, no text, no words, no labels, no logos.',
  'A cast iron kettlebell with chalk-dusted chrome handle on polished concrete, lit with a single hard directional light.',
  'The weight doesn''t care what day it is.

It doesn''t care that you''re tired, or busy, or that today was harder than yesterday. It just sits there, waiting.

Consistency isn''t motivation. It''s the decision you made before you needed to make it again.

Show up.',
  '#kettlebell #fitness #strengthtraining #gymlife #workout #functionalfitness #crossfit #strengthandconditioning #trainhard #fitfam #gymrat #powerlifting #fitnessjourney #gymmotivation #kettlebellworkout',
  '{"title": "Show Up", "subtitle": "The weight is waiting.", "cta": "Train With Us", "brand_name": ""}',
  0.81
),

-- ── Tech / SaaS · Professional + Minimal ─────────────────────
(
  'Technology',
  ARRAY['Professional', 'Minimal', 'Informative'],
  'seed', NULL,
  'An open aluminium laptop in Space Grey finish, lid open at 112 degrees, the display showing a dark-mode analytics dashboard with precisely rendered UI: deep graphite-grey interface panels, clean white Inter typeface headers, a multi-line area chart in electric blue and teal on a dark background, three data card panels in the upper row each showing white numerals against dark card surfaces, fine grid lines, no chrome UI noise. The keyboard surface reflects a thin horizontal specular highlight across the top row of function keys from the overhead light. The laptop is positioned on a solid live-edge European walnut desk plank — 50mm thick single slab, the grain running horizontally in bands of warm honey-brown and deep mahogany, faint medullary ray patterning visible in direct light. To the laptop''s left at 25cm: a closed Leuchtturm1917 A5 notebook in matte black, a Lamy AL-star fountain pen in graphite aluminium laid diagonally across it at 15 degrees. To the right at 20cm: a Lyngby Porcelain espresso cup in matte white, empty, with a dried coffee ring visible at the interior base from this angle. Overhead at 12-degree tilt from vertical, portrait 4:5 frame, laptop centered with desk surface extending to all four frame edges. Lighting: primary large overhead 2×2m softbox at 4200K warm white, even fill creating minimal soft shadows directed to lower-right; a narrow bare-bulb strip light from the left at 5-degree grazing angle picks up the walnut grain in raking relief; the screen''s own 6500K cold glow provides self-illumination, creating a subtle cool cast on the keyboard and lower display bezel that contrasts with the warm desk tone. Color grading referencing clean commercial technology photography — neutral colour balance, slight highlight roll-off, controlled shadow density. Color palette: Space Grey aluminium, warm walnut honey-brown grain, cold screen-glow blue-white, matte black notebook, graphite aluminium pen, matte white ceramic, deep mahogany grain shadow. Mood: focused professional clarity, design-forward intelligence, the productive solitude of deep work. Art style: high-end technology editorial photography with interior lifestyle sensibility. Shot on Fujifilm GFX 100S, GF 45-100mm f/4 R LM OIS WR at 65mm, aperture f/3.5, medium depth of field with all desk objects in complete focus. Ultra-high resolution, no text, no words, no labels, no logos.',
  'Open laptop with dark-mode dashboard on a walnut desk alongside a closed notebook and empty espresso cup, from a slight overhead angle.',
  'The best workflows don''t feel like work.

They feel like thinking clearly. Like finding the answer before anyone finished asking the question.

We built the tool for that gap — the one between knowing what needs to happen and actually making it happen fast.

Your team''s next quarter starts here.',
  '#productivity #saas #techstartup #remotework #workfromhome #workflowautomation #businesstools #entrepreneur #startuplife #techproduct #b2b #softwaresolutions #digitaltools #focustime #futureofwork',
  '{"title": "Think Clearly", "subtitle": "The workflow tool that gets out of the way.", "cta": "Start Free", "brand_name": ""}',
  0.77
),

-- ── Home / Interior · Warm + Minimal ─────────────────────────
(
  'Home & Lifestyle',
  ARRAY['Warm', 'Minimal', 'Luxurious'],
  'seed', NULL,
  'A wide cylindrical hand-cast concrete candle vessel — 12cm diameter, 8cm tall, the exterior surface a matte warm ash-grey with visible pour-seam lines along the side and fine air-bubble craters in the concrete matrix, the surface rough enough to catch raking light in granular relief — holds a single ivory pillar candle, 7cm diameter, burning with a living teardrop flame precisely 18mm tall. The flame is sharp and precisely rendered at its tip, transitioning to warm translucent amber-orange at its widening body, and to a near-invisible pale blue at its base where combustion temperature is highest. The wax pool around the wick is a shallow, perfectly smooth concave well of molten ivory wax — 8cm diameter — its mirror surface reflecting the flame above as a bright inverted point, with a ring of warm amber glow at the pool perimeter where liquid meets solid wax. Thin smoke microparticles are visible at the flame tip, backlit into a fine pale wisp. The vessel sits on a weathered Bianco Carrara marble coaster, 15cm diameter, marble worn at its edges and showing warm sand-gold veining. The candle occupies the lower-center two-thirds of the vertical portrait frame, set against a heavy dark-washed European linen backdrop — visible loose basket weave in deep warm brown-grey, the fabric nap catching the warm flame light at weave intersections, creating a micro-pattern of warm and dark fibres across the background. Foreground at 8cm: a dried California white sage bundle, 15cm long, bound tightly with natural jute twine, resting at 25 degrees; beside it, a 10cm piece of pale bleached driftwood. Lighting: primary source is the candle flame itself — its 1800K warm light illuminating all surfaces within a 25cm radius, creating a warm sphere of amber-orange fill on the concrete exterior and marble coaster; beyond this radius the linen falls to deep shadow. A secondary cold 5600K strip light at 3 metres to the left, heavily diffused, provides just enough shadow fill to keep the concrete vessel readable on its far side. Color grading referencing warm analogue: elevated shadow warmth in the amber range, slight corner vignetting. Color palette: ash-grey concrete, amber-ivory molten wax, warm orange flame, weathered Carrara marble, dark warm-grey linen, pale bleached sage, driftwood ivory. Mood: sanctuary evening stillness, domestic ritual, sensory retreat. Art style: atmospheric luxury home fragrance editorial photography. Shot on Canon EOS R5, Canon RF 85mm f/1.2L, aperture f/1.8, ultra-shallow depth of field — flame and wax pool in sharp focus, foreground sage and background linen in layered bokeh. Ultra-high resolution, no text, no words, no labels, no logos.',
  'A concrete candle vessel with a burning ivory candle lit by its own flame against dark linen, with dried sage and driftwood in the foreground.',
  'Light one. Put the phone down.

The hour before sleep belongs to you — not the inbox, not the feed, not the news. Just warmth, scent, and the kind of quiet you have to choose.

Hand-poured. Cedar and white sage. Thirty hours of slow burn.

Make the room yours.',
  '#candle #homedecor #candlelovers #handpouredcandle #interiordesign #cozyhome #homeaesthetics #candlelight #hygge #scented #homefragrance #slowliving #ambiance #cozyliving #homeinspo',
  '{"title": "Light One", "subtitle": "Cedar & Sage. 30 hours.", "cta": "Shop Candles", "brand_name": ""}',
  0.84
),

(
  'Home & Lifestyle',
  ARRAY['Minimal', 'Professional', 'Warm'],
  'seed', NULL,
  'A wide low bowl — wheel-thrown by hand from dark stoneware body clay, 28cm exterior diameter, 8cm depth, the organic rim showing slight undulation and the distinct compressed-finger impression marks of the potter''s left hand at twelve and six o''clock, evidence of hand-centering — sits centered on a large cast-concrete plinth surface, the concrete pale warm ash-grey, machine-troweled to a smooth finish with occasional dark aggregate inclusions visible as small mineral points. The interior glaze is a deep matte teal — Blythe earthenware teal, colour-dense at the base of the bowl where it pooled thickest during firing, graduating to a lighter seafoam-teal at the rim where the glaze thinned; a fine crackle pattern runs across the interior surface, the crazing lines visible as thin darker seams in the glaze matrix under direct overhead light. The exterior below the glaze line is intentionally left bare — the dark raw stoneware body, a warm terracotta-red-brown, visible in an uneven band covering the lower 40% of the exterior, showing fine grog texture and faint kiln shelf contact marks. Resting inside the bowl, off-center toward two o''clock: a halved Mission fig, cut face upward — exterior skin a deep blue-black matte, interior a jewel-toned garnet red with a pale ivory pith ring and densely packed seeds at center, each seed individually visible. The composition is a perfect vertical overhead shot — camera directly above, perpendicular to the concrete surface, bowl dead-centered, concrete extending to all frame edges. Lighting: flat perfectly even 5600K daylight fill — a 2×2m overhead softbox at 1.5m distance simulating overcast north-facing skylight, creating no directional shadows, all edges self-lit — the crackle glaze and pottery textures readable purely through their own surface variation. Color grading referencing clean natural documentary — neutral balance, slightly desaturated, no warmth shift. Color palette: matte teal glaze, raw dark stoneware terracotta, pale ash-grey concrete, jewel garnet fig interior, blue-black fig skin, ivory pith. Mood: slow domestic abundance, hand and clay, material honesty. Art style: editorial craft still life photography with precise material documentation. Shot on Fujifilm GFX 100S, GF 110mm f/2 R LM WR, aperture f/8.0, full depth of field — every element sharp from bowl rim to concrete edge. Ultra-high resolution, no text, no words, no labels, no logos.',
  'A handmade teal ceramic bowl with an organic rim, holding a halved fig, photographed overhead on concrete in flat natural light.',
  'Made by hand. Used every day.

The bowl that sits on your counter, your table, your bedside. The one that holds everything from keys to fruit to the last olive at the end of a long dinner.

Wheel-thrown. Each one different. Each one yours.

New collection — limited.',
  '#ceramics #handmadeceramics #pottery #wheelthrown #ceramicsofinstagram #ceramicart #studiopottery #homedecor #artisancraft #slowliving #makersmark #handmade #tableware #craftceramics #contemporarycraft',
  '{"title": "Made by Hand", "subtitle": "Wheel-thrown. Each one different.", "cta": "View Collection", "brand_name": ""}',
  0.80
),

-- ── Food & Beverage · Bold + Playful ─────────────────────────
(
  'Food & Beverage',
  ARRAY['Bold', 'Playful', 'Warm'],
  'seed', NULL,
  'A towering artisan double-smash burger — 18cm from board to bun crown, photographed in full cross-section in a tight vertical portrait frame — stands on a rough-hewn dark Welsh slate serving board, its stacked architecture completely exposed to the camera. Layer anatomy from base to crown: a bottom brioche bun half, lightly toasted on a flat-top to a deep amber-gold with grill contact marks visible on the cut face and pale cream house aioli spread edge-to-edge; two house-ground dry-aged beef smash patties, each pressed thin on the flat-top to develop a dark full-perimeter Maillard crust, the interior a pink-medium at the visible cross-section edge, beef fat and rendering juices creating a natural gloss on the outer crust; two slices of Montgomery aged cheddar at full mid-melt — the cheese has softened to a smooth flowing drape over the patty edges, pooling on the bun surface, showing oil separation at the highest-temperature contact point; a thick-cut heritage beef tomato slice, vivid fire-engine red with pale interior seed pockets visible; a Gem lettuce leaf, bright forest green, its lower edge slightly wilted from heat contact. The brioche crown: deep amber, heavily sesame-seeded, a pronounced egg-wash gloss, a single oven-spring crack running across the crown at 45 degrees. The entire stack is intentionally imperfect — a thin trail of melted cheddar running down the right patty side, a visible aioli drip at lower-left. All real food, unmanipulated. Background: deep basalt-slate grey gradient, entirely out of focus. Lighting: a single 800W Profoto B10 Plus with a 1×3m strip softbox from the upper left at 40 degrees, creating strong directional side-light that reveals every textural layer — the sesame seed ridges, the cheese drape, the crust carbonization, the tomato seed moisture — while the right side falls into rich deep shadow. Color grading referencing high-saturation commercial food photography — reds and ambers elevated, blacks deep and uncompressed, maximum food-color vibrancy. Color palette: amber-gold brioche, vivid fire-engine red tomato, melted amber-yellow cheddar, deep charred-brown crust, forest green lettuce, pale cream aioli, dark slate surface. Mood: unapologetic appetite, craft indulgence, bold material truth. Art style: editorial commercial food photography with Michelin-level visual confidence. Shot on Phase One IQ4 150MP, Rodenstock 70mm HR-W Digaron f/4, aperture f/5.6, deep field maintaining all burger layers in sharp focus. Ultra-high resolution, no text, no words, no labels, no logos.',
  'A towering artisan brioche burger with melted cheddar, heirloom tomato, and charred beef, lit with dramatic side lighting on dark slate.',
  'Some things just don''t need a caption.

(But here we are anyway.)

Fresh brioche. Dry-aged beef. Aged cheddar that actually melts the way cheddar is supposed to. The tomato from down the road. The aioli made this morning.

Thursday. Come hungry.',
  '#burger #artisanburger #foodphotography #burgerlovers #foodstagram #gourmetburger #cheesy #foodie #driedagedbeef #brioche #foodlover #instafood #localfood #burgerporn #cheeseburger',
  '{"title": "No Explanation Needed", "subtitle": "Fresh. Local. Thursday.", "cta": "Find Us", "brand_name": ""}',
  0.87
),

-- ── Fashion · Playful + Bold ──────────────────────────────────
(
  'Fashion',
  ARRAY['Playful', 'Bold', 'Inspiring'],
  'seed', NULL,
  'A structured canvas-and-leather tote bag — body fabric a vivid electric cobalt blue heavyweight canvas, 600gsm, the weave tightly packed with a slight surface sheen giving the cobalt a rich saturated depth; top rolled handles in natural vegetable-tanned full-grain tan leather showing natural surface grain and slight creasing where the handles meet the reinforced brass D-ring attachment rivets — stands upright, self-supporting, on a surface of antique hand-painted terracotta encaustic tile, the tile surface deep brick-red and clay-orange with faint worn geometric patterning visible at the tile center, the grout lines showing age. The bag is photographed at a natural three-quarter angle, slightly left of center in a vertical portrait composition showing the full bag height, the cobalt face as the dominant visual plane, the handle arc at the top. The bag front panel faces the camera: the cobalt surface showing a single clean base seam and two horizontal ridge seams where interior structure panels provide rigidity. A fresh-cut sunflower — single stem, 8cm remaining, the head 14cm diameter, petals vivid cadmium yellow with a dark brown disc center and visible ray-floret detail — leans against the lower-right face of the bag from the tile surface, the stem at a 30-degree diagonal, the flower head at shoulder height against the cobalt. Lighting: a large natural daylight window to the right at 90 degrees to the camera axis, warm afternoon light at 4200K, creating a warm side-lit bloom across the cobalt canvas face — the right side of the bag in full warm golden fill, the left side in a soft cool shadow; the terracotta tile surface catching the full warm side-light and glowing at its deepest clay-red. A white reflector card to the left returns a 20% fill into the shadow side. Background: plain limewash render wall in warm white, entirely out of focus in smooth circular bokeh. Color grading referencing Kodak Ektar 100 — maximum color saturation, fine grain, vivid primary colors at full extension. Color palette: electric cobalt blue canvas, natural warm-tan leather, cadmium yellow sunflower, burnt terracotta tile, warm ivory limewash, brass rivet gold. Mood: chromatic confidence, unambiguous joy, sun-drenched optimism. Art style: vibrant lifestyle editorial fashion photography. Shot on Sony Alpha 1, Sony FE 85mm f/1.4 GM, aperture f/2.5, subject in full focus with tile surface and wall in smooth progressive bokeh. Ultra-high resolution, no text, no words, no labels, no logos.',
  'A cobalt blue structured tote bag on terracotta tile with a fresh sunflower leaning against it, lit by warm window light.',
  'Color is a decision.

So is the bag you carry. The one that says: I got places to be and I''m not particularly stressed about it.

New season. New cobalt. Same confidence.',
  '#tote #totebag #fashion #fashionbag #handbag #accessories #colorful #summerfashion #brightstyle #fashionlover #bagstagram #ootd #streetstyle #fashionaccessories #sustainablefashion',
  '{"title": "Color Is a Decision", "subtitle": "New season. New cobalt.", "cta": "Shop Now", "brand_name": ""}',
  0.78
)

ON CONFLICT DO NOTHING;
