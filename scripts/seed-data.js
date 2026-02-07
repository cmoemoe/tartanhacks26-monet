/**
 * Seed data for dummy beauty accounts: GRWM, tutorials, product reviews.
 * Uses Unsplash for images; one Pexels-style placeholder for video.
 * Feed images (main + explore) use this pool. Pinterest (pin.it) links cannot be used as direct image URLs.
 */

const UNSPLASH = "https://images.unsplash.com";
const img = (id, w = 800) => `${UNSPLASH}/photo-${id}?w=${w}&q=80`;

// Pool of makeup/beauty images for feed posts (main page + explore). First 2 from user-provided Unsplash links
// (CDN IDs resolved from unsplash.com/photos/...). Pin.it links cannot be used as direct image URLs.
const MAKEUP_IMAGE_IDS = [
  "1512496015851-a90fb38ba796", // close-up photography of assorted cosmetics (unsplash.com/...FoeIOgztCXo)
  "1583209814683-c023dd293cc6", // pink and black makeup brush set (unsplash.com/...dMjkQJs58uo)
  "1487412947147-5cebf100ffc2", // lipstick application
  "1762522919970-18818d127017",  // dramatic makeup
  "1693004927824-f2623bbedc8b",  // skincare/lotion
  "1494790108377-be9c29b29330",
  "1534523857172-9d5c1e0c8d5d",
  "1507003211169-0a1dd7228f2d",
  "1517841905240-472988babdf9",
  "1544005313-94ddf0286df2",
  "1529626455594-4ff0802cf3fb",
  "1531123897727-8f129e168ec9",
  "1515023677547-593d7638c4ae",
  "1524504388940-b1c1722653e6",
  "1531746020798-e6953c6e8e04",
  "1487412720507-e7abf03c5f9c",
  "1570176443072-9c0a2e0e1b2b",
  "1612817288484-5f680412f4b0",
  "1522335789203-aabd1fc54bc4",
  "1596474232999-7a5a1e2c2b2b",
  "1506905925346-ee7177b0c5c5",
  "1519699047748-0c1c0c0c0c0c",
];
const pool = MAKEUP_IMAGE_IDS.map((id) => img(id));
const getUniqueImage = (index) => pool[index % pool.length];

// Short demo video (public domain / sample)
const SAMPLE_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

/** Profile definitions (order determines user index 0–9). Trigger creates profile with id, full_name; we update the rest. */
export const SEED_PROFILES = [
  { full_name: "Maya Chen", username: "mayaglow", bio: "GRWM & everyday glam ✨ Rare Beauty & CT stan" },
  { full_name: "Jordan Reese", username: "jordanbeauty", bio: "Tutorials • dupes • honest reviews" },
  { full_name: "Alex Rivera", username: "alexmakeup", bio: "Minimal makeup, max impact. Skin-first." },
  { full_name: "Sam Taylor", username: "samdoesmakeup", bio: "Product junkie. Sephora & Ulta hauls." },
  { full_name: "Casey Blake", username: "caseyblakebeauty", bio: "Get ready with me & soft glam" },
  { full_name: "Riley Kim", username: "rileykbeauty", bio: "K-beauty meets Western. Dewy everything." },
  { full_name: "Morgan James", username: "morganjmakeup", bio: "Bold looks & eyeliner tutorials" },
  { full_name: "Quinn Davis", username: "quinnbeauty", bio: "Cream blushes, skin tints, no-makeup makeup" },
  { full_name: "Jordan Lee", username: "jlee.beauty", bio: "Budget-friendly dupes & drugstore faves" },
  { full_name: "Skylar Rose", username: "skylarrosebeauty", bio: "Soft glam & Charlotte Tilbury" },
];

/**
 * Post definitions. Each has profileIndex 0–9, post_type, caption, tags, and media fields.
 * 30 posts total: GRWM, tutorials, product reviews. Each post with media gets a unique image index.
 */
let _imgIndex = 0;
function nextImageIndex() {
  return _imgIndex++;
}

export const SEED_POSTS = [
  // Maya Chen (0) – GRWM
  { profileIndex: 0, post_type: "video", caption: "GRWM for a casual day out 🍂 using my fall favorites – Rare Beauty blush & CT setting spray", tags: ["grwm", "getreadywithme", "fallmakeup", "rarebeauty", "charlottetilbury"], video_url: SAMPLE_VIDEO, image_url: getUniqueImage(nextImageIndex()), likes_count: 412 },
  { profileIndex: 0, post_type: "image", caption: "No-makeup makeup look with L’Oréal True Match & cream blush. So easy.", tags: ["nomakeupmakeup", "creamblush", "loreal", "everydaymakeup"], image_url: getUniqueImage(nextImageIndex()), likes_count: 289 },
  { profileIndex: 0, post_type: "blog", caption: "My 5 min routine: skin tint, concealer, blush, mascara, lip balm. That’s it. I use L’Oréal True Match skin tint, a tiny bit of concealer under the eyes, cream blush (Rare Beauty or e.l.f. Camo), one coat of mascara, and a tinted lip balm. No foundation, no powder – just enough to look awake and put-together.", tags: ["5minmakeup", "quickroutine", "minimal"], image_url: null, likes_count: 156 },
  // Jordan Reese (1) – Tutorials
  { profileIndex: 1, post_type: "image", caption: "Step-by-step soft glam eye using Natasha Denona midi palette. Tutorial saved in highlights!", tags: ["tutorial", "softglam", "natashadenona", "eyeshadow"], image_url: getUniqueImage(nextImageIndex()), likes_count: 534 },
  { profileIndex: 1, post_type: "slideshow", caption: "Full face tutorial: base, contour, eyes, lips. All products linked in bio.", tags: ["tutorial", "fullface", "makeuptutorial"], media_urls: [getUniqueImage(nextImageIndex()), getUniqueImage(nextImageIndex()), getUniqueImage(nextImageIndex())], likes_count: 892 },
  { profileIndex: 1, post_type: "blog", caption: "Best drugstore dupes for Charlotte Tilbury Pillow Talk – e.l.f. & NYX options under $12. The e.l.f. lip tint in the mauve shade is the closest I’ve found; the NYX Butter Gloss in Praline is a bit warmer but still in the same family. Both last well and don’t dry out my lips. Save your money and try these first.", tags: ["dupes", "drugstore", "charlottetilbury", "elf", "nyx"], image_url: null, likes_count: 1203 },
  // Alex Rivera (2) – Skin-first
  { profileIndex: 2, post_type: "image", caption: "Skin prep is everything. Tinted serum + minimal base = this glow.", tags: ["skinprep", "tintedserum", "glow", "skincare"], image_url: getUniqueImage(nextImageIndex()), likes_count: 445 },
  { profileIndex: 2, post_type: "video", caption: "GRWM with only 6 products. Hydrating base, cream everything.", tags: ["grwm", "minimal", "creamblush", "hydrating"], video_url: SAMPLE_VIDEO, image_url: getUniqueImage(nextImageIndex()), likes_count: 278 },
  { profileIndex: 2, post_type: "image", caption: "Ravie Beauty skin tint review – lightweight, buildable, perfect for everyday.", tags: ["review", "raviebeauty", "skintint", "lightweight"], image_url: getUniqueImage(nextImageIndex()), likes_count: 198 },
  // Sam Taylor (3) – Hauls & reviews
  { profileIndex: 3, post_type: "image", caption: "Sephora haul 🛍️ Rare Beauty Soft Pinch (Happy), Summer Fridays lip butter, Fenty setting powder.", tags: ["sephorahaul", "rarebeauty", "summerfridays", "fenty"], image_url: getUniqueImage(nextImageIndex()), likes_count: 667 },
  { profileIndex: 3, post_type: "blog", caption: "Rare Beauty Soft Pinch Liquid Blush – worth the hype? Yes. Blend with fingers or brush. A little goes a long way; I use one dot per cheek and blend out. Happy is my go-to for everyday; it gives a natural flush. Lasts all day and doesn’t settle into pores. One of my top 3 blushes ever.", tags: ["rarebeauty", "blush", "review", "bestseller"], image_url: null, likes_count: 423 },
  { profileIndex: 3, post_type: "slideshow", caption: "Ulta run: e.l.f. Camo blush, NYX Buttermelt, Benefit Benetint. Budget-friendly faves.", tags: ["ulta", "elf", "nyx", "benefit", "drugstore"], media_urls: [getUniqueImage(nextImageIndex()), getUniqueImage(nextImageIndex()), getUniqueImage(nextImageIndex())], likes_count: 512 },
  // Casey Blake (4) – GRWM
  { profileIndex: 4, post_type: "video", caption: "Chatty GRWM – full routine with my current favorites. So many questions answered!", tags: ["grwm", "chatty", "fullroutine", "favorites"], video_url: SAMPLE_VIDEO, image_url: getUniqueImage(nextImageIndex()), likes_count: 721 },
  { profileIndex: 4, post_type: "blog", caption: "Get ready with me in 10 min – products I always reach for. Skin tint, concealer, cream blush, brow gel, mascara, lip balm. I keep a small bag of these in my drawer so I can do my face fast before work or a casual dinner. No brushes needed except for brows; everything else is fingers.", tags: ["grwm", "10min", "everyday"], image_url: null, likes_count: 189 },
  // Riley Kim (5) – K-beauty
  { profileIndex: 5, post_type: "image", caption: "Dewy K-beauty inspired look. Glass skin base + cream blush + lip tint.", tags: ["kbeauty", "dewy", "glassskin", "creamblush"], image_url: getUniqueImage(nextImageIndex()), likes_count: 556 },
  { profileIndex: 5, post_type: "slideshow", caption: "Tutorial: dewy base with skin tint, concealer, and cream products only.", tags: ["tutorial", "dewy", "skintint", "cream"], media_urls: [getUniqueImage(nextImageIndex()), getUniqueImage(nextImageIndex()), getUniqueImage(nextImageIndex())], likes_count: 401 },
  { profileIndex: 5, post_type: "blog", caption: "Charlotte Tilbury Hyaluronic Happikiss vs Summer Fridays lip butter – both worth it. CT is more tinted and glossy; Summer Fridays is balmier and clearer. I use CT when I want a hint of color and SF when I just want hydration. Neither is sticky. Would repurchase both.", tags: ["review", "charlottetilbury", "summerfridays", "lipbalm"], image_url: null, likes_count: 298 },
  // Morgan James (6) – Bold
  { profileIndex: 6, post_type: "image", caption: "Fenty Pro Filt’r setting powder – keeps my oily T-zone matte all day. Review in comments.", tags: ["review", "fenty", "settingpowder", "oilyskin"], image_url: getUniqueImage(nextImageIndex()), likes_count: 267 },
  // Quinn Davis (7) – Cream products
  { profileIndex: 7, post_type: "image", caption: "Cream blush overload 🎨 CT Matte Beauty Blush Wand, Rare Beauty, e.l.f. Camo.", tags: ["creamblush", "charlottetilbury", "rarebeauty", "elf"], image_url: getUniqueImage(nextImageIndex()), likes_count: 478 },
  { profileIndex: 7, post_type: "blog", caption: "Why I switched to cream everything – blush, bronzer, highlighter. Game changer. Creams blend into skin and look more natural; no powdery finish. I use CT Matte Beauty Blush Wand, a cream bronzer stick, and a liquid highlighter. Application is faster and my dry skin looks healthier. Highly recommend if you’re over powder.", tags: ["cream", "blush", "bronzer", "minimal"], image_url: null, likes_count: 312 },
  { profileIndex: 7, post_type: "slideshow", caption: "No-makeup makeup GRWM – skin tint, cream blush, brow gel, lip balm.", tags: ["grwm", "nomakeupmakeup", "creamblush", "browgel"], media_urls: [getUniqueImage(nextImageIndex()), getUniqueImage(nextImageIndex())], likes_count: 534 },
  // Jordan Lee (8) – Dupes
  { profileIndex: 8, post_type: "blog", caption: "Ulta vs Sephora – where I buy what. Budget breakdown for my last haul. I buy drugstore at Ulta (e.l.f., NYX, L’Oréal) and prestige at Sephora (Rare Beauty, CT, Fenty). Ulta points add up fast; Sephora has better samples. Last haul: $45 at Ulta, $62 at Sephora. Both have good return policies.", tags: ["ulta", "sephora", "budget", "haul"], image_url: null, likes_count: 645 },
  { profileIndex: 8, post_type: "image", caption: "NYX Buttermelt blush review – $11 and so good. Blends like a dream.", tags: ["review", "nyx", "blush", "drugstore"], image_url: getUniqueImage(nextImageIndex()), likes_count: 423 },
  // Skylar Rose (9) – Soft glam
  { profileIndex: 9, post_type: "image", caption: "Soft glam look ✨ CT Pillow Talk lip, gloss, and blush. One brand, full look.", tags: ["softglam", "charlottetilbury", "pillowtalk", "glam"], image_url: getUniqueImage(nextImageIndex()), likes_count: 823 },
  { profileIndex: 9, post_type: "video", caption: "GRWM – soft glam edition. Skin first, then CT Airbrush Spray & Pillow Talk.", tags: ["grwm", "softglam", "charlottetilbury", "skinfirst"], video_url: SAMPLE_VIDEO, image_url: getUniqueImage(nextImageIndex()), likes_count: 567 },
  { profileIndex: 9, post_type: "blog", caption: "Charlotte Tilbury Mini Airbrush Flawless Setting Spray – worth $23? Yes. Holds all day. Fine mist, no sticky feeling, and my makeup doesn’t move. I use it after base and again after eyes and lips. The mini size lasts me a few months. Best setting spray I’ve tried – would repurchase the full size.", tags: ["review", "charlottetilbury", "settingspray", "holygrail"], image_url: null, likes_count: 445 },
];
