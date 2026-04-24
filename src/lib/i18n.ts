"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "en" | "fr";

type Dict = Record<string, string>;

// ═══════════════════════════════════════════════════════════════════════
// Dictionaries. Keys are stable; values are the rendered copy.
// Keep keys in groups matching the UI surface they live on.
// ═══════════════════════════════════════════════════════════════════════

const EN: Dict = {
  // Navigation
  "nav.prospection": "Prospection",
  "nav.outreach": "Outreach",
  "nav.pipeline": "Pipeline",
  "nav.language": "Language",
  "nav.prospection_sub": "Qualify sellers",
  "nav.outreach_sub": "Email sequences",
  "nav.pipeline_sub": "Track pipeline",

  // Prospection — common
  "prospection.bulk": "Bulk",
  "prospection.specific": "Specific",
  "prospection.mode": "Mode",

  // Prospection — bulk dashboard
  "bulk.title": "Bulk prospection",
  "bulk.subtitle": "Pick a target operator, filter the Supabase catalogue and rank the best-fit sellers.",
  "bulk.filters.category": "Category",
  "bulk.filters.category_hint": "Priority catalogue focus for the screening.",
  "bulk.filters.price": "Price",
  "bulk.filters.customer": "Customer",
  "bulk.filters.country": "Country",
  "bulk.filters.amazon": "Amazon presence",
  "bulk.filters.operator": "Target operator",
  "bulk.filters.search": "Search",
  "bulk.filters.search_placeholder": "Seller name…",
  "bulk.filters.apply": "Analyze",
  "bulk.filters.analyzing": "Analyzing…",
  "bulk.filters.clear": "Reset filters",
  "bulk.filters.any": "Any",
  "bulk.filters.amazon_yes": "Yes",
  "bulk.filters.amazon_no": "No",
  "bulk.stats.total": "Sellers scored",
  "bulk.stats.hot": "HOT priority",
  "bulk.stats.high": "HIGH priority",
  "bulk.stats.avg": "Avg score",
  "bulk.push_selected": "Push selected to Outreach",
  "bulk.selected_count": "{n} selected",
  "bulk.no_results": "No seller matches these filters yet.",
  "bulk.globe_toggle": "Toggle globe",

  // Prospection — specific search
  "specific.title": "Scrape & score a seller",
  "specific.badge": "BY SELLER",
  "specific.subtitle": "Enter a brand name and domain — the engine qualifies it via OpenAI and scores it against every marketplace.",
  "specific.brand_name": "Brand name",
  "specific.brand_name_hint": "Exact seller name to analyze.",
  "specific.brand_name_placeholder": "e.g. AGMES",
  "specific.domain": "Domain",
  "specific.domain_hint": "Seller website domain — used for profiling.",
  "specific.domain_placeholder": "e.g. agmesnyc.com",
  "specific.roles": "Target roles",
  "specific.roles_hint": "Priority contacts for the upcoming outreach.",
  "specific.pipeline": "Pipeline",
  "specific.pipeline.step1": "Brand scope classification (OpenAI)",
  "specific.pipeline.step2": "Country inference via domain TLD",
  "specific.pipeline.step3": "Score against the 7 marketplace profiles",
  "specific.pipeline.step4": "Insert into the Supabase sellers table",
  "specific.cta": "Run scraping",
  "specific.scraping": "Scraping…",
  "specific.detected_profile": "Detected profile",
  "specific.recommendations": "Marketplace recommendations",
  "specific.high_priority": "High priority",
  "specific.avg_score": "Avg score",
  "specific.marketplaces_total": "Marketplaces analyzed",
  "specific.selected_count": "{n} marketplace(s) selected",
  "specific.push_outreach": "Push Outreach + Pipeline",
  "specific.push_loading": "Loading…",
  "specific.empty_title": "No seller analyzed yet",
  "specific.empty_hint": "Enter a brand name and its domain to start.",
  "specific.scraping_hint": "Domain inference → profiling → scoring {n} marketplaces",
  "specific.outofscope.title": "Out of Mirakl Fashion scope",
  "specific.outofscope.hint": "No marketplace recommendation generated and no row added to Supabase. Try with a fashion, beauty, accessories, sport, kids or luxury brand.",

  // Outreach
  "outreach.title": "Outreach",
  "outreach.subtitle": "Seller accounts with editable strategy and email sequence.",
  "outreach.empty_title": "No seller in Outreach",
  "outreach.empty_hint": "Use the Prospection tab to qualify sellers and push them here.",
  "outreach.accounts_title": "Seller accounts ({n})",
  "outreach.back": "Back to Outreach",
  "outreach.enrich_contacts": "Enrich contacts",
  "outreach.enrich_searching": "Searching contacts…",
  "outreach.enrich_done": "✓ Contacts found",
  "outreach.enrich_error": "Error",
  "outreach.return_prospection": "Return to Prospection",
  "outreach.score_breakdown": "Score breakdown",
  "outreach.signals": "Signals",
  "outreach.top_operators": "Top operators",
  "outreach.strategy_title": "Outreach strategy",
  "outreach.amazon_fr": "Amazon FR: {n} products",
  "outreach.best_match": "Best match: {name}",

  // Outreach — table columns
  "accounts.seller": "Seller",
  "accounts.category": "Category",
  "accounts.score": "Score",
  "accounts.strategy": "Strategy",
  "accounts.emails": "Emails",
  "accounts.stage": "Stage",
  "accounts.actions": "Actions",
  "accounts.open": "Open",
  "accounts.stage.ready": "Ready",
  "accounts.stage.in_sequence": "In sequence",
  "accounts.stage.sent": "Sent",
  "accounts.stage.replied": "Replied",

  // Email sequence
  "emails.title": "Prospection sequence",
  "emails.subtitle": "3 personalized emails generated by GPT-4o.",
  "emails.generate_all": "Generate all 3 emails",
  "emails.generating": "Generating email {n}…",
  "emails.tab1": "Hook",
  "emails.tab2": "ROI",
  "emails.tab3": "Close",
  "emails.regenerate": "Regenerate",
  "emails.custom_prompt": "Custom prompt",
  "emails.custom_prompt_close": "Close prompt",
  "emails.custom_prompt_label": "Custom instructions (override default prompt)",
  "emails.custom_prompt_placeholder": "e.g. shorter, more direct tone, mention their Black Friday, reference a specific competitor…",
  "emails.custom_prompt_cta": "Regenerate with these instructions",
  "emails.custom_prompt_loading": "Regenerating…",
  "emails.copy": "Copy",
  "emails.copied": "Copied!",
  "emails.send": "Send",
  "emails.sending": "Sending…",
  "emails.sent": "✓ Sent",
  "emails.empty": "Email not yet generated",
  "emails.generate_one": "Generate email {n}",
  "emails.generating_full": "Generating email {n}…",
  "emails.generating_hint": "Competitor analysis + personalized ROI…",

  // Priority badges
  "priority.hot": "HOT PRIORITY",
  "priority.high": "HIGH PRIORITY",
  "priority.medium": "MEDIUM PRIORITY",
  "priority.low": "LOW PRIORITY",

  // Pipeline
  "pipeline.title": "Pipeline",
  "pipeline.subtitle": "Follow-up stages and progression.",
  "pipeline.stage.ready": "Ready",
  "pipeline.stage.in_sequence": "In sequence",
  "pipeline.stage.sent": "Sent",
  "pipeline.stage.replied": "Replied",
  "pipeline.advance": "Advance",
  "pipeline.regress": "Regress",
  "pipeline.empty": "No seller in the pipeline yet.",

  // Strategy editor
  "strategy.method": "Method",
  "strategy.angle": "Angle",
  "strategy.seasonal": "Seasonal moment",
  "strategy.gap1": "Gap email 1→2 (days)",
  "strategy.gap2": "Gap email 2→3 (days)",
};

const FR: Dict = {
  "nav.prospection": "Prospection",
  "nav.outreach": "Outreach",
  "nav.pipeline": "Pipeline",
  "nav.language": "Langue",
  "nav.prospection_sub": "Qualifier des sellers",
  "nav.outreach_sub": "Séquences d'emails",
  "nav.pipeline_sub": "Suivre le pipeline",

  "prospection.bulk": "Bulk",
  "prospection.specific": "Spécifique",
  "prospection.mode": "Mode",

  "bulk.title": "Prospection en lot",
  "bulk.subtitle": "Sélectionnez un opérateur cible, filtrez le catalogue Supabase et scorez les sellers les plus adaptés.",
  "bulk.filters.category": "Catégorie",
  "bulk.filters.category_hint": "Focus catalogue prioritaire pour le screening.",
  "bulk.filters.price": "Prix",
  "bulk.filters.customer": "Client",
  "bulk.filters.country": "Pays",
  "bulk.filters.amazon": "Présence Amazon",
  "bulk.filters.operator": "Opérateur cible",
  "bulk.filters.search": "Recherche",
  "bulk.filters.search_placeholder": "Nom du seller…",
  "bulk.filters.apply": "Analyser",
  "bulk.filters.analyzing": "Analyse en cours…",
  "bulk.filters.clear": "Réinitialiser",
  "bulk.filters.any": "Tous",
  "bulk.filters.amazon_yes": "Oui",
  "bulk.filters.amazon_no": "Non",
  "bulk.stats.total": "Sellers scorés",
  "bulk.stats.hot": "Priorité HOT",
  "bulk.stats.high": "Priorité HIGH",
  "bulk.stats.avg": "Score moyen",
  "bulk.push_selected": "Pousser la sélection dans Outreach",
  "bulk.selected_count": "{n} sélectionné(s)",
  "bulk.no_results": "Aucun seller ne correspond à ces filtres.",
  "bulk.globe_toggle": "Afficher le globe",

  "specific.title": "Scraping & scoring d'un vendeur",
  "specific.badge": "PAR VENDEUR",
  "specific.subtitle": "Entrez le nom de marque et le domaine — le moteur le qualifie via OpenAI et le score contre chaque marketplace.",
  "specific.brand_name": "Nom de marque",
  "specific.brand_name_hint": "Nom exact du vendeur à analyser.",
  "specific.brand_name_placeholder": "Ex: AGMES",
  "specific.domain": "Domaine",
  "specific.domain_hint": "Domaine du site vendeur — utilisé pour le profiling.",
  "specific.domain_placeholder": "Ex: agmesnyc.com",
  "specific.roles": "Rôles à cibler",
  "specific.roles_hint": "Contacts prioritaires pour l'outreach à venir.",
  "specific.pipeline": "Pipeline",
  "specific.pipeline.step1": "Classification du scope via OpenAI",
  "specific.pipeline.step2": "Inférence pays via TLD du domaine",
  "specific.pipeline.step3": "Scoring contre les 7 marketplaces",
  "specific.pipeline.step4": "Insertion dans la table sellers Supabase",
  "specific.cta": "Lancer le scraping",
  "specific.scraping": "Scraping en cours…",
  "specific.detected_profile": "Profil détecté",
  "specific.recommendations": "Recommandations marketplace",
  "specific.high_priority": "Priorité haute",
  "specific.avg_score": "Score moyen",
  "specific.marketplaces_total": "Marketplaces analysées",
  "specific.selected_count": "{n} marketplace(s) sélectionnée(s)",
  "specific.push_outreach": "Push Outreach + Pipeline",
  "specific.push_loading": "Chargement…",
  "specific.empty_title": "Aucun seller analysé",
  "specific.empty_hint": "Entrez un nom de marque et son domaine pour lancer le scraping.",
  "specific.scraping_hint": "Inférence domaine → profiling → scoring {n} marketplaces",
  "specific.outofscope.title": "Marque hors scope Mirakl Fashion",
  "specific.outofscope.hint": "Aucune recommandation marketplace générée et aucune ligne ajoutée en Supabase. Essayez avec une marque mode, beauté, accessoires, sport, kids ou luxe.",

  "outreach.title": "Outreach",
  "outreach.subtitle": "Comptes sellers avec stratégie éditable et séquence d'emails.",
  "outreach.empty_title": "Aucun seller dans Outreach",
  "outreach.empty_hint": "Utilisez l'onglet Prospection pour qualifier et pousser des sellers ici.",
  "outreach.accounts_title": "Comptes sellers ({n})",
  "outreach.back": "Retour à Outreach",
  "outreach.enrich_contacts": "Enrichir les contacts",
  "outreach.enrich_searching": "Recherche contacts…",
  "outreach.enrich_done": "✓ Contacts trouvés",
  "outreach.enrich_error": "Erreur",
  "outreach.return_prospection": "Retour Prospection",
  "outreach.score_breakdown": "Score breakdown",
  "outreach.signals": "Signaux",
  "outreach.top_operators": "Top opérateurs",
  "outreach.strategy_title": "Stratégie outreach",
  "outreach.amazon_fr": "Amazon FR : {n} produits",
  "outreach.best_match": "Best match : {name}",

  "accounts.seller": "Seller",
  "accounts.category": "Catégorie",
  "accounts.score": "Score",
  "accounts.strategy": "Stratégie",
  "accounts.emails": "Emails",
  "accounts.stage": "Stage",
  "accounts.actions": "Actions",
  "accounts.open": "Ouvrir",
  "accounts.stage.ready": "Ready",
  "accounts.stage.in_sequence": "In sequence",
  "accounts.stage.sent": "Sent",
  "accounts.stage.replied": "Replied",

  "emails.title": "Séquence de prospection",
  "emails.subtitle": "3 mails personnalisés générés par GPT-4o.",
  "emails.generate_all": "Générer les 3 mails",
  "emails.generating": "Génération mail {n}…",
  "emails.tab1": "Accroche",
  "emails.tab2": "ROI",
  "emails.tab3": "Closing",
  "emails.regenerate": "Regénérer",
  "emails.custom_prompt": "Prompt custom",
  "emails.custom_prompt_close": "Fermer prompt",
  "emails.custom_prompt_label": "Instructions custom (prioritaires sur le prompt par défaut)",
  "emails.custom_prompt_placeholder": "Ex: plus court, ton plus direct, insiste sur le Black Friday, mentionne un concurrent précis…",
  "emails.custom_prompt_cta": "Régénérer avec ces instructions",
  "emails.custom_prompt_loading": "Régénération…",
  "emails.copy": "Copier",
  "emails.copied": "Copié !",
  "emails.send": "Envoyer",
  "emails.sending": "Envoi…",
  "emails.sent": "✓ Envoyé",
  "emails.empty": "Mail non encore généré",
  "emails.generate_one": "Générer le mail {n}",
  "emails.generating_full": "Génération du mail {n} en cours…",
  "emails.generating_hint": "Analyse concurrentielle + calcul ROI personnalisé…",

  "priority.hot": "PRIORITÉ HOT",
  "priority.high": "PRIORITÉ HIGH",
  "priority.medium": "PRIORITÉ MEDIUM",
  "priority.low": "PRIORITÉ LOW",

  "pipeline.title": "Pipeline",
  "pipeline.subtitle": "Étapes de relance et progression.",
  "pipeline.stage.ready": "Ready",
  "pipeline.stage.in_sequence": "In sequence",
  "pipeline.stage.sent": "Sent",
  "pipeline.stage.replied": "Replied",
  "pipeline.advance": "Avancer",
  "pipeline.regress": "Reculer",
  "pipeline.empty": "Aucun seller dans le pipeline.",

  "strategy.method": "Méthode",
  "strategy.angle": "Angle",
  "strategy.seasonal": "Moment saisonnier",
  "strategy.gap1": "Écart mail 1→2 (jours)",
  "strategy.gap2": "Écart mail 2→3 (jours)",
};

const DICTS: Record<Language, Dict> = { en: EN, fr: FR };

// ═══════════════════════════════════════════════════════════════════════
// Zustand store for language preference — persists in localStorage.
// Default: English.
// ═══════════════════════════════════════════════════════════════════════

interface I18nState {
  lang: Language;
  setLang: (lang: Language) => void;
}

export const useLanguage = create<I18nState>()(
  persist(
    (set) => ({
      lang: "en",
      setLang: (lang) => set({ lang }),
    }),
    { name: "mirakl-lang-v1" }
  )
);

// ═══════════════════════════════════════════════════════════════════════
// Translation hook. Usage: const t = useT(); t("outreach.title") → "Outreach"
// Supports {placeholder} interpolation: t("key", { name: "Foo", n: 3 })
// Falls back to the key itself if the translation is missing (fail-visible).
// ═══════════════════════════════════════════════════════════════════════

export function useT() {
  const lang = useLanguage((s) => s.lang);
  return (key: string, vars?: Record<string, string | number>) => {
    const value = DICTS[lang][key] ?? EN[key] ?? key;
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
  };
}
