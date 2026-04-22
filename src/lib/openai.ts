import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmail(params: {
  sellerName: string;
  category: string;
  country: string;
  priceRange: string;
  catalogueSize: string;
  matchScore: number;
  topMarketplace: string;
  eligibleMarketplaces: string;
  competitors: string;
  marketTrend: string;
  roiEstimate: string;
  mailNumber: 1 | 2 | 3;
}) {
  const systemPrompt = `Tu es un expert en prospection commerciale B2B pour Mirakl Connect, la plateforme SaaS qui connecte les sellers aux plus grandes marketplaces (Zalando, La Redoute, Galeries Lafayette, John Lewis, Debenhams, Bloomingdales, Nordstrom).

Mirakl Connect permet aux marques de gérer tous leurs canaux marketplace depuis une seule interface. Pricing : Growth 599€/mois, Pro 1 999€/mois, Enterprise sur devis. 80 000+ sellers, 50+ opérateurs.

Règles strictes :
- Ton professionnel mais pas corporate, direct et engageant
- Personnalisation MAXIMALE avec les données fournies — cite des chiffres précis
- Sujet du mail accrocheur et spécifique (pas générique)
- Max 150 mots pour le corps du mail
- CTA clair en fin de mail
- Langue : français si le pays est FR/EU, anglais sinon
- Format de réponse : JSON avec "subject" et "body"`;

  const mailDescriptions: Record<number, string> = {
    1: `Mail 1 — L'ACCROCHE CONCURRENTIELLE (envoi J0)
Objectif : créer le FOMO en montrant que les concurrents sont déjà sur les marketplaces.
Montre que des marques similaires sont déjà présentes et profitent d'une visibilité accrue.
Utilise les données de concurrents pour être ultra-spécifique.`,
    2: `Mail 2 — LE ROI CHIFFRÉ (envoi J+5)
Objectif : convaincre par les chiffres.
Présente le coût de gérer manuellement plusieurs marketplaces vs Mirakl Connect.
Utilise le ROI estimé et la taille du catalogue pour personnaliser les chiffres.
Montre l'économie de temps et d'argent concrète.`,
    3: `Mail 3 — L'URGENCE + SOCIAL PROOF (envoi J+12)
Objectif : closer avec urgence douce.
Mentionne des success stories dans leur catégorie.
Crée un sentiment d'urgence (places limitées, marché qui évolue).
CTA direct vers une démo personnalisée.`,
  };

  const userPrompt = `Contexte seller :
- Nom : ${params.sellerName}
- Catégorie : ${params.category}
- Pays : ${params.country}
- Gamme de prix : ${params.priceRange}
- Taille catalogue : ${params.catalogueSize}
- Score de compatibilité : ${params.matchScore}/100
- Marketplace recommandée : ${params.topMarketplace}
- Marketplaces éligibles : ${params.eligibleMarketplaces}
- Concurrents déjà présents : ${params.competitors}

Données marché :
- Tendance : ${params.marketTrend}
- ROI estimé : ${params.roiEstimate}

${mailDescriptions[params.mailNumber]}

Réponds UNIQUEMENT en JSON valide : {"subject": "...", "body": "..."}`;

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

  return JSON.parse(content) as { subject: string; body: string };
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
