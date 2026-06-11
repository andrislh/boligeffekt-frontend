import React, { useState, useEffect } from "react";
import { track } from "@vercel/analytics";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";
const PAKKE = { navn: "Komplett rapport", pris: 399, beløp: 39900 };
const FREE_MODE = process.env.REACT_APP_FREE_MODE === "true";

// ─────────────────────────────────────────────
// BEREGNINGSDATA
// ─────────────────────────────────────────────
const BYGGEÅR_DATA = [
  { fra: 0,    til: 1949, label: "Før 1950",           u_vegg: 0.90, u_tak: 0.50, u_gulv: 0.60, u_vindu: 2.80, lufttetthet: 4.0 },
  { fra: 1950, til: 1969, label: "1950–1969",          u_vegg: 0.75, u_tak: 0.40, u_gulv: 0.50, u_vindu: 2.60, lufttetthet: 3.5 },
  { fra: 1970, til: 1986, label: "1970–1986",          u_vegg: 0.45, u_tak: 0.25, u_gulv: 0.35, u_vindu: 2.40, lufttetthet: 3.0 },
  { fra: 1987, til: 1997, label: "1987–1997",          u_vegg: 0.30, u_tak: 0.20, u_gulv: 0.25, u_vindu: 2.00, lufttetthet: 2.5 },
  { fra: 1998, til: 2007, label: "1998–2007",          u_vegg: 0.22, u_tak: 0.15, u_gulv: 0.18, u_vindu: 1.60, lufttetthet: 2.0 },
  { fra: 2008, til: 2017, label: "2008–2017 (TEK10)",  u_vegg: 0.18, u_tak: 0.13, u_gulv: 0.15, u_vindu: 1.40, lufttetthet: 1.5 },
  { fra: 2018, til: 9999, label: "Etter 2017 (TEK17)", u_vegg: 0.15, u_tak: 0.10, u_gulv: 0.10, u_vindu: 1.20, lufttetthet: 0.6 },
];
const KLIMASONER = [
  { id: "1", label: "Sørvestlandet (Stavanger, Bergen)", HDD: 3000, korreksjon: 0.85 },
  { id: "2", label: "Sørlandet / Østlandet lavland",     HDD: 3500, korreksjon: 0.92 },
  { id: "3", label: "Oslo / Innlandet",                  HDD: 4000, korreksjon: 1.00 },
  { id: "4", label: "Trøndelag / Vestlandet nord",       HDD: 4500, korreksjon: 1.10 },
  { id: "5", label: "Nord-Norge / Fjellområder",         HDD: 5500, korreksjon: 1.30 },
];
// faktor = andel av klimaskjermen som er eksponert (leiligheter/rekkehus deler
// vegger/tak/gulv med naboer) – brukes på transmisjonstapet
const BOLIGTYPER = [
  { id: "leilighet", label: "Leilighet",               faktor: 0.55, ikon: "🏢" },
  { id: "rekkehus",  label: "Rekkehus / Tomannsbolig", faktor: 0.78, ikon: "🏘️" },
  { id: "enebolig",  label: "Enebolig",                faktor: 1.00, ikon: "🏡" },
  { id: "hytte",     label: "Hytte / Fritidsbolig",    faktor: 1.05, ikon: "🏕️" },
];
// Kilde: Enova august 2025 / SSB Q3 2025
// SPF = Seasonal Performance Factor (reell, ikke lab-COP)
const OPPVARMING_DATA = {
  direkte_el:    { label: "Panelovner / direktevarme", COP: 1.0,  primær: 2.0,  ikon: "🔌" },
  varmepumpe_ll: { label: "Luft/luft-varmepumpe",     COP: 2.5,  primær: 0.80, ikon: "🌡️" }, // SPF 2,5 – dekningsgrad 60 % – ingen Enova-støtte fra aug 2025
  varmepumpe_lv: { label: "Luft/vann-varmepumpe",     COP: 2.8,  primær: 0.71, ikon: "💧" }, // SPF 2,8 – dekningsgrad 70 %
  fjernvarme:    { label: "Fjernvarme",                COP: 1.0,  primær: 0.80, ikon: "🌐" },
  ved_pellets:   { label: "Ved / pellets",             COP: 0.75, primær: 0.60, ikon: "🪵" },
  olje_gass:     { label: "Olje / gass",               COP: 0.85, primær: 1.40, ikon: "⚠️" }, // virkningsgrad 85 %
  gulvvarme_el:  { label: "Elektrisk gulvvarme",       COP: 1.0,  primær: 2.0,  ikon: "🔆" },
  biokjel:       { label: "Biokjel / pelletsovn",      COP: 0.85, primær: 0.5,  ikon: "🌿" },
};
// Kilde: SSB Q3 2025 – kr/kWh levert energi (inkl. nettleie, avgifter, mva)
// For varmepumper: effektiv kostnad = strømpris / SPF × dekningsgrad + strømpris × (1-dekningsgrad)
const ENERGIKOST = {
  direkte_el:    1.40, // 1,40 kr/kWh strøm
  varmepumpe_ll: 0.98, // 1,40/2,5×0,6 + 1,40×0,4 = 0,336 + 0,56 = 0,896 → avrundet 0,98 inkl. udekkede andeler
  varmepumpe_lv: 0.85, // 1,40/2,8×0,7 + 1,40×0,3 = 0,35 + 0,42 = 0,77 → avrundet 0,85
  fjernvarme:    1.10, // 1,10 kr/kWh fjernvarme
  ved_pellets:   0.85, // 0,85 kr/kWh biofyring/pellets
  olje_gass:     1.20, // 11 kr/liter ÷ 10 kWh/liter × 1/0,85 virkningsgrad ≈ 1,29 → rundet 1,20 kr/kWh
  gulvvarme_el:  1.40, // 1,40 kr/kWh strøm
  biokjel:       0.85, // 0,85 kr/kWh biofyring/pellets
};
const OPPVARMING_VALG = [
  { label: "Panelovner / direktevarme", verdi: "direkte_el",    ikon: "🔌" },
  { label: "Luft/luft-varmepumpe",     verdi: "varmepumpe_ll", ikon: "🌡️" },
  { label: "Luft/vann-varmepumpe",     verdi: "varmepumpe_lv", ikon: "💧" },
  { label: "Fjernvarme",               verdi: "fjernvarme",    ikon: "🌐" },
  { label: "Ved / pellets",            verdi: "ved_pellets",   ikon: "🪵" },
  { label: "Olje / gass",              verdi: "olje_gass",     ikon: "⚠️" },
  { label: "Elektrisk gulvvarme",      verdi: "gulvvarme_el",  ikon: "🔆" },
  { label: "Biokjel / pelletsovn",     verdi: "biokjel",       ikon: "🌿" },
];
// Farger/etiketter per karakter. NB: karaktergrensene er IKKE faste – de er
// arealavhengige (se karakterGrenser under). Kilde: Enova/NVE § 10b.
const ENERGIMERKER = [
  { merke: "A", farge: "#00a651", tekst: "#fff", epbd: "Svært energieffektiv" },
  { merke: "B", farge: "#57b946", tekst: "#fff", epbd: "TEK17-nivå" },
  { merke: "C", farge: "#b5d334", tekst: "#333", epbd: "Over middels" },
  { merke: "D", farge: "#ffd200", tekst: "#333", epbd: "Middels" },
  { merke: "E", farge: "#f7941d", tekst: "#fff", epbd: "Under middels" },
  { merke: "F", farge: "#ed1c24", tekst: "#fff", epbd: "Dårlig" },
  { merke: "G", farge: "#9e1a20", tekst: "#fff", epbd: "Svært dårlig" },
];

// Offisiell karakterskala for småhus/leiligheter: grensene avhenger av
// oppvarmet BRA. Kilde: Enova karakterskala / energimerkeforskriften § 10b.
function karakterGrenser(BRA) {
  const a = Math.max(BRA || 100, 30);
  return [
    { merke: "A", maks: 95  + 800  / a },
    { merke: "B", maks: 120 + 1600 / a },
    { merke: "C", maks: 145 + 2500 / a },
    { merke: "D", maks: 175 + 4100 / a },
    { merke: "E", maks: 205 + 5800 / a },
    { merke: "F", maks: 250 + 8000 / a },
    { merke: "G", maks: Infinity },
  ];
}
function karakterFor(kwhPerM2, BRA) {
  const g = karakterGrenser(BRA).find(x => kwhPerM2 <= x.maks);
  return ENERGIMERKER.find(e => e.merke === (g ? g.merke : "G")) || ENERGIMERKER[6];
}
// Kilde: Enova august 2025 – satser gjelder helårsboliger med byggesøknad FØR 1997 (vinduer/isolering)
// Maks totalt 100 000 kr per bolig i perioden 2025–2028. Søk FØR oppstart.
// MERK: Luft/luft-varmepumpe har INGEN Enova-støtte fra august 2025.
const TILTAK = [
  { id: "isolering_loft",   navn: "Etterisolering loft/tak",             ikon: "🏠", støtte_min: 5000,  støtte_max: 22500, kostnad_min: 30000,  kostnad_max: 100000, kWh_pct: 0.18, krever_ikke: [],                              passer_for: ["enebolig","rekkehus","hytte"], enova_program: "Tilskudd til energitiltak i bolig",  beskrivelse: "25 % av kostnad, maks 150 kr/kvm opp til 150 kvm. Varme stiger – loft er ofte det mest kostnadseffektive tiltaket. Kun boliger med byggesøknad før 1. juli 1997.", prioritet_terskel: 25, kategori: "enova_kvalifisert" },
  { id: "varmepumpe_lv",    navn: "Luft/vann-varmepumpe",                ikon: "💧", støtte_min: 5000,  støtte_max: 20000, kostnad_min: 60000,  kostnad_max: 120000, kWh_pct: 0.45, krever_ikke: ["varmepumpe_ll","varmepumpe_lv"], passer_for: ["enebolig","rekkehus"],          enova_program: "Tilskudd til luft-til-vann varmepumpe", beskrivelse: "SPF 2,8 – dekker 70 % av varmebehovet. 25 % av kostnad, maks 20 000 kr. Krever vannbåren distribusjon.", prioritet_terskel: 18, kategori: "enova_kvalifisert" },
  { id: "ventilasjon",      navn: "Balansert ventilasjon m/gjenvinning", ikon: "💨", støtte_min: 5000,  støtte_max: 15000, kostnad_min: 60000,  kostnad_max: 100000, kWh_pct: 0.20, krever_ikke: [],                              passer_for: ["alle"],                        enova_program: "Tilskudd til energitiltak i bolig",  beskrivelse: "25 % av kostnad, maks 15 000 kr. Gjenvinning av varme fra avtrekksluft + bedre luftkvalitet.", prioritet_terskel: 20, kategori: "enova_kvalifisert" },
  { id: "vinduer",          navn: "Vindusutskifting (3-lags)",           ikon: "🪟", støtte_min: 2000,  støtte_max: 20000, kostnad_min: 60000,  kostnad_max: 100000, kWh_pct: 0.15, krever_ikke: [],                              passer_for: ["alle"],                        enova_program: "Tilskudd til energitiltak i bolig",  beskrivelse: "25 % av kostnad, maks 400 kr/kvm opp til 50 kvm (maks 20 000 kr). U-verdi ned til 0,7 W/m²K. Kun boliger med byggesøknad før 1. juli 1997.", prioritet_terskel: 22, kategori: "enova_kvalifisert" },
  { id: "ytterdører",       navn: "Utskifting ytterdører",               ikon: "🚪", støtte_min: 2000,  støtte_max: 8000,  kostnad_min: 15000,  kostnad_max: 35000,  kWh_pct: 0.03, krever_ikke: [],                              passer_for: ["enebolig","rekkehus","hytte"], enova_program: "Tilskudd til energitiltak i bolig",  beskrivelse: "Energieffektive ytterdører med U-verdi ≤ 1,2 W/m²K. 25 % av kostnad, maks 400 kr/kvm. Kun boliger med byggesøknad før 1. juli 1997. Lav effekt isolert, men reduserer luftlekkasjer og hever totalkomforten.", prioritet_terskel: 28, kategori: "enova_kvalifisert" },
  { id: "isolering_vegger", navn: "Etterisolering yttervegger",          ikon: "🧱", støtte_min: 5000,  støtte_max: 37500, kostnad_min: 80000,  kostnad_max: 150000, kWh_pct: 0.22, krever_ikke: [],                              passer_for: ["enebolig","rekkehus","hytte"], enova_program: "Tilskudd til energitiltak i bolig",  beskrivelse: "25 % av kostnad, maks 150 kr/kvm opp til 250 kvm (maks 37 500 kr). Best ved fasaderehab. Kun boliger med byggesøknad før 1. juli 1997.", prioritet_terskel: 30, kategori: "enova_kvalifisert" },
  { id: "solceller",        navn: "Solcelleanlegg",                      ikon: "☀️", støtte_min: 10000, støtte_max: 37500, kostnad_min: 70000,  kostnad_max: 100000, kWh_pct: 0.0, krever_ikke: [],                              passer_for: ["enebolig","rekkehus","hytte"], enova_program: "Tilskudd til solcelleanlegg – 2 500 kr/kW, maks 15 kW", beskrivelse: "2 500 kr/kW installert effekt, maks 15 kW (maks 37 500 kr). Typisk produksjon 850 kWh/kWp/år. NB: solceller reduserer strømregningen, men påvirker i liten grad energimerket.", prioritet_terskel: 25, min_areal: 100, kategori: "enova_kvalifisert" },
  { id: "bergvarme",        navn: "Bergvarme (væske-til-vann)",          ikon: "⛏️", støtte_min: 10000, støtte_max: 40000, kostnad_min: 100000, kostnad_max: 200000, kWh_pct: 0.60, krever_ikke: ["varmepumpe_ll","varmepumpe_lv"], passer_for: ["enebolig","rekkehus"],          enova_program: "Tilskudd til væske-til-vann varmepumpe", beskrivelse: "SPF 3,5 – dekker 95 % av varmebehovet. 25 % av kostnad, maks 40 000 kr. Best langsiktig investering.", prioritet_terskel: 30, kategori: "enova_kvalifisert" },
  { id: "varmepumpe_ll",    navn: "Luft/luft-varmepumpe",                ikon: "🌡️", støtte_min: 0,     støtte_max: 0,     kostnad_min: 15000,  kostnad_max: 25000,  kWh_pct: 0.36, krever_ikke: ["varmepumpe_ll","varmepumpe_lv"], passer_for: ["alle"],                        enova_program: "Ingen Enova-støtte",               beskrivelse: "SPF 2,5, dekker 60 % av varmebehovet. Ingen Enova-støtte fra august 2025. Rask tilbakebetaling pga lav kostnad.", prioritet_terskel: 8, kategori: "egenfinansiert", enova_status_tekst: "Ikke Enova-støttet etter august 2025" },
  { id: "smart_styring",    navn: "Smart styring og soneregulering",     ikon: "📱", støtte_min: 0,     støtte_max: 0,     kostnad_min: 3000,   kostnad_max: 15000,  kWh_pct: 0.10, krever_ikke: [],                              passer_for: ["alle"],                        enova_program: "Ingen Enova-støtte",                                   beskrivelse: "Programmerbare termostater, soneregulering og natt-/dagsenking. Reduserer oppvarmingsbehovet uten å redusere komfort. Lav investering med rask tilbakebetaling.", prioritet_terskel: 10, kategori: "egenfinansiert", enova_status_tekst: "Ingen Enova-støtte" },
  { id: "tetting",          navn: "Tettelister og fuging",               ikon: "🔧", støtte_min: 0,     støtte_max: 0,     kostnad_min: 2000,   kostnad_max: 8000,   kWh_pct: 0.07, krever_ikke: [],                              passer_for: ["alle"],                        enova_program: "Ingen Enova-støtte (grunntiltak)",                      beskrivelse: "Tette rundt vinduer, dører og gjennomføringer med tettelister, bunnsverd og fugemasse. Billigste tiltak med raskest tilbakebetaling. Anbefales alltid som første steg.", prioritet_terskel: 7, kategori: "egenfinansiert", enova_status_tekst: "Grunntiltak uten Enova-støtte" },
];

// ─────────────────────────────────────────────
// BEREGNING
// ─────────────────────────────────────────────
// ── Beregningskonstanter (forenklet NS 3031-metodikk) ──
const HDD_NORM    = 4100; // normert klima (Oslo) – karakteren beregnes alltid med dette
const FAST_EL     = 29;   // lys + utstyr, kWh/m²/år (NS 3031 normtall)
const TAPPEVANN   = 30;   // varmt tappevann netto, kWh/m²/år (NS 3031: 29,8)
const GRATISVARME = 25;   // utnyttet sol- og internvarme, kWh/m²/år

function kuldebro(byggeår) { return byggeår < 1998 ? 0.10 : byggeår < 2008 ? 0.08 : byggeår < 2018 ? 0.06 : 0.05; }

// Systemfaktor: levert energi per kWh netto varmebehov (dekningsgrad/SPF innbakt)
const SYSTEMFAKTOR = {
  direkte_el:    { romoppv: 1.00, tappevann: 1.00 },
  varmepumpe_ll: { romoppv: 0.64, tappevann: 1.00 }, // 60 % dekning, SPF 2,5
  varmepumpe_lv: { romoppv: 0.55, tappevann: 0.55 }, // 70 % dekning, SPF 2,8 – dekker også tappevann
  fjernvarme:    { romoppv: 1.00, tappevann: 1.00 },
  ved_pellets:   { romoppv: 1.33, tappevann: 1.00 }, // virkningsgrad 75 %
  olje_gass:     { romoppv: 1.18, tappevann: 1.00 }, // virkningsgrad 85 %
  gulvvarme_el:  { romoppv: 1.00, tappevann: 1.00 },
  biokjel:       { romoppv: 1.18, tappevann: 1.00 },
};

function beregnEnergi(input) {
  const { areal, byggeår, oppvarming, boligtype, klimasone, isolering_nivå, vinduer_type, antall_etasjer } = input;
  const bygData = BYGGEÅR_DATA.find(b => byggeår >= b.fra && byggeår <= b.til) || BYGGEÅR_DATA[0];
  const klima   = KLIMASONER.find(k => k.id === klimasone) || KLIMASONER[2];
  const bolig   = BOLIGTYPER.find(b => b.id === boligtype) || BOLIGTYPER[2];

  // ── Oppvarmingssystem: systemfaktor = levert energi per kWh netto behov ──
  let oppvData, weightedCost, fRom, fVann;
  if (Array.isArray(oppvarming)) {
    fRom   = oppvarming.reduce((sum, k) => sum + (SYSTEMFAKTOR[k.kilde]?.romoppv   ?? 1.0) * k.andel, 0);
    fVann  = oppvarming.reduce((sum, k) => sum + (SYSTEMFAKTOR[k.kilde]?.tappevann ?? 1.0) * k.andel, 0);
    const wCOP    = oppvarming.reduce((sum, k) => sum + (OPPVARMING_DATA[k.kilde]?.COP    || 1.0) * k.andel, 0);
    const wPrimær = oppvarming.reduce((sum, k) => sum + (OPPVARMING_DATA[k.kilde]?.primær || 2.0) * k.andel, 0);
    oppvData     = { label: oppvarming.map(k => OPPVARMING_DATA[k.kilde]?.label || k.kilde).join(" + "), COP: wCOP, primær: wPrimær, ikon: OPPVARMING_DATA[oppvarming[0].kilde]?.ikon || "🏠" };
    weightedCost = oppvarming.reduce((sum, k) => sum + (ENERGIKOST[k.kilde] || 1.40) * k.andel, 0);
  } else {
    const sf     = SYSTEMFAKTOR[oppvarming] || SYSTEMFAKTOR.direkte_el;
    fRom = sf.romoppv; fVann = sf.tappevann;
    oppvData     = OPPVARMING_DATA[oppvarming] || OPPVARMING_DATA.direkte_el;
    weightedCost = ENERGIKOST[oppvarming] || 1.40; // Kilde: SSB – kr/kWh inkl. nettleie og avgifter
  }

  // ── U-verdier justert for oppgitt standard ──
  let u_vegg = bygData.u_vegg, u_tak = bygData.u_tak, lufttetthet = bygData.lufttetthet;
  let u_vindu = vinduer_type === "trippel" ? 0.9 : vinduer_type === "dobbel" ? 1.8 : bygData.u_vindu;
  if (isolering_nivå === "oppgradert") { u_vegg *= 0.75; u_tak *= 0.75; lufttetthet *= 0.75; }
  if (isolering_nivå === "dårlig")     { u_vegg *= 1.20; u_tak *= 1.15; lufttetthet *= 1.20; }

  // ── Geometri: fotavtrykk = areal per etasje (før: hele arealet per etasje → 41 % for mye vegg) ──
  const etg        = Math.max(1, Number(antall_etasjer) || 1);
  const fotavtrykk = areal / etg;
  const side       = Math.sqrt(fotavtrykk);
  const A_vindu    = 0.20 * areal;                                   // NS 3031-sjablong: 20 % av BRA
  const A_vegg     = Math.max(4 * side * 2.7 * etg - A_vindu, 0);

  // ── Transmisjonstap (W/K) inkl. kuldebroer; boligfaktor for delte flater ──
  const HT = (u_vegg * A_vegg + u_tak * fotavtrykk + bygData.u_gulv * fotavtrykk
            + u_vindu * A_vindu + kuldebro(byggeår) * areal) * bolig.faktor;

  // ── Ventilasjon + infiltrasjon (W/K) ──
  // Infiltrasjon = n50 × 0,07 (NS-EN 12831-forenkling) – n50 er IKKE reell luftveksling.
  // Boliger fra 2008+ antas å ha balansert ventilasjon med 65 % varmegjenvinning.
  const balansert = byggeår >= 2008;
  const ach = (balansert ? 0.5 * 0.35 : 0.5) + lufttetthet * 0.07;
  const Hv  = ach * areal * 2.4 * 0.33;
  const H   = HT + Hv;

  // ── Netto romoppvarming per m² ──
  const nettoOppv = HDD => {
    const tap = H * HDD * 24 / 1000 / areal;
    return Math.max(tap - Math.min(GRATISVARME, 0.6 * tap), 10);
  };
  const vifter = balansert ? 6 : 0;

  // KARAKTER: normert Oslo-klima – slik det offisielle energimerket beregnes.
  // Klimasonen skal IKKE påvirke karakteren, kun kostnadsestimatet.
  const oppvLevert  = nettoOppv(HDD_NORM) * fRom;
  const fastLevert  = TAPPEVANN * fVann + FAST_EL + vifter;
  const Q_levert    = Math.round(oppvLevert + fastLevert);

  // FORBRUK/KOSTNAD: lokalt klima
  const oppvLevertLokal = nettoOppv(klima.HDD) * fRom;
  const totalKwh        = Math.round((oppvLevertLokal + fastLevert) * areal);
  const oppvarmingKwh   = Math.round(oppvLevertLokal * areal);

  const Q_primær = Math.round(Q_levert * oppvData.primær);
  const merkeObj = karakterFor(Q_levert, areal);
  // Potensial: alle anbefalte tiltak ≈ 55 % reduksjon av oppvarmingsdelen
  const merkePot = karakterFor(Math.round(oppvLevert * 0.45 + fastLevert), areal);

  return { kwhPerM2: Q_levert, primærPerM2: Q_primær, totalKwh, oppvarmingKwh, areal,
           oppvLevertPerM2: Math.round(oppvLevert), fastLevertPerM2: Math.round(fastLevert),
           merke: merkeObj, merkePotensial: merkePot, bygData, klima, bolig, oppvData,
           u_vegg, u_tak, u_vindu, lufttetthet, weightedCost,
           strømkostnad: Math.round(totalKwh * weightedCost) };
}
function beregnTiltak(resultat, input) {
  // Worse energy grade → more urgent → higher effective priority thresholds
  const gradeFaktor = { A: 0.6, B: 0.75, C: 0.9, D: 1.0, E: 1.4, F: 1.8, G: 2.2 }[resultat.merke.merke] || 1.0;

  const resultatListe = TILTAK.filter(t => {
    if (Array.isArray(input.oppvarming)) {
      if (t.krever_ikke.some(k => input.oppvarming.some(o => o.kilde === k))) return false;
    } else {
      if (t.krever_ikke.includes(input.oppvarming)) return false;
    }
    if (!t.passer_for.includes("alle") && !t.passer_for.includes(input.boligtype)) return false;
    if (t.min_areal && input.areal < t.min_areal) return false;
    // Only skip veggisolering for already efficient homes (A/B merke)
    if (t.id === "isolering_vegger" && resultat.kwhPerM2 < 100) return false;
    return true;
  }).map(t => {
    // ── Enova-regler (verifisert mot enova.no juni 2026) ──
    // 1. Fritidsboliger får IKKE Enova-støtte – kun helårsbolig med folkeregistrert adresse.
    // 2. Bygningskropp-tiltak (isolering/vinduer/dører) krever byggesøknad før 1. juli 1997.
    const byggeårNum = Number(input.byggeår) || 1978;
    const KREVER_FØR_1997 = ["isolering_loft", "isolering_vegger", "vinduer", "ytterdører"];
    let støtte_min = t.støtte_min, støtte_max = t.støtte_max, enovaMerknad = null;
    if (input.boligtype === "hytte" && støtte_max > 0) {
      støtte_min = 0; støtte_max = 0;
      enovaMerknad = "Enova støtter ikke fritidsboliger – kun helårsbolig";
    } else if (byggeårNum >= 1997 && KREVER_FØR_1997.includes(t.id) && støtte_max > 0) {
      støtte_min = 0; støtte_max = 0;
      enovaMerknad = "Enova-støtte gjelder kun boliger med byggesøknad før 1. juli 1997";
    }
    // ── Besparelse ──
    // kWh_pct er andel av OPPVARMINGSBEHOVET (ikke totalforbruket) tiltaket sparer.
    // Solceller: fast produksjon (850 kWh/kWp, typisk 7 kW anlegg), verdsatt til
    // ~0,90 kr/kWh (blanding av egetbruk og plusskundesalg).
    const besparelse_kr = t.id === "solceller"
      ? Math.round(7 * 850 * 0.90)
      : Math.round((resultat.oppvarmingKwh || 0) * t.kWh_pct * resultat.weightedCost);
    const støtte_snitt  = Math.round((støtte_min + støtte_max) / 2);
    const kostnad_snitt = Math.round((t.kostnad_min + t.kostnad_max) / 2);
    const netto         = kostnad_snitt - støtte_snitt;
    const tilbake       = besparelse_kr > 0 ? Math.round(netto / besparelse_kr) : 99;
    const effTerskel    = Math.round(t.prioritet_terskel * gradeFaktor);
    const prioritet     = tilbake <= effTerskel ? "høy" : tilbake <= effTerskel * 1.8 ? "middels" : "lav";
    return { ...t, støtte_min, støtte_max, enovaMerknad, besparelse_kr, støtte_snitt, kostnad_snitt, netto, tilbakebetaling: tilbake, prioritet };
  }).sort((a, b) => a.tilbakebetaling - b.tilbakebetaling);

  // Marker topp 3 som "anbefalt": balanserer kWh-besparelse (karakter + strøm)
  // mot tilbakebetalingstid (ROI). Brukes i UI - "Anbefalt"-badgen og som
  // standardvalg i OppgraderingsFlow. Begrens til maks én varmepumpe i topp 3
  // - du installerer ikke luft/luft + luft/vann + bergvarme samtidig.
  const score = t => (t.kWh_pct || 0) - (t.tilbakebetaling || 99) / 100;
  const erVarmepumpe = id => id === "varmepumpe_ll" || id === "varmepumpe_lv" || id === "bergvarme";
  const sortertScore = [...resultatListe].sort((a, b) => score(b) - score(a));
  const topp = [];
  let varmepumpeValgt = false;
  for (const t of sortertScore) {
    if (topp.length >= 3) break;
    if (erVarmepumpe(t.id)) {
      if (varmepumpeValgt) continue;
      varmepumpeValgt = true;
    }
    topp.push(t.id);
  }
  return resultatListe.map(t => ({ ...t, anbefalt: topp.includes(t.id) }));
}

// Session-lagring
function lagreData(data) { try { sessionStorage.setItem("be_data", JSON.stringify(data)); } catch(_){} }
function hentData()      { try { const r = sessionStorage.getItem("be_data"); return r ? JSON.parse(r) : null; } catch(_){ return null; } }
function lagId(input)    { return btoa(JSON.stringify(input)).slice(0, 40); }

// ─────────────────────────────────────────────
// STEG
// ─────────────────────────────────────────────
const STEG = [
  { id: "boligtype",    tittel: "Hva slags bolig har du?",      hint: "Påvirker varmetap og relevante tiltak",         valg: BOLIGTYPER.map(b => ({ label: b.label, verdi: b.id, ikon: b.ikon })) },
  { id: "byggeår",      tittel: "Når ble boligen bygget?",       hint: "Byggeår bestemmer isolasjonsstandard",
    valg: [{ label:"Før 1950",verdi:1940,ikon:"🏚️"},{label:"1950–1969",verdi:1960,ikon:"🏠"},{label:"1970–1986",verdi:1978,ikon:"🏡"},{label:"1987–2007",verdi:1995,ikon:"🏘️"},{label:"2008–2017",verdi:2012,ikon:"🏗️"},{label:"Etter 2017",verdi:2020,ikon:"✨"}] },
  { id: "areal",        tittel: "Hva er boligarealet?",          hint: "Oppvarmet bruksareal (BRA)",
    valg: [{label:"Under 50 m²",verdi:40,ikon:"📦"},{label:"50–80 m²",verdi:65,ikon:"🏠"},{label:"80–120 m²",verdi:100,ikon:"🏡"},{label:"120–180 m²",verdi:150,ikon:"🏘️"},{label:"180–250 m²",verdi:215,ikon:"🏰"},{label:"Over 250 m²",verdi:300,ikon:"🏯"}] },
  { id: "klimasone",    tittel: "Hvor i Norge bor du?",          hint: "Klimasonen påvirker energibehovet betydelig",    valg: KLIMASONER.map(k => ({ label: k.label.split("(")[0].trim(), verdi: k.id, ikon: "📍" })) },
  { id: "oppvarming",   tittel: "Hvordan varmer du opp boligen?", hint: "Velg opptil 3 oppvarmingskilder",              valg: OPPVARMING_VALG },
  { id: "vinduer_type", tittel: "Hva slags vinduer har du?",     hint: "Vinduer er en stor kilde til varmetap",
    valg: [{label:"Enkeltglass / eldre",verdi:"enkelt",ikon:"🥶"},{label:"2-lags isolerglass",verdi:"dobbel",ikon:"🪟"},{label:"3-lags / nye",verdi:"trippel",ikon:"✨"}] },
  { id: "adresse", tittel: "Boligens adresse (valgfritt)", hint: "Vises på rapporten - vi henter ingen data fra adressen", tekstfelt: true },
];

// ─────────────────────────────────────────────
// DESIGN
// ─────────────────────────────────────────────
const C = { bg:"#F4F0E8",white:"#FFFFFF",navy:"#1B3A5C",navyDark:"#0D2238",navyMid:"#1E4A73",green:"#2AB55A",greenLight:"#3ECF6E",muted:"#7A8899",border:"rgba(27,58,92,0.09)",section:"#F0EDE5",gold:"#F0900D" };
const S = {
  app:    { minHeight:"100vh", background:`linear-gradient(170deg,${C.bg} 0%,#E6F2EB 100%)`, fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif", paddingBottom:60 },
  header: { background:"rgba(255,255,255,0.94)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${C.border}`, padding:"14px 24px", display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:10, boxShadow:"0 1px 0 rgba(27,58,92,0.06)" },
  logo:   { fontFamily:"'Fraunces',Georgia,serif", fontWeight:700, fontSize:"1.3rem", color:C.navyDark, letterSpacing:"-0.02em" },
  wrap:   { maxWidth:640, margin:"0 auto", padding:"28px 18px" },
  card:   { background:C.white, borderRadius:22, padding:"28px 24px", boxShadow:"0 2px 8px rgba(13,34,56,0.05), 0 8px 32px rgba(13,34,56,0.08)", border:`1px solid ${C.border}`, marginBottom:16 },
  tag:    { fontSize:"0.7rem", fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase", color:C.green, marginBottom:8 },
  h1:     { fontFamily:"'Fraunces',Georgia,serif", fontWeight:700, fontSize:"clamp(1.75rem,5vw,2.5rem)", color:C.navyDark, lineHeight:1.1, marginBottom:12 },
  h2:     { fontFamily:"'Fraunces',Georgia,serif", fontWeight:600, fontSize:"1.25rem", color:C.navyDark, marginBottom:8 },
  sub:    { fontSize:"0.88rem", color:C.muted, lineHeight:1.65 },
  prog:   { height:4, background:"rgba(27,58,92,0.10)", borderRadius:100, marginBottom:32, overflow:"hidden" },
  fill:   w => ({ height:"100%", background:`linear-gradient(90deg,${C.green},${C.greenLight})`, borderRadius:100, width:`${w}%`, transition:"width .5s cubic-bezier(.4,0,.2,1)" }),
  grid:   { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(148px,1fr))", gap:10 },
  btn:    sel => ({ position:"relative", background:sel?`linear-gradient(135deg,${C.navy},${C.navyMid})`:C.white, color:sel?C.white:C.navyDark, border:sel?`2px solid transparent`:`2px solid ${C.border}`, borderRadius:16, padding:"18px 12px", cursor:"pointer", fontWeight:600, fontSize:"0.86rem", textAlign:"center", boxShadow:sel?"0 4px 16px rgba(27,58,92,0.25)":"0 1px 4px rgba(0,0,0,0.04)" }),
  ikon:   { fontSize:"1.8rem", display:"block", marginBottom:8 },
  btnP:   { width:"100%", padding:"16px", background:`linear-gradient(135deg,${C.navy},${C.navyMid})`, color:C.white, border:"none", borderRadius:14, fontSize:"1rem", fontWeight:700, cursor:"pointer", boxShadow:"0 4px 20px rgba(27,58,92,0.28)", marginTop:8, letterSpacing:"-0.01em" },
  btnG:   { background:"transparent", border:`1.5px solid ${C.border}`, borderRadius:10, padding:"9px 18px", fontSize:"0.84rem", fontWeight:600, color:C.navy, cursor:"pointer" },
  lbl:    { display:"block", fontSize:"0.78rem", fontWeight:700, color:C.navy, marginBottom:6, letterSpacing:"0.01em" },
  // NB: fontSize må være ≥ 1rem (16px) – ellers auto-zoomer iOS Safari inn på feltet ved fokus (kjent mobil-bug)
  inp:    { width:"100%", padding:"12px 14px", borderRadius:11, border:`1.5px solid rgba(27,58,92,0.14)`, fontSize:"1rem", color:C.navyDark, background:"#FAFAF8", outline:"none", boxSizing:"border-box" },
  sel:    { width:"100%", padding:"12px 14px", borderRadius:11, border:`1.5px solid rgba(27,58,92,0.14)`, fontSize:"1rem", color:C.navyDark, background:"#FAFAF8", outline:"none", boxSizing:"border-box" },
};

function Header({ onBack, onHome }) {
  return (
    <div style={S.header}>
      <div onClick={onHome} style={{display:"flex",alignItems:"center",gap:11,cursor:onHome?"pointer":"default",textDecoration:"none"}}>
        <img src="/logo.png" alt="BoligEffekt" style={{height:"34px",width:"34px",objectFit:"contain",borderRadius:8}}/>
        <span style={S.logo}>BoligEffekt</span>
      </div>
      {onBack && (
        <button className="be-btn-g" onClick={onBack} style={{...S.btnG,marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:"0.9rem"}}>←</span> Tilbake
        </button>
      )}
    </div>
  );
}
function Merke({ m, stor, reveal }) {
  const sz = stor ? 80 : 58;
  return (
    <div className={`be-merke${reveal?" be-grade-reveal":""}`} style={{width:sz,height:sz,borderRadius:stor?22:15,background:m.farge,color:m.tekst,display:"flex",alignItems:"center",justifyContent:"center",fontSize:stor?"2.8rem":"1.9rem",fontWeight:900,fontFamily:"'Fraunces',Georgia,serif",boxShadow:`0 8px 28px ${m.farge}70, 0 2px 8px ${m.farge}40`,flexShrink:0,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(255,255,255,0.22) 0%,transparent 55%)",borderRadius:"inherit",pointerEvents:"none"}}/>
      {m.merke}
    </div>
  );
}
function Skala({ merke }) {
  return (
    <div>
      {ENERGIMERKER.map(em => {
        const isActive = em.merke === merke.merke;
        return (
          <div key={em.merke} style={{display:"flex",alignItems:"center",gap:10,marginBottom:isActive?8:5}}>
            <div style={{width:24,height:24,borderRadius:7,background:em.farge,color:em.tekst,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"0.78rem",flexShrink:0,opacity:isActive?1:0.38,transition:"opacity .3s",boxShadow:isActive?`0 3px 10px ${em.farge}70`:"none"}}>{em.merke}</div>
            <div style={{flex:1,height:isActive?9:6,background:"#E8E4DA",borderRadius:100,overflow:"hidden",transition:"height .3s ease"}}>
              <div style={{height:"100%",background:em.farge,borderRadius:100,width:isActive?"100%":"10%",opacity:isActive?1:0.22,transition:"width .6s cubic-bezier(.4,0,.2,1)"}}/>
            </div>
            {isActive && <span style={{fontSize:"0.7rem",fontWeight:800,color:em.farge,whiteSpace:"nowrap",letterSpacing:"0.01em"}}>← din bolig</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// BETALINGSMUR
// ─────────────────────────────────────────────
function Betalingsmur({ resultat, input, onBetalt, onNullstill }) {
  const [epost, setEpost]       = useState("");
  const [laster, setLaster]     = useState(false);
  const [feil, setFeil]         = useState("");
  const [delKopiert, setDelKopiert] = useState(false);
  const [fangetSendt, setFangetSendt]   = useState(false);
  const [fangetLaster, setFangetLaster] = useState(false);
  const [fangetFeil, setFangetFeil]     = useState("");
  const { merke, kwhPerM2, tiltak } = resultat;
  const høy = tiltak.filter(t => t.prioritet === "høy");

  useEffect(() => {
    track("paywall_viewed", { grade: merke.merke });
  }, [merke.merke]);

  async function betal() {
    if (!epost.includes("@")) { setFeil("Skriv inn en gyldig e-postadresse"); return; }
    setFeil(""); setLaster(true);
    const resultatId = lagId(input);
    lagreData({ resultat, input, epost, pakke: "oppgraderingsplan" });
    track("checkout_started");
    try {
      const res  = await fetch(`${BACKEND}/api/create-checkout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultatId, email: epost, resultatData: { resultat, input }, pakke: "oppgraderingsplan" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { setFeil("Noe gikk galt – prøv igjen."); setLaster(false); }
    } catch(_) {
      // VIKTIG: Tidligere låste denne opp rapporten gratis ved nettverksfeil (onBetalt).
      // Nå vises feilmelding i stedet – betaling skal aldri kunne omgås ved feil.
      setFeil("Kunne ikke kontakte betalingstjenesten. Sjekk nettforbindelsen og prøv igjen.");
      setLaster(false);
    }
  }

  // E-postfangst: fanger leads som ikke kjøper med en gang, og sender dem et
  // gratis sammendrag av energimerket. Verdifullt fordi ~95 % ikke kjøper umiddelbart.
  async function fangEpost() {
    if (!epost.includes("@")) { setFangetFeil("Skriv inn en gyldig e-postadresse"); return; }
    setFangetFeil(""); setFangetLaster(true);
    track("lead_captured", { grade: merke.merke });
    try {
      await fetch(`${BACKEND}/api/capture-lead`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epost, merke: merke.merke, kwhPerM2, tiltak: høy.slice(0, 3).map(t => t.navn), kilde: "betalingsmur" }),
      });
      setFangetSendt(true);
    } catch(_) {
      setFangetFeil("Kunne ikke sende akkurat nå – prøv igjen.");
    }
    setFangetLaster(false);
  }

  return (
    <div style={S.app}>
      <Header onHome={onNullstill}/>
      <div style={S.wrap}>
        {/* Gratis – energimerke */}
        <div className="be-in" style={{...S.card,background:`linear-gradient(150deg,${merke.farge}14 0%,${C.white} 55%)`,border:`1.5px solid ${merke.farge}35`}}>
          <div className="be-merke-row" style={{display:"flex",alignItems:"center",gap:20,marginBottom:22}}>
            <Merke m={merke} stor reveal/>
            <div>
              <div style={S.tag}>Estimert energimerke</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.8rem",color:C.navyDark,lineHeight:1}}>Merke {merke.merke}</div>
              <div style={{fontSize:"0.83rem",color:C.muted,marginTop:6}}>{kwhPerM2} kWh/m²/år · {merke.epbd}</div>
            </div>
          </div>
          <Skala merke={merke}/>
          <div style={{fontSize:"0.7rem",color:C.muted,marginTop:12,lineHeight:1.5}}>
            Estimat med normert Oslo-klima og Enovas arealavhengige karakterskala – ikke offisiell energiattest.
          </div>
        </div>

        {/* Personlig forhåndsvisning: ekte tiltaksnavn for boligen, men tallene
            (kr spart, Enova-støtte, tilbakebetaling) er låst – det er den betalte verdien.
            Mer overbevisende enn ren blur fordi den viser at analysen er relevant for nettopp deg. */}
        <div className="be-in-1" style={{...S.card,marginBottom:16,border:`1.5px solid ${C.green}30`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,color:C.navyDark}}>Tiltak vi fant for din bolig</div>
            <span style={{fontSize:"0.72rem",fontWeight:700,color:C.green,background:`${C.green}14`,borderRadius:100,padding:"3px 10px"}}>{tiltak.length} totalt</span>
          </div>
          {tiltak.slice(0,3).map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,background:C.section,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
              <span style={{fontSize:"1.3rem",flexShrink:0}}>{t.ikon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:"0.9rem",color:C.navyDark,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.navn}</div>
                <div style={{display:"flex",gap:6,marginTop:5,alignItems:"center"}}>
                  <span style={{fontSize:"0.7rem",color:C.muted}}>Sparer</span>
                  <span style={{height:9,width:48,background:"repeating-linear-gradient(90deg,#D8D4CC 0 6px,transparent 6px 9px)",borderRadius:4}}/>
                  <span style={{fontSize:"0.7rem",color:C.muted}}>kr/år · Enova</span>
                  <span style={{height:9,width:36,background:"repeating-linear-gradient(90deg,#D8D4CC 0 6px,transparent 6px 9px)",borderRadius:4}}/>
                </div>
              </div>
              <span style={{fontSize:"0.95rem",opacity:0.45}}>🔒</span>
            </div>
          ))}
          {tiltak.length>3 && <div style={{fontSize:"0.78rem",color:C.muted,textAlign:"center",marginTop:4}}>+ {tiltak.length-3} flere tiltak, alle med tall, i rapporten</div>}
        </div>

        {/* Del resultatet */}
        <div className="be-in-2" style={{textAlign:"center",marginBottom:16}}>
          <button className="be-btn-g"
            onClick={() => navigator.clipboard.writeText("Sjekk energimerket på din bolig: https://boligeffekt.no").then(() => { setDelKopiert(true); setTimeout(() => setDelKopiert(false), 2000); })}
            style={{...S.btnG,display:"inline-flex",alignItems:"center",gap:8}}
          >
            {delKopiert ? "✓ Lenke kopiert!" : "🔗 Del resultatet"}
          </button>
        </div>

        {/* Betalingskort */}
        <div className="be-in-3" style={{...S.card,border:`1.5px solid rgba(27,58,92,0.12)`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.1rem",color:C.navyDark}}>{PAKKE.navn}</div>
              <div style={{fontSize:"0.8rem",color:C.muted,marginTop:2}}>Engangskjøp · Ingen abonnement</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:900,fontSize:"1.9rem",color:C.navyDark,lineHeight:1}}>{PAKKE.pris} kr</div>
              <div style={{fontSize:"0.7rem",color:C.muted,marginTop:2}}>inkl. mva</div>
            </div>
          </div>
          {/* Dette får du – konkret verdi (ærlig alternativ til kundesitater) */}
          <div style={{marginBottom:16}}>
            {["Energimerke A–G med forklaring","Alle lønnsomme tiltak rangert etter tilbakebetaling","Enova-støtte beregnet per tiltak","Estimert besparelse i kroner per år","Komplett rapport som PDF på e-post"].map(t=>(
              <div key={t} style={{display:"flex",alignItems:"flex-start",gap:9,marginBottom:7}}>
                <span style={{color:C.green,fontWeight:900,flexShrink:0,marginTop:1}}>✓</span>
                <span style={{fontSize:"0.84rem",color:C.navyDark,lineHeight:1.4}}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{marginBottom:14}}>
            <label style={S.lbl}>E-postadresse <span style={{color:C.muted,fontWeight:400}}>(rapport sendes automatisk)</span></label>
            <input className="be-input" style={S.inp} type="email" placeholder="navn@epost.no" value={epost}
              onChange={e=>setEpost(e.target.value)} onKeyDown={e=>e.key==="Enter"&&betal()}/>
            {feil && <div style={{color:"#DC2626",fontSize:"0.8rem",marginTop:6,display:"flex",alignItems:"center",gap:4}}><span>⚠</span>{feil}</div>}
          </div>
          <div style={{background:C.section,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:"0.78rem",color:C.muted,lineHeight:1.55,textAlign:"center"}}>
            En offisiell energirådgiver koster <strong style={{color:C.navyDark}}>9 000–20 000 kr</strong>. Få et detaljert energiestimat med tiltaksplan for <strong style={{color:C.navyDark}}>399 kr</strong>.
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:16,marginBottom:12}}>
            {[{i:"💳",t:"Kortbetaling"},{i:"🔒",t:"Stripe"},{i:"📄",t:"PDF på e-post"}].map(x=>(
              <span key={x.t} style={{display:"flex",alignItems:"center",gap:4,fontSize:"0.72rem",color:C.muted}}><span>{x.i}</span>{x.t}</span>
            ))}
          </div>
          <button className="be-btn-p" style={{...S.btnP,background:`linear-gradient(135deg,${C.green},${C.greenLight})`,boxShadow:`0 6px 24px ${C.green}50`}} onClick={betal} disabled={laster}>
            {laster ? "Sender til betaling…" : `Kjøp ${PAKKE.navn} – ${PAKKE.pris} kr →`}
          </button>
        </div>
        <p style={{textAlign:"center",fontSize:"0.7rem",color:"#bbb",lineHeight:1.6}}>Betaling håndteres av Stripe. BoligEffekt lagrer ikke kortinformasjon.</p>

        {/* E-postfangst – lavterskel for de som ikke kjøper med en gang */}
        <div className="be-in-4" style={{...S.card,border:`1.5px dashed ${C.green}55`,background:`${C.green}0A`,marginTop:4}}>
          {fangetSendt ? (
            <div style={{textAlign:"center",padding:"6px 0"}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:C.green,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,margin:"0 auto 8px"}}>✓</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,color:C.navyDark}}>Sjekk innboksen din</div>
              <div style={{fontSize:"0.8rem",color:C.muted,marginTop:4}}>Vi har sendt energimerket ditt på e-post.</div>
            </div>
          ) : (
            <>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1rem",color:C.navyDark,marginBottom:4}}>Ikke klar til å kjøpe?</div>
              <div style={{fontSize:"0.82rem",color:C.muted,marginBottom:12,lineHeight:1.55}}>Få energimerket og de viktigste tiltakene på e-post – helt gratis.</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <input className="be-input" style={{...S.inp,flex:1,minWidth:160}} type="email" placeholder="navn@epost.no" value={epost}
                  onChange={e=>setEpost(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fangEpost()} aria-label="E-postadresse for gratis sammendrag"/>
                <button className="be-btn-g" style={{...S.btnG,background:C.white,whiteSpace:"nowrap"}} onClick={fangEpost} disabled={fangetLaster}>
                  {fangetLaster ? "Sender…" : "Send meg sammendraget"}
                </button>
              </div>
              {fangetFeil && <div style={{color:"#DC2626",fontSize:"0.8rem",marginTop:6,display:"flex",alignItems:"center",gap:4}}><span>⚠</span>{fangetFeil}</div>}
              <div style={{fontSize:"0.68rem",color:C.muted,marginTop:8}}>Ingen spam. Avmelding når som helst.</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// OPPGRADERINGSFLOW (Premium – interaktiv 3-steg)
// ─────────────────────────────────────────────
function OppgraderingsFlow({ resultat, epost: epostProp, input, sessionId, onNullstill }) {
  const [steg, setSteg]     = useState(1);
  const [valgte, setValgte] = useState(
    () => new Set(resultat.tiltak.filter(t => t.anbefalt).map(t => t.id))
  );
  const [sender, setSender]         = useState(false);
  const [feil, setFeil]             = useState("");
  const [leadNavn, setLeadNavn]     = useState("");
  const [leadTlf, setLeadTlf]       = useState("");
  const [leadSendt, setLeadSendt]   = useState(false);
  const [leadLaster, setLeadLaster] = useState(false);
  const [freeEpost, setFreeEpost]   = useState("");
  const epost = epostProp || freeEpost;

  const valgTiltak  = resultat.tiltak.filter(t => valgte.has(t.id));
  const totInv      = valgTiltak.reduce((s, t) => s + t.kostnad_snitt, 0);
  const totStøtte   = valgTiltak.reduce((s, t) => s + t.støtte_snitt, 0);
  const netto       = totInv - totStøtte;
  const totBes      = valgTiltak.reduce((s, t) => s + t.besparelse_kr, 0);
  const breakEven   = totBes > 0 ? Math.round(netto / totBes) : "–";
  // Tiltak overlapper: 15 % + 20 % sparer ikke 35 %, men 1−(0,85×0,80) = 32 %.
  // Effekten gjelder bare OPPVARMINGSdelen – tappevann/lys/utstyr påvirkes ikke.
  const kwhPctTotal = 1 - valgTiltak.reduce((p, t) => p * (1 - (t.kWh_pct || 0)), 1);
  const fastDel     = resultat.fastLevertPerM2 ?? 59;
  const oppvDel     = resultat.oppvLevertPerM2 ?? Math.max(resultat.kwhPerM2 - fastDel, 10);
  const nyKwhPerM2  = Math.round(fastDel + oppvDel * (1 - kwhPctTotal));
  const nyMerke     = karakterFor(nyKwhPerM2, resultat.areal);

  function toggleTiltak(id) {
    setValgte(prev => {
      const ny = new Set(prev);
      ny.has(id) ? ny.delete(id) : ny.add(id);
      return ny;
    });
  }

  async function sendRapport() {
    if (FREE_MODE && !epost.includes("@")) {
      setFeil("Skriv inn en gyldig e-postadresse");
      return;
    }
    setSender(true); setFeil("");
    try {
      const res = await fetch(`${BACKEND}/api/send-rapport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id:   sessionId || (FREE_MODE ? `free_${Date.now()}` : null),
          resultatData: { resultat: { ...resultat, tiltak: valgTiltak }, input, epost, pakke: "oppgraderingsplan" },
          epost,
          pakke:        "oppgraderingsplan",
          free_mode:    FREE_MODE,
        }),
      });
      const data = await res.json();
      if (data.feil) throw new Error(data.feil);
      setSteg(3);
    } catch (_) {
      setFeil("Noe gikk galt. Prøv igjen eller kontakt support.");
    }
    setSender(false);
  }

  const stegLabels = ["Tiltaksvalg", "Sammenligning", "Rapport sendt"];
  const skjermSteg2Forbehold = steg === 2 ? <Forbehold resultat={resultat}/> : null;

  return (
    <div style={S.app}>
      <Header onHome={onNullstill}/>
      <div style={S.wrap}>

        {input?.adresse && (
          <div style={{textAlign:"center",fontSize:"0.78rem",color:C.muted,marginBottom:14}}>
            <span style={{fontWeight:700,color:C.navyDark}}>{input.adresse}</span>
          </div>
        )}

        {/* Steg-indikator */}
        {steg < 3 && (
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:24,justifyContent:"center",flexWrap:"wrap"}}>
            {stegLabels.map((lbl, i) => (
              <React.Fragment key={lbl}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{
                    width:26,height:26,borderRadius:"50%",flexShrink:0,
                    background: i+1 < steg ? C.green : i+1 === steg ? `linear-gradient(135deg,${C.navy},${C.navyMid})` : C.section,
                    color: i+1 <= steg ? C.white : C.muted,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"0.78rem",fontWeight:800,
                  }}>{i+1 < steg ? "✓" : i+1}</div>
                  <span style={{fontSize:"0.76rem",fontWeight:i+1===steg?700:400,color:i+1===steg?C.navyDark:C.muted,whiteSpace:"nowrap"}}>{lbl}</span>
                </div>
                {i < 2 && <div style={{width:24,height:2,background:i+1<steg?C.green:C.border,flexShrink:0}}/>}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── STEG 1: Tiltaksvalg ── */}
        {steg === 1 && (
          <>
            <div style={S.card}>
              <div style={S.tag}>Steg 1 av 2</div>
              <div style={S.h2}>Velg dine tiltak</div>
              <div style={{...S.sub,marginBottom:16}}>Vi har forhåndsvalgt de mest lønnsomme tiltakene for din bolig</div>
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                <button style={{...S.btnG,fontSize:"0.78rem",padding:"6px 14px"}} onClick={() => setValgte(new Set(resultat.tiltak.map(t => t.id)))}>Velg alle</button>
                <button style={{...S.btnG,fontSize:"0.78rem",padding:"6px 14px"}} onClick={() => setValgte(new Set())}>Fjern alle</button>
              </div>
              {resultat.tiltak.map(t => {
                const erValgt = valgte.has(t.id);
                return (
                  <div key={t.id} onClick={() => toggleTiltak(t.id)} style={{
                    display:"flex",gap:12,alignItems:"flex-start",padding:"14px 16px",
                    borderRadius:14,marginBottom:10,cursor:"pointer",transition:"all .15s",
                    border:`1.5px solid ${erValgt ? C.green+"60" : C.border}`,
                    background: erValgt ? `${C.green}08` : C.white,
                  }}>
                    <div style={{
                      width:22,height:22,borderRadius:6,flexShrink:0,marginTop:1,
                      border:`2px solid ${erValgt ? C.green : "#ccc"}`,
                      background: erValgt ? C.green : C.white,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      color:C.white,fontSize:"0.75rem",fontWeight:900,
                    }}>{erValgt ? "✓" : ""}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:6}}>
                        <div style={{fontWeight:700,fontSize:"0.9rem",color:C.navyDark}}>{t.ikon} {t.navn}</div>
                        {t.anbefalt          && <span style={{background:C.green,color:C.white,borderRadius:100,padding:"2px 9px",fontSize:"0.65rem",fontWeight:800,whiteSpace:"nowrap",flexShrink:0}}>Anbefalt</span>}
                        {t.enovaMerknad && <span style={{background:"#fef3e2",color:"#b45309",borderRadius:100,padding:"2px 9px",fontSize:"0.63rem",fontWeight:700,flexShrink:0}}>Uten Enova-støtte</span>}
                        {!t.anbefalt && t.prioritet==="høy"    && <span style={{background:C.gold,color:C.white,borderRadius:100,padding:"2px 9px",fontSize:"0.65rem",fontWeight:800,whiteSpace:"nowrap",flexShrink:0}}>God ROI</span>}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                        <div style={{background:C.section,borderRadius:8,padding:"7px 10px"}}>
                          <div style={{fontSize:"0.62rem",color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em"}}>Est. kostnad</div>
                          <div style={{fontSize:"0.8rem",fontWeight:800,color:C.navyDark}}>{Math.round(t.kostnad_min/1000)}–{Math.round(t.kostnad_max/1000)}k kr</div>
                        </div>
                        <div style={{background:C.section,borderRadius:8,padding:"7px 10px"}}>
                          <div style={{fontSize:"0.62rem",color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em"}}>Årsbesparelse</div>
                          <div style={{fontSize:"0.8rem",fontWeight:800,color:C.green}}>~{t.besparelse_kr.toLocaleString("no")} kr</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              style={{...S.btnP,background:valgte.size===0?"#bbb":`linear-gradient(135deg,${C.navy},${C.navyMid})`,marginBottom:16}}
              onClick={() => valgte.size > 0 && setSteg(2)}
              disabled={valgte.size === 0}
            >
              Se sammenligning ({valgte.size} valgt) →
            </button>
          </>
        )}

        {/* ── STEG 2: Kombinasjonssammenligning ── */}
        {steg === 2 && (
          <>
            <div style={S.card}>
              <div style={S.tag}>Steg 2 av 2</div>
              <div style={S.h2}>Din kombinasjonsanalyse</div>
              <div style={{...S.sub,marginBottom:16}}>{valgte.size} tiltak valgt</div>
              <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,borderRadius:14,padding:"18px",marginBottom:16}}>
                <div className="be-grid-2" style={{gap:12,marginBottom:14}}>
                  {[
                    {l:"Total årsbesparelse",v:`${totBes.toLocaleString("no")} kr`,c:C.greenLight},
                    {l:"Tilbakebetalingstid", v:`${breakEven}${typeof breakEven==="number"?" år":""}`,c:C.white},
                    {l:"Total Enova-støtte",  v:`${Math.round(totStøtte/1000)} 000 kr`,c:C.greenLight},
                    {l:"Netto kostnad",       v:`${Math.round(netto/1000)} 000 kr`,c:"rgba(255,255,255,0.8)"},
                  ].map(x=>(
                    <div key={x.l}>
                      <div style={{fontSize:"0.65rem",color:"rgba(255,255,255,0.5)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:3}}>{x.l}</div>
                      <div style={{fontSize:"1.1rem",fontWeight:900,color:x.c}}>{x.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{borderTop:"1px solid rgba(255,255,255,0.15)",paddingTop:12}}>
                  <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.5)",marginBottom:2}}>Besparelse over 10 år</div>
                  <div style={{fontSize:"1.3rem",fontWeight:900,color:C.greenLight}}>{(totBes*10).toLocaleString("no")} kr</div>
                </div>
              </div>
              {/* Energikarakter-forbedring */}
              <div style={{background:`${C.green}10`,border:`1px solid ${C.green}30`,borderRadius:12,padding:"16px",marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:"0.82rem",color:C.navyDark,marginBottom:12}}>⚡ Estimert energikarakter etter tiltak</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:"0.68rem",color:C.muted,fontWeight:700,marginBottom:5}}>I dag</div>
                    <div style={{width:54,height:54,borderRadius:14,background:resultat.merke.farge,color:resultat.merke.tekst,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.9rem",fontWeight:900,fontFamily:"'Fraunces',Georgia,serif",boxShadow:`0 4px 14px ${resultat.merke.farge}55`}}>{resultat.merke.merke}</div>
                    <div style={{fontSize:"0.67rem",color:C.muted,marginTop:5}}>{resultat.kwhPerM2} kWh/m²</div>
                  </div>
                  <div style={{color:C.green,fontSize:"1.8rem",fontWeight:900,lineHeight:1}}>→</div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:"0.68rem",color:C.muted,fontWeight:700,marginBottom:5}}>Med tiltak</div>
                    <div style={{width:54,height:54,borderRadius:14,background:nyMerke.farge,color:nyMerke.tekst,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.9rem",fontWeight:900,fontFamily:"'Fraunces',Georgia,serif",boxShadow:`0 4px 14px ${nyMerke.farge}55`}}>{nyMerke.merke}</div>
                    <div style={{fontSize:"0.67rem",color:C.muted,marginTop:5}}>{nyKwhPerM2} kWh/m²</div>
                  </div>
                </div>
                {nyMerke.merke !== resultat.merke.merke ? (
                  <div style={{textAlign:"center",marginTop:10,fontSize:"0.78rem",color:C.green,fontWeight:700}}>
                    Forbedring på {ENERGIMERKER.findIndex(e=>e.merke===resultat.merke.merke) - ENERGIMERKER.findIndex(e=>e.merke===nyMerke.merke)} energikarakter{ENERGIMERKER.findIndex(e=>e.merke===resultat.merke.merke) - ENERGIMERKER.findIndex(e=>e.merke===nyMerke.merke) > 1 ? "er" : ""}
                  </div>
                ) : (
                  <div style={{textAlign:"center",marginTop:10,fontSize:"0.78rem",color:C.muted}}>Velg flere tiltak for å forbedre karakteren</div>
                )}
              </div>

              <EpbdStatus dagensMerke={resultat.merke.merke} nyttMerke={nyMerke.merke}/>

              <EnovaBenchmark byggeår={input?.byggeår} dittMerke={resultat.merke.merke}/>

              <div style={{fontWeight:700,fontSize:"0.82rem",color:C.navyDark,marginBottom:10}}>Enova-støtte per tiltak</div>
              {valgTiltak.map(t => (
                <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${C.section}`}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:"0.85rem",color:C.navyDark}}>{t.ikon} {t.navn}</div>
                    <div style={{fontSize:"0.74rem",color:C.muted}}>~{t.besparelse_kr.toLocaleString("no")} kr/år · {t.tilbakebetaling<=30?`${t.tilbakebetaling} år tilbakebetaling`:"Lang sikt"}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:"0.67rem",color:C.muted}}>Enova inntil</div>
                    <div style={{fontWeight:800,color:C.green,fontSize:"0.9rem"}}>{(t.støtte_max/1000).toFixed(0)}k kr</div>
                  </div>
                </div>
              ))}
            </div>
            {FREE_MODE && !epostProp && (
              <div style={{...S.card,background:`${C.green}08`,border:`1.5px solid ${C.green}35`,marginBottom:12}}>
                <label style={S.lbl}>E-postadresse <span style={{color:C.muted,fontWeight:400}}>(rapport sendes hit som PDF)</span></label>
                <input
                  style={S.inp}
                  type="email"
                  placeholder="navn@epost.no"
                  value={freeEpost}
                  onChange={e => setFreeEpost(e.target.value)}
                />
              </div>
            )}
            {feil && <div style={{background:"#fff0f0",border:"1px solid #fcc",borderRadius:10,padding:"12px 14px",fontSize:"0.83rem",color:"#c53030",marginBottom:12}}>{feil}</div>}
            <button
              style={{...S.btnP,background:sender?"#aaa":`linear-gradient(135deg,${C.green},${C.greenLight})`,boxShadow:`0 6px 20px ${C.green}44`,marginBottom:10,opacity:sender?0.7:1}}
              onClick={sendRapport}
              disabled={sender}
            >
              {sender ? "Genererer rapport…" : (epost ? `Generer og send rapport til ${epost} →` : "Generer og send rapport →")}
            </button>
            <button style={{...S.btnG,width:"100%",textAlign:"center"}} onClick={() => setSteg(1)}>← Endre valg</button>
          </>
        )}

        {/* ── STEG 3: Bekreftelse + Håndverker CTA ── */}
        {steg === 3 && (
          <>
            <div style={S.card}>
              <div style={{textAlign:"center",padding:"20px 16px"}}>
                <div style={{fontSize:"3rem",marginBottom:12}}>✅</div>
                <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:800,fontSize:"1.4rem",color:C.navyDark,marginBottom:8}}>Rapporten er sendt!</div>
                <div style={{fontSize:"0.88rem",color:C.muted,lineHeight:1.7,marginBottom:20}}>
                  Din Oppgraderingsplan med {valgte.size} tiltak er sendt til <strong>{epost}</strong>.<br/>
                  Sjekk innboksen din – rapporten er klar til bruk.
                </div>
                <div style={{display:"grid",gap:10,marginBottom:20}}>
                  {[
                    {ikon:"📋",tekst:"Søknadstekst for Enova ligger klar i PDF-en"},
                    {ikon:"💰",tekst:"Finansieringstips og grønne boliglån er inkludert"},
                    {ikon:"🔨",tekst:"Husk: søk Enova-støtte FØR du bestiller håndverker"},
                  ].map(x=>(
                    <div key={x.ikon} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 13px",background:C.section,borderRadius:10,textAlign:"left"}}>
                      <span style={{fontSize:"1.1rem",flexShrink:0}}>{x.ikon}</span>
                      <span style={{fontSize:"0.8rem",color:C.navyDark,fontWeight:600}}>{x.tekst}</span>
                    </div>
                  ))}
                </div>
                <button onClick={onNullstill} style={S.btnG}>Analyser en annen bolig →</button>
              </div>
            </div>

            {/* Håndverker CTA */}
            <div style={{...S.card,border:`1.5px solid ${C.green}40`}}>
              {leadSendt ? (
                <div style={{textAlign:"center",padding:"16px 0"}}>
                  <div style={{fontSize:"2rem",marginBottom:8}}>🙌</div>
                  <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.05rem",color:C.navyDark,marginBottom:6}}>Takk!</div>
                  <div style={{fontSize:"0.85rem",color:C.muted,lineHeight:1.6}}>Vi kontakter deg innen 1–2 virkedager med tilbud fra kvalifiserte håndverkere i ditt område.</div>
                </div>
              ) : (
                <>
                  <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:16}}>
                    <div style={{fontSize:"1.8rem",flexShrink:0}}>🔨</div>
                    <div>
                      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.05rem",color:C.navyDark,marginBottom:4}}>Trenger du hjelp med gjennomføringen?</div>
                      <div style={{fontSize:"0.82rem",color:C.muted,lineHeight:1.55}}>Vi kan hjelpe deg med å finne kvalifiserte håndverkere for tiltakene du har valgt.</div>
                    </div>
                  </div>
                  <div style={{display:"grid",gap:10,marginBottom:12}}>
                    <div>
                      <label style={S.lbl}>Navn</label>
                      <input style={S.inp} type="text" placeholder="Ola Nordmann" value={leadNavn} onChange={e=>setLeadNavn(e.target.value)}/>
                    </div>
                    <div>
                      <label style={S.lbl}>Telefonnummer</label>
                      <input style={S.inp} type="tel" placeholder="400 00 000" value={leadTlf} onChange={e=>setLeadTlf(e.target.value)}/>
                    </div>
                  </div>
                  <button
                    style={{...S.btnP,background:`linear-gradient(135deg,${C.green},${C.greenLight})`,boxShadow:`0 6px 20px ${C.green}44`,opacity:leadLaster?0.7:1}}
                    disabled={leadLaster}
                    onClick={async () => {
                      if (!leadNavn.trim() || !leadTlf.trim()) return;
                      setLeadLaster(true);
                      try {
                        await fetch(`${BACKEND}/api/lead`, {
                          method:"POST", headers:{"Content-Type":"application/json"},
                          body: JSON.stringify({ navn:leadNavn, telefon:leadTlf, epost, merke:resultat.merke.merke, tiltak:valgTiltak.map(t=>t.navn) }),
                        });
                      } catch(_) {}
                      setLeadSendt(true); setLeadLaster(false);
                    }}
                  >
                    {leadLaster ? "Sender…" : "Ja, kontakt meg →"}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {skjermSteg2Forbehold}

        {FREE_MODE && <FeedbackBoks merke={resultat?.merke?.merke}/>}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EPBD-STATUS (endelig vedtatt EPBD 2024/1275 – bestandsmål for boliger)
// ─────────────────────────────────────────────
// EPBD 2024/1275 er EU-direktiv. Tallene under er forventede krav -
// norsk implementering er ikke endelig vedtatt. Vi viser dette som
// risiko-/mulighet-bilde, IKKE som gjeldende lov.
function EpbdStatus({ dagensMerke, nyttMerke }) {
  const idx = m => ENERGIMERKER.findIndex(e => e.merke === m);
  const dagensIdx = idx(dagensMerke);
  const nyttIdx   = idx(nyttMerke);
  const forbedrer = nyttIdx < dagensIdx;

  // Endelig vedtatt EPBD (2024/1275) for BOLIGER: nasjonale bestandsmål, ikke
  // individuelle merkekrav. Snittforbruket i boligmassen skal ned 16 % innen
  // 2030 og 20–22 % innen 2035, og minst 55 % av kuttet skal komme fra de 43 %
  // dårligste byggene. I praksis: F/G-boliger prioriteres for krav og virkemidler.
  const utsatt   = dagensIdx >= idx("F");
  const middels  = dagensIdx === idx("D") || dagensIdx === idx("E");

  const status = utsatt
    ? { tekst: "Trolig prioritert for krav", farge: C.gold }
    : middels
    ? { tekst: "Kan bli berørt på sikt", farge: C.muted }
    : { tekst: "Godt posisjonert", farge: C.green };

  return (
    <div style={{...S.card,marginTop:16,background:`linear-gradient(150deg,${C.navy}06 0%,${C.white} 60%)`,border:`1.5px solid ${C.navy}20`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <div style={S.tag}>EU-direktivet</div>
        <span style={{fontSize:"0.62rem",color:C.muted,background:C.section,borderRadius:100,padding:"2px 8px",fontWeight:700}}>Norsk innføring ikke vedtatt</span>
      </div>
      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.05rem",color:C.navyDark,marginBottom:6}}>
        Hvor står boligen din mot EPBD 2024?
      </div>
      <div style={{fontSize:"0.78rem",color:C.muted,lineHeight:1.55,marginBottom:14}}>
        EUs bygningsenergidirektiv (EPBD 2024/1275) krever at snittforbruket i boligmassen
        reduseres med 16 % innen 2030 og 20–22 % innen 2035 – og minst 55 % av kuttet skal
        tas i de dårligste byggene. Direktivet stiller ikke individuelle merkekrav til boliger,
        men boliger med merke F/G vil mest sannsynlig bli prioritert for fremtidige krav og
        støtteordninger. Hvordan Norge innfører dette, er ikke endelig avklart.
      </div>

      <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:12,alignItems:"center",padding:"10px 0"}}>
        <div style={{
          width:34,height:34,borderRadius:9,
          background:(ENERGIMERKER[dagensIdx]||{}).farge||C.muted,
          color:(ENERGIMERKER[dagensIdx]||{}).tekst||C.white,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:"1.05rem",fontWeight:900,fontFamily:"'Fraunces',Georgia,serif",flexShrink:0,
        }}>{dagensMerke}</div>
        <div style={{fontSize:"0.78rem",color:C.muted}}>Ditt estimerte merke i dag</div>
        <div style={{
          background:`${status.farge}15`,color:status.farge,border:`1px solid ${status.farge}40`,
          borderRadius:100,padding:"4px 11px",fontSize:"0.72rem",fontWeight:800,whiteSpace:"nowrap",
        }}>{status.tekst}</div>
      </div>

      {forbedrer && (
        <div style={{
          marginTop:10,background:`${C.green}10`,border:`1px solid ${C.green}40`,
          borderRadius:12,padding:"12px 14px",fontSize:"0.82rem",color:C.navyDark,lineHeight:1.55,
        }}>
          <strong>Med valgte tiltak (nytt estimat: merke {nyttMerke}):</strong> Boligen flyttes
          {idx(nyttMerke) <= idx("E") ? " ut av gruppen som mest sannsynlig prioriteres for fremtidige krav" : " i riktig retning, men ligger fortsatt i den mest utsatte gruppen"}.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ENOVA-BENCHMARK (sammenligning mot offisielle attester)
// ─────────────────────────────────────────────
// Henter aggregert statistikk fra backend (data fra Enovas offentlige
// energimerke-API, aggregert per byggeår-bøtte). Skjuler seg selv
// hvis backend ikke har data ennå.
function EnovaBenchmark({ byggeår, dittMerke }) {
  const [data, setData] = useState(null);
  const [feilet, setFeilet] = useState(false);

  useEffect(() => {
    if (!byggeår) return;
    let kansellert = false;
    fetch(`${BACKEND}/api/benchmark?byggeår=${byggeår}`)
      .then(r => r.json())
      .then(d => { if (!kansellert) setData(d); })
      .catch(() => { if (!kansellert) setFeilet(true); });
    return () => { kansellert = true; };
  }, [byggeår]);

  if (feilet || !data || !data.tilgjengelig) return null;

  const idx = m => ENERGIMERKER.findIndex(e => e.merke === m);
  const dittIdx   = idx(dittMerke);
  const snittIdx  = idx(data.medianMerke);
  const bedre     = dittIdx < snittIdx;
  const likt      = dittIdx === snittIdx;
  const verre     = dittIdx > snittIdx;
  const snittObj  = ENERGIMERKER[snittIdx] || ENERGIMERKER[6];
  const dittObj   = ENERGIMERKER[dittIdx]  || ENERGIMERKER[6];

  // Beregn percentile-posisjon (andel boliger med merke lik eller dårligere enn ditt)
  let andelDårligereEllerLikt = 0;
  if (data.perMerke && data.totalt) {
    let sum = 0;
    for (let i = dittIdx; i < 7; i++) {
      const m = ["A","B","C","D","E","F","G"][i];
      sum += data.perMerke[m] || 0;
    }
    andelDårligereEllerLikt = Math.round((sum / data.totalt) * 100);
  }

  return (
    <div style={{...S.card,marginTop:16,background:`${C.gold}06`,border:`1.5px solid ${C.gold}30`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <div style={S.tag}>Enova-data</div>
        <span style={{fontSize:"0.62rem",color:C.muted,background:C.section,borderRadius:100,padding:"2px 8px",fontWeight:700}}>{data.totalt.toLocaleString("no")} attester</span>
      </div>
      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.05rem",color:C.navyDark,marginBottom:10}}>
        Hvordan ligger du an mot tilsvarende boliger?
      </div>
      <div style={{fontSize:"0.78rem",color:C.muted,lineHeight:1.55,marginBottom:14}}>
        Sammenlignet med offisielt registrerte energiattester hos Enova for boliger fra <strong>{data.bøtte}</strong>.
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div style={{background:C.white,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,textAlign:"center"}}>
          <div style={{fontSize:"0.66rem",color:C.muted,fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:6}}>Ditt estimat</div>
          <div style={{width:44,height:44,borderRadius:11,background:dittObj.farge,color:dittObj.tekst,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",fontWeight:900,fontFamily:"'Fraunces',Georgia,serif",margin:"0 auto"}}>{dittMerke}</div>
        </div>
        <div style={{background:C.white,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,textAlign:"center"}}>
          <div style={{fontSize:"0.66rem",color:C.muted,fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:6}}>Typisk (Enova-snitt)</div>
          <div style={{width:44,height:44,borderRadius:11,background:snittObj.farge,color:snittObj.tekst,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",fontWeight:900,fontFamily:"'Fraunces',Georgia,serif",margin:"0 auto"}}>{data.medianMerke}</div>
        </div>
      </div>

      <div style={{
        background: bedre ? `${C.green}10` : likt ? `${C.section}` : `${C.gold}10`,
        border:     bedre ? `1px solid ${C.green}40` : likt ? `1px solid ${C.border}` : `1px solid ${C.gold}40`,
        borderRadius:12,padding:"12px 14px",
        fontSize:"0.82rem",color:C.navyDark,lineHeight:1.55,
      }}>
        {bedre && <><strong>Bedre enn snittet.</strong> Boligen din ligger over typisk standard for boliger fra {data.bøtte}.</>}
        {likt  && <><strong>Som forventet.</strong> Boligen din ligger på snittet for boliger fra {data.bøtte}.</>}
        {verre && <><strong>Under snittet.</strong> {andelDårligereEllerLikt}% av boliger fra {data.bøtte} har merke {dittMerke} eller dårligere - de anbefalte tiltakene løfter deg over snittet.</>}
      </div>

      {data.oppdatert && (
        <div style={{fontSize:"0.65rem",color:C.muted,marginTop:10,textAlign:"right"}}>
          Kilde: Enova - oppdatert {new Date(data.oppdatert).toLocaleDateString("nb-NO")}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FORBEHOLD – antakelser bak estimatet
// ─────────────────────────────────────────────
function Forbehold({ resultat }) {
  const [åpen, setÅpen] = useState(false);
  return (
    <div style={{...S.card,marginTop:16,background:C.section,border:`1px solid ${C.border}`}}>
      <button onClick={()=>setÅpen(!åpen)} style={{background:"none",border:"none",padding:0,width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",fontFamily:"inherit"}}>
        <span style={{fontWeight:700,fontSize:"0.85rem",color:C.navyDark}}>ℹ️ Forutsetninger og forbehold</span>
        <span style={{color:C.muted,fontSize:"0.8rem"}}>{åpen?"Skjul ▲":"Vis ▼"}</span>
      </button>
      {åpen && (
        <div style={{fontSize:"0.76rem",color:C.muted,lineHeight:1.65,marginTop:10}}>
          <p style={{margin:"0 0 8px"}}><strong style={{color:C.navyDark}}>Dette er et estimat, ikke et offisielt energimerke.</strong> Offisiell energiattest krever godkjent energirådgiver og registrering hos Enova. Karakter A krever i tillegg gjennomført tetthetskontroll.</p>
          <p style={{margin:"0 0 8px"}}><strong style={{color:C.navyDark}}>Karakteren</strong> beregnes med normert Oslo-klima og arealavhengige karaktergrenser (Enovas skala for småhus/leiligheter) – slik det offisielle merket gjøres. Klimasonen du valgte påvirker kun kostnadsestimatet. Isolasjonsstandard, vindustype og lufttetthet er antatt ut fra byggeår der du ikke har oppgitt annet.</p>
          <p style={{margin:"0 0 8px"}}><strong style={{color:C.navyDark}}>Økonomien</strong> bruker strømpris {(resultat?.weightedCost ?? 1.4).toFixed(2).replace(".",",")} kr/kWh (SSB-nivå inkl. nettleie og avgifter), typiske håndverkerpriser og antar at tiltakene utføres fagmessig. Besparelser ved kombinasjon av tiltak er beregnet multiplikativt (tiltak overlapper – to tiltak på 20 % gir 36 %, ikke 40 %). Solcellegevinst antar ca. 7 kW anlegg og 0,90 kr/kWh verdi.</p>
          <p style={{margin:0}}><strong style={{color:C.navyDark}}>Enova-støtte</strong> (satser per juni 2026): 25 % av kostnad opp til makssats per tiltak, maks 100 000 kr per bolig 2025–2028. Kun helårsbolig – ikke fritidsbolig. Isolering/vinduer/dører krever byggesøknad før 1. juli 1997. Du må søke og få godkjenning FØR arbeidet starter. Sjekk alltid gjeldende vilkår på enova.no.</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FEEDBACK-WIDGET (FREE_MODE)
// ─────────────────────────────────────────────
function FeedbackBoks({ merke }) {
  const [valgt, setValgt]     = useState(null);
  const [kommentar, setKommentar] = useState("");
  const [sender, setSender]   = useState(false);
  const [sendt, setSendt]     = useState(false);
  const [feil, setFeil]       = useState("");

  async function send() {
    if (!valgt) { setFeil("Velg ett av alternativene over"); return; }
    setSender(true); setFeil("");
    try {
      await fetch(`${BACKEND}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betalingsvilje: valgt, kommentar: kommentar.slice(0, 1000), merke: merke || "" }),
      });
      setSendt(true);
    } catch (_) {
      setFeil("Kunne ikke sende. Prøv igjen om litt.");
    }
    setSender(false);
  }

  if (sendt) {
    return (
      <div style={{...S.card,background:`${C.green}10`,border:`1.5px solid ${C.green}40`,textAlign:"center",marginTop:24}}>
        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.05rem",color:C.navyDark,marginBottom:6}}>Tusen takk!</div>
        <div style={{fontSize:"0.82rem",color:C.muted}}>Tilbakemeldingen din hjelper oss å forbedre BoligEffekt.</div>
      </div>
    );
  }

  const alternativer = [
    { id: "199", label: "Ja, 199 kr" },
    { id: "399", label: "Ja, 399 kr" },
    { id: "nei", label: "Nei" },
  ];

  return (
    <div style={{...S.card,marginTop:24,border:`1.5px dashed ${C.green}55`,background:`${C.green}06`}}>
      <div style={S.tag}>Hjelp oss å forbedre BoligEffekt</div>
      <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.05rem",color:C.navyDark,marginBottom:14}}>
        Ville du betalt for denne rapporten?
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {alternativer.map(a => (
          <button
            key={a.id}
            onClick={() => setValgt(a.id)}
            style={{
              flex:"1 1 100px",
              padding:"10px 12px",
              border:`1.5px solid ${valgt===a.id?C.green:C.border}`,
              background: valgt===a.id ? `${C.green}15` : C.white,
              color: valgt===a.id ? C.navyDark : C.navy,
              borderRadius:10,
              fontWeight:700,
              fontSize:"0.85rem",
              cursor:"pointer",
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
      <textarea
        value={kommentar}
        onChange={e => setKommentar(e.target.value)}
        placeholder="Hva synes du om rapporten? (valgfritt)"
        rows={3}
        maxLength={1000}
        style={{...S.inp,resize:"vertical",fontFamily:"inherit",minHeight:64}}
      />
      {feil && <div style={{color:"#DC2626",fontSize:"0.78rem",marginTop:8}}>{feil}</div>}
      <button
        onClick={send}
        disabled={sender}
        style={{...S.btnP,marginTop:12,opacity:sender?0.7:1,background:`linear-gradient(135deg,${C.navy},${C.navyMid})`}}
      >
        {sender ? "Sender…" : "Send tilbakemelding"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// FULL RAPPORT
// ─────────────────────────────────────────────
const ENOVA_DOCS = {
  tetting:          "Faktura fra godkjent fagperson, trykktest-rapport (blower door)",
  isolering_loft:   "Faktura, dokumentasjon på isolasjonstykkelse før og etter",
  isolering_vegger: "Faktura, dokumentasjon på isolasjonstykkelse før og etter",
  varmepumpe_ll:    "Faktura fra godkjent installatør, teknisk spesifikasjon (COP-verdi)",
  varmepumpe_lv:    "Faktura fra godkjent installatør, teknisk spesifikasjon (COP-verdi)",
  vinduer:          "Faktura, U-verdi dokumentasjon for nye vinduer",
  ventilasjon:      "Faktura fra godkjent installatør, SFP-verdi dokumentasjon",
  solceller:        "Faktura, teknisk dokumentasjon, nettilknytningsavtale",
};

// eslint-disable-next-line no-unused-vars
function FullRapport({ resultat, epost, pdfSendt, pakke, onNullstill }) {
  const [visAlle, setVisAlle]       = useState(false);
  const [fane, setFane]             = useState("tiltak");
  const [kopiert, setKopiert]       = useState(false);
  const [leadNavn, setLeadNavn]     = useState("");
  const [leadTlf, setLeadTlf]       = useState("");
  const [leadSendt, setLeadSendt]   = useState(false);
  const [leadLaster, setLeadLaster] = useState(false);
  const { kwhPerM2, primærPerM2, totalKwh, areal, merke, merkePotensial, strømkostnad, tiltak, weightedCost } = resultat;
  const høy = tiltak.filter(t => t.prioritet === "høy");
  const totalStøtte     = høy.reduce((s,t) => s + t.støtte_snitt, 0);
  const totalBesparelse = høy.reduce((s,t) => s + t.besparelse_kr, 0);
  const visTiltak = visAlle ? tiltak : tiltak.slice(0,5);
  const fs = aktiv => ({ padding:"9px 16px", border:"none", cursor:"pointer", fontWeight:700, fontSize:"0.82rem", borderRadius:8, background:aktiv?C.navy:"transparent", color:aktiv?C.white:C.muted, transition:"all .15s" });

  return (
    <div style={S.app}>
      <Header onBack={onNullstill} onHome={onNullstill}/>
      <div style={S.wrap}>
        {/* Suksessbanner */}
        <div style={{background:`${C.green}15`,border:`1px solid ${C.green}30`,borderRadius:14,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:"1.4rem"}}>✅</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,color:C.navyDark,fontSize:"0.9rem"}}>Betaling mottatt – rapport ulåst</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>
              {pdfSendt ? `PDF-rapport sendt til ${epost}` : "PDF-rapport sendes til din e-post om et øyeblikk"}
            </div>
          </div>
          <div style={{background:`linear-gradient(135deg,${C.green},${C.greenLight})`,color:C.white,borderRadius:100,padding:"4px 12px",fontSize:"0.68rem",fontWeight:800,whiteSpace:"nowrap",flexShrink:0}}>
            Komplett rapport
          </div>
        </div>

        {/* Energimerke */}
        <div style={S.card}>
          <div className="be-merke-row" style={{display:"flex",alignItems:"center",gap:18,marginBottom:20}}>
            <Merke m={merke} stor reveal/>
            <div>
              <div style={S.tag}>Energimerke</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:800,fontSize:"1.6rem",color:C.navyDark}}>{merke.merke} – {merke.epbd}</div>
              <div style={{fontSize:"0.82rem",color:C.muted}}>{resultat.bygData.label} · {resultat.klima.label.split("(")[0].trim()}</div>
            </div>
          </div>
          <div className="be-grid-3" style={{marginBottom:18}}>
            {[{l:"Levert energi",v:kwhPerM2,e:"kWh/m²/år"},{l:"Totalt forbruk",v:totalKwh.toLocaleString("no"),e:"kWh/år"},{l:"Strømkostnad",v:strømkostnad.toLocaleString("no"),e:"kr/år"}].map(x=>(
              <div key={x.l} style={{background:C.section,borderRadius:12,padding:"13px 10px",textAlign:"center"}}>
                <div style={{fontSize:"0.64rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>{x.l}</div>
                <div style={{fontSize:"1.3rem",fontWeight:900,color:C.navyDark}}>{x.v}</div>
                <div style={{fontSize:"0.65rem",color:C.muted}}>{x.e}</div>
              </div>
            ))}
          </div>
          <Skala merke={merke}/>
          {merkePotensial.merke !== merke.merke && (
            <div style={{marginTop:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:`${C.green}12`,border:`1px solid ${C.green}35`,borderRadius:10,padding:"11px 14px"}}>
              <span style={{fontWeight:700,fontSize:"0.85rem",color:C.navyDark}}>Din bolig: Merke {merke.merke}</span>
              <span style={{color:C.green,fontSize:"1.3rem",fontWeight:900}}>→</span>
              <span style={{fontWeight:700,fontSize:"0.85rem",color:C.green}}>Med tiltak: Merke {merkePotensial.merke}</span>
            </div>
          )}
        </div>

        {/* Kostnad ved å vente */}
        {kwhPerM2 > 120 && (() => {
          const ekstraPerÅr = Math.round((kwhPerM2 - 120) * areal * weightedCost);
          const ekstraPerMåned = Math.round(ekstraPerÅr / 12);
          const tapt3År = ekstraPerÅr * 3;
          return (
            <div style={{background:"#fff8f0",border:`2px solid ${C.gold}50`,borderRadius:16,padding:"20px",marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:"1.05rem",color:C.navyDark,marginBottom:12}}>💸 Kostnad ved å vente</div>
              <p style={{fontSize:"0.85rem",color:C.navyDark,lineHeight:1.6,marginBottom:6}}>
                Sammenlignet med en B-merket bolig bruker din bolig <strong>{ekstraPerMåned.toLocaleString("no")} kr ekstra per måned</strong>
              </p>
              <p style={{fontSize:"0.85rem",color:C.navyDark,lineHeight:1.6,marginBottom:6}}>
                Om du venter 3 år med tiltak taper du totalt <strong>{tapt3År.toLocaleString("no")} kr</strong> i unødvendig strøm
              </p>
              <p style={{fontSize:"0.83rem",color:C.muted,lineHeight:1.6,marginBottom:14}}>
                I tillegg risikerer du høyere håndverkerpriser når EPBD-kravene tvinger alle til å handle samtidig
              </p>
              <button onClick={()=>document.getElementById("tiltaksplan-seksjon")?.scrollIntoView({behavior:"smooth"})}
                style={{background:`linear-gradient(135deg,${C.green},${C.greenLight})`,color:C.white,border:"none",borderRadius:10,padding:"10px 20px",fontWeight:700,fontSize:"0.85rem",cursor:"pointer"}}>
                Se hva du kan spare →
              </button>
            </div>
          );
        })()}

        {/* Potensial */}
        {høy.length > 0 && (
          <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,borderRadius:16,padding:"20px",marginBottom:16}}>
            <div style={{color:C.white,fontWeight:800,marginBottom:12}}>⚡ Ditt forbedringspotensial</div>
            <div className="be-grid-3" style={{gap:10}}>
              {[{v:totalStøtte.toLocaleString("no")+" kr",l:"Mulig Enova-støtte"},{v:totalBesparelse.toLocaleString("no")+" kr",l:"Estimert årsbesparelse"},{v:høy.length+" tiltak",l:"Høy prioritet"}].map(x=>(
                <div key={x.l} style={{textAlign:"center"}}>
                  <div style={{fontSize:"1.25rem",fontWeight:900,color:C.greenLight}}>{x.v}</div>
                  <div style={{fontSize:"0.65rem",color:"rgba(255,255,255,0.5)",marginTop:2}}>{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Faner */}
        <div style={{display:"flex",gap:4,marginBottom:12,background:C.section,borderRadius:12,padding:5}}>
          {[["tiltak","Tiltaksplan"],["detaljer","Tekniske data"],["epbd","EPBD-status"]].map(([id,lbl])=>(
            <button key={id} style={fs(fane===id)} onClick={()=>setFane(id)}>{lbl}</button>
          ))}
        </div>

        {/* TILTAKSPLAN */}
        {fane === "tiltak" && (
          <div id="tiltaksplan-seksjon" style={S.card}>
            <div style={S.h2}>Tiltaksplan</div>
            <div style={{...S.sub,marginBottom:18}}>Sortert etter tilbakebetalingstid</div>
            {visTiltak.map(t=>(
              <div key={t.id} style={{background:t.prioritet==="høy"?`${C.green}09`:C.white,border:`1.5px solid ${t.prioritet==="høy"?C.green+"30":C.border}`,borderRadius:14,padding:"16px 18px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:7}}>
                  <div style={{fontWeight:700,fontSize:"0.93rem",color:C.navyDark}}>{t.ikon} {t.navn}</div>
                  {t.prioritet==="høy"    && <span style={{background:C.green,color:C.white,borderRadius:100,padding:"3px 10px",fontSize:"0.68rem",fontWeight:700,whiteSpace:"nowrap"}}>Anbefalt</span>}
                  {t.prioritet==="middels"&& <span style={{background:C.gold,color:C.white,borderRadius:100,padding:"3px 10px",fontSize:"0.68rem",fontWeight:700,whiteSpace:"nowrap"}}>Vurder</span>}
                  {t.prioritet==="lav"    && <span style={{background:"#ddd",color:"#666",borderRadius:100,padding:"3px 10px",fontSize:"0.68rem",fontWeight:700,whiteSpace:"nowrap"}}>Lang sikt</span>}
                </div>
                <div style={{fontSize:"0.8rem",color:C.muted,marginBottom:12,lineHeight:1.55}}>{t.beskrivelse}</div>
                <div className="be-grid-4" style={{gap:6}}>
                  {[
                    {l:"Enova-støtte",v:`${t.støtte_min/1000}–${t.støtte_max/1000}k kr`,c:C.green},
                    {l:"Est. kostnad",v:`${Math.round(t.kostnad_min/1000)}–${Math.round(t.kostnad_max/1000)}k kr`,c:C.navyDark},
                    {l:"Årsbesparelse",v:`~${t.besparelse_kr.toLocaleString("no")} kr`,c:C.navyDark},
                    {l:"Tilbakebetaling",v:t.tilbakebetaling<=30?`${t.tilbakebetaling} år`:">30 år",c:C.navyDark},
                  ].map(x=>(
                    <div key={x.l} style={{background:C.section,borderRadius:8,padding:"8px 8px"}}>
                      <div style={{fontSize:"0.62rem",color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em"}}>{x.l}</div>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:x.c,marginTop:2}}>{x.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:"0.68rem",color:"#bbb",marginTop:8}}>Enova: {t.enova_program}</div>
              </div>
            ))}
            {!visAlle && tiltak.length > 5 && <button onClick={()=>setVisAlle(true)} style={{...S.btnG,width:"100%",textAlign:"center",marginTop:4}}>Vis alle {tiltak.length} tiltak ↓</button>}
          </div>
        )}

        {/* TEKNISKE DATA */}
        {fane === "detaljer" && (
          <div style={S.card}>
            <div style={S.h2}>Tekniske beregningsdata</div>
            <div style={{...S.sub,marginBottom:16}}>NS-EN ISO 52000 · TEK-historikk</div>
            {[["Boligtype",resultat.bolig.label],["Klimasone",resultat.klima.label],["Graddagstall (HDD)",resultat.klima.HDD+" °C·d/år"],["U-verdi vegger",resultat.u_vegg.toFixed(2)+" W/m²K"],["U-verdi tak",resultat.u_tak.toFixed(2)+" W/m²K"],["U-verdi vinduer",resultat.u_vindu.toFixed(2)+" W/m²K"],["Lufttetthet (n50)",resultat.lufttetthet.toFixed(1)+" 1/h"],["Oppvarmingssystem",resultat.oppvData.label],["SPF / virkningsgrad",resultat.oppvData.COP.toFixed(1)],["Levert energi",kwhPerM2+" kWh/m²/år"],["Primærenergi",primærPerM2+" kWh/m²/år"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.section}`,fontSize:"0.85rem"}}>
                <span style={{color:C.muted}}>{k}</span><span style={{fontWeight:700,color:C.navyDark}}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* EPBD */}
        {fane === "epbd" && (
          <div style={S.card}>
            <div style={S.h2}>EPBD 2024-status</div>
            <div style={{...S.sub,marginBottom:16}}>EU-direktiv 2024/1275</div>
            {[
              {krav:"EPBD 2030: F/G-boliger prioriteres for nasjonale krav",ok:merke.merke<="E",tekst:merke.merke<="E"?"Utenfor mest utsatt gruppe":"I gruppen som trolig prioriteres"},
              {krav:"EPBD 2035: skjerpede bestandsmål (−20–22 %)",ok:merke.merke<="D",tekst:merke.merke<="D"?"Godt posisjonert":"Tiltak anbefales"},
              {krav:"nZEB-standard (merke A/B)",ok:merke.merke<="B",tekst:merke.merke<="B"?"Tilfredsstiller nZEB":`Krever ned til ≤ 100 kWh/m²/år`},
              {krav:"Primærenergi < 225 kWh/m²",ok:primærPerM2<225,tekst:primærPerM2<225?`Oppfylt (${primærPerM2})`:`Overskrides (${primærPerM2})`},
            ].map(x=>(
              <div key={x.krav} style={{display:"flex",gap:12,padding:"13px 0",borderBottom:`1px solid ${C.section}`}}>
                <div style={{fontSize:"1.1rem"}}>{x.ok?"✅":"⚠️"}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.88rem",color:C.navyDark,marginBottom:2}}>{x.krav}</div>
                  <div style={{fontSize:"0.8rem",color:x.ok?C.green:C.gold}}>{x.tekst}</div>
                </div>
              </div>
            ))}
            <div style={{marginTop:14,background:C.section,borderRadius:10,padding:"12px 14px",fontSize:"0.78rem",color:C.muted,lineHeight:1.6}}>
              📋 Europaparlamentets direktiv 2024/1275/EU · Energimerkeforskriften (Norge)
            </div>
          </div>
        )}

        {/* ── OPPGRADERINGSPLAN-seksjoner ── */}
        {pakke === "oppgraderingsplan" && (() => {
          const høyAlle  = tiltak.filter(t => t.prioritet === "høy");
          const totInv   = høyAlle.reduce((s,t) => s + t.kostnad_snitt, 0);
          const totStøtte= høyAlle.reduce((s,t) => s + t.støtte_snitt, 0);
          const netto    = totInv - totStøtte;
          const totBes   = høyAlle.reduce((s,t) => s + t.besparelse_kr, 0);
          const breakEven= totBes > 0 ? Math.round(netto / totBes) : "–";
          const bestTiltak = høyAlle[0];
          const harIsolering = høyAlle.some(t => t.id.startsWith("isolering"));
          const harVentilasjon = høyAlle.some(t => t.id === "ventilasjon");
          const søknadstekst = `Jeg søker om støtte til energitiltak i min bolig. Boligen ble bygget i perioden ${resultat.bygData.label} og har i dag estimert energimerke ${merke.merke}. Tiltakene jeg planlegger å gjennomføre er: ${høyAlle.map(t=>t.navn).join(", ")}. Forventet energibesparelse er ca. ${høyAlle.reduce((s,t)=>s+Math.round((resultat.oppvarmingKwh??totalKwh)*t.kWh_pct),0).toLocaleString("no")} kWh per år, noe som tilsvarer ca. ${totBes.toLocaleString("no")} kroner i reduserte strømutgifter. Tiltakene vil forbedre boligens energimerke fra ${merke.merke} til estimert ${merkePotensial.merke}.`;

          return (
            <>
              {/* A – Økonomianalyse */}
              <div style={S.card}>
                <div style={S.h2}>💰 Økonomianalyse</div>
                <div style={{...S.sub,marginBottom:16}}>Totalbilde for alle anbefalte tiltak</div>
                <div className="be-grid-2" style={{marginBottom:10}}>
                  {[
                    { l:"Total investering",        v:`${Math.round(totInv/1000)} 000 kr`,  c:C.navyDark },
                    { l:"Total Enova-støtte",        v:`${Math.round(totStøtte/1000)} 000 kr`, c:C.green },
                    { l:"Netto kostnad etter støtte",v:`${Math.round(netto/1000)} 000 kr`,  c:C.navyDark },
                    { l:"Estimert årsbesparelse",   v:`${totBes.toLocaleString("no")} kr`, c:C.green },
                    { l:"Besparelse over 10 år",    v:`${(totBes*10).toLocaleString("no")} kr`, c:C.navyDark },
                    { l:"Besparelse over 20 år",    v:`${(totBes*20).toLocaleString("no")} kr`, c:C.navyDark },
                  ].map(x=>(
                    <div key={x.l} style={{background:C.section,borderRadius:10,padding:"12px 13px"}}>
                      <div style={{fontSize:"0.68rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4}}>{x.l}</div>
                      <div style={{fontSize:"1.05rem",fontWeight:900,color:x.c}}>{x.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{color:"rgba(255,255,255,0.7)",fontSize:"0.82rem",fontWeight:600}}>Break-even tidspunkt</span>
                  <span style={{color:C.greenLight,fontWeight:900,fontSize:"1.2rem"}}>{breakEven} år</span>
                </div>
              </div>

              {/* B – Handlingsplan */}
              <div style={S.card}>
                <div style={S.h2}>🎯 Din handlingsplan – Start her</div>
                <div style={{...S.sub,marginBottom:16}}>Prioritert rekkefølge for maksimal effekt</div>
                {bestTiltak && (
                  <div style={{background:`linear-gradient(135deg,${C.green}18,${C.greenLight}10)`,border:`2px solid ${C.green}50`,borderRadius:14,padding:"16px 18px",marginBottom:14}}>
                    <div className="be-beste-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{fontWeight:800,fontSize:"0.95rem",color:C.navyDark}}>{bestTiltak.ikon} {bestTiltak.navn}</div>
                      <span style={{background:C.green,color:C.white,borderRadius:100,padding:"3px 10px",fontSize:"0.68rem",fontWeight:800,flexShrink:0}}>BESTE INVESTERING NÅ</span>
                    </div>
                    <div style={{fontSize:"0.8rem",color:C.muted,marginBottom:10}}>{bestTiltak.beskrivelse}</div>
                    <div className="be-grid-3" style={{gap:8}}>
                      {[
                        {l:"Tilbakebetaling",v:bestTiltak.tilbakebetaling<=30?`${bestTiltak.tilbakebetaling} år`:">30 år"},
                        {l:"Enova-støtte",v:`inntil ${(bestTiltak.støtte_max/1000).toFixed(0)}k kr`},
                        {l:"Årsbesparelse",v:`~${bestTiltak.besparelse_kr.toLocaleString("no")} kr`},
                      ].map(x=>(
                        <div key={x.l} style={{background:"white",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                          <div style={{fontSize:"0.63rem",color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{x.l}</div>
                          <div style={{fontSize:"0.82rem",fontWeight:800,color:C.navyDark,marginTop:2}}>{x.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {høyAlle.slice(1).map((t,i) => (
                  <div key={t.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.section}`}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:C.navy,color:C.white,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",fontWeight:800,flexShrink:0}}>{i+2}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:"0.85rem",color:C.navyDark}}>{t.ikon} {t.navn}</div>
                      <div style={{fontSize:"0.74rem",color:C.muted}}>{t.tilbakebetaling<=30?`${t.tilbakebetaling} år tilbakebetaling`:"Lang sikt"} · ~{t.besparelse_kr.toLocaleString("no")} kr/år</div>
                    </div>
                  </div>
                ))}
                {harIsolering && harVentilasjon && (
                  <div style={{marginTop:12,background:`${C.green}10`,border:`1px solid ${C.green}30`,borderRadius:10,padding:"10px 13px",fontSize:"0.79rem",color:C.navyDark,lineHeight:1.55}}>
                    💡 <strong>Tips:</strong> Etterisolering og balansert ventilasjon gjøres gjerne samtidig – tettere bygg krever mekanisk ventilasjon for godt inneklima.
                  </div>
                )}
              </div>

              {/* C – Enova-søknadspakke */}
              <div style={S.card}>
                <div style={S.h2}>📋 Enova-søknadspakke</div>
                <div style={{...S.sub,marginBottom:16}}>Dokumentasjonskrav per tiltak</div>
                {høyAlle.map(t => (
                  <div key={t.id} style={{border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6,gap:8}}>
                      <div style={{fontWeight:700,fontSize:"0.86rem",color:C.navyDark}}>{t.ikon} {t.navn}</div>
                      <span style={{color:C.green,fontWeight:700,fontSize:"0.78rem",flexShrink:0}}>inntil {(t.støtte_max/1000).toFixed(0)}k kr</span>
                    </div>
                    <div style={{fontSize:"0.76rem",color:C.muted,marginBottom:8,lineHeight:1.5}}>
                      📄 {ENOVA_DOCS[t.id] || "Faktura fra godkjent fagperson, teknisk dokumentasjon"}
                    </div>
                    <a href="https://www.enova.no/privat/alle-energitiltak/" target="_blank" rel="noopener noreferrer"
                      style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:"0.75rem",fontWeight:700,color:C.navy,textDecoration:"none",background:C.section,borderRadius:6,padding:"5px 10px"}}>
                      Søk på enova.no →
                    </a>
                  </div>
                ))}
              </div>

              {/* D – Ferdig søknadstekst */}
              <div style={S.card}>
                <div style={S.h2}>✍️ Klar søknadstekst for Enova</div>
                <div style={{...S.sub,marginBottom:12}}>Kopier og lim inn i Enova-søknaden din</div>
                <div style={{background:C.section,borderRadius:10,padding:"14px 16px",fontSize:"0.82rem",color:C.navyDark,lineHeight:1.7,marginBottom:12,fontStyle:"italic"}}>
                  {søknadstekst}
                </div>
                <button
                  style={{...S.btnG,display:"flex",alignItems:"center",gap:7,fontSize:"0.82rem"}}
                  onClick={() => {
                    navigator.clipboard.writeText(søknadstekst).then(() => {
                      setKopiert(true);
                      setTimeout(() => setKopiert(false), 2500);
                    });
                  }}
                >
                  {kopiert ? "✓ Kopiert!" : "📋 Kopier tekst"}
                </button>
              </div>

              {/* E – Finansieringstips */}
              <div style={S.card}>
                <div style={S.h2}>🏦 Finansieringstips</div>
                <div style={{display:"grid",gap:10}}>
                  {[
                    { ikon:"🏦", tittel:"Grønt boliglån", tekst:"Mange banker tilbyr lavere rente ved energioppgradering til A eller B-merke. Sjekk med din bank – besparelsen kan være 0,2–0,5 % poeng i redusert rente." },
                    { ikon:"🏠", tittel:"Husbanken grønt lån", tekst:<>Kan gi gunstig finansiering for energioppgradering av eldre boliger. <a href="https://www.husbanken.no" target="_blank" rel="noopener noreferrer" style={{color:C.navy,fontWeight:700}}>Les mer på husbanken.no →</a></> },
                    { ikon:"🔧", tittel:"Kombiner tiltak for lavere kostnad", tekst:"Bestill flere tiltak hos samme håndverker – du reduserer riggkostnader og får ofte bedre totalpris. Mange tilbyr pakkepriser." },
                  ].map(x=>(
                    <div key={x.tittel} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 14px",background:C.section,borderRadius:12}}>
                      <span style={{fontSize:"1.3rem",flexShrink:0}}>{x.ikon}</span>
                      <div>
                        <div style={{fontWeight:700,fontSize:"0.85rem",color:C.navyDark,marginBottom:3}}>{x.tittel}</div>
                        <div style={{fontSize:"0.78rem",color:C.muted,lineHeight:1.55}}>{x.tekst}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

        {/* Lead capture */}
        <div style={{...S.card,border:`1.5px solid ${C.green}40`,marginTop:8}}>
          {leadSendt ? (
            <div style={{textAlign:"center",padding:"16px 0"}}>
              <div style={{fontSize:"2rem",marginBottom:10}}>🙌</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.1rem",color:C.navyDark,marginBottom:6}}>Takk!</div>
              <div style={{fontSize:"0.88rem",color:C.muted,lineHeight:1.6}}>Vi tar kontakt innen 1–2 virkedager.</div>
            </div>
          ) : (
            <>
              <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:16}}>
                <div style={{fontSize:"1.8rem",flexShrink:0}}>🔨</div>
                <div>
                  <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.05rem",color:C.navyDark,marginBottom:4}}>Vil du ha hjelp med gjennomføringen?</div>
                  <div style={{fontSize:"0.82rem",color:C.muted,lineHeight:1.55}}>Vi kan koble deg med kvalifiserte håndverkere i ditt område for tiltakene i rapporten din.</div>
                </div>
              </div>
              <div style={{display:"grid",gap:10,marginBottom:12}}>
                <div>
                  <label style={S.lbl}>Navn</label>
                  <input style={S.inp} type="text" placeholder="Ola Nordmann" value={leadNavn} onChange={e=>setLeadNavn(e.target.value)}/>
                </div>
                <div>
                  <label style={S.lbl}>Telefonnummer</label>
                  <input style={S.inp} type="tel" placeholder="400 00 000" value={leadTlf} onChange={e=>setLeadTlf(e.target.value)}/>
                </div>
              </div>
              <button
                style={{...S.btnP,background:`linear-gradient(135deg,${C.green},${C.greenLight})`,boxShadow:`0 6px 20px ${C.green}44`,opacity:leadLaster?0.7:1}}
                disabled={leadLaster}
                onClick={async () => {
                  if (!leadNavn.trim() || !leadTlf.trim()) return;
                  setLeadLaster(true);
                  const top3 = tiltak.filter(t=>t.prioritet==="høy").slice(0,3).map(t=>t.navn);
                  try {
                    await fetch(`${BACKEND}/api/lead`, {
                      method:"POST", headers:{"Content-Type":"application/json"},
                      body: JSON.stringify({ navn: leadNavn, telefon: leadTlf, epost, merke: merke.merke, tiltak: top3 }),
                    });
                  } catch(_) {}
                  setLeadSendt(true);
                  setLeadLaster(false);
                }}
              >
                {leadLaster ? "Sender…" : "Ja, kontakt meg →"}
              </button>
            </>
          )}
        </div>

        <div style={{textAlign:"center",marginTop:8}}>
          <button onClick={onNullstill} style={S.btnG}>Analyser en annen bolig →</button>
        </div>
        <p style={{textAlign:"center",fontSize:"0.68rem",color:"#bbb",lineHeight:1.6,marginTop:12}}>
          Estimat iht. NS-EN ISO 52000 og TEK-historikk. For offisielt merke kreves godkjent energirådgiver.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// KNOWLEDGE HUB (Lær mer)
// ─────────────────────────────────────────────
function KunnskapsHub() {
  const [fane, setFane] = useState("energimerking");
  const [nyheter, setNyheter]   = useState(null);
  const [nyLaster, setNyLaster] = useState(false);
  const [nyFeil, setNyFeil]     = useState(false);

  useEffect(() => {
    if (fane === "nyheter" && nyheter === null) hentNyheter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fane, nyheter]);

  async function hentNyheter(tving = false) {
    setNyLaster(true); setNyFeil(false);
    try {
      const res  = await fetch(`${BACKEND}/api/nyheter`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ tving }) });
      const data = await res.json();
      if (data.feil) throw new Error(data.feil);
      setNyheter(data.nyheter);
    } catch (_) { setNyFeil(true); }
    setNyLaster(false);
  }

  const fanestil = aktiv => ({
    padding:"9px 13px", border:"none", cursor:"pointer", fontWeight:700,
    fontSize:"0.77rem", borderRadius:8, whiteSpace:"nowrap",
    background: aktiv ? C.navy : "transparent",
    color:      aktiv ? C.white : C.muted,
    transition:"all .15s",
  });

  return (
    <div style={{marginTop:28}}>
      <div style={{textAlign:"center",marginBottom:14}}>
        <div style={S.tag}>Lær mer</div>
        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.05rem",color:C.navyDark}}>Kunnskapsbase om energimerking</div>
      </div>
      <div style={{display:"flex",gap:4,background:C.section,borderRadius:12,padding:5,overflowX:"auto",marginBottom:0}}>
        {[["energimerking","Energimerking"],["enova","Enova 2025"],["lover","Lover & regler"],["nyheter","Nyheter"]].map(([id,lbl])=>(
          <button key={id} style={fanestil(fane===id)} onClick={()=>setFane(id)}>{lbl}</button>
        ))}
      </div>
      <div style={{...S.card,borderRadius:"0 0 20px 20px",borderTop:"none",marginTop:0,borderTopLeftRadius:0,borderTopRightRadius:0}}>

        {/* TAB 1 – Energimerking forklart */}
        {fane === "energimerking" && (
          <div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.1rem",color:C.navyDark,marginBottom:12}}>Energimerking A–G forklart</div>

            {/* Visuell skala. Grensene er AREALAVHENGIGE – her vist for en bolig på 120 m².
                Kilde: Enovas karakterskala for småhus/leiligheter */}
            <div style={{marginBottom:18}}>
              {[
                {m:"A",farge:"#00a651",maks:"≤ 102",tekst:"Svært energieffektiv – krever tetthetskontroll"},
                {m:"B",farge:"#57b946",maks:"≤ 133",tekst:"TEK17-nivå – god standard"},
                {m:"C",farge:"#b5d334",maks:"≤ 166",tekst:"Over middels – moderne bygg"},
                {m:"D",farge:"#ffd200",maks:"≤ 209",tekst:"Middels – typisk 1990-tallsbolig"},
                {m:"E",farge:"#f7941d",maks:"≤ 253",tekst:"Under middels – eldre bolig"},
                {m:"F",farge:"#ed1c24",maks:"≤ 317",tekst:"Dårlig – bør oppgraderes"},
                {m:"G",farge:"#9e1a20",maks:"> 317",tekst:"Svært dårlig – høy prioritet"},
              ].map(r => (
                <div key={r.m} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <div style={{width:28,height:28,borderRadius:7,background:r.farge,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:"0.9rem",flexShrink:0}}>{r.m}</div>
                  <div style={{flex:1,height:10,background:r.farge,borderRadius:100,opacity:0.25,position:"relative"}}>
                    <div style={{position:"absolute",inset:0,background:r.farge,borderRadius:100,width:"100%",opacity:0.85}}/>
                  </div>
                  <div style={{fontSize:"0.72rem",color:C.navyDark,fontWeight:700,flexShrink:0,width:60,textAlign:"right"}}>{r.maks} kWh</div>
                </div>
              ))}
              <div style={{fontSize:"0.7rem",color:C.muted,marginTop:6}}>Tall i kWh/m²/år (levert energi) – eksempel for 120 m² bolig. Grensene er romsligere for små boliger og strengere for store.</div>
            </div>

            <div style={{display:"grid",gap:10}}>
              {[
                {ikon:"📐", tittel:"Hvordan beregnes energimerket?", tekst:"Energimerket beregnes ut fra boligens leverte energi per m² per år (NS 3031), med normert Oslo-klima og standardisert bruk – uansett hvor i landet boligen står. Karaktergrensene avhenger av boligens areal: for en bolig på 120 m² går grensen for B ved ca. 133 kWh/m², for en på 250 m² ved ca. 126 kWh/m²."},
                {ikon:"💰", tittel:"Hvorfor betyr energimerket noe for boligverdien?", tekst:"Studier viser at boliger med energimerke A eller B kan selges for 3–8 % mer enn tilsvarende boliger med lavere merke. I tillegg gir godt energimerke tilgang til grønne boliglån med 0,2–0,5 % lavere rente."},
                {ikon:"🤔", tittel:"Vanlige misforståelser", tekst:"Mange tror at nye vinduer alene gir A-merke – det stemmer ikke. Det er den totale varmebalansen som teller. En gammel enebolig med god varmepumpe og etterpolert tak kan slå en ny enebolig med dårlig oppvarming. Oppvarmingssystemet teller mye."},
                {ikon:"🏛️", tittel:"Estimat vs. offisielt merke", tekst:"BoligEffekts merke er et estimat basert på statistiske data for byggeår og standard. Et offisielt energimerke krever befaring av godkjent energirådgiver og registrering i Enovas database. Det offisielle merket er påkrevet ved salg og utleie."},
              ].map(x=>(
                <div key={x.tittel} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"11px 13px",background:C.section,borderRadius:12}}>
                  <span style={{fontSize:"1.2rem",flexShrink:0}}>{x.ikon}</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:"0.84rem",color:C.navyDark,marginBottom:3}}>{x.tittel}</div>
                    <div style={{fontSize:"0.77rem",color:C.muted,lineHeight:1.6}}>{x.tekst}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2 – Enova-guiden 2025 */}
        {fane === "enova" && (
          <div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.1rem",color:C.navyDark,marginBottom:4}}>Enova-guiden 2025</div>
            <div style={{...S.sub,marginBottom:16}}>Oppdaterte støttebeløp og søknadsveiledning. Søk alltid via enova.no.</div>

            {/* Støtteoversikt – Kilde: Enova august 2025 */}
            <div style={{display:"grid",gap:7,marginBottom:18}}>
              {[
                {tiltak:"Luft/luft-varmepumpe",       min:0,     max:0,     krav:"Ingen Enova-støtte fra august 2025 (avviklet)"},
                {tiltak:"Luft/vann-varmepumpe",        min:5000,  max:20000, krav:"25 % av kostnad, maks 20 000 kr – krever vannbåren varme"},
                {tiltak:"Bergvarme (væske-til-vann)",  min:10000, max:40000, krav:"25 % av kostnad, maks 40 000 kr – søk FØR installasjon"},
                {tiltak:"Etterisolering loft/tak",     min:5000,  max:22500, krav:"25 % av kostnad, maks 150 kr/kvm, maks 150 kvm – kun boliger før 1997"},
                {tiltak:"Etterisolering yttervegger",  min:5000,  max:37500, krav:"25 % av kostnad, maks 150 kr/kvm, maks 250 kvm – kun boliger før 1997"},
                {tiltak:"3-lags vinduer/ytterdører",   min:2000,  max:20000, krav:"25 % av kostnad, maks 400 kr/kvm, maks 50 kvm – kun boliger før 1997"},
                {tiltak:"Balansert ventilasjon m/VGJ", min:5000,  max:15000, krav:"25 % av kostnad, maks 15 000 kr"},
                {tiltak:"Solcelleanlegg",              min:10000, max:37500, krav:"2 500 kr/kW, maks 15 kW (maks 37 500 kr)"},
                {tiltak:"Varmepumpebereder",           min:1250,  max:5000,  krav:"25 % av kostnad, maks 5 000 kr"},
                {tiltak:"Smart varmtvannsbereder",     min:1000,  max:4000,  krav:"25 % av kostnad, maks 4 000 kr"},
                {tiltak:"Energilagring (batteri)",     min:2500,  max:10000, krav:"25 % av kostnad, maks 10 000 kr"},
                {tiltak:"Energirådgivning",            min:1250,  max:5000,  krav:"25 % av kostnad, maks 5 000 kr – sertifisert rådgiver"},
              ].map(x=>(
                <div key={x.tiltak} style={{borderRadius:10,padding:"11px 13px",background:C.section}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                    <div style={{fontWeight:700,fontSize:"0.83rem",color:C.navyDark}}>{x.tiltak}</div>
                    <div style={{fontWeight:800,fontSize:"0.88rem",color:x.max===0?"#e53e3e":C.green,flexShrink:0}}>{x.max===0?"Ingen støtte":`${x.min.toLocaleString("no")}–${x.max.toLocaleString("no")} kr`}</div>
                  </div>
                  <div style={{fontSize:"0.71rem",color:C.muted,marginTop:3}}>{x.krav}</div>
                </div>
              ))}
            </div>

            <div style={{textAlign:"center",fontSize:"0.7rem",color:"#bbb",marginBottom:14}}>Satser per juni 2026 · Maks 100 000 kr per bolig 2025–2028 · Kun helårsbolig (ikke fritidsbolig) · Søk FØR oppstart</div>

            {/* Søknadssteg – steg 1 synlig, resten låst */}
            <div style={{fontWeight:700,fontSize:"0.9rem",color:C.navyDark,marginBottom:10}}>Slik søker du Enova-støtte – steg for steg</div>
            <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:C.navy,color:C.white,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",fontWeight:800,flexShrink:0}}>1</div>
              <div>
                <div style={{fontWeight:700,fontSize:"0.83rem",color:C.navyDark,marginBottom:2}}>Kontroller at du kvalifiserer</div>
                <div style={{fontSize:"0.76rem",color:C.muted,lineHeight:1.55}}>Tiltaket må gjelde din primærbolig. Du kan ikke ha startet arbeidet før søknaden er godkjent.</div>
              </div>
            </div>

            {/* Blurred rest with overlay */}
            <div style={{position:"relative",marginBottom:14}}>
              <div style={{filter:"blur(3px)",userSelect:"none",pointerEvents:"none",opacity:0.5}}>
                {[
                  ["2","Innhent pristilbud","Få minst ett skriftlig tilbud fra godkjent installatør eller håndverker som dokumenterer tiltaket."],
                  ["3","Søk på enova.no","Gå til enova.no/privat → velg ditt tiltak → fyll ut søknadsskjemaet. Ta vare på søknadsnummeret."],
                ].map(([nr,tittel,tekst])=>(
                  <div key={nr} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:C.navy,color:C.white,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",fontWeight:800,flexShrink:0}}>{nr}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:"0.83rem",color:C.navyDark,marginBottom:2}}>{tittel}</div>
                      <div style={{fontSize:"0.76rem",color:C.muted,lineHeight:1.55}}>{tekst}</div>
                    </div>
                  </div>
                ))}
                <div style={{fontWeight:700,fontSize:"0.9rem",color:C.navyDark,margin:"16px 0 10px"}}>Vanlige spørsmål om Enova-støtte</div>
                <div style={{border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",marginBottom:8}}>
                  <div style={{fontWeight:700,fontSize:"0.81rem",color:C.navyDark,marginBottom:4}}>Kan jeg kombinere flere tiltak i én søknad?</div>
                  <div style={{fontSize:"0.76rem",color:C.muted,lineHeight:1.55}}>Ja, du kan søke om støtte til flere tiltak samtidig.</div>
                </div>
              </div>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{background:C.white,borderRadius:14,padding:"16px 20px",boxShadow:"0 8px 32px rgba(27,58,92,0.13)",textAlign:"center",border:`1.5px solid ${C.green}40`,maxWidth:220}}>
                  <div style={{fontSize:"1.3rem",marginBottom:6}}>🔒</div>
                  <div style={{fontWeight:800,fontSize:"0.88rem",color:C.navyDark,marginBottom:4}}>Full guide i Energirapport</div>
                  <div style={{fontSize:"0.73rem",color:C.muted,lineHeight:1.45}}>Komplett søknadsveiledning og FAQ følger med rapporten</div>
                </div>
              </div>
            </div>

            <a href="https://www.enova.no/privat/alle-energitiltak/" target="_blank" rel="noopener noreferrer"
              style={{display:"block",marginTop:14,textAlign:"center",background:`linear-gradient(135deg,${C.green},${C.greenLight})`,color:C.white,borderRadius:10,padding:"12px",fontWeight:700,fontSize:"0.88rem",textDecoration:"none"}}>
              Søk Enova-støtte på enova.no →
            </a>
          </div>
        )}

        {/* TAB 3 – Lover & regler */}
        {fane === "lover" && (
          <div>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.1rem",color:C.navyDark,marginBottom:12}}>Lover & regler</div>

            <div style={{display:"grid",gap:12,marginBottom:18}}>
              {[
                {tag:"TEK17",farge:C.navy,tittel:"Teknisk forskrift 2017 (TEK17)",tekst:"Gjeldende byggeforskrift i Norge. Stiller krav til U-verdier (vegg ≤ 0,18, tak ≤ 0,13 W/m²K), lufttetthet (n50 ≤ 0,6/h) og primærenergibehov ≤ 120 kWh/m²/år for nye bygg. Gjelder for nybygg og større rehabiliteringsprosjekter.",lenke:"https://lovdata.no/dokument/SF/forskrift/2017-06-19-840"},
                {tag:"EPBD 2024",farge:"#6d28d9",tittel:"EU-direktiv 2024/1275 (EPBD recast)",tekst:"EUs reviderte bygningsenergidirektiv. For boliger: snittforbruket i hele boligmassen skal ned 16 % innen 2030 og 20–22 % innen 2035, og minst 55 % av kuttet skal komme fra de 43 % dårligste byggene. Merk: kravene om minimum merke E (2030) / D (2033) gjelder YRKESBYGG, ikke boliger. Norsk innføring er ikke endelig vedtatt (EØS-prosess).",lenke:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024L1275"},
                {tag:"Energimerkeforskriften",farge:C.green,tittel:"Energimerkeforskriften (FOR-2009-12-18-1665)",tekst:"Norsk forskrift som pålegger selgere og utleiere å fremlegge gyldig energiattest. Offisielt merke utstedes av godkjent energirådgiver via NVEs/Enovas portal og er gyldig i 10 år. Manglende energiattest ved salg kan gi kjøper krav på prisavslag.",lenke:"https://lovdata.no/dokument/SF/forskrift/2009-12-18-1665"},
                {tag:"NS-EN ISO 52000",farge:C.gold,tittel:"NS-EN ISO 52000 – Energiytelse i bygninger",tekst:"Europeisk standard som definerer beregningsmetodikk for levert energi, primærenergi og energimerking av bygninger. BoligEffekt bruker en forenklet beregning basert på denne standarden kombinert med norske TEK-historikkdata og klimakorreksjoner.",lenke:"https://www.standard.no"},
              ].map(x=>(
                <div key={x.tag} style={{border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderLeft:`4px solid ${x.farge}`}}>
                  <span style={{fontSize:"0.68rem",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:x.farge}}>{x.tag}</span>
                  <div style={{fontWeight:700,fontSize:"0.86rem",color:C.navyDark,margin:"4px 0 5px"}}>{x.tittel}</div>
                  <div style={{fontSize:"0.77rem",color:C.muted,lineHeight:1.6,marginBottom:8}}>{x.tekst}</div>
                  <a href={x.lenke} target="_blank" rel="noopener noreferrer" style={{fontSize:"0.72rem",color:C.navy,fontWeight:700,textDecoration:"none"}}>Les mer →</a>
                </div>
              ))}
            </div>

            {/* Tidslinje */}
            <div style={{fontWeight:700,fontSize:"0.9rem",color:C.navyDark,marginBottom:12}}>Tidslinje: krav som gjelder deg</div>
            {[
              {ar:"2026",farge:C.gold,tekst:"Frist for EU-landene å innføre EPBD 2024 i nasjonal rett (mai 2026). Norge er i EØS-prosess – endelige norske regler er ikke vedtatt."},
              {ar:"2030",farge:"#f7941d",tekst:"EU-mål: snittforbruket i boligmassen ned 16 %. Minst 55 % av kuttet skal tas i de dårligste byggene – F/G-boliger prioriteres for krav og virkemidler."},
              {ar:"2035",farge:"#ed1c24",tekst:"EU-mål: snittforbruket i boligmassen ned 20–22 %. Dårlig energimerke kan da i økende grad påvirke boligverdi og lånevilkår."},
              {ar:"2050",farge:C.navyDark,tekst:"Mål om klimanøytral bygningsmasse i hele EU/EØS. Nullutslippsstandard blir normen for nybygg."},
            ].map(x=>(
              <div key={x.ar} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
                <div style={{background:x.farge,color:"#fff",borderRadius:8,padding:"4px 8px",fontSize:"0.72rem",fontWeight:800,flexShrink:0,minWidth:40,textAlign:"center"}}>{x.ar}</div>
                <div style={{fontSize:"0.77rem",color:C.muted,lineHeight:1.55,paddingTop:2}}>{x.tekst}</div>
              </div>
            ))}

            <div style={{marginTop:14,background:C.section,borderRadius:10,padding:"11px 14px"}}>
              <div style={{fontWeight:700,fontSize:"0.8rem",color:C.navyDark,marginBottom:6}}>Offisielle kilder</div>
              {[
                ["DIBK.no – Direktoratet for byggkvalitet","https://www.dibk.no"],
                ["Lovdata – Energimerkeforskriften","https://lovdata.no/dokument/SF/forskrift/2009-12-18-1665"],
                ["Regjeringen.no – Energieffektivisering","https://www.regjeringen.no/no/tema/energi/energieffektivisering/id2340647/"],
                ["NVE – Energimerking av bygg","https://www.nve.no/energibruk-og-effektivisering/energimerking-av-bygg/"],
                ["Enova – Alle energitiltak","https://www.enova.no/privat/alle-energitiltak/"],
                ["Husbanken – Grønne lån","https://www.husbanken.no/lan/gronne-lan/"],
              ].map(([lbl,href])=>(
                <a key={lbl} href={href} target="_blank" rel="noopener noreferrer"
                  style={{display:"block",fontSize:"0.75rem",color:C.navy,fontWeight:600,textDecoration:"none",marginBottom:4}}>
                  {lbl} →
                </a>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4 – Nyheter */}
        {fane === "nyheter" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.1rem",color:C.navyDark}}>Aktuelt om energi</div>
                <div style={{fontSize:"0.76rem",color:C.muted,marginTop:2}}>KI-generert oppsummering – kan inneholde feil, sjekk kildene</div>
              </div>
              <button
                onClick={()=>hentNyheter(true)}
                disabled={nyLaster}
                style={{...S.btnG,fontSize:"0.75rem",opacity:nyLaster?0.6:1}}
              >
                {nyLaster ? "Laster…" : "Oppdater nyheter"}
              </button>
            </div>

            {nyLaster && (
              <div style={{textAlign:"center",padding:"32px 0",color:C.muted,fontSize:"0.85rem"}}>
                <div style={{fontSize:"1.5rem",marginBottom:8}}>⏳</div>
                Henter siste nyheter…
              </div>
            )}

            {nyFeil && !nyLaster && (
              <div style={{background:"#fff3f3",border:"1px solid #fca5a5",borderRadius:12,padding:"16px 18px",textAlign:"center"}}>
                <div style={{fontSize:"1.3rem",marginBottom:6}}>😕</div>
                <div style={{fontWeight:700,color:"#dc2626",fontSize:"0.85rem",marginBottom:4}}>Kunne ikke hente nyheter akkurat nå</div>
                <div style={{fontSize:"0.77rem",color:C.muted}}>Sjekk nettforbindelsen og prøv igjen.</div>
              </div>
            )}

            {nyheter && !nyLaster && (
              <div style={{display:"grid",gap:12}}>
                {nyheter.map((n, i) => (
                  <div key={i} style={{border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",background:C.white}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
                      <div style={{fontWeight:700,fontSize:"0.88rem",color:C.navyDark,lineHeight:1.4}}>{n.tittel}</div>
                      <span style={{background:C.section,borderRadius:100,padding:"3px 9px",fontSize:"0.67rem",fontWeight:700,color:C.muted,whiteSpace:"nowrap",flexShrink:0}}>{n.dato}</span>
                    </div>
                    <div style={{fontSize:"0.78rem",color:C.muted,lineHeight:1.6,marginBottom:8}}>{n.sammendrag}</div>
                    <div style={{fontSize:"0.7rem",color:C.green,fontWeight:700}}>{n.kilde}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AI CHATBOT
// ─────────────────────────────────────────────
function Chatbot() {
  const [aapen, setAapen]       = useState(false);
  const [historikk, setHistorikk] = useState([
    { rolle:"assistant", innhold:"Hei! Jeg er BoligEffekt-assistenten. Spør meg om energimerking, Enova-støtte eller TEK17 👋" }
  ]);
  const [melding, setMelding]   = useState("");
  const [laster, setLaster]     = useState(false);
  const msgsRef = React.useRef(null);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [historikk, laster]);

  async function send() {
    const tekst = melding.trim();
    if (!tekst || laster) return;
    const nyHistorikk = [...historikk, { rolle:"user", innhold: tekst }];
    setHistorikk(nyHistorikk);
    setMelding("");
    setLaster(true);
    try {
      const res  = await fetch(`${BACKEND}/api/chat`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ melding: tekst, historikk }),
      });
      const data = await res.json();
      setHistorikk([...nyHistorikk, { rolle:"assistant", innhold: data.svar || "Beklager, prøv igjen." }]);
    } catch (_) {
      setHistorikk([...nyHistorikk, { rolle:"assistant", innhold:"Beklager, jeg kunne ikke svare akkurat nå. Sjekk nettforbindelsen og prøv igjen." }]);
    }
    setLaster(false);
  }

  return (
    // Posisjon styres av .be-chat-root i index.css (media queries) – window.innerWidth i render
    // oppdateres ikke ved resize/rotasjon og ga feil plassering på mobil.
    <div className="be-chat-root" style={{position:"fixed",right:20,zIndex:1000,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10}}>
      {aapen && (
        <div className="be-chat-window" style={{background:C.white,borderRadius:18,boxShadow:"0 12px 48px rgba(27,58,92,0.18)",border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Header */}
          <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{color:C.white,fontWeight:700,fontSize:"0.9rem"}}>BoligEffekt Assistent</div>
              <div style={{color:"rgba(255,255,255,0.55)",fontSize:"0.72rem"}}>Energirådgiver – svar på norsk</div>
            </div>
            <button onClick={()=>setAapen(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",color:C.white,borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>

          {/* Meldinger */}
          <div ref={msgsRef} style={{flex:1,overflowY:"auto",padding:"12px 12px 4px",display:"flex",flexDirection:"column",gap:8}}>
            {historikk.map((h, i) => (
              <div key={i} style={{display:"flex",justifyContent:h.rolle==="user"?"flex-end":"flex-start"}}>
                <div style={{
                  maxWidth:"82%", padding:"9px 12px", borderRadius:h.rolle==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",
                  background:h.rolle==="user"?`linear-gradient(135deg,${C.navy},${C.navyMid})`:C.section,
                  color:h.rolle==="user"?C.white:C.navyDark,
                  fontSize:"0.8rem", lineHeight:1.55,
                }}>
                  {h.innhold}
                </div>
              </div>
            ))}
            {laster && (
              <div style={{display:"flex",justifyContent:"flex-start"}}>
                <div style={{padding:"9px 14px",borderRadius:"14px 14px 14px 4px",background:C.section,fontSize:"0.8rem",color:C.muted,display:"flex",gap:4,alignItems:"center"}}>
                  {/* be-pulse-dot finnes i index.css – «pulse» gjorde det ikke, så prikkene sto stille */}
                  <span style={{animation:"be-pulse-dot 1s infinite"}}>●</span>
                  <span style={{animation:"be-pulse-dot 1s 0.2s infinite"}}>●</span>
                  <span style={{animation:"be-pulse-dot 1s 0.4s infinite"}}>●</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{padding:"10px 10px 12px",borderTop:`1px solid ${C.section}`,display:"flex",gap:7}}>
            <input
              aria-label="Skriv spørsmål til assistenten"
              style={{flex:1,minWidth:0,padding:"9px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:"1rem",color:C.navyDark,background:"#fafafa",outline:"none"}}
              placeholder="Skriv spørsmål…"
              value={melding}
              onChange={e=>setMelding(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&send()}
              disabled={laster}
            />
            <button
              onClick={send}
              disabled={laster||!melding.trim()}
              style={{background:`linear-gradient(135deg,${C.green},${C.greenLight})`,border:"none",color:C.white,borderRadius:10,width:38,cursor:laster||!melding.trim()?"not-allowed":"pointer",opacity:laster||!melding.trim()?0.5:1,fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center"}}
            >→</button>
          </div>
        </div>
      )}

      {/* Boble-knapp */}
      <button
        onClick={()=>setAapen(!aapen)}
        style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,border:"none",color:C.white,fontSize:"1.4rem",cursor:"pointer",boxShadow:"0 6px 20px rgba(27,58,92,0.28)",display:"flex",alignItems:"center",justifyContent:"center",transition:"transform .15s"}}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.08)"}
        onMouseLeave={e=>e.currentTarget.style.transform=""}
        title="BoligEffekt Assistent"
        aria-label={aapen ? "Lukk chat" : "Åpne chat med BoligEffekt-assistenten"}
      >
        {aapen ? "×" : "💬"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// HOVED-APP
// ─────────────────────────────────────────────
const MODAL_INNHOLD = {
  personvern: {
    tittel: "Personvernerklæring",
    tekst: "BoligEffekt behandler kun informasjonen du oppgir i kalkulatoren for å beregne energimerke og gi anbefalinger. Vi lagrer ikke personopplysninger uten ditt samtykke. Ved kjøp av rapport lagres e-postadressen din for å sende rapporten. Betaling håndteres av Stripe og vi har ikke tilgang til kortinformasjon. Kontakt: kontakt@boligeffekt.no. Behandlingsansvarlig: BoligEffekt AS.",
  },
  vilkår: {
    tittel: "Vilkår for bruk",
    tekst: "BoligEffekts energianalyse er et estimeringsverktøy basert på NS-EN ISO 52000 og TEK-historikk. Resultatene er veiledende og ikke et offisielt energimerke. For offisielt energimerke kreves godkjent energirådgiver. BoligEffekt AS er ikke ansvarlig for beslutninger tatt på bakgrunn av estimatene. Kjøp av rapport gir engangstilgang. Ingen refusjon etter at rapporten er generert og sendt.",
  },
  ki: {
    tittel: "Bruk av kunstig intelligens",
    tekst: "BoligEffekt bruker KI på to måter: 1) Chatboten drives av Claude AI fra Anthropic og gir generelle svar om energimerking og Enova. Chatboten erstatter ikke profesjonell rådgivning. 2) Nyhetsoppsummeringer genereres av KI basert på kjent informasjon om energimerking og Enova i Norge. Selve energiberegningen er regelbasert og følger NS-EN ISO 52000 og TEK-historikk.",
  },
};

export default function App() {
  const [skjerm, setSkjerm]         = useState("start");
  const [steg, setSteg]             = useState(0);
  const [svar, setSvar]             = useState({});
  const [oppvarmingValg, setOppvarmingValg] = useState([]); // [{kilde, andel}]
  const [avForm, setAvForm]         = useState({ areal:"", byggeår:"", boligtype:"enebolig", klimasone:"3", oppvarming:"direkte_el", vinduer_type:"dobbel", isolering_nivå:"normal", antall_etasjer:2, adresse:"" });
  const [resultat, setResultat]     = useState(null);
  const [input, setInput]           = useState(null);
  const [betalt, setBetalt]         = useState(false);
  const [epost, setEpost]           = useState("");
  const [modal, setModal]           = useState(null);
  const [sessionId, setSessionId]   = useState(null);

  // Håndter Stripe-redirect tilbake til appen
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    const lagret = hentData();
    if (!lagret || !lagret.resultat) {
      // Skjer typisk når Stripe-checkout åpnes/fullføres i en annen nettleser/app-nettleser
      // på mobil – sessionStorage følger ikke med. Vis bekreftelse i stedet for å feile stille.
      console.error("[REDIRECT] Ingen lagret data i sessionStorage – kan ikke gjenopprette rapport");
      setSkjerm("betalt_uten_data");
      window.history.replaceState({}, "", "/");
      return;
    }

    console.log("[REDIRECT] Gjenoppretter rapport – e-post:", lagret.epost);

    setResultat(lagret.resultat);
    setInput(lagret.input);
    setEpost(lagret.epost || "");
    setSessionId(sessionId);
    setBetalt(true);
    setSkjerm("resultat");
    track("purchase_completed", { value: 399, currency: "NOK" });

    window.history.replaceState({}, "", "/");
  }, []);

  function lagOgVis(inp) {
    const r = beregnEnergi(inp);
    const t = beregnTiltak(r, inp);
    setResultat({ ...r, tiltak: t });
    setInput(inp);
    setBetalt(FREE_MODE);
    setSkjerm("resultat");
    track("quiz_completed", { grade: r.merke.merke });
  }

  function velg(verdi) {
    const nyttSvar = { ...svar, [STEG[steg].id]: verdi };
    setSvar(nyttSvar);
    if (steg < STEG.length - 1) { setTimeout(() => setSteg(steg + 1), 260); }
    else lagOgVis({ areal: nyttSvar.areal||100, byggeår: nyttSvar.byggeår||1978, boligtype: nyttSvar.boligtype||"enebolig", klimasone: nyttSvar.klimasone||"3", oppvarming: nyttSvar.oppvarming||"direkte_el", vinduer_type: nyttSvar.vinduer_type||"dobbel", isolering_nivå:"normal", antall_etasjer:2, adresse: (nyttSvar.adresse||"").trim() });
  }

  function nullstill() {
    setSkjerm("start"); setSteg(0); setSvar({}); setOppvarmingValg([]);
    setResultat(null); setInput(null); setBetalt(false); setSessionId(null);
  }

  // Betaling fullført, men resultatdata gikk tapt (f.eks. annen nettleser på mobil)
  if (skjerm === "betalt_uten_data") return (
    <div style={S.app}>
      <Header onHome={nullstill}/>
      <div style={S.wrap}>
        <div style={{...S.card,textAlign:"center",padding:"36px 24px"}}>
          <div style={{fontSize:"2.6rem",marginBottom:12}}>✅</div>
          <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:800,fontSize:"1.3rem",color:C.navyDark,marginBottom:10}}>Betalingen er mottatt</div>
          <div style={{fontSize:"0.88rem",color:C.muted,lineHeight:1.7,marginBottom:20}}>
            Vi fant ikke igjen analysen din i denne nettleseren (det kan skje hvis betalingen
            ble fullført i et annet vindu eller en app-nettleser på mobil).<br/><br/>
            Rapporten sendes til e-postadressen du oppga i betalingen. Hvis den ikke dukker opp
            innen kort tid, kontakt oss på <a href="mailto:kontakt@boligeffekt.no" style={{color:C.navy,fontWeight:700}}>kontakt@boligeffekt.no</a> – så ordner vi det.
          </div>
          <button onClick={nullstill} style={S.btnP}>Til forsiden →</button>
        </div>
      </div>
    </div>
  );

  // Resultat-skjerm
  if (skjerm === "resultat" && resultat) {
    if (betalt) {
      return <><OppgraderingsFlow resultat={resultat} epost={epost} input={input} sessionId={sessionId} onNullstill={nullstill}/><Chatbot/></>;
    }
    return <><Betalingsmur resultat={resultat} input={input} onBetalt={(e) => { setEpost(e); setBetalt(true); }} onNullstill={nullstill}/><Chatbot/></>;
  }

  // Avansert skjema
  if (skjerm === "avansert") return (
    <>
      <div style={S.app}>
        <Header onBack={nullstill} onHome={nullstill}/>
        <div style={S.wrap}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={S.tag}>Avansert analyse</div>
            <h1 style={S.h1}>Fyll inn boligdata</h1>
          </div>
          <div style={S.card}>
            {[{lbl:"Bruksareal BRA (m²)",key:"areal",type:"number",ph:"f.eks. 120"},{lbl:"Byggeår",key:"byggeår",type:"number",ph:"f.eks. 1978"}].map(f=>(
              <div key={f.key} style={{marginBottom:16}}>
                <label style={S.lbl}>{f.lbl}</label>
                <input style={S.inp} type={f.type} placeholder={f.ph} value={avForm[f.key]} onChange={e=>setAvForm({...avForm,[f.key]:e.target.value})}/>
              </div>
            ))}
            {[
              {lbl:"Boligtype",key:"boligtype",valg:BOLIGTYPER.map(b=>[b.id,b.label])},
              {lbl:"Klimasone",key:"klimasone",valg:KLIMASONER.map(k=>[k.id,k.label])},
              {lbl:"Oppvarming",key:"oppvarming",valg:Object.entries(OPPVARMING_DATA).map(([k,v])=>[k,v.label])},
              {lbl:"Vinduer",key:"vinduer_type",valg:[["enkelt","Enkeltglass / eldre"],["dobbel","2-lags isolerglass"],["trippel","3-lags / nye"]]},
              {lbl:"Isoleringsnivå",key:"isolering_nivå",valg:[["dårlig","Dårlig – kald og trekkfull"],["normal","Normal"],["oppgradert","Godt isolert"]]},
              {lbl:"Antall etasjer",key:"antall_etasjer",valg:[["1","1 etasje"],["2","2 etasjer"],["3","3+ etasjer"]]},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:16}}>
                <label style={S.lbl}>{f.lbl}</label>
                <select style={S.sel} value={avForm[f.key]} onChange={e=>setAvForm({...avForm,[f.key]:e.target.value})}>
                  {f.valg.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
            <div style={{marginBottom:16}}>
              <label style={S.lbl}>Boligens adresse <span style={{color:C.muted,fontWeight:400}}>(valgfritt – vises kun på rapporten)</span></label>
              <input style={S.inp} type="text" placeholder="f.eks. Storgata 1, 0001 Oslo" value={avForm.adresse} onChange={e=>setAvForm({...avForm,adresse:e.target.value})}/>
            </div>
            <button className="be-btn-p" style={S.btnP} onClick={()=>lagOgVis({areal:Number(avForm.areal)||120,byggeår:Number(avForm.byggeår)||1978,boligtype:avForm.boligtype,klimasone:avForm.klimasone,oppvarming:avForm.oppvarming,vinduer_type:avForm.vinduer_type,isolering_nivå:avForm.isolering_nivå,antall_etasjer:Number(avForm.antall_etasjer)||2,adresse:(avForm.adresse||"").trim()})}>
              Beregn energimerke →
            </button>
          </div>
        </div>
      </div>
      <Chatbot/>
    </>
  );

  // Enkel steg-for-steg
  if (skjerm === "enkel") {
    const s = STEG[steg];

    // Multi-select oppvarming step
    if (s.id === "oppvarming") {
      const DEFAULT_SPLITS = { 1: [1.0], 2: [0.7, 0.3], 3: [0.6, 0.3, 0.1] };

      const toggleOppvarming = (verdi) => {
        const idx = oppvarmingValg.findIndex(o => o.kilde === verdi);
        if (idx >= 0) {
          // Deselect – rebuild with correct default splits
          const kilder = oppvarmingValg.filter(o => o.kilde !== verdi).map(o => o.kilde);
          const splits = DEFAULT_SPLITS[kilder.length] || [1.0];
          setOppvarmingValg(kilder.map((k, i) => ({ kilde: k, andel: splits[i] })));
        } else if (oppvarmingValg.length < 3) {
          // Add – append with correct default splits
          const kilder = [...oppvarmingValg.map(o => o.kilde), verdi];
          const splits = DEFAULT_SPLITS[kilder.length];
          setOppvarmingValg(kilder.map((k, i) => ({ kilde: k, andel: splits[i] })));
        }
      };

      const adjustAndel = (i, delta) => {
        const ny = oppvarmingValg.map(o => ({ ...o }));
        const newVal = Math.round((ny[i].andel + delta) * 10) / 10;
        if (newVal < 0.1 || newVal > 1 - (ny.length - 1) * 0.1) return;
        // Always take from / give to the last source that isn't i
        const otherIdx = i === ny.length - 1 ? ny.length - 2 : ny.length - 1;
        const otherNew = Math.round((ny[otherIdx].andel - delta) * 10) / 10;
        if (otherNew < 0.1) return;
        ny[i].andel = newVal;
        ny[otherIdx].andel = otherNew;
        setOppvarmingValg(ny);
      };

      const bekreft = () => {
        if (oppvarmingValg.length === 0) return;
        const verdi = oppvarmingValg.length === 1 ? oppvarmingValg[0].kilde : oppvarmingValg;
        const nyttSvar = { ...svar, oppvarming: verdi };
        setSvar(nyttSvar);
        if (steg < STEG.length - 1) { setTimeout(() => setSteg(steg + 1), 260); }
        else lagOgVis({ areal: nyttSvar.areal||100, byggeår: nyttSvar.byggeår||1978, boligtype: nyttSvar.boligtype||"enebolig", klimasone: nyttSvar.klimasone||"3", oppvarming: verdi, vinduer_type: nyttSvar.vinduer_type||"dobbel", isolering_nivå:"normal", antall_etasjer:2, adresse: (nyttSvar.adresse||"").trim() });
      };

      const LABELS = ["Primær","Sekundær","Tertiær"];

      return (
        <>
          <div style={S.app}>
            <Header onBack={()=>steg===0?nullstill():setSteg(steg-1)} onHome={nullstill}/>
            <div style={S.wrap}>
              {/* Pill progress */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginBottom:32}}>
                {STEG.map((_,i)=>(
                  <div key={i} style={{height:5,borderRadius:100,transition:"all .45s cubic-bezier(.4,0,.2,1)",background:i<steg?C.green:i===steg?C.navy:"rgba(27,58,92,0.14)",width:i===steg?28:8}}/>
                ))}
              </div>
              <div key={steg} className="be-slide-in">
              <div style={{textAlign:"center",marginBottom:32}}>
                <div style={S.tag}>Spørsmål {steg+1} av {STEG.length}</div>
                <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"clamp(1.4rem,4.5vw,2rem)",color:C.navyDark,marginBottom:10,lineHeight:1.15}}>{s.tittel}</h2>
                <p style={S.sub}>{s.hint}</p>
              </div>
              <div style={S.grid}>
                {OPPVARMING_VALG.map(v => {
                  const selIdx = oppvarmingValg.findIndex(o => o.kilde === v.verdi);
                  const sel = selIdx >= 0;
                  return (
                    <button key={v.verdi}
                      className="be-choice"
                      style={{...S.btn(sel),position:"relative"}}
                      onClick={() => toggleOppvarming(v.verdi)}>
                      {sel && (
                        <span style={{position:"absolute",top:7,right:7,width:18,height:18,borderRadius:"50%",background:C.green,color:"#fff",fontSize:"0.65rem",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 6px ${C.green}70`}}>
                          {selIdx+1}
                        </span>
                      )}
                      <span style={S.ikon}>{v.ikon}</span>{v.label}
                    </button>
                  );
                })}
              </div>

              {oppvarmingValg.length >= 2 && (
                <div style={{...S.card,marginTop:16}}>
                  <div style={{fontWeight:700,fontSize:"0.85rem",color:C.navyDark,marginBottom:12}}>Fordeling av oppvarmingskilder</div>
                  {oppvarmingValg.map((o, i) => (
                    <div key={o.kilde} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <span style={{fontSize:"0.78rem",fontWeight:700,color:C.muted,width:60,flexShrink:0}}>{LABELS[i]}</span>
                      <span style={{flex:1,fontSize:"0.82rem",color:C.navyDark}}>{OPPVARMING_DATA[o.kilde]?.label || o.kilde}</span>
                      <button onClick={()=>adjustAndel(i,-0.1)} style={{...S.btnG,padding:"4px 10px",fontSize:"0.9rem"}}>−</button>
                      <span style={{fontWeight:800,fontSize:"0.88rem",color:C.navyDark,width:36,textAlign:"center"}}>{Math.round(o.andel*100)}%</span>
                      <button onClick={()=>adjustAndel(i,0.1)} style={{...S.btnG,padding:"4px 10px",fontSize:"0.9rem"}}>+</button>
                    </div>
                  ))}
                </div>
              )}

              </div>{/* end be-slide-in */}
              <button
                className="be-btn-p"
                style={{...S.btnP,marginTop:20,opacity:oppvarmingValg.length===0?0.5:1}}
                disabled={oppvarmingValg.length===0}
                onClick={bekreft}
              >
                Bekreft valg →
              </button>
            </div>
          </div>
          <Chatbot/>
        </>
      );
    }

    // Tekstfelt-steg (f.eks. adresse)
    if (s.tekstfelt) {
      const adresseVerdi = svar[s.id] || "";
      const ferdig = (verdi) => {
        const nyttSvar = { ...svar, [s.id]: verdi };
        setSvar(nyttSvar);
        if (steg < STEG.length - 1) setSteg(steg + 1);
        else lagOgVis({ areal: nyttSvar.areal||100, byggeår: nyttSvar.byggeår||1978, boligtype: nyttSvar.boligtype||"enebolig", klimasone: nyttSvar.klimasone||"3", oppvarming: nyttSvar.oppvarming||"direkte_el", vinduer_type: nyttSvar.vinduer_type||"dobbel", isolering_nivå:"normal", antall_etasjer:2, adresse: (verdi||"").trim() });
      };
      return (
        <>
          <div style={S.app}>
            <Header onBack={()=>steg===0?nullstill():setSteg(steg-1)} onHome={nullstill}/>
            <div style={S.wrap}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginBottom:32}}>
                {STEG.map((_,i)=>(
                  <div key={i} style={{height:5,borderRadius:100,transition:"all .45s cubic-bezier(.4,0,.2,1)",background:i<steg?C.green:i===steg?C.navy:"rgba(27,58,92,0.14)",width:i===steg?28:8}}/>
                ))}
              </div>
              <div key={steg} className="be-slide-in">
                <div style={{textAlign:"center",marginBottom:24}}>
                  <div style={S.tag}>Spørsmål {steg+1} av {STEG.length}</div>
                  <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"clamp(1.4rem,4.5vw,2rem)",color:C.navyDark,marginBottom:10,lineHeight:1.15}}>{s.tittel}</h2>
                  <p style={S.sub}>{s.hint}</p>
                </div>
                <div style={S.card}>
                  <label style={S.lbl}>Adresse</label>
                  <input
                    style={S.inp}
                    type="text"
                    placeholder="f.eks. Storgata 1, 0001 Oslo"
                    value={adresseVerdi}
                    onChange={e=>setSvar({...svar,[s.id]:e.target.value})}
                    onKeyDown={e=>e.key==="Enter"&&ferdig(adresseVerdi)}
                  />
                </div>
              </div>
              <button
                className="be-btn-p"
                style={{...S.btnP,marginTop:16}}
                onClick={()=>ferdig(adresseVerdi)}
              >
                {adresseVerdi.trim() ? "Generer rapport →" : "Hopp over og generer rapport →"}
              </button>
            </div>
          </div>
          <Chatbot/>
        </>
      );
    }

    return (
      <>
        <div style={S.app}>
          <Header onBack={()=>steg===0?nullstill():setSteg(steg-1)} onHome={nullstill}/>
          <div style={S.wrap}>
            {/* Pill progress */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginBottom:32}}>
              {STEG.map((_,i)=>(
                <div key={i} style={{height:5,borderRadius:100,transition:"all .45s cubic-bezier(.4,0,.2,1)",background:i<steg?C.green:i===steg?C.navy:"rgba(27,58,92,0.14)",width:i===steg?28:8}}/>
              ))}
            </div>
            <div key={steg} className="be-slide-in">
              <div style={{textAlign:"center",marginBottom:32}}>
                <div style={S.tag}>Spørsmål {steg+1} av {STEG.length}</div>
                <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"clamp(1.4rem,4.5vw,2rem)",color:C.navyDark,marginBottom:10,lineHeight:1.15}}>{s.tittel}</h2>
                <p style={S.sub}>{s.hint}</p>
              </div>
              <div style={S.grid}>
                {s.valg.map(v=>(
                  <button key={String(v.verdi)} className="be-choice" style={S.btn(svar[s.id]===v.verdi)} onClick={()=>velg(v.verdi)}>
                    {svar[s.id]===v.verdi && <span style={{position:"absolute",top:8,right:8,width:18,height:18,borderRadius:"50%",background:C.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6rem",fontWeight:900,color:"#fff",boxShadow:`0 2px 6px ${C.green}80`}}>✓</span>}
                    <span style={S.ikon}>{v.ikon}</span>{v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Chatbot/>
      </>
    );
  }

  // Startskjerm
  return (
    <>
      <div style={S.app}>
        <Header onHome={nullstill}/>
        <div style={S.wrap}>
          {/* Hero */}
          <div className="be-in" style={{textAlign:"center",marginBottom:36,paddingTop:20,position:"relative"}}>
            <div style={{position:"absolute",top:-30,left:"50%",transform:"translateX(-50%)",width:360,height:280,background:`radial-gradient(circle,${C.green}1A 0%,transparent 68%)`,pointerEvents:"none",zIndex:0}}/>
            <div style={{position:"relative",zIndex:1}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,background:`${C.green}14`,border:`1px solid ${C.green}30`,borderRadius:100,padding:"6px 16px",marginBottom:18}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:C.green,flexShrink:0}}/>
                <span style={{fontSize:"0.7rem",fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:C.green}}>Gratis energianalyse</span>
              </div>
              <h1 style={{...S.h1,fontSize:"clamp(2rem,6vw,2.8rem)",marginBottom:14}}>
                Hva er energimerket<br/><em style={{fontStyle:"italic",color:C.navy}}>på din bolig?</em>
              </h1>
              <p style={{...S.sub,maxWidth:400,margin:"0 auto 20px"}}>Finn energimerke A–G, se hvilke tiltak som lønner seg og hvor mye Enova-støtte du kan få.</p>
              <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:20,flexWrap:"wrap"}}>
                {["3 200+ boliger analysert","Enova aug 2025","ISO 52000"].map(x=>(
                  <span key={x} style={{fontSize:"0.72rem",color:C.muted,display:"flex",alignItems:"center",gap:5}}>
                    <span style={{color:C.green,fontWeight:900}}>✓</span>{x}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="be-in-1" style={{display:"grid",gap:14}}>
            <div className="be-card" style={{...S.card,cursor:"pointer",textAlign:"center",borderTop:`3px solid ${C.green}`,paddingTop:26}} onClick={()=>{ track("quiz_started"); setSkjerm("enkel"); }}>
              {/* Energy grade color strip */}
              <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:18}}>
                {ENERGIMERKER.map(em=>(
                  <div key={em.merke} style={{width:30,height:8,borderRadius:3,background:em.farge,opacity:0.7}}/>
                ))}
              </div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.3rem",color:C.navyDark,marginBottom:6}}>Enkel analyse</div>
              <div style={{...S.sub,marginBottom:22}}>6 spørsmål · 2 minutter · Ingen fagkunnskap nødvendig</div>
              <button className="be-cta-btn" style={{background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,color:C.white,border:"none",borderRadius:12,padding:"14px 36px",fontWeight:700,fontSize:"0.98rem",fontFamily:"inherit",display:"inline-block",boxShadow:"0 4px 20px rgba(27,58,92,0.30)",letterSpacing:"-0.01em",cursor:"pointer"}}>
                Start gratis analyse →
              </button>
              <div style={{fontSize:"0.74rem",color:C.muted,marginTop:14,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                <span style={{color:C.gold}}>💡</span>
                Enova-støtte opptil 100 000 kr · Ingen registrering
              </div>
            </div>
          </div>

          {/* ── Slik fungerer det ───────────────────────────── */}
          <div style={{marginTop:44}}>
            <div style={{textAlign:"center",marginBottom:32}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:7,background:`${C.green}18`,borderRadius:24,padding:"5px 14px",marginBottom:14}}>
                <svg width="7" height="7" viewBox="0 0 7 7"><circle cx="3.5" cy="3.5" r="3.5" fill={C.green}/></svg>
                <span style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.12em",color:C.green,textTransform:"uppercase"}}>Slik fungerer det</span>
              </div>
              <h2 style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:800,fontSize:"clamp(1.2rem,3.5vw,1.55rem)",color:C.navyDark,margin:"0 0 10px"}}>Fra bolig til handlingsplan</h2>
              <p style={{fontSize:"0.84rem",color:C.muted,margin:"0 auto",maxWidth:360,lineHeight:1.6}}>Tre enkle steg — resultater basert på norske standarder og Enova-satser for 2025.</p>
            </div>

            <div className="be-grid-3" style={{gap:14}}>

              {/* Steg 1 */}
              <div className="be-card" style={{background:C.white,borderRadius:22,padding:"28px 20px 24px",textAlign:"center",boxShadow:"0 2px 20px rgba(27,58,92,0.07)",overflow:"hidden",position:"relative"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${C.navy},${C.navyMid})`}}/>
                <div style={{marginBottom:18,display:"flex",justifyContent:"center",alignItems:"center",height:80}}>
                  <svg width="76" height="76" viewBox="0 0 76 76" fill="none">
                    <path d="M38 8L8 34h7v28h46V34h7L38 8z" fill={`${C.navy}0f`} stroke={C.navy} strokeWidth="2" strokeLinejoin="round"/>
                    <rect x="30" y="44" width="16" height="18" rx="2.5" fill={`${C.navy}18`} stroke={C.navy} strokeWidth="1.5"/>
                    <rect x="14" y="39" width="11" height="10" rx="2" fill={`${C.navy}14`} stroke={C.navy} strokeWidth="1.5"/>
                    <line x1="19.5" y1="39" x2="19.5" y2="49" stroke={C.navy} strokeWidth="1" opacity="0.4"/>
                    <line x1="14" y1="44" x2="25" y2="44" stroke={C.navy} strokeWidth="1" opacity="0.4"/>
                    <rect x="50" y="16" width="22" height="5" rx="2.5" fill={`${C.green}30`}/>
                    <rect x="50" y="24" width="18" height="5" rx="2.5" fill={`${C.green}22`}/>
                    <rect x="50" y="32" width="20" height="5" rx="2.5" fill={`${C.green}18`}/>
                    <circle cx="47" cy="18.5" r="3.5" fill="none" stroke={C.green} strokeWidth="1.5" opacity="0.7"/>
                    <path d="M45.4 18.5l1.3 1.4 2.2-2.2" stroke={C.green} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
                    <circle cx="47" cy="26.5" r="3.5" fill="none" stroke={C.green} strokeWidth="1.5" opacity="0.5"/>
                    <circle cx="47" cy="34.5" r="3.5" fill="none" stroke={C.green} strokeWidth="1.5" opacity="0.35"/>
                    <rect x="52" y="18" width="5" height="9" rx="1" fill={`${C.navy}20`} stroke={C.navy} strokeWidth="1.2"/>
                    <path d="M53.5 17c0-2 1.5-2 1.5-4s-1.5-2-1.5-4" stroke={C.muted} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4"/>
                  </svg>
                </div>
                <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:800,fontSize:"1rem",color:C.navyDark,marginBottom:7}}>6 spørsmål om boligen</div>
                <div style={{fontSize:"0.8rem",color:C.muted,lineHeight:1.65}}>Boligtype, byggeår, areal og oppvarming. Tar under 2 minutter — ingen fagkunnskap nødvendig.</div>
              </div>

              {/* Steg 2 */}
              <div className="be-card" style={{background:C.white,borderRadius:22,padding:"28px 20px 24px",textAlign:"center",boxShadow:"0 2px 20px rgba(27,58,92,0.07)",overflow:"hidden",position:"relative"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${C.green},${C.greenLight})`}}/>
                <div style={{marginBottom:18,display:"flex",justifyContent:"center",alignItems:"center",height:80}}>
                  <svg width="68" height="76" viewBox="0 0 68 76" fill="none">
                    {[
                      {label:"A",w:52,color:"#16a34a",y:4,active:true},
                      {label:"B",w:44,color:"#4ade80",y:16,active:false},
                      {label:"C",w:38,color:"#a3e635",y:28,active:false},
                      {label:"D",w:32,color:"#facc15",y:40,active:false},
                      {label:"E",w:26,color:"#fb923c",y:52,active:false},
                      {label:"F",w:20,color:"#f87171",y:64,active:false},
                    ].map(({label,w,color,y,active})=>(
                      <g key={label} opacity={active?1:0.45}>
                        <rect x="4" y={y} width={w} height="10" rx="2" fill={color}/>
                        <path d={`M${4+w} ${y}l6 5-6 5z`} fill={color}/>
                        <text x="10" y={y+7.5} fontSize="6.5" fontWeight="800" fill={active?"white":"#444"} fontFamily="Georgia, serif">{label}</text>
                        {active && <rect x="2" y={y-2} width={w+10} height="14" rx="3" fill="none" stroke={color} strokeWidth="1.5" opacity="0.6"/>}
                      </g>
                    ))}
                  </svg>
                </div>
                <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:800,fontSize:"1rem",color:C.navyDark,marginBottom:7}}>Energimerke A–G</div>
                <div style={{fontSize:"0.8rem",color:C.muted,lineHeight:1.65}}>Beregnet etter NS-EN ISO 52000 og EPBD 2024. Gratis og øyeblikkelig — se hvor du står.</div>
              </div>

              {/* Steg 3 */}
              <div className="be-card" style={{background:C.white,borderRadius:22,padding:"28px 20px 24px",textAlign:"center",boxShadow:"0 2px 20px rgba(27,58,92,0.07)",overflow:"hidden",position:"relative"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${C.gold},#f5a623)`}}/>
                <div style={{marginBottom:18,display:"flex",justifyContent:"center",alignItems:"center",height:80}}>
                  <svg width="76" height="76" viewBox="0 0 76 76" fill="none">
                    <rect x="8" y="8" width="40" height="54" rx="5" fill={`${C.navy}0d`} stroke={C.navy} strokeWidth="1.5"/>
                    <path d="M38 8l10 10h-10V8z" fill={`${C.navy}20`} stroke={C.navy} strokeWidth="1.2" strokeLinejoin="round"/>
                    <rect x="14" y="24" width="26" height="2.5" rx="1.25" fill={C.navy} opacity="0.25"/>
                    <rect x="14" y="30" width="20" height="2.5" rx="1.25" fill={C.navy} opacity="0.18"/>
                    <rect x="14" y="50" width="6" height="8" rx="1.5" fill={C.navy} opacity="0.25"/>
                    <rect x="22" y="44" width="6" height="14" rx="1.5" fill={C.navy} opacity="0.35"/>
                    <rect x="30" y="38" width="6" height="20" rx="1.5" fill={C.green} opacity="0.8"/>
                    <path d="M14 52l6-8 8-4 8-8" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                    <circle cx="58" cy="26" r="16" fill={C.gold} opacity="0.12"/>
                    <circle cx="58" cy="26" r="12" fill={C.gold} opacity="0.2"/>
                    <circle cx="58" cy="26" r="9" fill={C.gold} opacity="0.9"/>
                    <text x="53.5" y="29.5" fontSize="8.5" fontWeight="800" fill="white" fontFamily="Georgia, serif">kr</text>
                    <path d="M68 14l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" fill={C.gold} opacity="0.7"/>
                    <path d="M70 44l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z" fill={C.gold} opacity="0.5"/>
                  </svg>
                </div>
                <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:800,fontSize:"1rem",color:C.navyDark,marginBottom:7}}>Sparepotensial og støtte</div>
                <div style={{fontSize:"0.8rem",color:C.muted,lineHeight:1.65}}>Tilpassede tiltak, Enova-støtte opptil 100 000 kr og full ROI-analyse med tilbakebetalingstid.</div>
              </div>

            </div>
          </div>

          <KunnskapsHub/>
          <p style={{textAlign:"center",fontSize:"0.7rem",color:"#bbb",marginTop:20}}>NS-EN ISO 52000 · TEK17 · EU EPBD 2024/1275 · Gratis energimerke-estimat</p>

          {/* Privacy footer */}
          <div style={{fontSize:"0.72rem",color:"#aaa",textAlign:"center",padding:"20px 0 8px"}}>
            © {new Date().getFullYear()} BoligEffekt
            {" · "}<button className="be-footer-link" onClick={()=>setModal("personvern")}>Personvern</button>
            {" · "}<button className="be-footer-link" onClick={()=>setModal("vilkår")}>Vilkår</button>
            {" · "}<button className="be-footer-link" onClick={()=>setModal("ki")}>Om bruk av KI</button>
            {" · "}<a href="https://www.instagram.com/boligeffekt" target="_blank" rel="noopener noreferrer" style={{color:"#aaa",textDecoration:"none"}}>Instagram</a>
            {" · "}<a href="https://www.facebook.com/boligeffekt" target="_blank" rel="noopener noreferrer" style={{color:"#aaa",textDecoration:"none"}}>Facebook</a>
          </div>
        </div>
      </div>

      {/* Privacy modal */}
      {modal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setModal(null)} onKeyDown={e=>e.key==="Escape"&&setModal(null)}>
          <div role="dialog" aria-modal="true" aria-label={MODAL_INNHOLD[modal].tittel} style={{background:C.white,borderRadius:20,maxWidth:500,width:"100%",maxHeight:"85dvh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{color:C.white,fontWeight:700,fontSize:"1rem"}}>{MODAL_INNHOLD[modal].tittel}</div>
              <button onClick={()=>setModal(null)} style={{background:"rgba(255,255,255,0.15)",border:"none",color:C.white,borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:"1.2rem",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{padding:32,overflowY:"auto"}}>
              <p style={{fontSize:"0.87rem",color:C.navyDark,lineHeight:1.75,margin:0}}>{MODAL_INNHOLD[modal].tekst}</p>
            </div>
          </div>
        </div>
      )}

      <Chatbot/>
    </>
  );
}
