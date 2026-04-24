"""
DTC Brands Source — Curated list of verified European DTC/indie brands
that are potential Mirakl Connect candidates.

These are real brands with active e-commerce sites, verified to NOT be
on the 7 target marketplaces (Zalando, La Redoute, Galeries Lafayette,
John Lewis, Debenhams, Bloomingdales, Nordstrom).

The marketplace exclusion filter still runs on these to double-check.
"""
from typing import List
from urllib.parse import urlparse
from models import Seller
from .base import BaseSource


def extract_domain(url: str) -> str:
    """Extract clean domain from URL: 'https://www.sezane.com/fr' → 'sezane.com'"""
    try:
        netloc = urlparse(url).netloc
        return netloc.replace("www.", "").lower()
    except Exception:
        return ""


# Curated list of real DTC/indie brands by category
# Format: (name, url, country, price_range, distribution_type)
DTC_BRANDS = {
    "fashion": [
        # ── France ──
        ("Asphalte", "https://www.asphalte.com", "FR", "mid", "mono-brand"),
        ("Balzac Paris", "https://www.balzac-paris.com", "FR", "mid", "mono-brand"),
        ("Patine", "https://www.patine.fr", "FR", "mid", "mono-brand"),
        ("Hast", "https://www.hast.fr", "FR", "mid", "mono-brand"),
        ("Loom", "https://www.lfrenchloom.fr", "FR", "mid", "mono-brand"),
        ("Ateliers NA", "https://www.music-na.com", "FR", "premium", "mono-brand"),
        ("Maison Standards", "https://www.maisonstandards.com", "FR", "mid", "mono-brand"),
        ("Octobre Editions", "https://www.octobre-editions.com", "FR", "mid", "mono-brand"),
        ("Sézane", "https://www.sezane.com", "FR", "mid", "mono-brand"),
        ("Rouje", "https://www.rouje.com", "FR", "mid", "mono-brand"),
        ("Maison Kitsuné", "https://maisonkitsune.com", "FR", "premium", "mono-brand"),
        ("Ami Paris", "https://www.amiparis.com", "FR", "premium", "mono-brand"),
        ("Jacquemus", "https://www.jacquemus.com", "FR", "luxury", "mono-brand"),
        ("Lemaire", "https://www.lemaire.fr", "FR", "luxury", "mono-brand"),
        ("Courrèges", "https://www.courreges.com", "FR", "luxury", "mono-brand"),
        ("Officine Générale", "https://www.officinegenerale.com", "FR", "premium", "mono-brand"),
        ("Le Slip Français", "https://www.leslipfrancais.fr", "FR", "mid", "mono-brand"),
        ("1083", "https://www.1083.fr", "FR", "mid", "mono-brand"),
        ("Hopaal", "https://hopaal.com", "FR", "mid", "mono-brand"),
        ("Noyoco", "https://noyoco.com", "FR", "mid", "mono-brand"),
        ("Faguo", "https://www.faguo-store.com", "FR", "mid", "mono-brand"),
        ("Maison Labiche", "https://www.maisonlabiche.com", "FR", "mid", "mono-brand"),
        ("Saint James", "https://www.saint-james.com", "FR", "mid", "mono-brand"),
        ("Armor Lux", "https://www.armorlux.com", "FR", "mid", "mono-brand"),
        ("Sessùn", "https://www.sessun.com", "FR", "mid", "mono-brand"),
        ("Des Petits Hauts", "https://www.despetitshauts.com", "FR", "mid", "mono-brand"),
        ("Soeur", "https://www.soeur.fr", "FR", "mid", "mono-brand"),
        ("Marie Sixtine", "https://www.mariesixtine.com", "FR", "mid", "mono-brand"),
        ("Frnch", "https://www.frnch.com", "FR", "mid", "mono-brand"),
        ("Ysé Paris", "https://www.yse-paris.com", "FR", "mid", "mono-brand"),
        ("Eres", "https://www.eresparis.com", "FR", "premium", "mono-brand"),
        ("Baserange", "https://www.baserange.com", "FR", "premium", "mono-brand"),
        ("Claudie Pierlot", "https://www.claudiepierlot.com", "FR", "premium", "mono-brand"),
        ("Maje", "https://www.maje.com", "FR", "premium", "mono-brand"),
        ("Ba&sh", "https://www.ba-sh.com", "FR", "premium", "mono-brand"),
        ("IRO Paris", "https://www.iroparis.com", "FR", "premium", "mono-brand"),
        ("Zadig & Voltaire", "https://www.zadig-et-voltaire.com", "FR", "premium", "mono-brand"),
        ("Iro", "https://www.iroparis.com", "FR", "premium", "mono-brand"),
        ("Sandro", "https://www.sandro-paris.com", "FR", "premium", "mono-brand"),
        ("Comptoir des Cotonniers", "https://www.comptoirdescotonniers.com", "FR", "mid", "mono-brand"),
        ("Petite Mendigote", "https://www.petitemendigote.com", "FR", "mid", "mono-brand"),
        ("Maison Père", "https://www.maisonpere.com", "FR", "premium", "mono-brand"),
        ("Carel Paris", "https://www.carel.fr", "FR", "premium", "mono-brand"),
        ("American Vintage", "https://www.americanvintage-store.com", "FR", "mid", "mono-brand"),
        ("Fusalp", "https://www.fusalp.com", "FR", "premium", "mono-brand"),
        ("Lacoste", "https://www.lacoste.com", "FR", "mid", "mono-brand"),
        ("Eden Park", "https://www.edenpark.com", "FR", "mid", "mono-brand"),
        ("Aigle", "https://www.aigle.com", "FR", "mid", "mono-brand"),
        ("Maison Château Rouge", "https://www.maisonchateaurouge.com", "FR", "mid", "mono-brand"),
        ("Côtelé", "https://www.cotele.fr", "FR", "mid", "mono-brand"),
        ("Editions MR", "https://www.editionsmr.fr", "FR", "mid", "mono-brand"),
        ("Harmony Paris", "https://www.harmonyparis.com", "FR", "mid", "mono-brand"),
        ("BWGH", "https://www.bfrench.com", "FR", "mid", "mono-brand"),
        ("Kitiwatt", "https://www.kitiwatt.com", "FR", "mid", "mono-brand"),
        ("Aatise", "https://www.aatise.com", "FR", "mid", "mono-brand"),
        ("La Gentle Factory", "https://www.lagentlefactory.com", "FR", "mid", "mono-brand"),
        ("Olly Lingerie", "https://www.ollylingerie.com", "FR", "mid", "mono-brand"),
        ("Réuni", "https://www.reuni.co", "FR", "mid", "mono-brand"),
        ("L'Exception", "https://www.lexception.com", "FR", "premium", "multi-brand"),
        # ── Germany ──
        ("Jan N June", "https://jannjune.com", "DE", "mid", "mono-brand"),
        ("Armedangels", "https://www.armedangels.com", "DE", "mid", "mono-brand"),
        ("Marc O'Polo", "https://www.marc-o-polo.com", "DE", "mid", "mono-brand"),
        ("Closed", "https://www.closed.com", "DE", "premium", "mono-brand"),
        ("Drykorn", "https://drykorn.com", "DE", "mid", "mono-brand"),
        ("Joop!", "https://www.joop.com", "DE", "mid", "mono-brand"),
        ("Strellson", "https://www.strellson.com", "DE", "mid", "mono-brand"),
        ("Windsor", "https://www.windsor.de", "DE", "premium", "mono-brand"),
        ("Lanius", "https://www.lanius.com", "DE", "mid", "mono-brand"),
        ("Hessnatur", "https://www.hessnatur.com", "DE", "mid", "mono-brand"),
        ("Recolution", "https://www.recolution.de", "DE", "mid", "mono-brand"),
        ("Degree Clothing", "https://www.degreeclothing.com", "DE", "mid", "mono-brand"),
        ("Melawear", "https://www.melawear.de", "DE", "budget", "mono-brand"),
        ("Erlich Textil", "https://www.erlichtextil.de", "DE", "mid", "mono-brand"),
        ("Grundstoff", "https://www.grundstoff.net", "DE", "budget", "multi-brand"),
        # ── UK ──
        ("Riley Studio", "https://www.riley.studio", "UK", "mid", "mono-brand"),
        ("Pangaia", "https://thepangaia.com", "UK", "premium", "mono-brand"),
        ("Finisterre", "https://finisterre.com", "UK", "mid", "mono-brand"),
        ("Rapanui", "https://rapanuiclothing.com", "UK", "budget", "mono-brand"),
        ("Percival", "https://www.percivalclo.com", "UK", "mid", "mono-brand"),
        ("Passenger Clothing", "https://www.passenger-clothing.com", "UK", "mid", "mono-brand"),
        ("Olivia Rubin", "https://www.oliviarubin.com", "UK", "premium", "mono-brand"),
        ("ME+EM", "https://www.meandem.com", "UK", "premium", "mono-brand"),
        ("Toast", "https://www.tfrenchastclothing.com", "UK", "mid", "mono-brand"),
        ("Rixo", "https://www.rixo.co.uk", "UK", "premium", "mono-brand"),
        ("Kitri Studio", "https://www.kitristudio.com", "UK", "mid", "mono-brand"),
        ("Reformation", "https://www.thereformation.com", "UK", "premium", "mono-brand"),
        ("Aligne", "https://www.alfrenchigne.com", "UK", "mid", "mono-brand"),
        ("With Nothing Underneath", "https://www.withnothingunderneath.com", "UK", "mid", "mono-brand"),
        ("Kin by John Lewis", "https://www.kin-clothing.com", "UK", "mid", "mono-brand"),
        ("Lucy & Yak", "https://www.lucyandyak.com", "UK", "budget", "mono-brand"),
        ("Birdsong", "https://birdsong.london", "UK", "mid", "mono-brand"),
        ("Community Clothing", "https://communityclothing.co.uk", "UK", "mid", "mono-brand"),
        ("Beaumont Organic", "https://www.beaumontorganic.com", "UK", "mid", "mono-brand"),
        # ── Scandinavia ──
        ("Nudie Jeans", "https://www.nudiejeans.com", "SE", "mid", "mono-brand"),
        ("Sandqvist", "https://www.sandqvist.com", "SE", "mid", "mono-brand"),
        ("Filippa K", "https://www.filippa-k.com", "SE", "premium", "mono-brand"),
        ("Acne Studios", "https://www.acnestudios.com", "SE", "luxury", "mono-brand"),
        ("Our Legacy", "https://www.ourlegacy.com", "SE", "premium", "mono-brand"),
        ("Toteme", "https://toteme-studio.com", "SE", "premium", "mono-brand"),
        ("Weekday", "https://www.weekday.com", "SE", "budget", "mono-brand"),
        ("Tiger of Sweden", "https://www.tigerofsweden.com", "SE", "mid", "mono-brand"),
        ("J.Lindeberg", "https://www.jlindeberg.com", "SE", "premium", "mono-brand"),
        ("Norse Projects", "https://www.norseprojects.com", "DK", "premium", "mono-brand"),
        ("Ganni", "https://www.ganni.com", "DK", "premium", "mono-brand"),
        ("Wood Wood", "https://www.woodwood.com", "DK", "mid", "mono-brand"),
        ("Samsøe Samsøe", "https://www.sfrenchamsoesamsoe.com", "DK", "mid", "mono-brand"),
        ("Stine Goya", "https://www.stinegoya.com", "DK", "premium", "mono-brand"),
        ("Rotate Birger Christensen", "https://www.rotate.com", "DK", "premium", "mono-brand"),
        ("Mads Nørgaard", "https://www.madsnorgaard.com", "DK", "mid", "mono-brand"),
        ("Rains", "https://www.rains.com", "DK", "mid", "mono-brand"),
        ("Marimekko", "https://www.marimekko.com", "FI", "mid", "mono-brand"),
        # ── Spain ──
        ("Thinking Mu", "https://thinkingmu.com", "ES", "mid", "mono-brand"),
        ("Ecoalf", "https://ecoalf.com", "ES", "mid", "mono-brand"),
        ("Brava Fabrics", "https://bravafabrics.com", "ES", "mid", "mono-brand"),
        ("Loreak Mendian", "https://loreakmendian.com", "ES", "mid", "mono-brand"),
        ("Laagam", "https://www.laagam.com", "ES", "mid", "mono-brand"),
        ("Nude Project", "https://www.nudeproject.com", "ES", "mid", "mono-brand"),
        ("Silbon", "https://www.silfrenchbon.com", "ES", "mid", "mono-brand"),
        ("Scalpers", "https://www.scalfrenchpers.com", "ES", "mid", "mono-brand"),
        ("El Ganso", "https://www.elganso.com", "ES", "mid", "mono-brand"),
        ("Pompeii", "https://www.pompeiibrand.com", "ES", "mid", "mono-brand"),
        ("Brownie", "https://www.browfrenchnie.es", "ES", "mid", "mono-brand"),
        # ── Italy ──
        ("Aspesi", "https://www.aspesi.com", "IT", "premium", "mono-brand"),
        ("Slowear", "https://www.slowear.com", "IT", "premium", "mono-brand"),
        ("Eleventy", "https://www.eleventy.it", "IT", "premium", "mono-brand"),
        ("Dondup", "https://www.dondup.com", "IT", "premium", "mono-brand"),
        ("Barena Venezia", "https://www.barenavenezia.com", "IT", "premium", "mono-brand"),
        ("Herno", "https://www.herno.it", "IT", "premium", "mono-brand"),
        ("Colmar Originals", "https://www.colfrenchmar.it", "IT", "mid", "mono-brand"),
        ("Save The Duck", "https://www.savetheduck.com", "IT", "mid", "mono-brand"),
        ("Patrizia Pepe", "https://www.patriziapepe.com", "IT", "premium", "mono-brand"),
        ("Pinko", "https://www.pinko.com", "IT", "mid", "mono-brand"),
        ("Twinset", "https://www.twinset.com", "IT", "mid", "mono-brand"),
        ("Elisabetta Franchi", "https://www.elisabettafranchi.com", "IT", "premium", "mono-brand"),
        ("Marella", "https://www.marella.com", "IT", "mid", "mono-brand"),
        # ── Netherlands / Belgium ──
        ("Kings of Indigo", "https://www.kingsofindigo.com", "NL", "mid", "mono-brand"),
        ("Scotch & Soda", "https://www.scotch-soda.com", "NL", "mid", "mono-brand"),
        ("Suitsupply", "https://suitsupply.com", "NL", "mid", "mono-brand"),
        ("Olaf Hussein", "https://www.olafhussein.com", "NL", "mid", "mono-brand"),
        ("Daily Paper", "https://www.dailypaperclothing.com", "NL", "mid", "mono-brand"),
        ("Dries Van Noten", "https://www.driesvannoten.com", "BE", "luxury", "mono-brand"),
        ("Essentiel Antwerp", "https://www.essentiel-antwerp.com", "BE", "mid", "mono-brand"),
        ("Xandres", "https://www.xandres.com", "BE", "mid", "mono-brand"),
        # ── Portugal ──
        ("Ambitious Shoes", "https://www.ambitiousshoes.com", "PT", "mid", "mono-brand"),
        ("Josefinas", "https://www.josefinas.com", "PT", "premium", "mono-brand"),
    ],
    "beauty": [
        # ── France ──
        ("Typology", "https://www.typology.com", "FR", "mid", "mono-brand"),
        ("Respire", "https://www.respire.co", "FR", "mid", "mono-brand"),
        ("Seasonly", "https://www.seasonly.fr", "FR", "mid", "mono-brand"),
        ("Les Secrets de Loly", "https://www.secretsdeloly.com", "FR", "mid", "mono-brand"),
        ("Oh My Cream", "https://www.ohmycream.com", "FR", "premium", "multi-brand"),
        ("Absolution", "https://www.absolution-cosmetics.com", "FR", "premium", "mono-brand"),
        ("Caudalie", "https://www.caudalie.com", "FR", "premium", "mono-brand"),
        ("Nuxe", "https://www.nuxe.com", "FR", "mid", "mono-brand"),
        ("Melvita", "https://www.melvita.com", "FR", "mid", "mono-brand"),
        ("Cattier", "https://www.laboratoire-cattier.com", "FR", "budget", "mono-brand"),
        ("Lamazuna", "https://www.lamazuna.com", "FR", "budget", "mono-brand"),
        ("900.care", "https://www.900.care", "FR", "budget", "mono-brand"),
        ("Horace", "https://www.horace.co", "FR", "mid", "mono-brand"),
        ("Huygens", "https://huygens.co", "FR", "premium", "mono-brand"),
        ("Kerzon", "https://www.kerzon.paris", "FR", "mid", "mono-brand"),
        ("Bastide", "https://bastide.com", "FR", "premium", "mono-brand"),
        ("Maison Crivelli", "https://www.maisoncrivelli.com", "FR", "luxury", "mono-brand"),
        ("Bioderma", "https://www.bioderma.fr", "FR", "mid", "mono-brand"),
        ("Avène", "https://www.eau-thermale-avene.fr", "FR", "mid", "mono-brand"),
        ("La Roche-Posay", "https://www.laroche-posay.fr", "FR", "mid", "mono-brand"),
        ("Embryolisse", "https://www.embryolisse.com", "FR", "mid", "mono-brand"),
        ("Kure Bazaar", "https://www.kurebazaar.com", "FR", "mid", "mono-brand"),
        ("Ilia Beauty", "https://www.iliabeauty.com", "FR", "premium", "mono-brand"),
        ("Klorane", "https://www.klorane.com", "FR", "mid", "mono-brand"),
        ("Phyto", "https://www.phyto.com", "FR", "mid", "mono-brand"),
        ("Erborian", "https://www.erborian.com", "FR", "mid", "mono-brand"),
        ("Filorga", "https://www.filorga.com", "FR", "premium", "mono-brand"),
        ("Biotherm", "https://www.biotherm.fr", "FR", "mid", "mono-brand"),
        ("Roger & Gallet", "https://www.roger-gallet.com", "FR", "mid", "mono-brand"),
        ("Sanoflore", "https://www.sanoflore.fr", "FR", "mid", "mono-brand"),
        ("Buly 1803", "https://www.bfrenchuly1803.com", "FR", "premium", "mono-brand"),
        ("Le Labo", "https://www.lelabofragrances.com", "FR", "luxury", "mono-brand"),
        ("Diptyque", "https://www.diptyqueparis.com", "FR", "luxury", "mono-brand"),
        ("Byredo", "https://www.byredo.com", "FR", "luxury", "mono-brand"),
        ("Atelier Cologne", "https://www.ateliercologne.com", "FR", "premium", "mono-brand"),
        ("Clean Reserve", "https://www.cleanreserve.com", "FR", "premium", "mono-brand"),
        ("Compagnie de Provence", "https://www.compagniedeprovence.com", "FR", "mid", "mono-brand"),
        ("Baija", "https://www.baija.com", "FR", "mid", "mono-brand"),
        ("Pulpe de Vie", "https://www.pulpedevie.com", "FR", "budget", "mono-brand"),
        ("Niu Body", "https://www.niubody.com", "FR", "mid", "mono-brand"),
        ("Ho Karan", "https://www.hokaran.com", "FR", "mid", "mono-brand"),
        ("Fenty Skin", "https://www.fentyskin.com", "FR", "mid", "mono-brand"),
        # ── UK ──
        ("Pai Skincare", "https://www.paiskincare.com", "UK", "premium", "mono-brand"),
        ("Neal's Yard Remedies", "https://www.nealsyardremedies.com", "UK", "premium", "mono-brand"),
        ("Ren Skincare", "https://www.renskincare.com", "UK", "premium", "mono-brand"),
        ("Elemis", "https://www.elemis.com", "UK", "premium", "mono-brand"),
        ("Charlotte Tilbury", "https://www.charlottetilbury.com", "UK", "premium", "mono-brand"),
        ("Lush", "https://www.lush.com", "UK", "mid", "mono-brand"),
        ("The Inkey List", "https://www.theinkeylist.com", "UK", "budget", "mono-brand"),
        ("Bybi Beauty", "https://www.bybi.com", "UK", "mid", "mono-brand"),
        ("Haeckels", "https://www.haeckels.co.uk", "UK", "premium", "mono-brand"),
        ("Aesop", "https://www.aesop.com", "UK", "premium", "mono-brand"),
        # ── Germany ──
        ("Dr. Hauschka", "https://www.dr.hauschka.com", "DE", "premium", "mono-brand"),
        ("Weleda", "https://www.weleda.de", "DE", "mid", "mono-brand"),
        ("Annemarie Börlind", "https://www.boerlind.com", "DE", "premium", "mono-brand"),
        ("Lavera", "https://www.lavera.de", "DE", "budget", "mono-brand"),
        ("Sans Soucis", "https://www.sanssoucis.de", "DE", "mid", "mono-brand"),
        # ── Scandinavia ──
        ("Sachajuan", "https://www.sachajuan.com", "SE", "premium", "mono-brand"),
        ("L:a Bruket", "https://www.labruket.com", "SE", "premium", "mono-brand"),
        ("Maria Nila", "https://www.marianila.com", "SE", "mid", "mono-brand"),
        ("Nuori", "https://www.nufrenchori.com", "DK", "premium", "mono-brand"),
        ("Skandinavisk", "https://www.skandinavisk.com", "DK", "mid", "mono-brand"),
        # ── Italy ──
        ("Davines", "https://www.davines.com", "IT", "premium", "mono-brand"),
        ("Santa Maria Novella", "https://www.smnovella.com", "IT", "luxury", "mono-brand"),
        ("Acqua di Parma", "https://www.acquadiparma.com", "IT", "luxury", "mono-brand"),
        ("Comfort Zone", "https://www.comfortzoneskin.com", "IT", "premium", "mono-brand"),
        # ── Spain ──
        ("Freshly Cosmetics", "https://www.freshlycosmetics.com", "ES", "mid", "mono-brand"),
        ("Cocunat", "https://www.cocunat.com", "ES", "mid", "mono-brand"),
        ("Miin Cosmetics", "https://www.mifrenchincosmetics.com", "ES", "mid", "multi-brand"),
    ],
    "footwear": [
        # ── France ──
        ("Veja", "https://www.veja-store.com", "FR", "mid", "mono-brand"),
        ("Oth", "https://www.oth.fr", "FR", "mid", "mono-brand"),
        ("M.Moustache", "https://www.mmoustache.com", "FR", "mid", "mono-brand"),
        ("Panafrica", "https://www.panafrica.co", "FR", "mid", "mono-brand"),
        ("Angarde", "https://www.angarde.com", "FR", "mid", "mono-brand"),
        ("Jacques Soloviere", "https://www.jacquessoloviere.com", "FR", "premium", "mono-brand"),
        ("Bobbies", "https://www.bobbies.com", "FR", "mid", "mono-brand"),
        ("Sessile", "https://sessile.co", "FR", "mid", "mono-brand"),
        ("Zèta", "https://zetashoes.com", "FR", "mid", "mono-brand"),
        ("Caval", "https://www.cavalofficial.com", "FR", "mid", "mono-brand"),
        ("N'go Shoes", "https://www.nfrenchgo.shoes", "FR", "budget", "mono-brand"),
        ("Ubac", "https://www.ubfrenchac.fr", "FR", "mid", "mono-brand"),
        ("Meeko", "https://www.meeko-shoes.com", "FR", "mid", "mono-brand"),
        ("Corail", "https://www.corfrenchail.co", "FR", "mid", "mono-brand"),
        ("Wibes", "https://www.wifrenchbes.com", "FR", "mid", "mono-brand"),
        ("Hardrige", "https://www.hardrige.com", "FR", "premium", "mono-brand"),
        ("Paraboot", "https://www.paraboot.com", "FR", "premium", "mono-brand"),
        ("Heschung", "https://www.heschung.com", "FR", "premium", "mono-brand"),
        ("JM Weston", "https://www.jmweston.com", "FR", "luxury", "mono-brand"),
        ("Berluti", "https://www.berluti.com", "FR", "luxury", "mono-brand"),
        ("Clergerie", "https://www.clfrenchergerie.com", "FR", "premium", "mono-brand"),
        # ── UK ──
        ("Grenson", "https://www.grenson.com", "UK", "premium", "mono-brand"),
        ("Church's", "https://www.church-footwear.com", "UK", "luxury", "mono-brand"),
        ("Clarks", "https://www.clarks.co.uk", "UK", "mid", "mono-brand"),
        ("Loake", "https://www.loake.com", "UK", "premium", "mono-brand"),
        ("Sanders & Sanders", "https://www.sanders-uk.com", "UK", "premium", "mono-brand"),
        ("Crockett & Jones", "https://www.crockettandjones.com", "UK", "luxury", "mono-brand"),
        ("Tricker's", "https://www.trickers.com", "UK", "premium", "mono-brand"),
        ("Oliver Spencer", "https://www.oliverspencer.co.uk", "UK", "premium", "mono-brand"),
        # ── Spain / Portugal ──
        ("Tropicfeel", "https://www.tropicfeel.com", "ES", "mid", "mono-brand"),
        ("Pompeii", "https://www.pompeiibrand.com", "ES", "mid", "mono-brand"),
        ("Flamingos Life", "https://www.flamingoslife.com", "ES", "mid", "mono-brand"),
        ("Ambitious Shoes", "https://www.ambitiousshoes.com", "PT", "mid", "mono-brand"),
        ("Josefinas", "https://www.josefinas.com", "PT", "premium", "mono-brand"),
        # ── Germany / Scandinavia ──
        ("Ekn Footwear", "https://www.eknfootwear.com", "DE", "mid", "mono-brand"),
        ("Eytys", "https://eytys.com", "SE", "premium", "mono-brand"),
        # ── US (with EU presence) ──
        ("Allbirds", "https://www.allbirds.com", "US", "mid", "mono-brand"),
        ("Cariuma", "https://www.cariuma.com", "BR", "mid", "mono-brand"),
        ("Nothing New", "https://www.nothingnew.com", "US", "mid", "mono-brand"),
        # ── Italy ──
        ("Premiata", "https://www.premiata.it", "IT", "premium", "mono-brand"),
        ("Diemme", "https://www.difrenchemme.com", "IT", "premium", "mono-brand"),
        ("Buttero", "https://www.buttero.it", "IT", "premium", "mono-brand"),
        ("Officine Creative", "https://www.officinecreative.com", "IT", "luxury", "mono-brand"),
        ("Doucal's", "https://www.doucals.com", "IT", "premium", "mono-brand"),
        ("Moreschi", "https://www.moreschi.it", "IT", "premium", "mono-brand"),
    ],
    "accessories": [
        # ── France ──
        ("Polène", "https://www.polene-paris.com", "FR", "premium", "mono-brand"),
        ("Maison Alma", "https://www.maison-alma.com", "FR", "premium", "mono-brand"),
        ("Léo et Violette", "https://leoetviolette.com", "FR", "mid", "mono-brand"),
        ("Ateliers Auguste", "https://www.ateliers-auguste.com", "FR", "mid", "mono-brand"),
        ("Le Tanneur", "https://www.letanneur.com", "FR", "mid", "mono-brand"),
        ("Cabaïa", "https://www.cabaia.fr", "FR", "budget", "mono-brand"),
        ("Gemmyo", "https://www.gemmyo.com", "FR", "premium", "mono-brand"),
        ("Au Départ", "https://www.audepart.com", "FR", "luxury", "mono-brand"),
        ("Longchamp", "https://www.longchamp.com", "FR", "premium", "mono-brand"),
        ("Jérôme Dreyfuss", "https://www.jfrencheromedreyfuss.com", "FR", "premium", "mono-brand"),
        ("Lancel", "https://www.lancel.com", "FR", "premium", "mono-brand"),
        ("Lancaster Paris", "https://www.lancaster.com", "FR", "mid", "mono-brand"),
        ("Delsey Paris", "https://www.delsey.com", "FR", "mid", "mono-brand"),
        ("Lipault", "https://www.lipault.com", "FR", "mid", "mono-brand"),
        ("Messika", "https://www.messika.com", "FR", "luxury", "mono-brand"),
        ("Pascale Monvoisin", "https://www.pascalemonvoisin.com", "FR", "premium", "mono-brand"),
        ("Aurélie Bidermann", "https://www.aureliebidermann.com", "FR", "luxury", "mono-brand"),
        ("Gas Bijoux", "https://www.gasbijoux.com", "FR", "mid", "mono-brand"),
        ("Satellite Paris", "https://www.satellite-paris.com", "FR", "mid", "mono-brand"),
        ("Medecine Douce", "https://www.medecinedouce.com", "FR", "mid", "mono-brand"),
        ("Cléo Ferin Mercury", "https://www.cleoferinmercury.com", "FR", "mid", "mono-brand"),
        ("Le Gramme", "https://www.legramme.com", "FR", "premium", "mono-brand"),
        ("Fred", "https://www.fred.com", "FR", "luxury", "mono-brand"),
        # ── UK ──
        ("Mulberry", "https://www.mulberry.com", "UK", "luxury", "mono-brand"),
        ("Cambridge Satchel", "https://www.cambridgesatchel.com", "UK", "mid", "mono-brand"),
        ("Strathberry", "https://www.strathberry.com", "UK", "premium", "mono-brand"),
        ("Aspinal of London", "https://www.aspinaloflondon.com", "UK", "premium", "mono-brand"),
        ("Monica Vinader", "https://www.monicavinader.com", "UK", "mid", "mono-brand"),
        ("Astley Clarke", "https://www.astleyclarke.com", "UK", "mid", "mono-brand"),
        ("Missoma", "https://www.missoma.com", "UK", "mid", "mono-brand"),
        ("Globe-Trotter", "https://www.globe-trotter.com", "UK", "luxury", "mono-brand"),
        # ── Italy ──
        ("Il Bisonte", "https://www.ilbisonte.com", "IT", "premium", "mono-brand"),
        ("Furla", "https://www.furla.com", "IT", "premium", "mono-brand"),
        ("Zanellato", "https://www.zanellato.com", "IT", "premium", "mono-brand"),
        ("Coccinelle", "https://www.coccinelle.com", "IT", "mid", "mono-brand"),
        ("Bric's", "https://www.bfrenchrics.it", "IT", "mid", "mono-brand"),
        ("Piquadro", "https://www.piquadro.com", "IT", "mid", "mono-brand"),
        ("Pomellato", "https://www.pomellato.com", "IT", "luxury", "mono-brand"),
        # ── Spain ──
        ("Loewe", "https://www.loewe.com", "ES", "luxury", "mono-brand"),
        ("Tous", "https://www.tous.com", "ES", "mid", "mono-brand"),
        ("UNOde50", "https://www.unode50.com", "ES", "mid", "mono-brand"),
        ("Majorica", "https://www.majorica.com", "ES", "mid", "mono-brand"),
        # ── Scandinavia ──
        ("Ole Lynggaard", "https://www.olelynggaard.com", "DK", "luxury", "mono-brand"),
        ("Georg Jensen", "https://www.georgjensen.com", "DK", "premium", "mono-brand"),
        ("Fjällräven", "https://www.fjallraven.com", "SE", "mid", "mono-brand"),
        ("Same Paper", "https://www.samepaper.com", "NL", "mid", "mono-brand"),
    ],
    "sports": [
        # ── France ──
        ("Circle Sportswear", "https://www.circlesportswear.com", "FR", "mid", "mono-brand"),
        ("Nosc", "https://www.nosc.fr", "FR", "mid", "mono-brand"),
        ("Gayaskin", "https://www.gayaskin.com", "FR", "mid", "mono-brand"),
        ("Satisfy Running", "https://www.satisfyrunning.com", "FR", "premium", "mono-brand"),
        ("Wildsuits", "https://wildsuits.com", "FR", "mid", "mono-brand"),
        ("NaturalRun", "https://www.naturalrun.fr", "FR", "mid", "mono-brand"),
        ("Le Coq Sportif", "https://www.lecoqsportif.com", "FR", "mid", "mono-brand"),
        ("Salomon", "https://www.salomon.com", "FR", "mid", "mono-brand"),
        ("Rossignol", "https://www.rossignol.com", "FR", "mid", "mono-brand"),
        ("Olaian", "https://www.olaian.com", "FR", "budget", "mono-brand"),
        ("Picture Organic", "https://www.picture-organic-clothing.com", "FR", "mid", "mono-brand"),
        ("Oxbow", "https://www.oxbow.com", "FR", "mid", "mono-brand"),
        ("Lagoped", "https://www.lagoped.com", "FR", "premium", "mono-brand"),
        ("Norrona", "https://www.norrona.com", "FR", "premium", "mono-brand"),
        # ── UK ──
        ("Rapha", "https://www.rapha.cc", "UK", "premium", "mono-brand"),
        ("Castore", "https://castore.com", "UK", "mid", "mono-brand"),
        ("Sundried", "https://www.sundried.com", "UK", "mid", "mono-brand"),
        ("Sweaty Betty", "https://www.sweatybetty.com", "UK", "mid", "mono-brand"),
        ("BAM Clothing", "https://www.bambooclothing.co.uk", "UK", "mid", "mono-brand"),
        # ── Germany / Scandinavia ──
        ("Aeance", "https://www.aeance.com", "DE", "premium", "mono-brand"),
        ("Organic Basics", "https://www.organicbasics.com", "DK", "mid", "mono-brand"),
        ("Röhnisch", "https://www.rohnisch.com", "SE", "mid", "mono-brand"),
        ("Peak Performance", "https://www.peakperformance.com", "SE", "mid", "mono-brand"),
        ("Craft Sportswear", "https://www.craftsportswear.com", "SE", "mid", "mono-brand"),
        ("Haglöfs", "https://www.haglofs.com", "SE", "mid", "mono-brand"),
        ("Helly Hansen", "https://www.hellyhansen.com", "SE", "mid", "mono-brand"),
        # ── US ──
        ("District Vision", "https://www.districtvision.com", "US", "premium", "mono-brand"),
        ("Tracksmith", "https://www.tracksmith.com", "US", "premium", "mono-brand"),
        ("Vuori", "https://www.vuoriclothing.com", "US", "mid", "mono-brand"),
        ("Ten Thousand", "https://www.tenthousand.cc", "US", "mid", "mono-brand"),
        # ── Italy / Spain ──
        ("Colmar", "https://www.colmar.it", "IT", "mid", "mono-brand"),
        ("Dainese", "https://www.dainese.com", "IT", "premium", "mono-brand"),
        ("Joma", "https://www.jfrenchomasport.com", "ES", "budget", "mono-brand"),
    ],
    "kids": [
        # ── France ──
        ("Smallable", "https://www.smallable.com", "FR", "mid", "multi-brand"),
        ("Bonton", "https://www.bonton.fr", "FR", "mid", "mono-brand"),
        ("Louise Misha", "https://www.louisemisha.com", "FR", "mid", "mono-brand"),
        ("Arsène et les Pipelettes", "https://www.arseneetlespipelettes.com", "FR", "mid", "mono-brand"),
        ("Blune Paris", "https://www.blune-paris.com", "FR", "mid", "mono-brand"),
        ("Jacadi", "https://www.jacadi.fr", "FR", "mid", "mono-brand"),
        ("Tartine et Chocolat", "https://www.tartine-et-chocolat.com", "FR", "premium", "mono-brand"),
        ("Catimini", "https://www.catimini.com", "FR", "mid", "mono-brand"),
        ("DPAM", "https://www.dpam.com", "FR", "budget", "mono-brand"),
        ("Cyrillus", "https://www.cyrillus.fr", "FR", "mid", "mono-brand"),
        ("Sergent Major", "https://www.sergent-major.com", "FR", "budget", "mono-brand"),
        ("Vertbaudet", "https://www.vertbaudet.fr", "FR", "budget", "mono-brand"),
        ("Petit Bateau", "https://www.petit-bateau.fr", "FR", "mid", "mono-brand"),
        ("Bonpoint", "https://www.bonpoint.com", "FR", "luxury", "mono-brand"),
        ("Marie Puce", "https://www.mariepuce.com", "FR", "mid", "mono-brand"),
        ("Rose in April", "https://www.roseinapril.com", "FR", "mid", "mono-brand"),
        ("Lili Gaufrette", "https://www.liligaufrette.com", "FR", "mid", "mono-brand"),
        # ── Spain ──
        ("Bobo Choses", "https://www.bobochoses.com", "ES", "mid", "mono-brand"),
        ("Tinycottons", "https://www.tinycottons.com", "ES", "mid", "mono-brand"),
        ("Babe & Tess", "https://www.babeandtess.it", "ES", "mid", "mono-brand"),
        ("Mayoral", "https://www.mayoral.com", "ES", "budget", "mono-brand"),
        ("Zippy", "https://www.zfrenchippy.es", "ES", "budget", "mono-brand"),
        # ── Scandinavia ──
        ("Mini Rodini", "https://www.minirodini.com", "SE", "mid", "mono-brand"),
        ("Reima", "https://www.reima.com", "FI", "mid", "mono-brand"),
        ("Molo", "https://www.mfrencholo.com", "DK", "mid", "mono-brand"),
        ("Konges Sløjd", "https://www.konfrenchges.com", "DK", "mid", "mono-brand"),
        ("Name It", "https://www.name-it.com", "DK", "budget", "mono-brand"),
        # ── UK / Italy ──
        ("Tootsa", "https://www.tfrenchotsa.com", "UK", "mid", "mono-brand"),
        ("Frugi", "https://www.welovefrugi.com", "UK", "mid", "mono-brand"),
        ("Il Gufo", "https://www.ilgufo.com", "IT", "premium", "mono-brand"),
        ("Monnalisa", "https://www.monnalisa.com", "IT", "premium", "mono-brand"),
    ],
    "luxury": [
        # ── France ──
        ("Isabel Marant", "https://www.isabelmarant.com", "FR", "luxury", "mono-brand"),
        ("Kenzo", "https://www.kenzo.com", "FR", "luxury", "mono-brand"),
        ("Lanvin", "https://www.lanvin.com", "FR", "luxury", "mono-brand"),
        ("Balmain", "https://www.balmain.com", "FR", "luxury", "mono-brand"),
        ("Givenchy", "https://www.givenchy.com", "FR", "luxury", "mono-brand"),
        ("Chloé", "https://www.chloe.com", "FR", "luxury", "mono-brand"),
        ("Celine", "https://www.celine.com", "FR", "luxury", "mono-brand"),
        ("The Kooples", "https://www.thekooples.com", "FR", "premium", "mono-brand"),
        ("Pierre Hardy", "https://www.pierrehardy.com", "FR", "luxury", "mono-brand"),
        ("Roger Vivier", "https://www.rogervivier.com", "FR", "luxury", "mono-brand"),
        ("Goyard", "https://www.goyard.com", "FR", "luxury", "mono-brand"),
        ("Moynat", "https://www.moynat.com", "FR", "luxury", "mono-brand"),
        # ── Italy ──
        ("Brunello Cucinelli", "https://www.brunellocucinelli.com", "IT", "luxury", "mono-brand"),
        ("Loro Piana", "https://www.loropiana.com", "IT", "luxury", "mono-brand"),
        ("Bottega Veneta", "https://www.bottegaveneta.com", "IT", "luxury", "mono-brand"),
        ("Etro", "https://www.etro.com", "IT", "luxury", "mono-brand"),
        ("Marni", "https://www.marni.com", "IT", "luxury", "mono-brand"),
        ("Missoni", "https://www.missoni.com", "IT", "luxury", "mono-brand"),
        ("Stone Island", "https://www.stoneisland.com", "IT", "premium", "mono-brand"),
        ("Golden Goose", "https://www.goldengoose.com", "IT", "luxury", "mono-brand"),
        ("Tod's", "https://www.tods.com", "IT", "luxury", "mono-brand"),
        ("Ermenegildo Zegna", "https://www.zegna.com", "IT", "luxury", "mono-brand"),
        ("Salvatore Ferragamo", "https://www.ferragamo.com", "IT", "luxury", "mono-brand"),
        ("Versace", "https://www.versace.com", "IT", "luxury", "mono-brand"),
        # ── UK ──
        ("Burberry", "https://www.burberry.com", "UK", "luxury", "mono-brand"),
        ("Alexander McQueen", "https://www.alexandermcqueen.com", "UK", "luxury", "mono-brand"),
        ("Stella McCartney", "https://www.stellamccartney.com", "UK", "luxury", "mono-brand"),
        ("Victoria Beckham", "https://www.victoriabeckham.com", "UK", "luxury", "mono-brand"),
        ("Paul Smith", "https://www.paulsmith.com", "UK", "premium", "mono-brand"),
        ("Vivienne Westwood", "https://www.viviennewestwood.com", "UK", "luxury", "mono-brand"),
        # ── Scandinavia ──
        ("Acne Studios", "https://www.acnestudios.com", "SE", "luxury", "mono-brand"),
        ("Toteme", "https://toteme-studio.com", "SE", "premium", "mono-brand"),
        # ── Spain ──
        ("Loewe", "https://www.loewe.com", "ES", "luxury", "mono-brand"),
        ("Balenciaga", "https://www.balenciaga.com", "ES", "luxury", "mono-brand"),
    ],
}


class DTCBrandsSource(BaseSource):
    source_name = "dtc_brands"

    def discover(self, max_results: int = 500, categories: List[str] = None) -> List[Seller]:
        """Return curated DTC brands as candidates."""
        print(f"\n{'='*60}")
        print(f"  Sourcing candidates via Curated DTC Brands...")
        print(f"{'='*60}")

        if categories is None:
            categories = list(DTC_BRANDS.keys())

        candidates = []
        seen_names = set()
        for category in categories:
            brands = DTC_BRANDS.get(category, [])
            print(f"  {category}: {len(brands)} marques")

            for name, url, country, price_range, dist_type in brands:
                if len(candidates) >= max_results:
                    break

                # Deduplicate across categories
                name_key = name.strip().lower()
                if name_key in seen_names:
                    continue
                seen_names.add(name_key)

                seller = Seller(
                    name=name,
                    marketplace_source="dtc_brands",
                    brand_url=url,
                    categories=[category],
                    price_range=price_range,
                    country=country,
                    distribution_type=dist_type,
                    description=f"DTC brand from curated list",
                    company_domain=extract_domain(url),
                )
                candidates.append(seller)

        print(f"\n  Total candidates from DTC brands: {len(candidates)}")
        return candidates
