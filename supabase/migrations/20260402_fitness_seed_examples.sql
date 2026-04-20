-- ============================================================
-- Lumen: additional Fitness seed examples
-- Covers gym facility, coaching, and group training contexts
-- so cold-start gym accounts don't fall back to luxury goods.
-- ============================================================

INSERT INTO prompt_examples
  (industry, tone_tags, source, user_id, image_prompt, visual_concept, caption, hashtags, template_layers, performance_score)
VALUES

-- ── Fitness · Bold + Inspiring · Gym floor ────────────────────
(
  'Fitness',
  ARRAY['Bold', 'Inspiring', 'Professional'],
  'seed', NULL,
  'A wide commercial strength training floor photographed at 6:14 AM, fourteen minutes before the facility opens — the space entirely empty, purposeful, vast. Camera positioned at 20cm above the rubber matting, framed in a wide vertical portrait at a 15-degree upward tilt, the low angle compressing the floor surface into the mid-frame while the ceiling height rises dramatically above. Foreground: a row of five black Olympic barbells, 20kg each, racked horizontally in their J-hook cradles on a power rack frame that recedes into mid-frame perspective — the barbell sleeves are bright chrome, each catching the incoming morning light as a sharp horizontal specular stripe. The floor surface is black vulcanised rubber matting, 20mm thick, with a diamond-relief texture visible in the raking side-light; parallel shadow lines from the barbell rack columns stripe the floor diagonally from lower-left toward mid-frame. Mid-ground: a black iron plate tree, 180cm tall, loaded with 20kg and 10kg black cast iron plates in descending order, the plates throwing concentric circular shadow rings onto the rubber matting below. The far background dissolves into atmospheric depth haze — the far wall at 25 metres barely legible, the ghost outlines of wall-mounted mirrors and rubber-floored lifting platforms visible as soft forms. Ceiling: exposed industrial steel RSJ beams at 7m height, painted matte black; industrial strip fluorescent fittings running the ceiling length, all switched off — the only illumination is natural amber morning light flooding through three-metre floor-to-ceiling windows along the left wall. The light falls as a warm golden column across the central floor section, its edge creating a crisp shadow-to-light boundary, fine chalk-dust particles suspended and backlit in the column, visible as a fine atmospheric grain at mid-frame height. Lighting: entirely practical — the natural golden-hour window light as the sole source, hard and directional, creating deep shadows under all equipment and raking across the floor texture to reveal every diamond-relief indent. Color grading referencing Kodak Portra 800 — elevated grain, warm shadow lift, amber saturation in the light column, cooler tones in the shadowed equipment. Color palette: matte charcoal-black rubber matting, chrome silver barbell sleeve, warm amber-gold morning light column, chalk-white atmospheric particles, deep cast-iron grey, industrial ceiling shadow. Mood: the sanctity of the empty gym, earned silence, sacred pre-dawn discipline. Art style: cinematic architectural sports photography with documentary precision. Shot on Sony Alpha 1, Sony FE 24mm f/1.4 GM, aperture f/5.6, wide-angle capturing full floor depth — all foreground equipment pin-sharp, far background dissolving to atmospheric haze. Ultra-high resolution, no text, no words, no labels, no logos.',
  'An empty gym floor at dawn with rows of barbells and plate racks lit by warm morning light cutting through tall windows.',
  'The floor doesn''t judge.

It just shows up every morning — the same bars, the same chalk, the same silence — waiting to see who came back.

Before the city wakes up, this room is already busy doing what it does best: building something.

Doors open at 6. The floor is yours.',
  '#gym #strengthtraining #gymlife #earlymorning #barbells #weightlifting #powerlifting #gymfloor #fitnessmotivation #trainhard #morningworkout #5amclub #strengthandconditioning #gymcommunity #dedication',
  '{"title": "The Floor Is Yours", "subtitle": "Doors open at 6 AM.", "cta": "Join Now", "brand_name": ""}',
  0.88
),

-- ── Fitness · Warm + Professional · Personal training ─────────
(
  'Fitness',
  ARRAY['Warm', 'Professional', 'Inspiring'],
  'seed', NULL,
  'A personal trainer and client captured in a candid coaching moment — no posing, no awareness of camera — photographed from a medium distance at a natural documentary angle. The trainer stands at the client''s right side and slightly behind, approximately 30cm separation, one hand resting with a light corrective cue on the client''s right forearm at the wrist. Both figures shown from a three-quarter rear-side angle — the client''s face in partial right-profile, the trainer''s face in near-full left-profile showing focused concentration, brow slightly drawn, eyes tracking the client''s elbow position precisely. The client holds a 10kg dumbbell in a standing bicep curl at peak contraction — the forearm musculature defined under the directional light, wrist in neutral alignment. The trainer''s posture is forward and attentive, weight on the front foot, free hand resting at their own waist. Both in fitted athletic training wear: the client in dark navy compression leggings and a muted grey performance top, the trainer in black training trousers and a dark forest green polo-collar coaching top. The gym background is a soft shallow-focus environment — warm amber bokeh from wall-mounted lighting behind, the ghost outlines of squat racks and weight stack machines visible as rounded blur forms, mirror surfaces dissolving to warm golden reflections. Foreground rubber matting partially visible as a dark textured plane leading into the figures. A large window to the left of frame, 3 metres away, provides the primary light source — warm afternoon light at 3800K, falling as a soft side-lit bloom across the nearer side of both figures, the trainer''s face warmly illuminated in near three-quarter profile, the client''s forearm and dumbbell catching a directional highlight that validates the movement form. The window light creates soft half-shadow across the far sides of both bodies. Color grading referencing Fuji 400H — warm highlights, slightly desaturated shadows, smooth and gentle light-to-dark transitions. Color palette: warm amber gym light, deep navy and charcoal training wear, soft steel-grey equipment bokeh, warm skin tones in highlight, mirror-gold background bokeh. Mood: attentive human coaching, the trust between trainer and client, quiet progress in the details. Art style: candid documentary sports portrait photography. Shot on Canon EOS R5, Canon RF 85mm f/1.2L, aperture f/2.0, selective focus on the client''s arm and trainer''s guiding hand in the sharpest focal plane, both figures in comfortable readable context. Ultra-high resolution, no text, no words, no labels, no logos.',
  'A personal trainer coaching a client during a dumbbell exercise, both seen from the side in warm gym light, captured in a candid moment.',
  'One rep at a time. One cue at a time.

The difference between a program and a coach is the hand on your shoulder that says: slower, breathe, you''ve got this.

Results happen in reps. But the transformation starts in the conversation.

Book your first session. We''ll handle the rest.',
  '#personaltraining #fitness #coach #gymcoach #strengthcoaching #personaltrainer #fitnessmotivation #training #workout #gymlife #fitnessjourney #oneonone #results #healthylifestyle #fitlife',
  '{"title": "One Rep at a Time", "subtitle": "Book your first session.", "cta": "Book Now", "brand_name": ""}',
  0.86
),

-- ── Fitness · Bold + Passionate · Group class ─────────────────
(
  'Fitness',
  ARRAY['Bold', 'Passionate', 'Warm'],
  'seed', NULL,
  'A group fitness class photographed from the front corner of the studio, camera elevated at 210cm and angled 15 degrees downward — the instructor at the front-center of frame, two rows of participants receding behind. The instructor is captured mid-movement in a deep reverse lunge: front knee at 90 degrees, rear knee 10cm above the hardwood floor, both arms extended forward at shoulder height with palms flat — their form is technically exact, expression fierce and direct, facing the camera with the commanding authority of someone who has delivered this cue a thousand times. Behind: the first row of eight participants mirrors the lunge at varying depths — two at the instructor''s depth, three at 75%, the rest finding their range, creating real collective effort rather than choreographed perfection. Second row visible through the gaps at reduced focus. The studio floor is dark oiled American walnut sprung hardwood — 90mm board widths — its surface polished enough to catch the overhead lighting as four long parallel specular streaks running from the instructor''s feet toward the camera. The ceiling: matte black acoustic panels at 4.5m height, with six overhead spotlight cans — four producing a warm amber-gold 3200K wash across the main floor zone, two narrower 4500K floods tracking the instructor, all creating warm modelling light that defines muscle tone and motion blur on the fastest-moving extremities at a 1/80s shutter. A 4-metre wall mirror behind the group reflects the rear of the class, doubling the visual mass of participants and adding spatial depth. Slight motion blur on extended arms and hands — bodies held, gesture softened. Lighting: the overhead studio rig as sole source, zero natural light, the warm amber-gold creating a stage quality that isolates the class from the surrounding void. Color grading referencing Kodak Vision3 500T cinematic emulation — elevated shadow grain, warm midtone saturation, slight highlight roll-off giving the studio light a filmic quality. Color palette: warm amber-gold overhead wash, dark oiled walnut floor, matte black acoustic ceiling, warm skin tones in directional fill, mixed athletic-wear palette of navy, black, and deep red. Mood: collective momentum, the alchemy of shared effort, earned group energy. Art style: cinematic fitness editorial photography, the visual language of boutique studio brand campaigns. Shot on Sony Alpha 1, Sony FE 35mm f/1.4 GM, aperture f/2.8, 1/80s shutter, wide-angle capturing the full room depth. Ultra-high resolution, no text, no words, no labels, no logos.',
  'A group fitness class in motion, instructor at the front leading a dynamic lunge exercise, participants receding behind in warm studio lighting.',
  'Something changes when you''re not doing it alone.

The rep you were going to skip. The round you almost sat out. The pace you wouldn''t have held on your own.

This is what a room full of people who showed up does for you.

Classes this week — spots still open.',
  '#groupfitness #fitnesscommunity #gymclass #fitfam #workouttogether #classesofinstagram #gymvibes #fitnessmotivation #communityovercompetition #groupworkout #strengthclass #training #gymlife #fitnessclass #moveyourbody',
  '{"title": "Not Alone", "subtitle": "Classes this week — join us.", "cta": "Reserve Spot", "brand_name": ""}',
  0.85
),

-- ── Fitness · Minimal + Warm · Recovery ───────────────────────
(
  'Fitness',
  ARRAY['Warm', 'Minimal', 'Professional'],
  'seed', NULL,
  'A precision overhead flat-lay composition on a pale polished concrete surface — the concrete a warm light grey with faint natural aggregate variation and zero visual noise — objects arranged in a deliberate asymmetric layout occupying the full vertical 4:5 portrait frame. Object inventory and positions: a standard-length foam roller in matte white, 90cm × 15cm, positioned diagonally from upper-left to lower-center at a 30-degree axis, its surface texture — circular EVA foam ridges, each 5mm raised — casting fine parallel shadow lines in the diffused directional light; beside the roller''s lower-right end, a set of three resistance bands in matte black flat-braided latex, each 200cm × 3cm, coiled individually into three offset circles of decreasing diameter from 20cm to 14cm, stacked loosely with the smallest on top; at upper-right, a 750ml insulated stainless steel water bottle in matte black with a hammered texture finish and a brushed aluminium press-fit cap, standing vertically, its base precisely placed, the hammered surface creating a pattern of micro-highlights from the overhead light; at lower-right, a single white cotton gym towel, 60×30cm, folded into a clean three-fold rectangle, its tightly woven surface showing a fine shadow grid from the weave structure, one corner fold intentionally imperfect. Between all objects: deliberate negative space — the pale concrete surface fully visible at every gap, the negative space as compositionally intentional as the objects themselves. Camera directly overhead, perfectly perpendicular, at 160cm height, vertical 4:5 portrait. Lighting: a large 2×2m diffused daylight overhead softbox at 5600K, supplemented by a wide 60×60cm softbox to the left creating a gentle directional gradient — slightly brighter from left to right — with no hard shadows, all object edges self-defining through their own surface relief. All object shadows are soft, 3–4cm offset, indicating pure overcast daylight quality. Color grading referencing clean natural documentary: neutral colour balance, slight underexposure in shadow areas to give the concrete surface subtle depth, no warmth shift. Color palette: warm pale-grey concrete, matte white foam roller, matte black rubber resistance bands, brushed aluminium cap, matte black water bottle, clean white cotton. Mood: deliberate post-session recovery, quiet athletic discipline, maintenance as practice. Art style: editorial lifestyle flat-lay photography with precise material documentation. Shot on Hasselblad H6D-400C, HC 50mm f/3.5 II, aperture f/8.0, full depth of field — every object surface sharp from edge to edge of frame. Ultra-high resolution, no text, no words, no labels, no logos.',
  'A minimalist overhead flat-lay of gym recovery essentials — foam roller, resistance band, water bottle, and towel — on pale concrete in diffused natural light.',
  'The session after the session.

The work that doesn''t count reps but counts for everything — the ten minutes with the foam roller, the water you actually drank, the sleep you protected.

Recovery isn''t the break from training. It''s half of it.

Take care of the machine.',
  '#recovery #gymrecovery #foamrolling #fitnessrecovery #restday #activerecovery #mobility #gymessentials #healthyhabits #fitnesslifestyle #selfcare #training #athlete #sportsrecovery #wellness',
  '{"title": "The Session After", "subtitle": "Recovery is half the work.", "cta": "Learn More", "brand_name": ""}',
  0.82
)

ON CONFLICT DO NOTHING;
