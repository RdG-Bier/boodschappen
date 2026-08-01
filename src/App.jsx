import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

/* ============================================================
   Boodschappen — catalogus → winkellijst → historie
   ============================================================ */

const VERSIE = "2026.07.30-c";   /* staat onderaan Beheer › Huishouden */
const IDX_KEY = "bd:index:v1";        /* gedeeld: welke huishoudens bestaan er */
const CAT_KEY = "bd:cat:v3";          /* gedeeld: één catalogus voor iedereen */
const ADMIN_KEY = "bd:admin:v1";      /* gedeeld: wie beheert de catalogus */
const ME_KEY = "bd:me:v1";                    /* persoonlijk: welk huishouden ben ik */
const K = (hh, n) => `bd:hh:${hh}:${n}`;      /* gedeeld per huishouden */
const ALFA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   /* zonder I, O, 0, 1 */
const newCode = () => {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALFA[Math.floor(Math.random() * ALFA.length)];
  return s;
};
const fmtCode = (c) => (c ? c.slice(0, 4) + "-" + c.slice(4) : "");
const cleanCode = (s) => s.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 8);
const newUid = () => "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const ini = (naam) =>
  naam.trim().split(/\s+/).filter((w) => w.length > 1).slice(0, 2).map((w) => w[0].toUpperCase()).join("") ||
  naam.trim().slice(0, 2).toUpperCase();
const geleden = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 2) return "nu actief";
  if (m < 60) return m + " min geleden";
  const u = Math.round(m / 60);
  if (u < 24) return u + " uur geleden";
  return Math.round(u / 24) + " dgn geleden";
};

/* Categorieën in looproute-volgorde */
const CATS = [
  "Groente & fruit",
  "Brood & bakkerij",
  "Kaas & vleeswaren",
  "Vlees & vis",
  "Vega",
  "Zuivel & eieren",
  "Broodbeleg & ontbijt",
  "Voorraad & conserven",
  "Sauzen, olie & kruiden",
  "Soep & maaltijden",
  "Snoep, koek & chips",
  "Frisdrank & sap",
  "Bier, wijn & sterk",
  "Koffie & thee",
  "Diepvries",
  "Schoonmaak & huishoud",
  "Persoonlijke verzorging",
  "Baby & huisdier",
  "Non-food",
];

const CAT_COLOR = {
  "Groente & fruit": "#8fbf12",
  "Brood & bakkerij": "#d9a441",
  "Kaas & vleeswaren": "#f2a31b",
  "Vlees & vis": "#c85c4a",
  "Vega": "#4fa36b",
  "Zuivel & eieren": "#5b8fd6",
  "Broodbeleg & ontbijt": "#a3763f",
  "Voorraad & conserven": "#2f6fa8",
  "Sauzen, olie & kruiden": "#b0562f",
  "Soep & maaltijden": "#7a6bb5",
  "Snoep, koek & chips": "#d4638f",
  "Frisdrank & sap": "#39a8b8",
  "Bier, wijn & sterk": "#8a5a2b",
  "Koffie & thee": "#6b4a35",
  "Diepvries": "#7fc4e8",
  "Schoonmaak & huishoud": "#5e9e91",
  "Persoonlijke verzorging": "#9a8ec9",
  "Baby & huisdier": "#e0a5b8",
  "Non-food": "#8d9490",
};

const SHOPS_STANDAARD = ["Dirk", "Boons", "Albert Heijn", "Jumbo", "Lidl", "Aldi", "Plus", "Hoogvliet", "Coop", "Spar", "Kruidvat", "Etos", "Action", "Slager", "Bakker", "Markt", "Online"];
const SHOP_DEFAULT = "Dirk";

const SEED = {
  "Groente & fruit": ["aardappelen", "kruimige aardappelen", "zoete aardappel", "ui", "rode ui", "sjalot", "knoflook", "wortel", "winterpeen", "prei", "bleekselderij", "broccoli", "bloemkool", "spitskool", "witte kool", "rodekool", "spruitjes", "courgette", "aubergine", "paprika", "komkommer", "tomaten", "cherrytomaten", "ijsbergsalade", "gemengde salade", "rucola", "spinazie", "andijvie", "boerenkool", "sperziebonen", "champignons", "taugé", "avocado", "maiskolf", "radijs", "venkel", "pompoen", "verse basilicum", "peterselie", "koriander", "gember", "citroen", "limoen", "appels", "bananen", "peren", "sinaasappels", "mandarijnen", "druiven", "aardbeien", "blauwe bessen", "frambozen", "kiwi", "ananas", "mango", "meloen", "perziken", "nectarines", "gesneden fruit"],
  "Brood & bakkerij": ["bruin brood", "wit brood", "volkorenbrood", "tijgerbrood", "meergranenbrood", "pistolets", "croissants", "kaiserbroodjes", "bagels", "wraps", "pitabrood", "naanbrood", "krentenbollen", "beschuit", "knäckebröd", "crackers", "toastbrood", "hamburgerbollen", "hotdogbroodjes", "pizzabodem", "cake", "appelflap"],
  "Kaas & vleeswaren": ["jonge kaas", "jong belegen kaas", "belegen kaas", "oude kaas", "geraspte kaas", "mozzarella", "feta", "parmezaan", "roomkaas", "brie", "geitenkaas", "smeerkaas", "ham", "achterham", "kipfilet beleg", "salami", "rookvlees", "ossenworst", "boterhamworst", "bacon", "spekjes", "gebraden gehakt", "leverworst", "filet americain", "grillworst"],
  "Vlees & vis": ["gehakt", "half-om-half gehakt", "rundergehakt", "hamburgers", "biefstuk", "kipfilet", "kipdrumsticks", "kipshoarma", "speklapjes", "karbonade", "varkenshaas", "schnitzel", "worstjes", "braadworst", "rookworst", "shoarmavlees", "gyros", "zalmfilet", "kabeljauw", "koolvis", "garnalen", "gerookte zalm", "haring", "kibbeling"],
  "Vega": ["vegetarische burgers", "vegetarische schnitzel", "vega gehakt", "vega worstjes", "vega kipstukjes", "falafel", "tofu", "tempeh", "hummus", "sojaschnitzels"],
  "Zuivel & eieren": ["halfvolle melk", "volle melk", "magere melk", "karnemelk", "chocolademelk", "havermelk", "sojamelk", "amandelmelk", "yoghurt", "Griekse yoghurt", "kwark", "magere kwark", "skyr", "drinkyoghurt", "vla", "pudding", "slagroom", "kookroom", "crème fraîche", "zure room", "roomboter", "margarine", "halvarine", "eieren", "scharreleieren", "koffiemelk"],
  "Broodbeleg & ontbijt": ["hagelslag", "vruchtenhagel", "pindakaas", "chocopasta", "jam", "aardbeienjam", "appelstroop", "stroop", "honing", "sandwichspread", "muesli", "cruesli", "cornflakes", "havermout", "granola", "brinta"],
  "Voorraad & conserven": ["spaghetti", "penne", "macaroni", "lasagnebladen", "rijst", "basmatirijst", "risottorijst", "couscous", "bulgur", "quinoa", "mie", "noedels", "bloem", "zelfrijzend bakmeel", "gist", "bakpoeder", "suiker", "basterdsuiker", "poedersuiker", "vanillesuiker", "paneermeel", "maizena", "linzen", "kikkererwten", "witte bonen in tomatensaus", "bruine bonen", "kidneybonen", "mais in blik", "erwten in blik", "tomatenblokjes", "tomatenpuree", "passata", "kokosmelk", "tonijn in blik", "sardines", "olijven", "augurken", "zilveruitjes", "zuurkool", "appelmoes", "ananas in blik", "perziken in blik", "bouillonblokjes", "noten", "ongezouten noten", "pinda's", "rozijnen"],
  "Sauzen, olie & kruiden": ["olijfolie", "zonnebloemolie", "sesamolie", "azijn", "balsamicoazijn", "mayonaise", "ketchup", "curry", "mosterd", "satésaus", "sambal", "sojasaus", "ketjap", "oestersaus", "sriracha", "barbecuesaus", "knoflooksaus", "dressing", "pastasaus", "pesto", "salsa", "tacokruiden", "nasikruiden", "italiaanse kruiden", "paprikapoeder", "kerriepoeder", "komijn", "kaneel", "oregano", "tijm", "laurier", "kurkuma", "chilipoeder", "zout", "grof zout", "peper", "nootmuskaat", "vanille-extract"],
  "Soep & maaltijden": ["tomatensoep", "groentesoep", "erwtensoep", "kippensoep", "bouillon", "kant-en-klaarmaaltijd", "wokmix", "macaronimix", "nasipakket"],
  "Snoep, koek & chips": ["chips naturel", "chips paprika", "nachos", "zoutjes", "borrelnootjes", "popcorn", "melkchocolade", "pure chocolade", "chocoladepinda's", "snoep", "winegums", "drop", "kauwgom", "pepermunt", "koekjes", "biscuits", "stroopwafels", "speculaas", "gevulde koeken", "ontbijtkoek", "mueslibars", "toffees", "marshmallows"],
  "Frisdrank & sap": ["cola", "cola zero", "sinas", "cassis", "bronwater", "mineraalwater", "spa rood", "ice tea", "appelsap", "sinaasappelsap", "multivitaminesap", "ranja", "siroop", "tonic", "ginger ale", "bitter lemon", "energydrink", "sportdrank"],
  "Bier, wijn & sterk": ["pils", "speciaalbier", "alcoholvrij bier", "radler", "witte wijn", "rode wijn", "rosé", "prosecco", "wodka", "gin", "rum", "whisky", "likeur", "port", "cider"],
  "Koffie & thee": ["filterkoffie", "koffiebonen", "koffiecups", "koffiepads", "oploskoffie", "cappuccino", "thee", "groene thee", "zwarte thee", "kruidenthee", "kamillethee", "muntthee", "rooibos", "cacao", "chocolademelkpoeder"],
  "Diepvries": ["diepvriespizza", "patat", "aardappelkroketten", "frikandellen", "kroketten", "loempia's", "bitterballen", "vissticks", "diepvries groenten", "diepvries spinazie", "diepvries fruit", "ijs", "waterijs", "ijsjes", "diepvries broodjes"],
  "Schoonmaak & huishoud": ["wc-papier", "keukenpapier", "tissues", "afwasmiddel", "vaatwastabletten", "vaatwaszout", "glansmiddel", "allesreiniger", "schuurmiddel", "wc-reiniger", "wc-blokjes", "ontkalker", "glasreiniger", "sponsjes", "schuursponsjes", "vuilniszakken", "vaatdoekjes", "wasmiddel", "wasverzachter", "vlekverwijderaar", "luchtverfrisser", "aluminiumfolie", "vershoudfolie", "bakpapier", "boterhamzakjes", "theelichtjes", "batterijen", "lampen", "kaarsen"],
  "Persoonlijke verzorging": ["tandpasta", "tandenborstel", "mondwater", "flosdraad", "shampoo", "conditioner", "douchegel", "handzeep", "zeep", "deodorant", "bodylotion", "scheermesjes", "scheerschuim", "wattenschijfjes", "wattenstaafjes", "haargel", "zonnebrand", "pleisters", "paracetamol", "maandverband", "tampons", "handcrème", "lippenbalsem"],
  "Baby & huisdier": ["luiers", "babydoekjes", "babyvoeding", "babymelk", "kattenvoer", "kattenbrokken", "kattengrit", "hondenvoer", "hondenbrokken", "hondensnacks", "vogelvoer"],
  "Non-food": ["cadeaupapier", "wenskaart", "pen", "plakband", "bloemen", "plant"],
};

const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const p2 = (n) => String(n).padStart(2, "0");

const EXTRA = {
  "Groente & fruit": ["gele paprika","rode paprika","groene paprika","puntpaprika","snoeptomaatjes","romatomaten","vleestomaten","tomaten aan de tak","minikomkommers","krop sla","romaine sla","little gem","veldsalade","waterkers","postelein","paksoi","chinese kool","snijbiet","raapsteeltjes","koolrabi","knolselderij","pastinaak","rammenas","bosui","lente-ui","bospeen","artisjok","asperges","groene asperges","tuinbonen","snijbonen","haricots verts","okra","palmkool","oesterzwammen","shiitake","kastanjechampignons","portobello","alfalfa","kiemgroente","soepgroenten","hutspotmix","stamppotmix boerenkool","andijvie gesneden","spinazie gesneden","rauwkost","wortelsalade","koolsalade","rode biet","gekookte bietjes","aardpeer","zoete aardappel oranje","mais mini","tuinkers","verse munt","verse dille","verse salie","verse rozemarijn","verse tijm","citroengras","rode peper","jalapeño","gepelde knoflook","kurkumawortel","limoenblaadjes","jonagold","granny smith","pink lady","elstar","golden delicious","stoofperen","conference peren","blauwe druiven","witte druiven","kersen","abrikozen","verse vijgen","verse dadels","granaatappel","passievrucht","lychee","papaya","sharonfruit","sterfruit","drakenfruit","pomelo","grapefruit","bloedsinaasappel","clementines","bramen","rode bessen","kruisbessen","verse cranberries","rabarber","verse kokosnoot","gesneden ananas","galiameloen","watermeloen","cantaloupemeloen","honingmeloen","gesneden mango","fruitsalade","gesneden meloen","babyspinazie","rucola melange","veldsalade melange","kruidenmix vers","gemengde paprika","groentemix soep","wokgroenten vers","roerbakmix vers","gesneden prei","gesneden ui","gesneden knoflook","schoongemaakte wortel","gesneden bloemkool","gesneden broccoli"],
  "Brood & bakkerij": ["casinobrood wit","casinobrood bruin","boerenbrood","speltbrood","roggebrood","fries roggebrood","vloerbrood","maisbrood","zonnebloembrood","pompoenzaadbrood","notenbrood","rozijnenbrood","suikerbrood","gemberkoek","waldkornbrood","zesgranenbrood","twaalfgranenbrood","proteïnebrood","koolhydraatarm brood","glutenvrij brood","tijgerbol","bruine bollen","witte bollen","harde broodjes","zachte broodjes","luxe broodjes","mueslibollen","gevulde koek","appelkoek","saucijzenbroodje","worstenbroodje","kaasbroodje","ham-kaascroissant","chocoladecroissant","muffins","donuts","tompouce","slagroomsoes","appeltaart","vruchtenvlaai","abrikozenvlaai","kruimelvlaai","rijstevlaai","kwarktaart","brownie","carrot cake","citroencake","marmercake","boterkoek","oliebollen","appelbeignets","kaneelbroodjes","koffiebroodjes","minicroissants","brioche","ciabatta","focaccia","turks brood","platbrood","tortilla's","tacoshells","pannenkoeken","poffertjes","wafels","matzes","rijstwafels","maiswafels","volkoren crackers","cracottes","ontbijtcrackers","stokbrood","afbakbrood","afbakbroodjes","knoflookstokbrood","paneermeelbrood","tosti brood","boterhamzakjes brood"],
  "Kaas & vleeswaren": ["komijnekaas","nagelkaas","edammer","goudse kaas","maasdammer","gruyère","emmentaler","cheddar","red cheddar","gorgonzola","blauwe kaas","roquefort","camembert","kruidenroomkaas","mascarpone","ricotta","halloumi","manchego","pecorino","grana padano","burrata","buffelmozzarella","geraspte mozzarella","pizzakaas","fonduekaas","raclettekaas","zachte geitenkaas","geitenkaasrol","schapenkaas","kaas 30+","kaas 48+","kaasplank","kaasblokjes","borrelkaas","geraspte oude kaas","kruidenkaas","mosterdkaas","brandnetelkaas","truffelkaas","rosbief","carpaccio","gekookte ham","gerookte ham","serranoham","parmaham","coppa","chorizo","cervelaat","snijworst","fricandeau","casselerrib","pastrami","kalkoenfilet beleg","gerookte kipfilet","hamblokjes","katenspek","ontbijtspek","rauwe ham","paté","boerenpaté","leverpastei","huzarensalade","eiersalade","zalmsalade","kipsalade","tonijnsalade","selderijsalade","rundvleessalade","droge worst","bierworst","gelderse worst","metworst","kipcurrysalade","zalmspread","tonijnspread"],
  "Vlees & vis": ["riblappen","sucadelappen","hacheevlees","stoofvlees","poulet","runderlappen","entrecote","ribeye","kogelbiefstuk","tournedos","bavette","ossenhaas","kalfsschnitzel","kalfslever","lamskoteletten","lamsbout","lamsgehakt","hertenvlees","konijn","eendenbout","eendenfilet","kalkoenfilet rauw","kalkoengehakt","kipfilethaasjes","kipdijfilet","kippenpoten","kippenvleugels","hele kip","braadkip","kipgehakt","kipburger","kipnuggets","kipsaté","kipreepjes","gemarineerde kip","varkensfilet","varkenslapjes","varkensgehakt","procureur","buikspek","spareribs","gehaktballen","slavinken","blinde vinken","cordon bleu","tartaar","filet pur","saucijzen","verse worst","chipolata","merguez","bratwurst","knakworstjes","hotdogworstjes","gehaktbrood","zalmmoot","forel","gerookte forel","makreel","gerookte makreel","heilbot","schol","tong","pangasius","tilapia","victoriabaars","zeebaars","dorade","roodbaars","schelvis","wijting","tonijnsteak","ansjovis","mosselen","kokkels","oesters","scampi's","gamba's","krab","kreeft","langoustines","calamaris","pijlinktvis","surimi","krabsalade","vissalade","hollandse nieuwe","zure haring","rolmops","gerookte paling","lekkerbekje","kabeljauwhaas","visfilet","gepelde garnalen","noorse garnalen","zalmsnippers","visburger"],
  "Vega": ["seitan","jackfruit","vega shoarma","vega gehaktballen","vegan burger","plantaardige kaas","vega kipfilet beleg","vega speklapjes","gemarineerde tofu","gerookte tofu","gemarineerde tempeh","edamame","sojabrokken","sojagehakt","vega nuggets","falafelballen","vegan mayonaise","vega ei","linzenburger","quinoaburger","groenteburger","spinaziebal","bietenburger","kikkererwtenburger","vegan schnitzel","tofu wokblokjes","vega saté","vega kroket","vega bitterballen","vega frikandel","hummus paprika","hummus bieten","babaganoush","tzatziki vega","groentespread","vega tonijn","vega vissticks","plantaardige yoghurt","plantaardige room","vega slagroom","vega roomkaas","vega ijs","vega worstjes knak","vega ham","vega salami","vega rookworst","vega gyros","vega balletjes in tomatensaus"],
  "Zuivel & eieren": ["biologische melk","lactosevrije melk","houdbare melk","halfvolle houdbare melk","kokosdrink","rijstdrink","havermelk barista","sojayoghurt","kokosyoghurt","roeryoghurt","Bulgaarse yoghurt","Turkse yoghurt","kefir","ayran","boerenyoghurt","yoghurt met vruchten","fruityoghurt","kwark met fruit","vanillekwark","hüttenkäse","cottage cheese","magere kwark 0%","proteïnekwark","proteïnepudding","griesmeelpudding","chocoladevla","vanillevla","aardbeienvla","hopjesvla","dubbelvla","yoghurtdrink","chocolademelk houdbaar","custard","tiramisu","chocolademousse","slagroom spuitbus","kookroom light","sojaroom","plantaardige room","ongezouten roomboter","gezouten roomboter","dieetmargarine","olijfmargarine","bakboter","vloeibare bakboter","frituurvet","biologische eieren","eieren vrije uitloop","eieren maat L","kwarteleitjes","koffiecreamer","condensmelk","gecondenseerde melk","yoghurt Griekse stijl","skyr vanille","skyr aardbei","kwark komkommer dille","crème fraîche light","zure room light","roomkaas naturel","roomkaas kruiden"],
  "Broodbeleg & ontbijt": ["pindakaas naturel","pindakaas crunchy","amandelpasta","cashewpasta","notenpasta","hazelnootpasta","witte chocopasta","speculoospasta","kokosbrood","gestampte muisjes","muisjes","melkvlokken","pure vlokken","chocoladevlokken","hagelslag puur","hagelslag melk","kaneelhagel","rinse appelstroop","perenstroop","vloeibare honing","cremehoning","ahornsiroop","agavesiroop","sinaasappelmarmelade","frambozenjam","bosvruchtenjam","kersenjam","abrikozenjam","pruimenjam","jam zonder toegevoegde suiker","lemon curd","halva","tahini","kokosjam","havermout instant","havervlokken","quinoaflakes","boekweitvlokken","granola noten","granola chocolade","muesli naturel","cruesli rozijnen","cruesli chocolade","cornflakes honing","gepofte rijst","gepofte quinoa","chocoladeontbijtgranen","ontbijtgranen","proteïnegranola","chiazaad","lijnzaad","hennepzaad","zonnebloemzaad","pompoenzaad","sesamzaad","kokosschaafsel","gedroogde cranberries","gedroogde abrikozen","gedroogde vijgen","dadels ontpit","gojibessen","bananenchips","ontbijtdrink","yoghurt muesli beker"],
  "Voorraad & conserven": ["volkoren pasta","speltpasta","glutenvrije pasta","verse pasta","tagliatelle","fettuccine","farfalle","fusilli","rigatoni","conchiglie","orzo","cannelloni","gnocchi","ravioli","tortellini","verse lasagne","udon noodles","rijstnoedels","glasnoedels","bami","wokmie","eiermie","sushirijst","pandanrijst","jasmijnrijst","wilde rijst","volkoren rijst","snelkookrijst","rijst in zakjes","arboriorijst","paellarijst","polenta","griesmeel","tapioca","havermeel","volkorenmeel","speltmeel","roggemeel","boekweitmeel","amandelmeel","kokosmeel","glutenvrije bloem","pizzameel","broodmix","pannenkoekmix","poffertjesmix","cakemix","browniemix","muffinmix","droge gist","baksoda","custardpoeder","puddingpoeder","gelatine","agar agar","aardappelmeel","chocolade callets","cacaopoeder","marsepein","fondant","glazuur","bakstrooisel","amandelspijs","gedroogde vruchtenmix","gemengde noten","walnoten","hazelnoten","amandelen","cashewnoten","pecannoten","pistachenoten","macadamianoten","paranoten","pijnboompitten","kokosrasp","kikkererwten in blik","linzen in blik","zwarte bonen","borlottibonen","cannellinibonen","tuinbonen in blik","sperziebonen in blik","worteltjes in blik","doperwten en wortelen","asperges in pot","artisjokharten","zongedroogde tomaten","gepelde tomaten","cherrytomaten in blik","tomatensaus in blik","ansjovis in blik","makreel in blik","zalm in blik","sardines in tomatensaus","mosselen in pot","palmharten","bamboescheuten","taugé in blik","waterkastanjes","babymais","champignons in blik","zwarte olijven","groene olijven","gevulde olijven","kappertjes","jalapeños in pot","tafelzuur","piccalilly","zoetzure uitjes","rode kool in pot","appelmoes in pot","perenmoes","fruitcocktail","mandarijnen in blik","kersen op siroop","appelvulling","pruimen op siroop","kokosmelk light","kokoscrème","santen","instant noodles","instant pasta","couscous fijn","bulgur grof","spliterwten","witte bonen droog","bruine bonen droog","gele split"],
  "Sauzen, olie & kruiden": ["extra vierge olijfolie","milde olijfolie","arachideolie","kokosolie","lijnzaadolie","walnootolie","truffelolie","olijfoliespray","frituurolie","wijnazijn","rode wijnazijn","appelazijn","rijstazijn","sherryazijn","balsamicostroop","natuurazijn","mayonaise light","halvanaise","fritessaus","joppiesaus","andalousesaus","samuraisaus","cocktailsaus","tartaarsaus","remouladesaus","ravigottesaus","grove mosterd","dijonmosterd","honingmosterd","zoete mosterd","curryketchup","hamburgersaus","chilisaus","sweet chilisaus","piri piri saus","tabasco","harissa","gochujang","misopasta","rode currypasta","groene currypasta","tikka masala pasta","tandooripasta","garam masala","ras el hanout","za'atar","sumak","cajunkruiden","jerkkruiden","kipkruiden","viskruiden","vleeskruiden","groentekruiden","aardappelkruiden","ovenschotelmix","stroganoffmix","goulashmix","chili con carne mix","tacosaus","milde salsa","guacamole","tzatziki","kerriesaus","satésaus in pot","pindasaus","ketjap manis","ketjap asin","teriyakisaus","hoisinsaus","vissaus","sushi-azijn","wasabi","zoetzure gember","zoutarme sojasaus","worcestershiresaus","aromat","bouillonpoeder","groentebouillon","rundvleesbouillon","kippenbouillon","visbouillon","kalfsfond","wildfond","jus","jus de veau","bruine sausmix","witte sausmix","kaassaus","bearnaisesaus","hollandaisesaus","pepersaus","champignonsaus","zigeunersaus","currysaus","bamikruiden","kroepoek","sambal badjak","sambal oelek","boemboe","laos","sereh","ketoembar","djinten","kruidnagel","kardemom","anijs","steranijs","jeneverbes","mosterdzaad","korianderzaad","komijnzaad","venkelzaad","karwij","saffraan","vanillestokje","kaneelstokjes","piment","cayennepeper","chilivlokken","gerookte paprika","gedroogde oregano","gedroogde basilicum","gedroogde dille","dragon","gedroogde bieslook","kervel","provençaalse kruiden","bouquet garni","zeezout","selderijzout","knoflookpoeder","uienpoeder","kerrie madras","citroenpeper","peperbollen","witte peper","szechuanpeper","pastasaus arrabbiata","pastasaus bolognese","pastasaus pesto rosso","groene pesto","pesto rosso"],
  "Soep & maaltijden": ["minestrone","pompoensoep","aspergesoep","champignonsoep","bospaddenstoelensoep","uiensoep","linzensoep","bonensoep","tomatenroomsoep","thaise soep","tom kha kai","ramensoep","misosoep","goulashsoep","mexicaanse soep","chinese tomatensoep","kippensoep met vermicelli","vissoep","romige kerriesoep","broccolisoep","bloemkoolsoep","courgettesoep","wortelsoep","verse erwtensoep","soep in pak","verse soep","kant-en-klare pasta","lasagne kant-en-klaar","macaroni kant-en-klaar","nasi kant-en-klaar","bami kant-en-klaar","wokgerecht","curry maaltijd","stamppot kant-en-klaar","hutspot kant-en-klaar","andijviestamppot","zuurkoolschotel","ovenschotel","verse pizza","pizza margherita","quiche","hartige taart","maaltijdsalade","maaltijdsalade kip","sushibox","poké bowl","burrito","kant-en-klare wrap","ovenpakket","aardappelgratin","pasta pesto maaltijd","risottopakket","couscouspakket","quinoapakket","chilimix","hamburgermix","gehaktmix","groentewokmix","stoofpakket"],
  "Snoep, koek & chips": ["ribbelchips","chips zout","chips zoute karamel","chips cheese onion","chips bolognese","chips patatje joppie","chips barbecue","chips pickles","tortillachips","tortillachips kaas","nachos kaas","popcorn zout","popcorn zoet","karamelpopcorn","maiskrullen","maisrollen","borrelmix","cocktailnootjes","gezouten pinda's","gepofte pinda's","wasabinoten","japanse mix","zoute crackers","kaaskoekjes","kaasstengels","partymix","borrelolijven","zoete aardappelchips","linzenchips","popchips","rijstchips","veggiechips","naanchips","pitachips","dip guacamole","dip salsa","dip kaas","dip tzatziki","chocoladeletter","chocolade hazelnoot","chocolade karamel zeezout","pure chocolade 70%","witte chocolade","chocolade met noten","bonbons","pralines","chocoladetruffels","chocoladerozijnen","chocoladetoffees","chocoladestaaf","chocoladesnacks","chocolade-eitjes","kruidnoten","pepernoten","marsepeinfiguren","taai taai","speculaasjes","roomboterkoekjes","biscuitjes","sprits","bokkenpootjes","kano's","chocoladekoekjes met vulling","digestive","volkorenbiscuit","mueslikoek","volkorenkoek","kokoskoekjes","amaretti","stroopkoeken","gevulde speculaas","appelkoekjes","kaneelkoekjes","karamelwafels","kletskoppen","krakelingen","mergpijpjes","eierkoeken","minicakes","madeleines","minimuffins","minibrownies","minidonuts","zure matten","zure beertjes","spekjes","schuimpjes","kauwsnoep","fruitgums","jellybeans","lolly","toverbal","zoute drop","zoete drop","dropveters","muntdrop","honingdrop","engelse drop","salmiak","kokosschuim","nougat","karamels","fudge","kauwgomballen","pepermuntrol","pepermunt dragees","hoestbonbons","keelpastilles","suikervrije kauwgom","suikervrij snoep","chocoladepasta koek"],
  "Frisdrank & sap": ["cola light","merkloze cola","sinaasappelfrisdrank","citroenfrisdrank","citroenlimonade","cassis frisdrank","melkzuurdrank","yoghurtdrink fles","ice tea green","ice tea peach","ice tea zero","kombucha","energiedrank zero","sportdrank citroen","isotone drank","vitaminewater","water met koolzuur","sodawater","mineraalwater koolzuurvrij","water met citroen","bronwater fles","water sixpack","troebel appelsap","helder appelsap","perensap","druivensap","ananassap","mangosap","tomatensap","wortelsap","bietensap","granaatappelsap","cranberrysap","grapefruitsap","verse jus d'orange","smoothie","groene smoothie","rode smoothie","limonadesiroop","siroop framboos","siroop citroen","ijstheepoeder","limonadepoeder","tonic light","ginger beer","fruitwater","alcoholvrije cocktail","cocktailmix"],
  "Bier, wijn & sterk": ["krat pils","pils in blik","pils in fles","weizenbier","witbier","tripel","dubbel","blond bier","bokbier","IPA","session IPA","stout","porter","sour bier","saison","lambiek","kriek","geuze","radler citroen","radler 0.0","bierpakket","alcoholvrij witbier","alcoholvrije IPA","chardonnay","sauvignon blanc","pinot grigio","riesling","gewürztraminer","chenin blanc","merlot","cabernet sauvignon","shiraz","pinot noir","tempranillo","rioja","chianti","malbec","primitivo","beaujolais","rosé provence","witte port","rode port","madeira","vermout","bitter aperitief","prosecco rosé","cava","champagne","alcoholvrij mousserend","single malt whisky","bourbon","tequila","cognac","brandy","jenever","oude jenever","vieux","bessenjenever","advocaat","amandellikeur","kruidenbitter","limoncello","roomlikeur","sambuca","ouzo","grappa","calvados","bruine rum","witte rum"],
  "Koffie & thee": ["espressobonen","dark roast bonen","medium roast bonen","koffiepads regular","koffiepads dark","espressocapsules","lungocapsules","decafé koffie","decafé bonen","snelfilterkoffie","grof gemalen koffie","cold brew","ijskoffie","koffiemelkcups","koffiesiroop","cappuccinopoeder","latte macchiato poeder","chai latte","matcha","matcha latte","earl grey","english breakfast","darjeeling","assam","sencha","jasmijnthee","oolong","witte thee","rooibos vanille","kamille honing thee","pepermuntthee","gember citroen thee","bosvruchtenthee","kaneelthee","zoethoutthee","brandnetelthee","venkelthee","anijsthee","slaapthee","detoxthee","zwangerschapsthee","kinderthee","ijstheezakjes","honingsticks","zoetstoftabletten","zoetjes","stevia","rietsuikersticks","kandijsuiker","koffiekoekjes"],
  "Diepvries": ["pizza salami diepvries","pizza margherita diepvries","pizza hawaii","pizza quattro formaggi","pizza tonno","vega pizza","minipizza","pizzabaguette","superfrites","aardappelschijfjes","aardappelblokjes","rösti","aardappelpuree","pommes duchesse","zoete aardappelfriet","frikandel speciaal","kaassoufflé","mexicano","berehap","kipcorn","kipnuggets diepvries","kipschnitzel diepvries","kipburger diepvries","hamburgers diepvries","gehaktballen diepvries","slavink diepvries","saucijzenbroodje diepvries","worstenbroodje diepvries","miniloempia's","springrolls","samosa","dimsum","gyoza","bapao","sushi diepvries","garnalen diepvries","gamba's diepvries","kabeljauwfilet diepvries","zalmfilet diepvries","koolvisfilet diepvries","lekkerbekje diepvries","kibbeling diepvries","mosselen diepvries","calamaris diepvries","spinazie à la crème","bladspinazie diepvries","tuinbonen diepvries","sperziebonen diepvries","broccoli diepvries","bloemkool diepvries","wokgroenten diepvries","roerbakmix diepvries","soepgroenten diepvries","worteltjes diepvries","rode kool diepvries","spruitjes diepvries","aardbeien diepvries","bosvruchten diepvries","mango diepvries","ananas diepvries","smoothiefruit","vanille-ijs","chocolade-ijs","aardbeienijs","stracciatella-ijs","pistache-ijs","mango-ijs","sorbet","waterijs multipack","roomijsstaaf","ijstaart","softijs","slagroomtaart diepvries","appeltaart diepvries","croissants diepvries","brood diepvries","stokbrood diepvries","knoflookbrood","naan diepvries","bladerdeeg","filodeeg","kruimeldeeg","pizzadeeg","ijsblokjes"],
  "Schoonmaak & huishoud": ["vloeibaar wasmiddel","waspoeder","waspods","wolwasmiddel","wasmiddel zwart","wasmiddel color","wasmiddel wit","bleekmiddel","soda","wasparfum","wasverzachter navulling","wasstrips","vlekkenspray","gordijnwasmiddel","schoenpoets","schoenspray","waterafstotende spray","strijkspray","stijfsel","droogrek","wasmand","wasnetje","pluizenroller","kleerhangers","stofdoek","microvezeldoek","dweildoek","mopnavulling","ragebol","stoffer en blik","handveger","bezem","emmer","teil","afwasbak","afwasborstel","afwasrek","sponsdoekjes","staalwol","ovenreiniger","kalkaanslagverwijderaar","badkamerreiniger","sanitairspray","gootsteenontstopper","afvoerreiniger","toiletgel","luchtverfrisser navulling","geurstokjes","geurkaars","vaatwasmachinereiniger","wasmachinereiniger","meubelpoets","houtreiniger","vloerreiniger","laminaatreiniger","parketreiniger","tapijtreiniger","ruitensproeiervloeistof","insectenspray","muizenval","vliegenlint","mottenballen","dinerkaarsen","lucifers","aansteker","aanmaakblokjes","houtskool","barbecuebriketten","zware aluminiumfolie","aluminium ovenschaal","bakvormen","muffinvormpjes","papieren bordjes","plastic bekers","rietjes","cocktailprikkers","servetten","papieren tafelkleed","elastiekjes","punaises","touw","vuilniszakken 60 liter","gft-zakken","papieren zakken","stofzuigerzakken","batterijen AA","batterijen AAA","batterijen 9V","knoopcelbatterij","ledlamp E27","ledlamp E14","spaarlamp","verlengsnoer","stekkerdoos","schuurspons","glasdoek","theedoek","handdoek keuken","ovenhandschoen","pannenlap"],
  "Persoonlijke verzorging": ["tandpasta whitening","tandpasta sensitive","kindertandpasta","opzetborstels","tandenstokers","interdentale ragers","tongschraper","kunstgebitreiniger","mondspray","shampoo droog haar","shampoo vet haar","antiroosshampoo","shampoo gekleurd haar","volumeshampoo","kindershampoo","droogshampoo","haarmasker","haarserum","haarolie","haarlak","haarmousse","haarwax","haarcrème","stylingspray","hittebeschermer","haarverf","kleurshampoo","ontklitspray","haarborstel","kam","haarelastiekjes","haarspelden","douchegel heren","douchegel dames","douchecrème","badschuim","badzout","badbom","bodyscrub","gezichtsscrub","gezichtsreiniger","micellair water","gezichtscrème","dagcrème","nachtcrème","oogcrème","serum","vitamine C serum","hyaluronzuur","retinolcrème","gezichtsmasker","zonnebrand factor 30","zonnebrand factor 50","kinderzonnebrand","zelfbruiner","deodorant roller","deodorantspray","deodorantstick","antitranspirant","deodorant zonder aluminium","parfum","eau de toilette","bodyspray","handzeep navulling","desinfecterende handgel","handcrème droge huid","voetcrème","voetbad","likdoornpleister","nagelknipper","nagelschaartje","nagelvijl","nagellak","nagellakremover","make-upremover","mascara","foundation","concealer","lippenstift","lipgloss","oogschaduw","eyeliner","wenkbrauwpotlood","gezichtspoeder","blush","make-upsponsjes","scheermesjes heren","scheermesjes dames","scheergel","scheercrème","aftershave","ontharingscrème","harsstrips","pincet","oordopjes","oorreiniger","neusspray","neusdruppels","oogdruppels","lenzenvloeistof","ibuprofen","paracetamol 500","aspirine","maagtabletten","maagzuurremmer","hoestdrank","hoestpastilles","keelspray","vitamine C tabletten","vitamine D","multivitamine","magnesium","ijzertabletten","omega 3","probiotica","zink","foliumzuur","waterproof pleisters","wondzalf","desinfecterend middel","verband","zwachtel","koelspray","spierbalsem","muggenspray","muggenmelk","aftersungel","thermometer","mondkapjes","condooms","glijmiddel","maandverband nacht","inlegkruisjes","tampons mini","menstruatiecup","incontinentieverband"],
  "Baby & huisdier": ["luiers maat 3","luiers maat 4","luiers maat 5","zwemluiers","billendoekjes","billenzalf","babyolie","babyshampoo","babybadschuim","babycrème","babypoeder","babyvoeding 6 maanden","babyvoeding 8 maanden","fruithapje","groentehapje","babykoekjes","babyknabbels","babymelk 1","babymelk 2","babymelk 3","opvolgmelk","babyrijstepap","babypap","babythee","babywater","spenen","babyflessen","flessenreiniger","sterilisatietabletten","slabbetje","hydrofiele doeken","babyzeep","kindertandpasta 0-5","kinderparacetamol","kinderpleisters","nat kattenvoer","droog kattenvoer","kittenvoer","kattenvoer senior","kattensnacks","kattenmelk","kattengras","kattenbakvulling","kattenbakzakjes","nat hondenvoer","droog hondenvoer","puppyvoer","hondenvoer senior","hondenkauwstaaf","hondenkoekjes","hondenpoepzakjes","vogelzaad","parkietenvoer","kanariezaad","hamstervoer","caviavoer","konijnenvoer","knaagdierstrooisel","hooi","vissenvoer","vlooienband","vlooiendruppels","ontwormingsmiddel","dierenshampoo"],
  "Non-food": ["cadeaupapier rol","cadeaulint","cadeauzakje","cadeaukaart","verjaardagskaart","beterschapskaart","condoleancekaart","enveloppen","postzegels","notitieblok","schrift","pennen blauw","potloden","gum","puntenslijper","markeerstift","permanent marker","kleurpotloden","stiften","knutselpapier","lijmstift","schaar","nietmachine","paperclips","breed plakband","dubbelzijdig tape","ducttape","ballonnen","slingers","vlaggetjes","feesthoedjes","verjaardagskaarsjes","feestservetten","cadeaustickers","telefoonkabel","USB-oplader","oordopjes met draad","powerbank","sokken","panty","handschoenen","sjaal","paraplu","regenponcho","zonnebril","leesbril","tuinhandschoenen","plantenvoeding","potgrond","bloembollen","zaden","snijbloemen","boeket","kamerplant","vaas","kaarsenhouder","fotolijst"],
};

function buildSeedCatalog() {
  const out = [];
  const zien = new Set();
  CATS.forEach((cat) =>
    [...(SEED[cat] || []), ...(EXTRA[cat] || [])].forEach((name) => {
      const k = cat + "|" + norm(name);
      if (zien.has(k)) return;
      zien.add(k);
      out.push({ id: slug(cat) + "__" + slug(name), name, cat });
    })
  );
  return out;
}

const DAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const stamp = (d = new Date()) => `${DAGEN[d.getDay()]} ${d.getDate()} ${MND[d.getMonth()]} · ${p2(d.getHours())}:${p2(d.getMinutes())}`;
const iso = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const nlDate = (s) => {
  const d = new Date(s + "T12:00:00");
  return `${DAGEN[d.getDay()]} ${d.getDate()} ${MND[d.getMonth()]} ${d.getFullYear()}`;
};

/* ---------- huishoudindex ----------
   Op Supabase gaat dit via database-functies die de code afschermen:
   je krijgt alleen de naam en de eerste vier tekens terug. Bestaat dat
   laagje niet (zoals binnen Claude), dan gebeurt hetzelfde lokaal. */
const HUIS = {
  async add(code, naam, alias) {
    if (typeof window !== "undefined" && window.huis) return window.huis.add(code, naam, alias || "");
    const idx = await load(IDX_KEY, []);
    return save(IDX_KEY, [...idx.filter((x) => x.hh !== code), { hh: code, name: naam, alias: alias || "" }]);
  },
  async index() {
    if (typeof window !== "undefined" && window.huis) return window.huis.index();
    return (await load(IDX_KEY, [])).map((x) => ({ name: x.name, pre: x.hh.slice(0, 4) }));
  },
  async zoek(pre, rest) {
    if (typeof window !== "undefined" && window.huis) return window.huis.zoek(pre, rest);
    const idx = await load(IDX_KEY, []);
    const hit = idx.find((x) => x.hh.toUpperCase() === (pre + rest).toUpperCase());
    return hit ? hit.hh : null;
  },
  /* overzicht voor de beheerder: namen en leden, geen lijsten */
  async overzicht(adminUid) {
    if (typeof window !== "undefined" && window.huis && window.huis.overzicht) return window.huis.overzicht(adminUid);
    return [];
  },
  /* zoek op zelfgekozen eenvoudige code */
  async viaAlias(a) {
    if (typeof window !== "undefined" && window.huis && window.huis.viaAlias) return window.huis.viaAlias(a);
    const idx = await load(IDX_KEY, []);
    const hit = idx.find((x) => (x.alias || "").toLowerCase() === a.trim().toLowerCase());
    return hit ? hit.hh : null;
  },
};

/* ---------- opslag ---------- */
async function load(key, fallback, shared = true, streng = false) {
  try {
    const r = await window.storage.get(key, shared);
    return r && r.value ? JSON.parse(r.value) : fallback;
  } catch (e) {
    /* streng = een storing mag niet doorgaan alsof er niets stond,
       anders overschrijft de app je instellingen met standaardwaarden */
    if (streng) throw e;
    return fallback;
  }
}
async function save(key, value, shared = true) {
  try {
    await window.storage.set(key, JSON.stringify(value), shared);
    return true;
  } catch {
    return false;
  }
}

const CSS = `
.bd-root{--ink:#12271f;--ink2:#4c6357;--paper:#f5f6f1;--card:#ffffff;--line:#dde3d5;
  --lime:#c7f04a;--limeDeep:#8fbf12;--amber:#f2a31b;--blue:#2f6fa8;
  --font:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  position:absolute;inset:0;display:flex;flex-direction:column;background:var(--paper);
  color:var(--ink);font-family:var(--font);overflow:hidden;
  touch-action:manipulation;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}
.bd-root *{box-sizing:border-box;margin:0;touch-action:manipulation}
.bd-root button{font:inherit;color:inherit;border:0;background:none;cursor:pointer}
.bd-root input,.bd-root select,.bd-root textarea{font-size:16px;font-family:inherit}

.bd-top{padding:14px 16px 10px;background:var(--ink);color:#fff;flex:none}
.bd-brand{display:flex;align-items:baseline;gap:8px}
.bd-brand h1{font-size:19px;font-weight:800;letter-spacing:-.5px}
.bd-sync{margin-left:auto;font-family:var(--mono);font-size:10px;letter-spacing:.06em;
  text-transform:uppercase;opacity:.65}
.bd-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--lime);margin-right:5px;vertical-align:1px}
.bd-dot.off{background:var(--amber)}

.bd-search{margin-top:12px;display:flex;align-items:center;gap:8px;background:#fff;border-radius:10px;
  padding:0 8px 0 12px;color:#6f7f74}
.bd-search input{flex:1;min-width:0;border:0;outline:0;padding:13px 0;background:none;color:var(--ink)}
.bd-search > svg{flex:none;opacity:.8}
.bd-clear{flex:none;width:32px;height:32px;border-radius:50%;background:var(--ink);color:#fff;
  display:grid;place-items:center;opacity:1}
.bd-clear svg{opacity:1}
.bd-clear:active{background:#2c4a3d}

.bd-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:126px}
.bd-eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--ink2);padding:18px 16px 8px}

.bd-cat{border-bottom:1px solid var(--line)}
.bd-cathead{width:100%;display:flex;align-items:center;gap:10px;padding:14px 16px;text-align:left}
.bd-cathead h2{font-size:14.5px;font-weight:700;letter-spacing:-.2px;flex:1}
.bd-count{font-family:var(--mono);font-size:11px;color:var(--ink2)}
.bd-badge{font-family:var(--mono);font-size:11px;font-weight:700;background:var(--lime);
  color:#213b0a;border-radius:20px;padding:2px 8px}
.bd-chev{transition:transform .18s ease;opacity:.4}
.bd-chev.open{transform:rotate(90deg)}

.bd-items{padding:0 10px 12px;display:flex;flex-direction:column;gap:6px}
.bd-item{display:flex;align-items:stretch;border-radius:9px;background:var(--card);
  border:1px solid var(--line);overflow:hidden}
.bd-item.on{background:#f4fbe0;border-color:var(--limeDeep)}
.bd-item.on.edit{border-radius:9px 9px 0 0}
.bd-hit{flex:1;min-width:0;display:flex;align-items:center;gap:11px;padding:11px 10px;text-align:left}
.bd-txt{min-width:0;flex:1}
.bd-txt .nm{font-size:15px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bd-item.on .nm{font-weight:650}
.bd-meta{display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap}
.bd-tick{flex:none;width:22px;height:22px;border-radius:6px;border:2px solid var(--line);
  display:grid;place-items:center}
.bd-item.on .bd-tick{background:var(--limeDeep);border-color:var(--limeDeep)}
.bd-note-inline{font-family:var(--mono);font-size:11px;color:var(--ink2)}
.bd-flag{font-family:var(--mono);font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;white-space:nowrap}
.bd-flag.a{background:var(--amber);color:#3a2400}
.bd-flag.s{background:var(--blue);color:#fff}
.bd-flag.w{background:#efe6c8;color:#6b5218}
.bd-flag.d{background:#f6dcd4;color:#8f3a24}
.bd-ord{display:flex;align-items:center;gap:8px;height:48px;border-top:1px solid #f0f2ec;
  background:#fff;transition:background .12s ease}
.bd-ord.pak{background:#f4fbe0;box-shadow:0 3px 10px rgba(18,39,31,.12);border-radius:8px;position:relative;z-index:2}
.bd-ord .grip{flex:none;width:34px;height:38px;display:grid;place-items:center;color:var(--ink2);
  cursor:grab;touch-action:none}
.bd-ord.pak .grip{cursor:grabbing;color:var(--limeDeep)}
.bd-pull{display:flex;align-items:flex-end;justify-content:center;overflow:hidden}
.bd-pull span{font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink2);padding-bottom:6px}
.bd-ord .n{font-family:var(--mono);font-size:10.5px;color:var(--ink2);width:20px;flex:none}
.bd-ord .l{flex:1;min-width:0;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bd-ord button{flex:none;width:34px;height:34px;border:1px solid var(--line);border-radius:8px;
  background:#fff;display:grid;place-items:center;font-size:14px}
.bd-ord button:disabled{opacity:.3}
.bd-ov{border-top:1px solid #f0f2ec;padding:10px 0;display:grid;grid-template-columns:1fr auto;gap:2px 10px}
.bd-ov b{font-size:14px;font-weight:650}
.bd-ov .c{font-family:var(--mono);font-size:10.5px;color:var(--ink2);align-self:center}
.bd-ov .p{grid-column:1 / -1;font-size:12.5px;color:var(--ink2)}
.bd-pend{border-top:1px solid #f0f2ec;padding:11px 0;display:flex;align-items:center;gap:9px}
.bd-pend .t{flex:1;min-width:0}
.bd-pend .t b{display:block;font-size:14px;font-weight:650}
.bd-pend .t span{font-family:var(--mono);font-size:10px;color:var(--ink2)}
.bd-ok{flex:none;background:var(--limeDeep);color:#fff;border-radius:8px;padding:9px 13px;font-size:13px;font-weight:700}

.bd-step{flex:none;display:flex;align-items:center;border-left:1px solid var(--limeDeep)}
.bd-step button{width:38px;align-self:stretch;font-size:19px;font-weight:600;color:var(--ink);
  display:grid;place-items:center}
.bd-step button:disabled{opacity:.25}
.bd-step .q{font-family:var(--mono);font-size:15px;font-weight:700;min-width:22px;text-align:center}

.bd-editor{background:#fff;border:1px solid var(--limeDeep);border-top:0;
  border-radius:0 0 9px 9px;margin:-7px 0 0;padding:11px;display:flex;flex-direction:column;gap:9px}
.bd-editor input{width:100%;border:1px solid var(--line);border-radius:7px;padding:11px;outline:0}
.bd-editor input:focus{border-color:var(--limeDeep)}
.bd-chips{display:flex;gap:6px;flex-wrap:wrap}
.bd-chip{font-family:var(--mono);font-size:12px;font-weight:700;border:1px solid var(--line);
  border-radius:20px;padding:7px 12px;background:#fff}
.bd-chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.bd-chip.a.on{background:var(--amber);color:#3a2400;border-color:var(--amber)}

.bd-new{margin:12px 16px;padding:14px;border:2px dashed var(--line);border-radius:11px;
  display:flex;flex-direction:column;gap:10px;background:#fff}
.bd-new p{font-size:13.5px;color:var(--ink2)}
.bd-new b{color:var(--ink)}
.bd-new select{width:100%;padding:11px;border:1px solid var(--line);border-radius:7px;background:#fff}

.bd-cta{position:absolute;left:0;right:0;bottom:56px;padding:10px 12px;
  background:linear-gradient(to top,var(--paper) 62%,rgba(245,246,241,0));display:flex;gap:8px}
.bd-btn{flex:1;background:var(--ink);color:#fff;border-radius:11px;padding:15px;
  font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:9px}
.bd-btn:disabled{opacity:.35}
.bd-btn.ghost{flex:none;background:#fff;color:var(--ink);border:1px solid var(--line);padding:15px 16px}
.bd-btn.warn{background:var(--amber);color:#3a2400;border-color:var(--amber)}
.bd-btn .n{font-family:var(--mono);background:var(--lime);color:#213b0a;border-radius:6px;padding:1px 7px;font-size:13px}

.bd-recpt{margin:14px 12px;background:#fff;border-radius:12px;overflow:hidden;
  box-shadow:0 1px 0 var(--line),0 6px 18px rgba(18,39,31,.06)}
.bd-recpt-h{padding:16px 16px 14px;border-bottom:2px dashed var(--line)}
.bd-recpt-h h2{font-family:var(--mono);font-size:14px;font-weight:700;letter-spacing:-.2px}
.bd-recpt-h p{font-family:var(--mono);font-size:11px;color:var(--ink2);margin-top:5px;letter-spacing:.04em}
.bd-bar{height:5px;background:var(--line);border-radius:3px;margin-top:11px;overflow:hidden}
.bd-bar i{display:block;height:100%;background:var(--limeDeep);border-radius:3px;transition:width .3s ease}
.bd-sec{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--ink2);padding:15px 16px 6px}
.bd-line{display:flex;align-items:stretch;width:100%;border-top:1px solid #f0f2ec}
.bd-hitline{flex:1;min-width:0;display:flex;align-items:center;gap:12px;padding:13px 4px 13px 16px;text-align:left}
.bd-weg{flex:none;width:42px;display:grid;place-items:center;color:#c6cfc2;border-radius:0 8px 8px 0}
.bd-weg.armed{background:#b5432f;color:#fff}
.bd-line .bd-txt .nm{font-size:15.5px;font-weight:600}
.bd-line.done{opacity:.42}
.bd-line.done .nm{text-decoration:line-through;font-weight:400}
.bd-box{flex:none;width:26px;height:26px;border-radius:7px;border:2px solid var(--line);display:grid;place-items:center}
.bd-line.done .bd-box{background:var(--ink);border-color:var(--ink)}
.bd-qty{flex:none;font-family:var(--mono);font-size:13px;font-weight:700;background:#eef2e6;
  border-radius:6px;padding:3px 8px}
.bd-shop{display:flex;align-items:center;gap:10px;margin-top:6px;padding:13px 16px 11px;
  background:var(--ink);color:#fff;font-size:14px;font-weight:800;letter-spacing:-.2px}
.bd-shop .n{margin-left:auto;font-family:var(--mono);font-size:11px;font-weight:700;
  background:var(--lime);color:#213b0a;border-radius:20px;padding:2px 8px}
.bd-shoprow{display:flex;align-items:center;gap:10px}
.bd-shoprow .lbl{font-family:var(--mono);font-size:10px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink2);flex:none}
.bd-shoprow select{flex:1;min-width:0;border:1px solid var(--line);border-radius:7px;
  padding:10px;background:#fff;outline:0}
.bd-shoprow select:focus{border-color:var(--limeDeep)}
.bd-verder{margin:14px 14px 0;background:var(--ink);border-radius:12px;padding:16px;color:#fff}
.bd-verder h3{font-size:14px;font-weight:700}
.bd-verder .sub{font-family:var(--mono);font-size:10.5px;opacity:.65;margin-top:3px;letter-spacing:.04em}
.bd-verder button{width:100%;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:13px;margin-top:10px;text-align:left}
.bd-verder button .nm{flex:1;font-size:15px;font-weight:650;color:#fff}
.bd-verder button .cd{font-family:var(--mono);font-size:10.5px;color:var(--lime)}
.bd-cart{margin-top:14px;border-top:2px dashed var(--line)}
.bd-done-msg{padding:26px 20px;text-align:center}
.bd-done-msg strong{display:block;font-size:17px;margin-bottom:5px}
.bd-done-msg span{font-size:13.5px;color:var(--ink2)}

.bd-empty{padding:56px 32px;text-align:center;color:var(--ink2)}
.bd-empty strong{display:block;color:var(--ink);font-size:16px;margin-bottom:7px}
.bd-empty span{font-size:13.5px;line-height:1.5}

/* cijfers */
.bd-card{margin:12px;background:#fff;border-radius:12px;border:1px solid var(--line);padding:16px}
.bd-card h3{font-size:14px;font-weight:700;letter-spacing:-.2px;margin-bottom:2px}
.bd-card .sub{font-family:var(--mono);font-size:10.5px;color:var(--ink2);letter-spacing:.04em}
.bd-kpis{display:flex;gap:10px;margin:12px 12px 0}
.bd-kpi{flex:1;background:var(--ink);color:#fff;border-radius:11px;padding:13px}
.bd-kpi b{display:block;font-size:24px;font-weight:800;letter-spacing:-1px;font-family:var(--mono)}
.bd-kpi span{font-size:10.5px;font-family:var(--mono);letter-spacing:.08em;text-transform:uppercase;opacity:.7}
.bd-donut{display:flex;align-items:center;gap:14px;margin-top:14px}
.bd-legend{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}
.bd-lg{display:flex;align-items:center;gap:8px;font-size:12.5px}
.bd-lg i{width:10px;height:10px;border-radius:3px;flex:none}
.bd-lg .l{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bd-lg .v{font-family:var(--mono);font-size:11.5px;color:var(--ink2)}
.bd-rank{display:flex;flex-direction:column;gap:11px;margin-top:14px}
.bd-rk .t{display:flex;align-items:baseline;gap:8px;font-size:13.5px;margin-bottom:5px}
.bd-rk .t .l{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bd-rk .t .v{font-family:var(--mono);font-size:12px;font-weight:700}
.bd-rk .track{height:9px;background:#eef2e6;border-radius:5px;overflow:hidden}
.bd-rk .track i{display:block;height:100%;border-radius:5px}
.bd-trip{display:flex;align-items:center;gap:10px;padding:11px 0;border-top:1px solid #f0f2ec;font-size:13.5px}
.bd-trip .d{flex:1}
.bd-trip .n{font-family:var(--mono);font-size:11.5px;color:var(--ink2)}
.bd-tools{display:flex;gap:8px;margin-top:14px}
.bd-tools button{flex:1;border:1px solid var(--line);border-radius:9px;padding:12px;
  font-size:13px;font-weight:600;background:#fff}
.bd-csv{width:100%;margin-top:10px;height:150px;border:1px solid var(--line);border-radius:8px;
  padding:10px;font-family:var(--mono);font-size:11px;resize:vertical}

.bd-toast{position:absolute;left:12px;right:12px;bottom:124px;background:var(--ink);color:#fff;
  border-radius:10px;padding:13px 15px;font-size:13.5px;box-shadow:0 8px 22px rgba(18,39,31,.22);z-index:20}

.bd-tabs{position:absolute;left:0;right:0;bottom:0;height:56px;display:flex;
  background:#fff;border-top:1px solid var(--line)}
.bd-tab{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  font-size:9.5px;font-family:var(--mono);letter-spacing:.02em;text-transform:uppercase;color:var(--ink2)}
.bd-tab.on{color:var(--ink);font-weight:700}
.bd-tab.on .ic{background:var(--lime)}
.bd-tab .ic{width:32px;height:22px;border-radius:11px;display:grid;place-items:center}
.bd-tab .pip{position:absolute;top:6px;left:50%;margin-left:6px;font-family:var(--mono);font-size:9px;
  background:var(--ink);color:#fff;border-radius:9px;padding:1px 5px;font-weight:700}
/* setup / uitnodigen */
.bd-hero{padding:34px 22px 10px;text-align:center}
.bd-hero .mark{font-size:38px;line-height:1}
.bd-hero h2{font-size:22px;font-weight:800;letter-spacing:-.6px;margin:14px 0 8px}
.bd-hero p{font-size:14px;line-height:1.55;color:var(--ink2)}
.bd-pane{margin:14px 14px 0;background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px}
.bd-pane h3{font-size:14px;font-weight:700;letter-spacing:-.2px}
.bd-pane .sub{font-family:var(--mono);font-size:10.5px;color:var(--ink2);letter-spacing:.04em;margin-top:3px}
.bd-pane label{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink2);margin:13px 0 6px}
.bd-pane input,.bd-pane select{width:100%;border:1px solid var(--line);border-radius:8px;padding:12px;outline:0;background:#fff}
.bd-pane input:focus,.bd-pane select:focus{border-color:var(--limeDeep)}
.bd-pane input.code{font-family:var(--mono);font-weight:700;letter-spacing:.18em;text-align:center;text-transform:uppercase}
.bd-pane .act{margin-top:13px}
.bd-or{text-align:center;font-family:var(--mono);font-size:10px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--ink2);padding:16px 0 2px}
.bd-code{font-family:var(--mono);font-size:25px;font-weight:800;letter-spacing:.14em;text-align:center;
  background:var(--ink);color:var(--lime);border-radius:10px;padding:16px 8px;margin-top:12px}
.bd-hint{font-size:12.5px;line-height:1.5;color:var(--ink2);margin-top:11px}
.bd-house{display:flex;align-items:center;gap:10px;width:100%;padding:12px 0;
  border-top:1px solid #f0f2ec;text-align:left;font-size:14px}
.bd-house .nm{flex:1;font-weight:600}
.bd-house .cd{font-family:var(--mono);font-size:11px;color:var(--ink2)}
.bd-house.now .cd{color:var(--limeDeep);font-weight:700}
.bd-tag{font-family:var(--mono);font-size:9.5px;font-weight:700;background:var(--lime);color:#213b0a;
  border-radius:4px;padding:2px 6px;letter-spacing:.06em}

.bd-ini{flex:none;width:32px;height:32px;border-radius:50%;background:var(--ink);color:var(--lime);
  display:grid;place-items:center;font-family:var(--mono);font-size:11.5px;font-weight:700}
.bd-by{font-family:var(--mono);font-size:9.5px;font-weight:700;color:var(--ink2);
  border:1px solid var(--line);border-radius:4px;padding:1px 5px}

/* catalogusbeheer */
.bd-mrow{border-top:1px solid #f0f2ec;padding:11px 0}
.bd-mrow .top{display:flex;align-items:center;gap:10px}
.bd-mrow .top .nm{flex:1;min-width:0;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bd-mrow .top .ct{font-family:var(--mono);font-size:10px;color:var(--ink2)}
.bd-mrow .ed{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.bd-icon{flex:none;width:32px;height:32px;border-radius:8px;border:1px solid var(--line);
  display:grid;place-items:center;background:#fff}
.bd-icon.del{border-color:#e6c4bd;color:#b5432f}
.bd-icon.del.armed{background:#b5432f;border-color:#b5432f;color:#fff}
.bd-mini{display:flex;gap:8px}
.bd-mini button{flex:1;border:1px solid var(--line);border-radius:8px;padding:10px;font-size:13px;font-weight:600;background:#fff}
.bd-mini button.pri{background:var(--ink);color:#fff;border-color:var(--ink)}
.bd-warnbox{margin-top:12px;background:#fdf6e6;border:1px solid #f0dfae;border-radius:9px;
  padding:12px;font-size:12.5px;line-height:1.5;color:#6b5218}
@media (prefers-reduced-motion:reduce){.bd-root *{transition:none!important;animation:none!important}}
`;

const Check = ({ c = "#fff" }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const Trash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
);
const Pen = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4L20 8l-4-4L4 16v4z" />
  </svg>
);

/* Eigen component met eigen tekststand: hertekent de app, dan blijft
   dit veld staan en houdt het toetsenbord de focus. */
const NoteVeld = React.memo(function NoteVeld({ start, onKlaar }) {
  const [v, setV] = useState(start || "");
  const t = useRef(null);
  useEffect(() => () => clearTimeout(t.current), []);
  const wijzig = (val) => {
    setV(val);
    clearTimeout(t.current);
    t.current = setTimeout(() => onKlaar(val), 600);
  };
  return (
    <input
      value={v}
      inputMode="text"
      autoComplete="off"
      placeholder="notitie, bijv. 800 gram of grote fles"
      onChange={(e) => wijzig(e.target.value)}
      onBlur={() => { clearTimeout(t.current); onKlaar(v); }}
    />
  );
});

export default function App() {
  /* wie ben ik / welk huishouden */
  const [me, setMe] = useState(null);
  const [house, setHouse] = useState("");
  const [members, setMembers] = useState({ owner: "", people: [], blocked: [] });
  const [myName, setMyName] = useState("");
  const [kicked, setKicked] = useState("");
  const [shops, setShops] = useState(SHOPS_STANDAARD);
  const [defShop, setDefShop] = useState(SHOP_DEFAULT);
  const [index, setIndex] = useState([]);
  const [pickHh, setPickHh] = useState("");
  const [pickRest, setPickRest] = useState("");
  const [newShop, setNewShop] = useState("");
  const [overzicht, setOverzicht] = useState(null);
  const [pending, setPending] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [uses, setUses] = useState({});
  const [catOrder, setCatOrder] = useState(CATS);
  const [alias, setAlias] = useState("");
  const [aliasDraft, setAliasDraft] = useState("");
  const [ownDraft, setOwnDraft] = useState("");
  const [dupWarn, setDupWarn] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const dragRef = useRef(null);
  const ordRef = useRef(CATS);
  const [pull, setPull] = useState(0);
  const [laadFout, setLaadFout] = useState("");
  const [settingsOk, setSettingsOk] = useState(false);
  const pullRef = useRef(null);
  const bodyRef = useRef(null);
  const [booting, setBooting] = useState(true);

  /* data van het huidige huishouden */
  const [catalog, setCatalog] = useState([]);
  const [sel, setSel] = useState({});
  const [list, setList] = useState(null);
  const [hist, setHist] = useState([]);
  const [ready, setReady] = useState(false);

  /* interface */
  const [tab, setTab] = useState("kies");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState({});
  const [edit, setEdit] = useState(null);
  const [newCat, setNewCat] = useState(CATS[0]);
  const [synced, setSynced] = useState(true);
  const [toast, setToast] = useState("");
  const [confirm, setConfirm] = useState("");
  const [range, setRange] = useState("all");
  const [csv, setCsv] = useState("");
  const [pane, setPane] = useState("huis");
  const [mq, setMq] = useState("");
  const [mEdit, setMEdit] = useState(null);
  const [mName, setMName] = useState("");
  const [mCat, setMCat] = useState(CATS[0]);
  const [aCat, setACat] = useState(CATS[0]);
  const [addName, setAddName] = useState("");
  const [setupName, setSetupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinWarn, setJoinWarn] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const clock = useRef(0);
  const dirty = useRef(false);
  const hh = me && me.hh ? me.hh : "";
  const uid = me && me.uid ? me.uid : "";
  const myIni = me && me.name ? ini(me.name) : "";
  const isOwner = members.owner === uid;
  const meerdere = members.people.length > 1;
  /* labels voor de leden: R, of Rd en Ri als twee namen met dezelfde letter beginnen */
  const labels = useMemo(() => {
    const tel = {};
    members.people.forEach((p) => {
      const l = (p.name || "?").trim().charAt(0).toUpperCase();
      tel[l] = (tel[l] || 0) + 1;
    });
    const m = {};
    members.people.forEach((p) => {
      const n = (p.name || "?").trim();
      const l = n.charAt(0).toUpperCase();
      m[p.uid] = tel[l] > 1 && n.length > 1 ? l + n.charAt(1).toLowerCase() : l;
    });
    return m;
  }, [members]);
  const wie = (id) => labels[id] || id || "";

  const isBeheerder =
    !!admin && (admin.uid === uid || (!!admin.name && !!me && norm(admin.name) === norm(me.name || "")));
  /* eigen volgorde, met nieuwe categorieën automatisch achteraan */
  const ordCats = useMemo(() => {
    const bekend = catOrder.filter((c) => CATS.includes(c));
    const alles = [...bekend, ...CATS.filter((c) => !bekend.includes(c))];
    ordRef.current = alles;
    return alles;
  }, [catOrder]);
  const tel = useRef(0);

  const say = useCallback((m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2800);
  }, []);

  /* ---------- huishouden openen ---------- */
  const openHouse = useCallback(async (code, myUid, naam) => {
    setReady(false);
    setSettingsOk(false);
    setLaadFout("");
    let mem, cfg, glob, hist, adm;
    try {
      mem = await load(K(code, "members"), { owner: "", people: [], blocked: [] }, true, true);
      cfg = await load(K(code, "catalog"), null, true, true);
      glob = await load(CAT_KEY, null, true, true);
      hist = await load(K(code, "history"), [], true, true);
      adm = await load(ADMIN_KEY, null, true, true);
    } catch (e) {
      setLaadFout(String((e && e.message) || e));
      return false;
    }
    if (!Array.isArray(mem.people)) mem.people = [];
    if (!Array.isArray(mem.blocked)) mem.blocked = [];
    if (mem.blocked.some((b) => (b.uid || b) === myUid)) {
      setKicked(code);
      return false;
    }
    const bestaand = mem.people.find((p) => p.uid === myUid);
    let hersteld = "";
    if (!bestaand) {
      /* staat er al iemand met deze naam? dan ben jij dat, met een nieuwe
         browser-identiteit. Plek en eventueel eigenaarschap gaan mee over. */
      const zelfde = mem.people.find((p) => norm(p.name) === norm(naam));
      if (zelfde) {
        const oud = zelfde.uid;
        mem.people = mem.people.map((p) =>
          p.uid === oud ? { ...p, uid: myUid, name: naam, ini: ini(naam), seen: Date.now() } : p
        );
        if (mem.owner === oud) mem.owner = myUid;
        mem.blocked = mem.blocked.filter((b) => (b.uid || b) !== oud);
        hersteld = naam;
      } else {
        mem.people = [...mem.people, { uid: myUid, name: naam, ini: ini(naam), joined: Date.now(), seen: Date.now() }];
      }
      if (!mem.owner) mem.owner = myUid;
      await save(K(code, "members"), mem);
    } else if (bestaand.name !== naam) {
      mem.people = mem.people.map((p) => (p.uid === myUid ? { ...p, name: naam, ini: ini(naam), seen: Date.now() } : p));
      await save(K(code, "members"), mem);
    } else {
      mem.people = mem.people.map((p) => (p.uid === myUid ? { ...p, seen: Date.now() } : p));
      save(K(code, "members"), mem);
    }
    /* niemand meer als eigenaar in de lijst? dan mag wie er is het oppakken */
    if (mem.owner && !mem.people.some((p) => p.uid === mem.owner)) {
      mem.owner = myUid;
      await save(K(code, "members"), mem);
    }
    setMembers(mem);
    if (hersteld) setTimeout(() => say(`Welkom terug ${hersteld} — je oude plek is hergebruikt`), 400);
    /* instellingen van dit huishouden */
    setShops(cfg && Array.isArray(cfg.shops) && cfg.shops.length ? cfg.shops : SHOPS_STANDAARD);
    setDefShop(cfg && cfg.defaultShop ? cfg.defaultShop : SHOP_DEFAULT);
    setUses(cfg && cfg.uses ? cfg.uses : {});
    setCatOrder(cfg && Array.isArray(cfg.catOrder) && cfg.catOrder.length ? cfg.catOrder : CATS);
    setAlias(cfg && cfg.alias ? cfg.alias : "");
    setAliasDraft(cfg && cfg.alias ? cfg.alias : "");
    setHouse(cfg && cfg.name ? cfg.name : "Huishouden");

    /* de catalogus is gedeeld door alle huishoudens */
    if (!glob || !Array.isArray(glob.items) || !glob.items.length) {
      const start = cfg && Array.isArray(cfg.items) && cfg.items.length
        ? cfg.items.map((i) => ({ id: i.id, name: i.name, cat: i.cat }))
        : buildSeedCatalog();
      glob = { items: start, pending: [] };
      await save(CAT_KEY, glob);
    }
    setCatalog(glob.items);
    setPending(Array.isArray(glob.pending) ? glob.pending : []);
    const a = adm;
    if (a && a.uid !== myUid && a.name && norm(a.name) === norm(naam)) {
      const na = { ...a, uid: myUid };
      await save(ADMIN_KEY, na);
      setAdmin(na);
    } else setAdmin(a);
    let live = null;
    try {
      live = await load(K(code, "live"), null, true, true);
    } catch (e) {
      setLaadFout(String((e && e.message) || e));
      return false;
    }
    setSel(live && live.sel ? live.sel : {});
    setList(live && live.list ? live.list : null);
    clock.current = live && live.t ? live.t : 0;
    setHist(hist);
    setSettingsOk(true);
    setQ("");
    setEdit(null);
    setOpen({});
    setReady(true);
    return true;
  }, []);

  useEffect(() => {
    (async () => {
      const m = await load(ME_KEY, null, false);
      const mine = { uid: "", name: "", hh: "", houses: [], appUrl: "", ...(m || {}) };
      if (!Array.isArray(mine.houses)) mine.houses = [];
      if (!mine.uid) {
        mine.uid = newUid();
        await save(ME_KEY, mine, false);
      }
      setMe(mine);
      setMyName(mine.name || "");
      setUrlDraft(mine.appUrl || "");
      if (mine.hh && mine.name) await openHouse(mine.hh, mine.uid, mine.name);
      else setIndex(await HUIS.index());
      setBooting(false);
    })();
  }, [openHouse]);

  const saveMe = useCallback(async (next) => {
    setMe(next);
    await save(ME_KEY, next, false);
  }, []);

  async function startHouse() {
    const wie = myName.trim();
    if (!wie) return say("Vul eerst je eigen naam in");
    const name = setupName.trim() || "Ons huishouden";
    if (!dupWarn && index.some((x) => norm(x.name) === norm(name))) {
      setDupWarn(true);
      return;
    }
    const code = newCode();
    let items = buildSeedCatalog();
    let live = null;
    let history = [];
    /* eenmalige overname van de vorige versie */
    if (!me.houses.length) {
      const oud = await load("boodschappen:catalog:v2", null);
      if (oud && oud.length) {
        items = oud;
        live = await load("boodschappen:live:v2", null);
        history = await load("boodschappen:history:v1", []);
      }
    }
    await save(K(code, "catalog"), { name, items, shops: SHOPS_STANDAARD, defaultShop: SHOP_DEFAULT });
    await HUIS.add(code, name, "");
    await save(K(code, "members"), {
      owner: me.uid,
      people: [{ uid: me.uid, name: wie, ini: ini(wie), joined: Date.now(), seen: Date.now() }],
      blocked: [],
    });
    if (live) await save(K(code, "live"), live);
    if (history.length) await save(K(code, "history"), history);
    await saveMe({ ...me, name: wie, hh: code, houses: [...me.houses.filter((x) => x.hh !== code), { hh: code, name }] });
    await openHouse(code, me.uid, wie);
    setSetupName("");
    setDupWarn(false);
    setTab("kies");
    say(history.length ? `${name} aangemaakt — je oude lijst is overgenomen` : `${name} aangemaakt`);
  }

  async function joinHouse(codeArg) {
    const wie = myName.trim();
    if (!wie) return say("Vul eerst je eigen naam in");
    const ruw = typeof codeArg === "string" ? codeArg : joinCode;
    let code = cleanCode(ruw);
    if (code.length !== 8) {
      /* geen lange code? probeer het als zelfgekozen code */
      const viaA = await HUIS.viaAlias(ruw);
      if (!viaA) return say("Onbekende code");
      code = viaA;
    }
    const cat = await load(K(code, "catalog"), null);
    if (!(cat && cat.items && cat.items.length) && !joinWarn) {
      setJoinWarn(true);
      return;
    }
    const name = cat && cat.name ? cat.name : "Ons huishouden";
    const next = { ...me, name: wie, hh: code, houses: [...me.houses.filter((x) => x.hh !== code), { hh: code, name }] };
    const ok = await openHouse(code, me.uid, wie);
    if (!ok) return;
    await saveMe(next);
    setJoinCode("");
    setJoinWarn(false);
    setTab("kies");
    say(`Je doet nu mee met ${name}`);
  }

  async function switchHouse(code) {
    const ok = await openHouse(code, me.uid, me.name);
    if (!ok) return;
    await saveMe({ ...me, hh: code });
    setTab("kies");
  }

  /* eigenaarschap naar jezelf halen; daarvoor moet je de volledige code kennen */
  async function takeOwner() {
    if (cleanCode(ownDraft) !== hh) return say("Die code hoort niet bij dit huishouden");
    const mem = { ...members, owner: uid };
    setMembers(mem);
    setOwnDraft("");
    await save(K(hh, "members"), mem);
    say(`${me.name} beheert dit huishouden nu`);
  }

  /* oprichter haalt iemand uit het huishouden */
  async function kickMember(p) {
    const mem = {
      ...members,
      people: members.people.filter((x) => x.uid !== p.uid),
      blocked: [...members.blocked.filter((b) => (b.uid || b) !== p.uid), { uid: p.uid, name: p.name }],
    };
    setMembers(mem);
    setConfirm("");
    await save(K(hh, "members"), mem);
    say(`${p.name} heeft geen toegang meer`);
  }

  async function unblock(id) {
    const mem = { ...members, blocked: members.blocked.filter((b) => (b.uid || b) !== id) };
    setMembers(mem);
    await save(K(hh, "members"), mem);
    say("Weer toegelaten — met de code kan diegene opnieuw meedoen");
  }

  async function saveMyName(v) {
    const wie = v.trim();
    if (!wie || wie === me.name) return;
    await saveMe({ ...me, name: wie });
    const mem = { ...members, people: members.people.map((p) => (p.uid === uid ? { ...p, name: wie, ini: ini(wie) } : p)) };
    setMembers(mem);
    await save(K(hh, "members"), mem);
    say("Je naam is bijgewerkt");
  }

  async function forgetHouse(code) {
    const houses = me.houses.filter((x) => x.hh !== code);
    const next = { ...me, houses, hh: me.hh === code ? "" : me.hh };
    await saveMe(next);
    if (!next.hh) {
      setCatalog([]);
      setList(null);
      setSel({});
      setHist([]);
      setReady(false);
    }
    say("Huishouden van dit toestel gehaald");
  }

  /* instellingen van dit huishouden bewaren */
  const cfgRef = useRef({});
  useEffect(() => {
    cfgRef.current = { name: house, shops, defaultShop: defShop, uses, catOrder, alias };
  }, [house, shops, defShop, uses, catOrder, alias]);

  async function saveSettings(patch) {
    if (!settingsOk) return say("Instellingen zijn niet geladen — nog even niet opslaan");
    const next = { ...cfgRef.current, ...patch };
    cfgRef.current = next;
    return save(K(hh, "catalog"), next);
  }

  /* gedeelde catalogus bewaren */
  async function saveGlobal(items, pend) {
    const nItems = items !== undefined ? items : catalog;
    const nPend = pend !== undefined ? pend : pending;
    setCatalog(nItems);
    setPending(nPend);
    return save(CAT_KEY, { items: nItems, pending: nPend });
  }

  async function saveShops(sh, ds) {
    setShops(sh);
    if (ds !== undefined) setDefShop(ds);
    await saveSettings({ shops: sh, ...(ds !== undefined ? { defaultShop: ds } : {}) });
  }

  /* slepen met de greep links */
  function dragStart(e, i) {
    dragRef.current = { i, y: e.clientY };
    setDragIdx(i);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  }
  function dragMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const rij = 48;
    const stap = Math.round((e.clientY - d.y) / rij);
    if (!stap) return;
    const arr = [...ordRef.current];
    const j = Math.max(0, Math.min(arr.length - 1, d.i + stap));
    if (j === d.i) return;
    const [item] = arr.splice(d.i, 1);
    arr.splice(j, 0, item);
    ordRef.current = arr;
    setCatOrder(arr);
    d.i = j;
    d.y = e.clientY;
    setDragIdx(j);
  }
  function dragEnd() {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragIdx(null);
    saveSettings({ catOrder: ordRef.current });
  }

  async function moveCat(cat, richting) {
    const arr = [...ordCats];
    const i = arr.indexOf(cat);
    const j = i + richting;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    ordRef.current = arr;
    setCatOrder(arr);
    await saveSettings({ catOrder: arr });
  }

  async function saveAlias(v) {
    const a = v.trim().toLowerCase().replace(/\s+/g, "");
    if (a === alias) return;
    if (a && a.length < 4) return say("Maak hem minstens 4 tekens lang");
    if (a) {
      const bezet = await HUIS.viaAlias(a);
      if (bezet && bezet !== hh) return say("Die code is al door een ander huishouden in gebruik");
    }
    setAlias(a);
    await saveSettings({ alias: a });
    await HUIS.add(hh, house, a);
    say(a ? `Jullie kunnen nu ook met “${a}” meedoen` : "Eenvoudige code verwijderd");
  }

  /* naar beneden trekken bovenaan de lijst = opnieuw ophalen */
  function pullStart(e) {
    const el = bodyRef.current;
    if (!el || el.scrollTop > 2 || dragRef.current) return;
    pullRef.current = { y: e.touches[0].clientY };
  }
  function pullMove(e) {
    const p = pullRef.current;
    const el = bodyRef.current;
    if (!p || !el) return;
    if (el.scrollTop > 2) { pullRef.current = null; setPull(0); return; }
    const dy = e.touches[0].clientY - p.y;
    if (dy > 0) setPull(Math.min(dy * 0.6, 80));
  }
  async function pullEnd() {
    const p = pullRef.current;
    pullRef.current = null;
    if (!p) return;
    const ver = pull;
    setPull(0);
    if (ver > 52 && hh && me && me.name) {
      say("Bijwerken…");
      await openHouse(hh, uid, me.name);
      say("Lijst is bijgewerkt");
    }
  }

  /* haalt de nieuwste versie op, ook als de browser een oude vasthoudt */
  async function verversApp() {
    try {
      if ("caches" in window) {
        const ks = await caches.keys();
        await Promise.all(ks.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {}
    window.location.reload();
  }

  async function haalOverzicht() {
    try {
      const r = await HUIS.overzicht(uid);
      setOverzicht(Array.isArray(r) ? r : []);
      if (!r || !r.length) say("Geen huishoudens gevonden, of je bent niet de beheerder");
    } catch (e) {
      say("Kon het overzicht niet ophalen");
    }
  }

  async function claimBeheer() {
    const a = { uid, name: me.name };
    setAdmin(a);
    await save(ADMIN_KEY, a);
    say("Je beheert nu de catalogus");
  }

  async function renameHouse(name) {
    const clean = name.trim();
    if (!clean) return;
    setHouse(clean);
    HUIS.add(hh, clean);
    await saveMe({ ...me, houses: me.houses.map((x) => (x.hh === hh ? { ...x, name: clean } : x)) });
  }

  /* ---------- opslaan + meelezen ---------- */
  useEffect(() => {
    if (!ready || !hh || !settingsOk) return;
    dirty.current = true;
    const t = setTimeout(async () => {
      clock.current = Date.now();
      setSynced(await save(K(hh, "live"), { sel, list, t: clock.current }));
      dirty.current = false;
    }, 600);
    return () => clearTimeout(t);
  }, [sel, list, ready, hh, settingsOk]);

  useEffect(() => {
    if (!ready || !hh) return;
    const iv = setInterval(async () => {
      if (dirty.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const live = await load(K(hh, "live"), null);
      if (live && (live.t || 0) > clock.current) {
        clock.current = live.t;
        setSel(live.sel || {});
        setList(live.list || null);
      }
      tel.current += 1;
      if (tel.current % 4 === 0) {
        const mem = await load(K(hh, "members"), null);
        if (mem && Array.isArray(mem.people)) {
          if (!Array.isArray(mem.blocked)) mem.blocked = [];
          if (mem.blocked.some((b) => (b.uid || b) === uid)) {
            setKicked(hh);
            setReady(false);
            saveMe({ ...me, hh: "" });
          } else setMembers(mem);
        }
      }
    }, 12000);
    return () => clearInterval(iv);
  }, [ready, hh, uid, me, saveMe]);

  /* ---------- afgeleide lijsten ---------- */
  /* wat jij ziet: alles wat goedgekeurd is, plus je eigen inzendingen */
  const zichtbaar = useMemo(() => {
    const mijn = pending.filter((p) => p.byUid === uid || isBeheerder).map((p) => ({ ...p, wacht: true }));
    return [...catalog, ...mijn];
  }, [catalog, pending, uid, isBeheerder]);

  const byCat = useMemo(() => {
    const m = {};
    zichtbaar.forEach((i) => (m[i.cat] = m[i.cat] || []).push(i));
    Object.values(m).forEach((a) => a.sort((x, y) => x.name.localeCompare(y.name, "nl")));
    return m;
  }, [zichtbaar]);

  const hits = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return null;
    return zichtbaar
      .filter((i) => norm(i.name).includes(t))
      .sort((a, b) => norm(a.name).indexOf(t) - norm(b.name).indexOf(t) || a.name.localeCompare(b.name, "nl"))
      .slice(0, 60);
  }, [q, zichtbaar]);

  const exact = hits && hits.some((i) => norm(i.name) === norm(q.trim()));
  const favs = useMemo(
    () => zichtbaar.filter((i) => (uses[i.id] || 0) > 0).sort((a, b) => (uses[b.id] || 0) - (uses[a.id] || 0)).slice(0, 10),
    [zichtbaar, uses]
  );
  const selCount = Object.keys(sel).length;

  const toggle = useCallback((id) => {
    setSel((p) => {
      const n = { ...p };
      if (n[id]) delete n[id];
      else n[id] = { qty: 1, note: "", deal: false, shop: defShop };
      return n;
    });
  }, [defShop]);
  const patch = (id, k, v) => setSel((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));
  const bump = (id, d) => setSel((p) => ({ ...p, [id]: { ...p[id], qty: Math.max(1, Math.min(99, (p[id].qty || 1) + d)) } }));

  /* nieuw artikel: de beheerder zet het er direct in, anderen dienen het in */
  async function nieuwArtikel(name, cat) {
    const item = { id: slug(cat) + "__" + slug(name) + "-" + Date.now().toString(36), name, cat };
    if (isBeheerder) {
      await saveGlobal([...catalog, item]);
      say(`“${name}” staat nu in ${cat}`);
    } else {
      await saveGlobal(undefined, [...pending, { ...item, byUid: uid, byName: me.name, hh, when: Date.now() }]);
      say(`“${name}” ingediend — je kunt hem meteen gebruiken`);
    }
    return item;
  }

  async function addFromSearch() {
    const name = q.trim();
    if (!name) return;
    const item = await nieuwArtikel(name, newCat);
    toggle(item.id);
    setEdit(item.id);
    setOpen((p) => ({ ...p, [newCat]: true }));
  }

  async function addFromManager() {
    const name = addName.trim();
    if (!name) return;
    if (zichtbaar.some((i) => norm(i.name) === norm(name) && i.cat === aCat)) return say("Die staat er al in");
    await nieuwArtikel(name, aCat);
    setAddName("");
  }

  async function applyEdit(id) {
    const name = mName.trim();
    if (!name || !isBeheerder) return;
    await saveGlobal(catalog.map((i) => (i.id === id ? { ...i, name, cat: mCat } : i)));
    setMEdit(null);
    say("Artikel bijgewerkt");
  }

  async function dropItem(id, name) {
    if (!isBeheerder) return say("Alleen de beheerder kan artikelen verwijderen");
    await saveGlobal(catalog.filter((i) => i.id !== id), pending.filter((p) => p.id !== id));
    setSel((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    setMEdit(null);
    setConfirm("");
    say(`“${name}” uit de catalogus verwijderd`);
  }

  async function keurGoed(p) {
    await saveGlobal([...catalog, { id: p.id, name: p.name, cat: p.cat }], pending.filter((x) => x.id !== p.id));
    say(`“${p.name}” goedgekeurd`);
  }

  async function wijsAf(p) {
    await saveGlobal(undefined, pending.filter((x) => x.id !== p.id));
    setConfirm("");
    say(`“${p.name}” afgewezen`);
  }

  async function restoreSeed() {
    if (!isBeheerder) return say("Alleen de beheerder kan de catalogus aanvullen");
    const have = new Set(catalog.map((i) => norm(i.name) + "|" + i.cat));
    const add = buildSeedCatalog().filter((i) => !have.has(norm(i.name) + "|" + i.cat));
    if (!add.length) return say("Alle basisartikelen staan er al in");
    await saveGlobal([...catalog, ...add]);
    say(`${add.length} basisartikelen teruggezet`);
  }

  /* ---------- lijst ---------- */
  function makeList() {
    const items = [];
    ordCats.forEach((cat) =>
      zichtbaar
        .filter((i) => i.cat === cat && sel[i.id])
        .sort((a, b) => a.name.localeCompare(b.name, "nl"))
        .forEach((i) => {
          const s = sel[i.id];
          const winkel = s.shop || defShop;
          items.push({
            rid: i.id + "@" + slug(winkel),
            id: i.id, name: i.name, cat: i.cat, ...s, shop: winkel,
            by: uid, done: false, doneAt: 0,
          });
        })
    );
    if (!items.length) return;

    const nu = { ...uses };
    Object.keys(sel).forEach((id) => (nu[id] = (nu[id] || 0) + 1));
    setUses(nu);
    saveSettings({ uses: nu });

    setList((cur) => {
      if (!cur) return { title: stamp(), date: iso(), items };
      /* zelfde artikel bij een andere winkel wordt een eigen regel;
         precies dezelfde combinatie telt bij het aantal op */
      const samen = [...cur.items];
      items.forEach((n) => {
        const i = samen.findIndex((o) => (o.rid || o.id + "@" + slug(o.shop || defShop)) === n.rid);
        if (i >= 0) samen[i] = { ...samen[i], qty: Math.min(99, (samen[i].qty || 1) + (n.qty || 1)) };
        else samen.push(n);
      });
      return { ...cur, items: samen };
    });
    setSel({});
    setEdit(null);
    setQ("");
    setTab("winkel");
  }

  const rijId = (i) => i.rid || i.id + "@" + slug(i.shop || defShop);

  /* haalt alleen deze regel van de winkellijst; de catalogus blijft ongemoeid */
  function haalWeg(rid, naam) {
    setConfirm("");
    setList((l) => {
      if (!l) return l;
      const over = l.items.filter((i) => rijId(i) !== rid);
      return over.length ? { ...l, items: over } : null;
    });
    say(`${naam} van de lijst gehaald`);
  }
  const tickLine = (rid) =>
    setList((l) => ({
      ...l,
      items: l.items.map((i) =>
        rijId(i) === rid ? { ...i, done: !i.done, doneAt: i.done ? 0 : Date.now(), got: i.done ? "" : uid } : i
      ),
    }));

  async function finish() {
    const bought = list.items.filter((i) => i.done);
    const missed = list.items.length - bought.length;
    if (bought.length) {
      const next = [...hist, ...bought.map((i) => ({ d: list.date || iso(), name: i.name, cat: i.cat, qty: i.qty || 1 }))];
      setHist(next);
      await save(K(hh, "history"), next);
    }
    setList(null);
    setConfirm("");
    setTab(bought.length ? "cijfers" : "kies");
    say(`${bought.length} artikelen in de historie${missed ? ` · ${missed} niet gepakt` : ""}`);
  }

  /* ---------- analyse ---------- */
  const scope = useMemo(() => {
    if (range === "all") return hist;
    const cut = new Date(Date.now() - (range === "30" ? 30 : 365) * 864e5);
    return hist.filter((r) => new Date(r.d + "T12:00:00") >= cut);
  }, [hist, range]);

  const perCat = useMemo(() => {
    const m = {};
    scope.forEach((r) => (m[r.cat] = (m[r.cat] || 0) + (r.qty || 1)));
    const tot = Object.values(m).reduce((a, b) => a + b, 0);
    return { tot, rows: Object.entries(m).map(([cat, v]) => ({ cat, v, f: tot ? v / tot : 0 })).sort((a, b) => b.v - a.v) };
  }, [scope]);

  const top10 = useMemo(() => {
    const m = {};
    scope.forEach((r) => {
      m[r.name] = m[r.name] || { name: r.name, cat: r.cat, keer: 0, stuks: 0 };
      m[r.name].keer += 1;
      m[r.name].stuks += r.qty || 1;
    });
    return Object.values(m).sort((a, b) => b.keer - a.keer || b.stuks - a.stuks).slice(0, 10);
  }, [scope]);

  const trips = useMemo(() => {
    const m = {};
    scope.forEach((r) => (m[r.d] = (m[r.d] || 0) + 1));
    return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [scope]);

  function exportCsv() {
    const rows = [...hist].sort((a, b) => (a.d < b.d ? 1 : -1)).map((r) => `${r.d};${r.name};${r.cat};${r.qty || 1}`);
    const text = ["datum;artikel;categorie;aantal", ...rows].join("\n");
    try {
      const url = URL.createObjectURL(new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `boodschappen-${slug(house)}-${iso()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      say("CSV gedownload");
    } catch {
      setCsv(text);
      say("Download geblokkeerd — kopieer de tekst hieronder");
    }
  }

  /* ---------- uitnodigen ---------- */
  const appUrl = (me && me.appUrl) || "";
  const inviteText = `Doe mee met onze boodschappenlijst 🛒\n\n${appUrl || "[link naar de app]"}\n\nOpen Beheer › Meedoen met een code en vul in:\n${fmtCode(hh)}`;

  function shareWhatsApp() {
    try {
      const w = window.open("https://wa.me/?text=" + encodeURIComponent(inviteText), "_blank");
      if (!w) throw new Error("blocked");
    } catch {
      setCsv(inviteText);
      say("Kon WhatsApp niet openen — kopieer de tekst hieronder");
    }
  }
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteText);
      say("Uitnodiging gekopieerd");
    } catch {
      setCsv(inviteText);
      say("Kopiëren geblokkeerd — selecteer de tekst hieronder");
    }
  }

  /* ---------- rij in de catalogus ---------- */
  const rij = (it, sleutel) => {
    const s = sel[it.id];
    const on = !!s;
    const opened = on && edit === it.id;
    return (
      <div key={sleutel || it.id}>
        <div className={"bd-item" + (on ? " on" : "") + (opened ? " edit" : "")}>
          <button className="bd-hit" onClick={() => { toggle(it.id); setEdit(on ? null : it.id); }}>
            <span className="bd-tick">{on && <Check />}</span>
            <span className="bd-txt">
              <span className="nm">{it.name}</span>
              {(it.wacht || (on && (s.note || s.deal || (s.shop && s.shop !== defShop)))) && (
                <span className="bd-meta">
                  {on && s.deal && <span className="bd-flag a">Aanbieding</span>}
                  {on && s.shop && s.shop !== defShop && <span className="bd-flag s">{s.shop}</span>}
                  {on && s.note && <span className="bd-note-inline">{s.note}</span>}
                  {it.wacht && <span className="bd-flag w">wacht op goedkeuring</span>}
                </span>
              )}
            </span>
          </button>
          {on && (
            <span className="bd-step">
              <button onClick={() => bump(it.id, -1)} disabled={s.qty <= 1} aria-label="minder">−</button>
              <span className="q">{s.qty}</span>
              <button onClick={() => bump(it.id, 1)} aria-label="meer">+</button>
            </span>
          )}
        </div>
        {opened && (
          <div className="bd-editor">
            <NoteVeld key={"n" + it.id} start={s.note} onKlaar={(v) => patch(it.id, "note", v)} />
            <div className="bd-shoprow">
              <span className="lbl">Winkel</span>
              <select value={s.shop || defShop} onChange={(e) => patch(it.id, "shop", e.target.value)}>
                {[...new Set([defShop, ...shops, s.shop].filter(Boolean))].map((w) => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div className="bd-chips">
              <button className={"bd-chip a" + (s.deal ? " on" : "")} onClick={() => patch(it.id, "deal", !s.deal)}>Aanbieding</button>
              <button className="bd-chip" onClick={() => setEdit(null)}>Klaar</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const todo = list ? list.items.filter((i) => !i.done) : [];
  const cart = list ? list.items.filter((i) => i.done).sort((a, b) => b.doneAt - a.doneAt) : [];
  const pct = list && list.items.length ? Math.round((cart.length / list.items.length) * 100) : 0;

  /* namen die bij meerdere winkels op de lijst staan */
  const dubbel = useMemo(() => {
    const m = new Map();
    (list ? list.items : []).forEach((i) => {
      const k = norm(i.name);
      const w = i.shop || defShop;
      if (!m.has(k)) m.set(k, []);
      if (!m.get(k).includes(w)) m.get(k).push(w);
    });
    return new Map([...m].filter(([, w]) => w.length > 1));
  }, [list, defShop]);

  /* eerst de standaardwinkel, daarna de rest op alfabet */
  const perShop = useMemo(() => {
    const m = {};
    todo.forEach((i) => {
      const w = i.shop || defShop;
      (m[w] = m[w] || []).push(i);
    });
    return Object.entries(m).sort((a, b) =>
      a[0] === defShop ? -1 : b[0] === defShop ? 1 : a[0].localeCompare(b[0], "nl")
    );
  }, [todo, defShop]);

  const R = 52, C = 2 * Math.PI * R;
  let off = 0;
  const arcs = perCat.rows.map((r) => {
    const len = r.f * C;
    const el = (
      <circle key={r.cat} r={R} cx="64" cy="64" fill="none" stroke={CAT_COLOR[r.cat] || "#8d9490"} strokeWidth="22"
        strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 64 64)" />
    );
    off += len;
    return el;
  });

  const nieuwBeschikbaar = useMemo(() => {
    if (!catalog.length || !isBeheerder) return 0;
    const have = new Set(catalog.map((i) => norm(i.name) + "|" + i.cat));
    return buildSeedCatalog().filter((i) => !have.has(norm(i.name) + "|" + i.cat)).length;
  }, [catalog, isBeheerder]);

  const mHits = useMemo(() => {
    const t = norm(mq.trim());
    const base = t ? zichtbaar.filter((i) => norm(i.name).includes(t)) : zichtbaar;
    return [...base].sort((a, b) => ordCats.indexOf(a.cat) - ordCats.indexOf(b.cat) || a.name.localeCompare(b.name, "nl")).slice(0, 80);
  }, [mq, zichtbaar, ordCats]);

  /* ---------- setup ---------- */
  if (booting) return <div className="bd-root"><style>{CSS}</style><div className="bd-empty"><span>Even laden…</span></div></div>;

  if (laadFout) {
    return (
      <div className="bd-root">
        <style>{CSS}</style>
        <div className="bd-body" style={{ paddingBottom: 24 }}>
          <div className="bd-hero">
            <div className="mark">📡</div>
            <h2>Even geen verbinding</h2>
            <p>
              De gegevens konden niet worden opgehaald. Er is niets gewijzigd — je lijst en
              instellingen staan nog gewoon goed. Probeer het zo opnieuw.
            </p>
          </div>
          <div className="bd-pane">
            <div className="act">
              <button className="bd-btn" onClick={() => (hh && me && me.name ? openHouse(hh, uid, me.name) : setLaadFout(""))}>
                Opnieuw proberen
              </button>
            </div>
            <p className="bd-hint" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{laadFout}</p>
          </div>
        </div>
      </div>
    );
  }

  if (hh && !me.name) {
    return (
      <div className="bd-root">
        <style>{CSS}</style>
        <div className="bd-body" style={{ paddingBottom: 24 }}>
          <div className="bd-hero">
            <div className="mark">👋</div>
            <h2>Wie ben jij?</h2>
            <p>Iedereen in het huishouden vult zijn naam in. Zo zie je op de lijst wie iets heeft toegevoegd en wie het in de winkel heeft gepakt.</p>
          </div>
          <div className="bd-pane">
            <label>Je naam of initialen</label>
            <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="bijv. Rob" />
            <div className="act">
              <button className="bd-btn" onClick={async () => {
                const wie = myName.trim();
                if (!wie) return say("Vul je naam in");
                await saveMe({ ...me, name: wie });
                await openHouse(hh, me.uid, wie);
              }}>Verder</button>
            </div>
          </div>
        </div>
        {toast && <div className="bd-toast" style={{ bottom: 20 }}>{toast}</div>}
      </div>
    );
  }

  if (!hh) {
    return (
      <div className="bd-root">
        <style>{CSS}</style>
        <div className="bd-body" style={{ paddingBottom: 24 }}>
          <div className="bd-hero">
            <div className="mark">🛒</div>
            <h2>Boodschappen samen</h2>
            <p>Eén lijst voor jullie huishouden. Iedereen met dezelfde code werkt in dezelfde lijst en historie — andere huishoudens houden hun eigen boekhouding.</p>
          </div>

          {me.houses.length > 0 && (
            <div className="bd-verder">
              <h3>Verder waar je was</h3>
              <p className="sub">eerder gebruikt op dit toestel</p>
              {me.houses.map((x) => (
                <button key={x.hh} onClick={() => switchHouse(x.hh)}>
                  <span className="nm">{x.name}</span>
                  <span className="cd">{fmtCode(x.hh)}</span>
                </button>
              ))}
            </div>
          )}

          {kicked && (
            <div className="bd-pane">
              <div className="bd-warnbox">De oprichter van {fmtCode(kicked)} heeft je uit dat huishouden gehaald. Je kunt hier een eigen huishouden starten.</div>
            </div>
          )}

          <div className="bd-pane">
            <h3>Jouw naam</h3>
            <p className="sub">zichtbaar voor de anderen in het huishouden</p>
            <label>Naam of initialen</label>
            <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="bijv. Rob" />
          </div>

          <div className="bd-pane">
            <h3>Nieuw huishouden starten</h3>
            <p className="sub">je krijgt een code om te delen</p>
            <label>Naam</label>
            <input value={setupName} onChange={(e) => { setSetupName(e.target.value); setDupWarn(false); }} placeholder="bijv. Thuis" />
            {dupWarn && (
              <div className="bd-warnbox">
                Er bestaat al een huishouden dat “{setupName.trim()}” heet. Wilde je daar juist bij?
                Kies dat dan hieronder bij <b>Bestaande huishoudens</b> — dan houd je één lijst in
                plaats van twee. Weet je het zeker, tik dan nog een keer op de knop.
              </div>
            )}
            <div className="act">
              <button className="bd-btn" onClick={startHouse}>{dupWarn ? "Toch een nieuw huishouden" : "Huishouden aanmaken"}</button>
            </div>
          </div>

          <p className="bd-or">of</p>

          <div className="bd-pane">
            <h3>Meedoen met een code</h3>
            <p className="sub">de lange code of de eenvoudige code van je huishouden</p>
            <label>Code</label>
            <input className="code" value={joinCode} maxLength={40} placeholder="XXXX-XXXX of pergo"
              onChange={(e) => { setJoinCode(e.target.value); setJoinWarn(false); }} />
            {joinWarn && (
              <div className="bd-warnbox">
                Onder deze code staat nog niets. Controleer de tekens, of ga verder om hier een nieuw huishouden op te bouwen.
              </div>
            )}
            <div className="act"><button className="bd-btn" onClick={() => joinHouse()}>{joinWarn ? "Toch doorgaan" : "Meedoen"}</button></div>
          </div>

          {index.filter((x) => !me.houses.some((h) => h.hh.slice(0, 4) === x.pre)).length > 0 && (
            <div className="bd-pane">
              <h3>Bestaande huishoudens</h3>
              <p className="sub">tik de jouwe aan en vul de laatste 4 tekens van de code in</p>
              {index
                .filter((x) => !me.houses.some((h) => h.hh.slice(0, 4) === x.pre))
                .map((x) => (
                  <div key={x.pre + x.name}>
                    <button className="bd-house" onClick={() => { setPickHh(pickHh === x.pre ? "" : x.pre); setPickRest(""); }}>
                      <span className="nm">{x.name}</span>
                      <span className="cd">{x.pre}-••••</span>
                    </button>
                    {pickHh === x.pre && (
                      <div className="ed" style={{ display: "flex", gap: 8, paddingBottom: 12 }}>
                        <input className="code" value={pickRest} maxLength={4} placeholder="XXXX"
                          onChange={(e) => setPickRest(e.target.value)} style={{ flex: 1 }} />
                        <button className="bd-chip" onClick={async () => {
                          const volledig = await HUIS.zoek(x.pre, cleanCode(pickRest));
                          if (!volledig) return say("Die vier tekens kloppen niet");
                          setPickHh("");
                          joinHouse(volledig);
                        }}>Openen</button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
        {toast && <div className="bd-toast" style={{ bottom: 20 }}>{toast}</div>}
      </div>
    );
  }

  /* ---------- app ---------- */
  return (
    <div className="bd-root">
      <style>{CSS}</style>

      <header className="bd-top">
        <div className="bd-brand">
          <h1>{tab === "kies" ? "Boodschappen" : tab === "winkel" ? "In de winkel" : tab === "cijfers" ? "Cijfers" : "Beheer"}</h1>
          <span className="bd-sync"><span className={"bd-dot" + (synced ? "" : " off")} />{house}</span>
        </div>
        {tab === "kies" && (
          <div className="bd-search">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" strokeLinecap="round" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek artikel…" />
            {q && (
              <button className="bd-clear" onClick={() => setQ("")} aria-label="zoekbalk leegmaken">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        )}
      </header>

      <div className="bd-body" ref={bodyRef}
        onTouchStart={pullStart} onTouchMove={pullMove} onTouchEnd={pullEnd} onTouchCancel={pullEnd}>
        <div className="bd-pull" style={{ height: pull }}>
          {pull > 8 && <span>{pull > 52 ? "laat los om te verversen" : "trek verder…"}</span>}
        </div>
        {tab === "kies" && (hits ? (
          <>
            <p className="bd-eyebrow">{hits.length} van {catalog.length} artikelen</p>
            <div className="bd-items">{hits.map((it) => rij(it))}</div>
            {!exact && (
              <div className="bd-new">
                <p>Staat <b>{q.trim()}</b> er niet bij? Zet het in de catalogus — hij blijft daarna bewaard.</p>
                <select value={newCat} onChange={(e) => setNewCat(e.target.value)}>
                  {ordCats.map((c) => <option key={c}>{c}</option>)}
                </select>
                <button className="bd-btn" onClick={addFromSearch}>Toevoegen aan catalogus</button>
              </div>
            )}
          </>
        ) : (
          <>
            {favs.length > 0 && (
              <section className="bd-cat">
                <button className="bd-cathead" onClick={() => setOpen((p) => ({ ...p, __top: !p.__top }))}>
                  <svg className={"bd-chev" + (open.__top ? " open" : "")} width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M2 2l5 5-5 5" /></svg>
                  <h2>Meest bestelde artikelen</h2>
                  <span className="bd-count">{favs.length}</span>
                </button>
                {open.__top && <div className="bd-items">{favs.map((it) => rij(it, "f" + it.id))}</div>}
              </section>
            )}
            {ordCats.map((cat) => {
              const items = byCat[cat] || [];
              if (!items.length) return null;
              const n = items.filter((i) => sel[i.id]).length;
              const o = open[cat];
              return (
                <section className="bd-cat" key={cat}>
                  <button className="bd-cathead" onClick={() => setOpen((p) => ({ ...p, [cat]: !p[cat] }))}>
                    <svg className={"bd-chev" + (o ? " open" : "")} width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M2 2l5 5-5 5" /></svg>
                    <h2>{cat}</h2>
                    {n > 0 && <span className="bd-badge">{n}</span>}
                    <span className="bd-count">{items.length}</span>
                  </button>
                  {o && <div className="bd-items">{items.map((it) => rij(it))}</div>}
                </section>
              );
            })}
          </>
        ))}

        {tab === "winkel" && (!list ? (
          <div className="bd-empty">
            <strong>Nog geen winkellijst</strong>
            <span>Vink artikelen aan bij Kiezen en tik op Lijst maken. De lijst komt hier in looproute te staan.</span>
          </div>
        ) : (
          <div className="bd-recpt">
            <div className="bd-recpt-h">
              <h2>{list.title}</h2>
              <p>{cart.length} / {list.items.length} in de wagen</p>
              <div className="bd-bar"><i style={{ width: pct + "%" }} /></div>
            </div>
            {perShop.map(([winkel, items]) => (
              <div key={winkel}>
                <p className="bd-shop">
                  <span>{winkel}</span>
                  <span className="n">{items.length}</span>
                </p>
                {ordCats.map((cat) => {
                  const regels = items
                    .filter((i) => i.cat === cat)
                    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
                  if (!regels.length) return null;
                  return (
                    <div key={cat}>
                      <p className="bd-sec">{cat}</p>
                      {regels.map((i) => (
                        <div className="bd-line" key={rijId(i)}>
                        <button className="bd-hitline" onClick={() => tickLine(rijId(i))}>
                          <span className="bd-box" />
                          <span className="bd-txt">
                            <span className="nm">{i.name}</span>
                            {(i.note || i.deal || dubbel.has(norm(i.name)) || (meerdere && i.by)) && (
                              <span className="bd-meta">
                                {i.deal && <span className="bd-flag a">Aanbieding</span>}
                                {i.note && <span className="bd-note-inline">{i.note}</span>}
                                {dubbel.has(norm(i.name)) && (
                                  <span className="bd-flag d">! ook bij {dubbel.get(norm(i.name)).filter((w) => w !== i.shop).join(" en ")}</span>
                                )}
                                {meerdere && i.by && <span className="bd-by">van {wie(i.by)}</span>}
                              </span>
                            )}
                          </span>
                          {(i.qty || 1) > 1 && <span className="bd-qty">{i.qty}×</span>}
                        </button>
                        <button className={"bd-weg" + (confirm === "r" + rijId(i) ? " armed" : "")}
                          aria-label="van de lijst halen"
                          onClick={() => {
                            if (confirm === "r" + rijId(i)) haalWeg(rijId(i), i.name);
                            else { setConfirm("r" + rijId(i)); setTimeout(() => setConfirm(""), 4000); }
                          }}><Trash /></button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
            {!todo.length && (
              <div className="bd-done-msg">
                <strong>Alles binnen 🎉</strong>
                <span>Rond de lijst af, dan gaat alles de historie in.</span>
              </div>
            )}
            {cart.length > 0 && (
              <div className="bd-cart">
                <p className="bd-sec">In de wagen</p>
                {cart.map((i) => (
                  <div className="bd-line done" key={rijId(i)}>
                    <button className="bd-hitline" onClick={() => tickLine(rijId(i))}>
                      <span className="bd-box"><Check /></span>
                      <span className="bd-txt">
                        <span className="nm">{i.name}</span>
                        {meerdere && i.got && <span className="bd-meta"><span className="bd-by">gepakt door {wie(i.got)}</span></span>}
                      </span>
                      {(i.qty || 1) > 1 && <span className="bd-qty">{i.qty}×</span>}
                    </button>
                    <button className={"bd-weg" + (confirm === "r" + rijId(i) ? " armed" : "")}
                      aria-label="van de lijst halen"
                      onClick={() => {
                        if (confirm === "r" + rijId(i)) haalWeg(rijId(i), i.name);
                        else { setConfirm("r" + rijId(i)); setTimeout(() => setConfirm(""), 4000); }
                      }}><Trash /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {tab === "cijfers" && (!hist.length ? (
          <div className="bd-empty">
            <strong>Nog geen historie</strong>
            <span>Zodra je een winkellijst afrondt, komt elk gekocht artikel hier met datum, categorie en aantal in de database.</span>
          </div>
        ) : (
          <>
            <div className="bd-kpis">
              <div className="bd-kpi"><b>{trips.length}</b><span>rondes</span></div>
              <div className="bd-kpi"><b>{perCat.tot}</b><span>artikelen</span></div>
              <div className="bd-kpi"><b>{trips.length ? Math.round(perCat.tot / trips.length) : 0}</b><span>per ronde</span></div>
            </div>

            <div className="bd-card">
              <div className="bd-chips">
                {[["30", "30 dagen"], ["365", "12 maanden"], ["all", "Alles"]].map(([k, l]) => (
                  <button key={k} className={"bd-chip" + (range === k ? " on" : "")} onClick={() => setRange(k)}>{l}</button>
                ))}
              </div>
            </div>

            <div className="bd-card">
              <h3>Verdeling per categorie</h3>
              <p className="sub">{perCat.tot} artikelen · {perCat.rows.length} categorieën</p>
              <div className="bd-donut">
                <svg width="128" height="128" viewBox="0 0 128 128" style={{ flex: "none" }}>
                  {arcs}
                  <text x="64" y="60" textAnchor="middle" fontSize="21" fontWeight="800" fill="#12271f" fontFamily="ui-monospace,monospace">{perCat.tot}</text>
                  <text x="64" y="76" textAnchor="middle" fontSize="9" fill="#4c6357" fontFamily="ui-monospace,monospace" letterSpacing="1">STUKS</text>
                </svg>
                <div className="bd-legend">
                  {perCat.rows.slice(0, 7).map((r) => (
                    <div className="bd-lg" key={r.cat}>
                      <i style={{ background: CAT_COLOR[r.cat] || "#8d9490" }} />
                      <span className="l">{r.cat}</span>
                      <span className="v">{Math.round(r.f * 100)}%</span>
                    </div>
                  ))}
                  {perCat.rows.length > 7 && <div className="bd-lg"><i style={{ background: "#c9d2c4" }} /><span className="l">overige {perCat.rows.length - 7}</span></div>}
                </div>
              </div>
            </div>

            <div className="bd-card">
              <h3>Top 10 artikelen</h3>
              <p className="sub">hoe vaak op een lijst gestaan</p>
              <div className="bd-rank">
                {top10.map((r) => (
                  <div className="bd-rk" key={r.name}>
                    <div className="t">
                      <span className="l">{r.name}</span>
                      <span className="v">{r.keer}×{r.stuks > r.keer ? ` · ${r.stuks} st` : ""}</span>
                    </div>
                    <div className="track"><i style={{ width: (r.keer / top10[0].keer) * 100 + "%", background: CAT_COLOR[r.cat] || "#8d9490" }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bd-card">
              <h3>Rondes</h3>
              <p className="sub">datum · aantal artikelen</p>
              {trips.slice(0, 12).map(([d, n]) => (
                <div className="bd-trip" key={d}><span className="d">{nlDate(d)}</span><span className="n">{n}</span></div>
              ))}
              <div className="bd-tools">
                <button onClick={exportCsv}>Exporteer CSV</button>
                <button onClick={() => {
                  if (confirm === "hist") { setHist([]); save(K(hh, "history"), []); setConfirm(""); say("Historie gewist"); }
                  else { setConfirm("hist"); setTimeout(() => setConfirm(""), 4000); }
                }}>{confirm === "hist" ? "Zeker weten?" : "Historie wissen"}</button>
              </div>
              {csv && <textarea className="bd-csv" readOnly value={csv} onFocus={(e) => e.target.select()} />}
            </div>
          </>
        ))}

        {tab === "beheer" && (
          <>
            <div className="bd-card">
              <div className="bd-chips">
                <button className={"bd-chip" + (pane === "huis" ? " on" : "")} onClick={() => setPane("huis")}>Huishouden</button>
                <button className={"bd-chip" + (pane === "cat" ? " on" : "")} onClick={() => setPane("cat")}>Catalogus</button>
              </div>
            </div>

            {pane === "huis" ? (
              <>
                <div className="bd-pane">
                  <h3>{house}</h3>
                  <p className="sub">deel deze code met wie meedoet</p>
                  <div className="bd-code">{fmtCode(hh)}</div>
                  <div className="bd-mini" style={{ marginTop: 12 }}>
                    <button className="pri" onClick={shareWhatsApp}>Via WhatsApp</button>
                    <button onClick={copyInvite}>Kopieer tekst</button>
                  </div>
                  <p className="bd-hint">Wie de code invult, ziet dezelfde lijst en historie — handig voor één huishouden. Familie die zelf wil bijhouden, start een eigen huishouden met een eigen code.</p>
                  <label>Naam van dit huishouden</label>
                  <input key={hh} defaultValue={house} onBlur={(e) => renameHouse(e.target.value)} placeholder="bijv. Thuis" />
                  <label>Eenvoudige code (optioneel)</label>
                  <input key={"a" + hh} defaultValue={alias} placeholder="bijv. pergo"
                    onBlur={(e) => saveAlias(e.target.value)} />
                  <p className="bd-hint">
                    Hiermee kan iemand ook meedoen zonder de lange code te typen. Houd hem niet té
                    voorspelbaar: wie hem raadt, komt in jullie lijst.
                  </p>
                  <label>Link naar deze app</label>
                  <input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)}
                    onBlur={() => saveMe({ ...me, appUrl: urlDraft.trim() })} placeholder="https://…" />
                  <p className="bd-hint">Plak hier de link waarop jullie de app openen. Die komt dan automatisch in de uitnodiging te staan.</p>
                  {csv && <textarea className="bd-csv" readOnly value={csv} onFocus={(e) => e.target.select()} />}
                  {isBeheerder && (
                    <>
                      <label>Alle huishoudens</label>
                      {overzicht === null ? (
                        <div className="bd-mini">
                          <button className="pri" onClick={haalOverzicht}>Overzicht ophalen</button>
                        </div>
                      ) : !overzicht.length ? (
                        <p className="bd-hint">Geen huishoudens gevonden.</p>
                      ) : (
                        <>
                          {overzicht.map((o) => (
                            <div className="bd-ov" key={o.code_begin + o.naam}>
                              <b>{o.naam}</b>
                              <span className="c">{o.code_begin}-••••</span>
                              <span className="p">{o.leden || "nog niemand"}</span>
                            </div>
                          ))}
                          <div className="bd-mini" style={{ marginTop: 10 }}>
                            <button onClick={haalOverzicht}>Vernieuwen</button>
                          </div>
                        </>
                      )}
                      <p className="bd-hint">
                        Je ziet wie waar in zit, maar nooit hun lijsten of historie. Daarvoor heb je
                        hun volledige code nodig.
                      </p>
                    </>
                  )}
                  <label>Versie van de app</label>
                  <div className="bd-mini">
                    <span style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 12, alignSelf: "center", color: "var(--ink2)" }}>
                      {VERSIE}
                    </span>
                    <button className="pri" style={{ flex: "none", padding: "10px 16px" }} onClick={verversApp}>
                      Nieuwste ophalen
                    </button>
                  </div>
                  <p className="bd-hint">
                    Zie je een wijziging niet terug, tik dan op Nieuwste ophalen. Dat gooit de
                    opgeslagen versie weg en haalt de app opnieuw op.
                  </p>
                </div>

                <div className="bd-pane">
                  <h3>Wie doen mee</h3>
                  <p className="sub">{members.people.length} {members.people.length === 1 ? "persoon" : "personen"} in {house}</p>
                  {members.people.map((p) => (
                    <div className="bd-house" key={p.uid}>
                      <span className="bd-ini">{wie(p.uid)}</span>
                      <span className="nm">
                        {p.name}{p.uid === uid ? " · jij" : ""}
                        <span style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink2)", fontWeight: 400, marginTop: 2 }}>
                          {geleden(p.seen || p.joined || Date.now())}
                        </span>
                      </span>
                      {members.owner === p.uid && <span className="bd-tag">oprichter</span>}
                      {isOwner && p.uid !== uid && (
                        <button className={"bd-icon del" + (confirm === "k" + p.uid ? " armed" : "")} onClick={() => {
                          if (confirm === "k" + p.uid) kickMember(p);
                          else { setConfirm("k" + p.uid); setTimeout(() => setConfirm(""), 4000); }
                        }}><Trash /></button>
                      )}
                    </div>
                  ))}
                  {confirm.startsWith("k") && <div className="bd-warnbox">Nog een keer tikken haalt diegene uit het huishouden. De lijst en historie blijven bestaan.</div>}
                  {isOwner && members.blocked.length > 0 && (
                    <>
                      <label>Geen toegang meer</label>
                      {members.blocked.map((b) => (
                        <div className="bd-house" key={b.uid || b}>
                          <span className="nm">{b.name || "onbekend"}</span>
                          <button className="bd-chip" onClick={() => unblock(b.uid || b)}>Weer toelaten</button>
                        </div>
                      ))}
                    </>
                  )}
                  <label>Jouw naam</label>
                  <input key={"n" + uid} defaultValue={me.name} onBlur={(e) => saveMyName(e.target.value)} />
                  {!isOwner && (
                    <>
                      <label>Beheer van dit huishouden overnemen</label>
                      <div className="bd-mini">
                        <input className="code" value={ownDraft} maxLength={9} placeholder="XXXX-XXXX"
                          onChange={(e) => setOwnDraft(e.target.value)} />
                        <button className="pri" style={{ flex: "none", padding: "10px 16px" }} onClick={takeOwner}>Overnemen</button>
                      </div>
                      <p className="bd-hint">
                        Vul de volledige code van dit huishouden in om oprichter te worden. Handig als
                        de oorspronkelijke oprichter er niet meer bij kan.
                      </p>
                    </>
                  )}
                  <p className="bd-hint">
                    {isOwner
                      ? "Jij bent de oprichter en kunt mensen verwijderen. Wie je verwijdert, komt er ook met de code niet meer in."
                      : `Alleen ${(members.people.find((p) => p.uid === members.owner) || {}).name || "de oprichter"} kan mensen uit dit huishouden halen.`}
                  </p>
                </div>

                <div className="bd-pane">
                  <h3>Volgorde in de winkel</h3>
                  <p className="sub">pak een rij bij de strepen en sleep hem op zijn plek</p>
                  {ordCats.map((c, i) => (
                    <div className={"bd-ord" + (dragIdx === i ? " pak" : "")} key={c}>
                      <span
                        className="grip"
                        onPointerDown={(e) => dragStart(e, i)}
                        onPointerMove={dragMove}
                        onPointerUp={dragEnd}
                        onPointerCancel={dragEnd}
                        aria-label="versleep"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M4 8h16M4 12h16M4 16h16" />
                        </svg>
                      </span>
                      <span className="n">{i + 1}</span>
                      <span className="l">{c}</span>
                      <button onClick={() => moveCat(c, -1)} disabled={i === 0} aria-label="omhoog">↑</button>
                      <button onClick={() => moveCat(c, 1)} disabled={i === ordCats.length - 1} aria-label="omlaag">↓</button>
                    </div>
                  ))}
                  <div className="bd-mini" style={{ marginTop: 12 }}>
                    <button onClick={() => { setCatOrder(CATS); saveSettings({ catOrder: CATS }); say("Standaardvolgorde terug"); }}>
                      Standaardvolgorde
                    </button>
                  </div>
                  <p className="bd-hint">Deze volgorde is van dit huishouden en geldt voor al jullie winkels. Andere huishoudens hebben hun eigen route.</p>
                </div>

                <div className="bd-pane">
                  <h3>Winkels</h3>
                  <p className="sub">de standaard wordt vooraf gekozen bij elk artikel</p>
                  {shops.map((w) => (
                    <div className="bd-house" key={w}>
                      <span className="nm">{w}{w === defShop ? "" : ""}</span>
                      {w === defShop ? (
                        <span className="bd-tag">standaard</span>
                      ) : (
                        <button className="bd-chip" onClick={() => saveShops(shops, w)}>Maak standaard</button>
                      )}
                      {w !== defShop && (
                        <button className="bd-icon del" onClick={() => saveShops(shops.filter((x) => x !== w))}><Trash /></button>
                      )}
                    </div>
                  ))}
                  <label>Winkel toevoegen</label>
                  <div className="bd-mini">
                    <input value={newShop} onChange={(e) => setNewShop(e.target.value)} placeholder="bijv. Vomar" />
                    <button className="pri" style={{ flex: "none", padding: "10px 16px" }} onClick={() => {
                      const w = newShop.trim();
                      if (!w) return;
                      if (shops.some((x) => norm(x) === norm(w))) return say("Die staat er al in");
                      saveShops([...shops, w]);
                      setNewShop("");
                      say(`${w} toegevoegd`);
                    }}>Erbij</button>
                  </div>
                </div>

                <div className="bd-pane">
                  <h3>Huishoudens op dit toestel</h3>
                  <p className="sub">tik om te wisselen</p>
                  {me.houses.map((x) => (
                    <div className="bd-house" key={x.hh}>
                      <button className="nm" style={{ textAlign: "left" }} onClick={() => x.hh !== hh && switchHouse(x.hh)}>{x.name}</button>
                      {x.hh === hh ? <span className="bd-tag">nu</span> : <span className="cd">{fmtCode(x.hh)}</span>}
                      <button className={"bd-icon del" + (confirm === "f" + x.hh ? " armed" : "")} onClick={() => {
                        if (confirm === "f" + x.hh) forgetHouse(x.hh);
                        else { setConfirm("f" + x.hh); setTimeout(() => setConfirm(""), 4000); }
                      }}><Trash /></button>
                    </div>
                  ))}
                  <label>Meedoen met een andere code</label>
                  <input className="code" value={joinCode} maxLength={40} placeholder="XXXX-XXXX of pergo"
                    onChange={(e) => { setJoinCode(e.target.value); setJoinWarn(false); }} />
                  {joinWarn && <div className="bd-warnbox">Onder deze code staat nog niets. Controleer de tekens, of ga verder om er een nieuw huishouden op te bouwen.</div>}
                  <div className="bd-mini" style={{ marginTop: 12 }}>
                    <button className="pri" onClick={() => joinHouse()}>{joinWarn ? "Toch doorgaan" : "Meedoen"}</button>
                    <button onClick={() => saveMe({ ...me, hh: "" })}>Nieuw starten</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {!admin && (
                  <div className="bd-pane">
                    <h3>Nog geen beheerder</h3>
                    <p className="sub">de catalogus wordt door alle huishoudens gedeeld</p>
                    <p className="bd-hint">
                      Eén persoon beheert de artikelen. Die keurt nieuwe voorstellen goed en mag
                      dingen verwijderen. Dit is eenmalig en daarna niet meer over te nemen.
                    </p>
                    <div className="act"><button className="bd-btn" onClick={claimBeheer}>Ik beheer de catalogus</button></div>
                  </div>
                )}

                {isBeheerder && (
                  <div className="bd-pane">
                    <h3>Ter goedkeuring{pending.length ? ` · ${pending.length}` : ""}</h3>
                    <p className="sub">voorstellen van huisgenoten en familie</p>
                    {!pending.length && <p className="bd-hint">Niets in de wachtrij.</p>}
                    {pending.map((p) => (
                      <div key={p.id}>
                        <div className="bd-pend">
                          <span className="t">
                            <b>{p.name}</b>
                            <span>{p.cat} · {p.byName || "onbekend"}</span>
                          </span>
                          <button className="bd-ok" onClick={() => keurGoed(p)}>Goed</button>
                          <button className={"bd-icon del" + (confirm === "w" + p.id ? " armed" : "")} onClick={() => {
                            if (confirm === "w" + p.id) wijsAf(p);
                            else { setConfirm("w" + p.id); setTimeout(() => setConfirm(""), 4000); }
                          }}><Trash /></button>
                        </div>
                        {confirm === "w" + p.id && <div className="bd-warnbox">Nog een keer tikken wijst “{p.name}” af.</div>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="bd-pane">
                  <h3>{isBeheerder ? "Artikel toevoegen" : "Artikel voorstellen"}</h3>
                  <p className="sub">
                    {catalog.length} artikelen{isBeheerder ? "" : " · jouw voorstel komt bij de beheerder"}
                  </p>
                  <label>Naam</label>
                  <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="bijv. verse pasta" />
                  <label>Categorie</label>
                  <select value={aCat} onChange={(e) => setACat(e.target.value)}>
                    {ordCats.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <div className="act"><button className="bd-btn" onClick={addFromManager}>Toevoegen</button></div>
                </div>

                <div className="bd-pane">
                  <h3>{isBeheerder ? "Artikelen wijzigen of verwijderen" : "Alle artikelen"}</h3>
                  <p className="sub">
                    {isBeheerder
                      ? "verwijderen haalt het uit de catalogus, niet uit je wagen"
                      : `alleen ${admin ? admin.name : "de beheerder"} kan artikelen wijzigen`}
                  </p>
                  <label>Zoeken</label>
                  <input value={mq} onChange={(e) => setMq(e.target.value)} placeholder="filter op naam" />
                  {mHits.map((it) => (
                    <div className="bd-mrow" key={it.id}>
                      <div className="top">
                        <span className="nm">{it.name}</span>
                        <span className="ct">{it.cat}</span>
                        {isBeheerder && (
                          <>
                            <button className="bd-icon" onClick={() => {
                              if (mEdit === it.id) setMEdit(null);
                              else { setMEdit(it.id); setMName(it.name); setMCat(it.cat); }
                            }}><Pen /></button>
                            <button className={"bd-icon del" + (confirm === "d" + it.id ? " armed" : "")} onClick={() => {
                              if (confirm === "d" + it.id) dropItem(it.id, it.name);
                              else { setConfirm("d" + it.id); setTimeout(() => setConfirm(""), 4000); }
                            }}><Trash /></button>
                          </>
                        )}
                      </div>
                      {confirm === "d" + it.id && <div className="bd-warnbox">Nog een keer op de prullenbak tikken verwijdert “{it.name}” uit de catalogus van {house}.</div>}
                      {mEdit === it.id && (
                        <div className="ed">
                          <input value={mName} onChange={(e) => setMName(e.target.value)} />
                          <select value={mCat} onChange={(e) => setMCat(e.target.value)}>
                            {ordCats.map((c) => <option key={c}>{c}</option>)}
                          </select>
                          <div className="bd-mini">
                            <button className="pri" onClick={() => applyEdit(it.id)}>Opslaan</button>
                            <button onClick={() => setMEdit(null)}>Annuleren</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {zichtbaar.length > mHits.length && <p className="bd-hint">Eerste {mHits.length} van {zichtbaar.length} — zoek om verder te filteren.</p>}
                  {isBeheerder && (
                    <div className="bd-mini" style={{ marginTop: 14 }}>
                      <button onClick={restoreSeed}>{nieuwBeschikbaar ? `Catalogus bijwerken (+${nieuwBeschikbaar})` : "Catalogus is bijgewerkt"}</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {toast && <div className="bd-toast">{toast}</div>}

      {(tab === "kies" || tab === "winkel") && (
        <div className="bd-cta">
          {tab === "kies" ? (
            <button className="bd-btn" disabled={!selCount} onClick={makeList}>
              <span className="n">{selCount}</span> {list ? "Toevoegen aan lijst" : "Lijst maken"}
            </button>
          ) : list ? (
            <>
              <button className="bd-btn" onClick={() => setTab("kies")}>Artikelen toevoegen</button>
              <button className={"bd-btn ghost" + (confirm === "fin" ? " warn" : "")} onClick={() => {
                if (confirm === "fin") finish();
                else { setConfirm("fin"); setTimeout(() => setConfirm(""), 4000); }
              }}>{confirm === "fin" ? "Afronden?" : "Afronden"}</button>
            </>
          ) : (
            <button className="bd-btn" onClick={() => setTab("kies")}>Naar de catalogus</button>
          )}
        </div>
      )}

      <nav className="bd-tabs">
        <button className={"bd-tab" + (tab === "kies" ? " on" : "")} onClick={() => setTab("kies")}>
          <span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg></span>
          Kiezen{selCount > 0 && <span className="pip">{selCount}</span>}
        </button>
        <button className={"bd-tab" + (tab === "winkel" ? " on" : "")} onClick={() => setTab("winkel")}>
          <span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h3l2.5 11h11L21 7H6" /><circle cx="9" cy="19" r="1.4" /><circle cx="18" cy="19" r="1.4" /></svg></span>
          Winkel{todo.length > 0 && <span className="pip">{todo.length}</span>}
        </button>
        <button className={"bd-tab" + (tab === "cijfers" ? " on" : "")} onClick={() => setTab("cijfers")}>
          <span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 20V10M12 20V4M19 20v-7" /></svg></span>
          Cijfers
        </button>
        <button className={"bd-tab" + (tab === "beheer" ? " on" : "")} onClick={() => setTab("beheer")}>
          <span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg></span>
          Beheer
        </button>
      </nav>
    </div>
  );
}
