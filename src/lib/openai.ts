import OpenAI from "openai";
import type { MatchingBrandProfile } from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildSdrNotes(
  strategy: { method: string; angle: string; seasonalMoment: string } | undefined,
  mailNumber: number,
  timing: string
): string {
  if (!strategy) return "";
  const notes: string[] = [];

  const methodNotes: Record<string, string> = {
    linkedin_email: "Mention having recently seen their LinkedIn profile or company page.",
    partner_intro: "Reference a mutual marketplace connection or operator intro.",
    seasonal_push: "Lead with the seasonal commercial opportunity.",
    email_sequence: "",
  };
  if (methodNotes[strategy.method]) notes.push(methodNotes[strategy.method]);

  const angleNotes: Record<string, string> = {
    competitive_gap: "Emphasize that direct competitors are already active on the target marketplace.",
    roi: "Lead with concrete ROI numbers and time savings.",
    social_proof: "Open with a success story from a similar brand in the same category.",
    seasonal_window: `Anchor the message to the upcoming ${strategy.seasonalMoment.replace(/_/g, " ")} commercial window.`,
    market_fit: "Highlight the strong category and geography alignment with the marketplace.",
  };
  if (angleNotes[strategy.angle]) notes.push(angleNotes[strategy.angle]);

  if (strategy.seasonalMoment !== "always_on") {
    notes.push(`Seasonal moment to leverage: ${strategy.seasonalMoment.replace(/_/g, " ")}.`);
  }

  notes.push(`This is email ${mailNumber} of 3, sending on ${timing}.`);

  return notes.join(" ");
}

export async function generateEmail(params: {
  sellerName: string;
  category: string;
  country: string;
  priceRange: string;
  matchScore: number;
  topMarketplace: string;
  eligibleMarketplaces: string;
  matchRationale: string;
  competitors: string;
  marketTrend: string;
  roiEstimate: string;
  contactName?: string;
  contactJobTitle?: string;
  mailNumber: 1 | 2 | 3;
  mailTiming: string;
  strategy?: { method: string; angle: string; seasonalMoment: string };
  customInstructions?: string;
}) {
  const systemPrompt = `<role>
You are an expert B2B Sales Development Representative (SDR) and Copywriter working for Mirakl. Your expertise lies in writing highly personalized, concise, and high-converting cold emails for e-commerce brands and retailers.
</role>

<context>
Mirakl is a global SaaS company that provides enterprise marketplace platforms. "Mirakl Connect" is an ecosystem that helps brands and sellers easily find and join hundreds of Mirakl-powered marketplaces globally.

A major pain point for sellers when joining new marketplaces is adapting their product catalog to fit each specific marketplace's rules. Mirakl solves this with its "AI-powered Catalog Transformer", which automates product data mapping, reducing onboarding time from weeks to just 24 hours. Another solution is Mirakl's Generative Engine Optimization (GEO) to boost AI discovery.

Key rules:
1. ZERO PLACEHOLDERS — CRITICAL. The email MUST be ready to send as-is.
   - NEVER use brackets of any kind: [name], [your name], [signature], {name}, <placeholder>, [LinkedIn], [calendar link], [company], [date].
   - NEVER write "Insert X here", "Add X", "Your X", "to be filled", "TBD", "XXX".
   - If a specific link, date, or calendar URL is not provided in the inputs, rephrase so it is not needed (e.g. "reply to this email" instead of "[book a slot here]").
   - If a contact name is missing, open with a neutral but warm greeting like "Bonjour" or "Hi there", never "Bonjour [prénom]".
2. SIGNATURE — Always close the email with exactly this sign-off on its own two lines, nothing else:
      Best,
      The Mirakl Team
   (In French emails use: "Cordialement,\\nL'équipe Mirakl")
   Do not add any personal name, no "[Your name]", no job title, no phone number. This is the final version that a Mirakl SDR will review and send; they will not edit the signature.
3. CONCISENESS: Keep the email under 150-200 words.
4. STRUCTURE: Short intriguing subject line, personalized hook, clear value proposition, low-friction CTA, signature.
5. TONE: Professional, consultative, confident, slightly urgent.
6. CUSTOMIZATION: Use all provided inputs to make the email hyper-relevant.
7. LANGUAGE: Write in French if the country is FR/BE/EU, in English otherwise.
8. CTA: The call-to-action must be answerable by replying to the email (e.g. "Would next Tuesday or Wednesday work for a 15-min intro?"). Do not reference external links, calendars, or scheduling tools unless one is explicitly provided in the inputs.
9. RESPONSE FORMAT: JSON with exactly two keys: "subject" and "body". The body is plain text with real line breaks (\\n), not markdown.
</context>`;

  const firstName = params.contactName
    ? params.contactName.split(" ")[0]
    : params.sellerName;

  const sdrNotes = buildSdrNotes(params.strategy, params.mailNumber, params.mailTiming);

  const mailFocus: Record<number, string> = {
    1: `This is Mail 1 (sent on ${params.mailTiming}): the COMPETITIVE HOOK. Create FOMO by showing competitors are already on marketplaces. Be ultra-specific using the competitor data and match rationale.`,
    2: `This is Mail 2 (sent on ${params.mailTiming}): the ROI FOLLOW-UP. Convince with numbers. Show the cost of manual multi-marketplace management vs Mirakl Connect. Use ROI estimate and category data to personalize.`,
    3: `This is Mail 3 (sent on ${params.mailTiming}): the URGENCY + SOCIAL PROOF CLOSE. Mention success stories in their category. Create gentle urgency. Direct CTA to a personalized demo.`,
  };

  const userPrompt = `<inputs>
<first_name>${firstName}</first_name>
<company_name>${params.sellerName}</company_name>
<product_category>${params.category}</product_category>
<price_category>${params.priceRange}</price_category>
<country>${params.country}</country>
<matching_marketplace>${params.topMarketplace}</matching_marketplace>
<match_rationale>${params.matchRationale || params.eligibleMarketplaces}</match_rationale>
<sdr_notes>${sdrNotes}</sdr_notes>
<sales_name>Mirakl Connect</sales_name>
</inputs>

<mail_instructions>
${mailFocus[params.mailNumber]}
Competitors already on marketplaces: ${params.competitors}
Market trend: ${params.marketTrend}
ROI estimate: ${params.roiEstimate}
</mail_instructions>
${params.customInstructions?.trim()
  ? `\n<user_override_instructions priority="highest">
${params.customInstructions.trim()}

IMPORTANT: the instructions above come directly from the user and MUST take precedence over any default tone, length, or structure rule, except for the JSON response format. Apply them literally.
</user_override_instructions>\n`
  : ""}
Respond ONLY with valid JSON: {"subject": "...", "body": "..."}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No response from OpenAI");

  const parsed = JSON.parse(content) as { subject: string; body: string };
  return sanitizeEmailOutput(parsed, params.country);
}

// Strip any residual placeholder and enforce the Mirakl Team signature.
// The LLM occasionally slips in "[Your Name]" or similar — this pass ensures
// we never ship an email that a human would have to edit before sending.
function sanitizeEmailOutput(
  email: { subject: string; body: string },
  country: string
): { subject: string; body: string } {
  const isFrench = ["FR", "BE", "CH", "LU", "EU"].includes((country || "").toUpperCase());
  const signature = isFrench
    ? "Cordialement,\nL'équipe Mirakl"
    : "Best,\nThe Mirakl Team";

  let body = email.body || "";

  // 1) Remove bracket-style placeholders like [anything], {anything}, <anything>
  //    but keep legitimate line breaks and punctuation.
  body = body
    .replace(/\[[^\]\n]{1,80}\]/g, "")
    .replace(/\{\{[^}\n]{1,80}\}\}/g, "")
    .replace(/\{[^}\n]{1,80}\}/g, "")
    // XML-style placeholder only (avoid eating legit "<" usage)
    .replace(/<(insert|your|placeholder|add|tbd|name)[^>]*>/gi, "");

  // 2) Strip common filler phrases like "Your Name", "Insert link here"
  body = body
    .replace(/\b(insert|add|your)\s+(name|link|calendar|signature|email|company|date|time)\b[^.\n]*/gi, "")
    .replace(/\bTBD\b/g, "")
    .replace(/\bXXX+\b/g, "");

  // 3) Normalize trailing whitespace + double line breaks
  body = body.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();

  // 4) Force signature: drop any existing sign-off after the last CTA and append ours.
  //    We detect the last sign-off block (lines matching common patterns) and replace
  //    everything from there to end with our canonical signature.
  const signoffPattern = /(\n[ \t]*(?:best(?:\s+regards)?|cheers|cordialement|sincerely|regards|thanks|thank you|bien[^\n]*|warmly|warm regards|kind regards|looking forward)[\s\S]*)$/i;
  if (signoffPattern.test(body)) {
    body = body.replace(signoffPattern, `\n\n${signature}`);
  } else {
    body = `${body}\n\n${signature}`;
  }

  return { subject: email.subject || "", body };
}

export async function analyzeMarketplace(marketplaceName: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Tu es un expert du e-commerce et des marketplaces mondiales. Tu connais en détail les positionnements, catégories, et marques présentes sur chaque marketplace.`,
      },
      {
        role: "user",
        content: `Analyse la marketplace "${marketplaceName}".

1. Décris cette marketplace :
   - Catégories principales (parmi : fashion, footwear, beauty, accessories, sports, kids, luxury)
   - Positionnement prix (parmi : budget, mid, premium, luxury)
   - Pays cibles
   - Taille minimale de catalogue recommandée

2. Liste 15-20 marques connues présentes sur cette marketplace.

Réponds UNIQUEMENT en JSON valide :
{
  "name": "...",
  "description": "...",
  "preferred_categories": ["fashion", ...],
  "preferred_prices": ["mid", ...],
  "accepted_prices": ["premium", ...],
  "preferred_countries": ["DE", ...],
  "accepted_countries": ["FR", ...],
  "min_catalog": 10,
  "known_brands": ["Brand1", "Brand2", ...]
}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 800,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No response from OpenAI");

  return JSON.parse(content);
}

export async function analyzeBrandProfile(params: {
  brandName: string;
  companyDomain?: string;
}): Promise<MatchingBrandProfile> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "Tu es un expert du commerce digital B2B. Tu dois profiler une marque pour un matching marketplace. Reponds uniquement en JSON.",
      },
      {
        role: "user",
        content: `Profile la marque "${params.brandName}" ${params.companyDomain ? `avec le domaine ${params.companyDomain}` : ""}.

Donne une hypothese utile pour le matching marketplace avec les champs suivants :
{
  "brandName": "${params.brandName}",
  "companyDomain": "${params.companyDomain || ""}",
  "focusCategories": ["fashion"],
  "priceBands": ["mid"],
  "targetCountries": ["FR"],
  "customerPositioning": ["unisex"],
  "catalogueExpectation": ["medium"],
  "distributionModel": ["mono-brand"],
  "seasonalMoments": ["always_on"]
}

Contraintes :
- Rester prudent si l'information n'est pas certaine
- Utiliser des valeurs compactes compatibles avec un moteur de matching
- Pas de texte hors JSON`,
      },
    ],
    temperature: 0.2,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No response from OpenAI");
  return JSON.parse(content) as MatchingBrandProfile;
}

export type BrandCategory =
  | "fashion"
  | "footwear"
  | "beauty"
  | "accessories"
  | "sports"
  | "kids"
  | "luxury"
  | "home";

export type BrandPriceBand = "budget" | "mid" | "premium" | "luxury";

export interface BrandScopeClassification {
  inScope: boolean;
  category: BrandCategory | null;
  priceBand: BrandPriceBand | null;
  country: string | null;
  confidence: "high" | "medium" | "low";
  reason: string;
}

const IN_SCOPE_CATEGORIES: BrandCategory[] = [
  "fashion",
  "footwear",
  "beauty",
  "accessories",
  "sports",
  "kids",
  "luxury",
  "home",
];

const PRICE_BANDS: BrandPriceBand[] = ["budget", "mid", "premium", "luxury"];

/**
 * Classifies whether a brand belongs to the Mirakl Fashion universe
 * (fashion, footwear, beauty, accessories, sports, kids, luxury, home).
 * Returns inScope=false for out-of-vertical brands (Michelin, Total, Renault, etc.).
 */
export async function classifyBrandScope(params: {
  brandName: string;
  companyDomain?: string;
}): Promise<BrandScopeClassification> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    max_tokens: 300,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a brand classifier for Mirakl Connect, a marketplace platform focused on Fashion, Beauty, Accessories, Sports, Kids, Luxury, Home, and Footwear. " +
          "Given a brand name and optional domain, output a strict JSON classification. " +
          "Be accurate — brands like Michelin (tires), Total (oil), Renault (cars), McDonald's (food), Orange (telecom) are OUT OF SCOPE. " +
          "Fashion/beauty/accessories/sport/kidswear/luxury brands are IN SCOPE.",
      },
      {
        role: "user",
        content: `Classify the brand "${params.brandName}"${params.companyDomain ? ` (domain: ${params.companyDomain})` : ""}.

Respond with JSON only, this exact shape:
{
  "inScope": boolean,
  "category": "fashion" | "footwear" | "beauty" | "accessories" | "sports" | "kids" | "luxury" | "home" | null,
  "priceBand": "budget" | "mid" | "premium" | "luxury" | null,
  "country": "FR" | "DE" | "UK" | "US" | "IT" | "ES" | "NL" | "BE" | "SE" | "DK" | "AT" | "PL" | "PT" | "CH" | "AU" | "CA" | "JP" | null,
  "confidence": "high" | "medium" | "low",
  "reason": "short explanation in French"
}

Rules:
- If you are not confident the brand is a CONSUMER brand in Fashion/Beauty/Accessories/Sport/Kids/Luxury/Home/Footwear, set inScope=false.
- If the brand is primarily known for tires, cars, oil, food, telecom, banking, industrial goods, software, or services → inScope=false.
- If the brand name is ambiguous (e.g. "Total" could be oil OR a clothing label) and domain doesn't disambiguate, set inScope=false with confidence=low.
- Price bands: budget (<30€ avg), mid (30-100€), premium (100-300€), luxury (300€+).
- If inScope=false, category and priceBand must be null.
- Reason must be one short sentence in French.`,
      },
    ],
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No response from OpenAI classifier");

  const raw = JSON.parse(content) as Partial<BrandScopeClassification>;

  // Strict validation — coerce invalid values to safe defaults rather than trust the LLM
  const category = raw.category && IN_SCOPE_CATEGORIES.includes(raw.category as BrandCategory)
    ? (raw.category as BrandCategory)
    : null;
  const priceBand = raw.priceBand && PRICE_BANDS.includes(raw.priceBand as BrandPriceBand)
    ? (raw.priceBand as BrandPriceBand)
    : null;
  const inScope = raw.inScope === true && category !== null;

  return {
    inScope,
    category: inScope ? category : null,
    priceBand: inScope ? priceBand : null,
    country: typeof raw.country === "string" ? raw.country : null,
    confidence: raw.confidence === "high" || raw.confidence === "medium" || raw.confidence === "low"
      ? raw.confidence
      : "low",
    reason: typeof raw.reason === "string" ? raw.reason : "Classification incertaine.",
  };
}

export async function analyzeCompetitors(params: {
  sellerName: string;
  category: string;
  priceRange: string;
  country: string;
}) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Tu es un expert du e-commerce. Tu connais les marques DTC et leurs présences sur les marketplaces (Zalando, La Redoute, Galeries Lafayette, John Lewis, Debenhams, Bloomingdales, Nordstrom).`,
      },
      {
        role: "user",
        content: `Pour la marque "${params.sellerName}" (catégorie: ${params.category}, gamme: ${params.priceRange}, pays: ${params.country}):

1. Identifie 3-5 concurrents directs dans la même catégorie et gamme de prix
2. Pour chaque concurrent, indique sur quelles marketplaces ils sont présents (parmi: Zalando, La Redoute, Galeries Lafayette, John Lewis, Debenhams, Bloomingdales, Nordstrom)
3. Donne une tendance de croissance e-commerce pour cette catégorie

Réponds UNIQUEMENT en JSON valide :
{
  "competitors": [
    {"name": "...", "presentOn": ["Zalando", "Nordstrom"]},
    ...
  ],
  "marketTrend": "La catégorie fashion mid-range connaît une croissance de 15% par an sur les marketplaces européennes..."
}`,
      },
    ],
    temperature: 0.5,
    max_tokens: 600,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No response from OpenAI");

  return JSON.parse(content);
}
