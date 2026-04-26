import React, { useState, useEffect } from "react";
import { track } from "@vercel/analytics";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";
const PAKKE = { navn: "Komplett rapport", pris: 399, beløp: 39900 };

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
const BOLIGTYPER = [
  { id: "leilighet", label: "Leilighet",               faktor: 0.72, ikon: "🏢" },
  { id: "rekkehus",  label: "Rekkehus / Tomannsbolig", faktor: 0.88, ikon: "🏘️" },
  { id: "enebolig",  label: "Enebolig",                faktor: 1.00, ikon: "🏡" },
  { id: "hytte",     label: "Hytte / Fritidsbolig",    faktor: 1.15, ikon: "🏕️" },
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
// Kilde: Energimerkeforskriften (FOR-2009-12-18-1665) – kWh/m²/år levert energi
const ENERGIMERKER = [
  { merke: "A", maks: 70,   farge: "#00a651", tekst: "#fff", epbd: "nZEB-klar" },
  { merke: "B", maks: 100,  farge: "#57b946", tekst: "#fff", epbd: "God standard" },
  { merke: "C", maks: 150,  farge: "#b5d334", tekst: "#333", epbd: "Over middels" },
  { merke: "D", maks: 200,  farge: "#ffd200", tekst: "#333", epbd: "Middels" },
  { merke: "E", maks: 250,  farge: "#f7941d", tekst: "#fff", epbd: "Under middels" },
  { merke: "F", maks: 300,  farge: "#ed1c24", tekst: "#fff", epbd: "Dårlig" },
  { merke: "G", maks: 9999, farge: "#9e1a20", tekst: "#fff", epbd: "Svært dårlig" },
];
// Kilde: Enova august 2025 – satser gjelder helårsboliger med byggesøknad FØR 1997 (vinduer/isolering)
// Maks totalt 100 000 kr per bolig i perioden 2025–2028. Søk FØR oppstart.
// MERK: Luft/luft-varmepumpe har INGEN Enova-støtte fra august 2025.
const TILTAK = [
  { id: "isolering_loft",   navn: "Etterisolering loft/tak",             ikon: "🏠", støtte_min: 5000,  støtte_max: 22500, kostnad_min: 30000,  kostnad_max: 100000, kWh_pct: 0.15, krever_ikke: [],                              passer_for: ["enebolig","rekkehus","hytte"], enova_program: "Tilskudd til energitiltak i bolig (aug 2025)",  beskrivelse: "25 % av kostnad, maks 150 kr/kvm opp til 150 kvm. Varme stiger – loft er ofte det mest kostnadseffektive tiltaket. Kun boliger bygget før 1997.", prioritet_terskel: 25, kategori: "enova_kvalifisert" },
  { id: "varmepumpe_lv",    navn: "Luft/vann-varmepumpe",                ikon: "💧", støtte_min: 5000,  støtte_max: 20000, kostnad_min: 60000,  kostnad_max: 120000, kWh_pct: 0.35, krever_ikke: ["varmepumpe_ll","varmepumpe_lv"], passer_for: ["enebolig","rekkehus"],          enova_program: "Tilskudd til luft-til-vann varmepumpe (aug 2025)", beskrivelse: "SPF 2,8 – dekker 70 % av varmebehovet. 25 % av kostnad, maks 20 000 kr. Krever vannbåren distribusjon.", prioritet_terskel: 18, kategori: "enova_kvalifisert" },
  { id: "ventilasjon",      navn: "Balansert ventilasjon m/gjenvinning", ikon: "💨", støtte_min: 5000,  støtte_max: 15000, kostnad_min: 60000,  kostnad_max: 100000, kWh_pct: 0.13, krever_ikke: [],                              passer_for: ["alle"],                        enova_program: "Tilskudd til energitiltak i bolig (aug 2025)",  beskrivelse: "25 % av kostnad, maks 15 000 kr. Gjenvinning av varme fra avtrekksluft + bedre luftkvalitet.", prioritet_terskel: 20, kategori: "enova_kvalifisert" },
  { id: "vinduer",          navn: "Vindusutskifting (3-lags)",           ikon: "🪟", støtte_min: 2000,  støtte_max: 20000, kostnad_min: 60000,  kostnad_max: 100000, kWh_pct: 0.10, krever_ikke: [],                              passer_for: ["alle"],                        enova_program: "Tilskudd til energitiltak i bolig (aug 2025)",  beskrivelse: "25 % av kostnad, maks 400 kr/kvm opp til 50 kvm (maks 20 000 kr). U-verdi ned til 0,7 W/m²K. Kun boliger bygget før 1997.", prioritet_terskel: 22, kategori: "enova_kvalifisert" },
  { id: "ytterdører",       navn: "Utskifting ytterdører",               ikon: "🚪", støtte_min: 2000,  støtte_max: 8000,  kostnad_min: 15000,  kostnad_max: 35000,  kWh_pct: 0.03, krever_ikke: [],                              passer_for: ["enebolig","rekkehus","hytte"], enova_program: "Tilskudd til energitiltak i bolig (aug 2025)",  beskrivelse: "Energieffektive ytterdører med U-verdi ≤ 1,2 W/m²K. 25 % av kostnad, maks 400 kr/kvm. Kun boliger bygget før 1997. Lav effekt isolert, men reduserer luftlekkasjer og hever totalkomforten.", prioritet_terskel: 28, kategori: "enova_kvalifisert" },
  { id: "isolering_vegger", navn: "Etterisolering yttervegger",          ikon: "🧱", støtte_min: 5000,  støtte_max: 37500, kostnad_min: 80000,  kostnad_max: 150000, kWh_pct: 0.15, krever_ikke: [],                              passer_for: ["enebolig","rekkehus","hytte"], enova_program: "Tilskudd til energitiltak i bolig (aug 2025)",  beskrivelse: "25 % av kostnad, maks 150 kr/kvm opp til 250 kvm (maks 37 500 kr). Best ved fasaderehab. Kun boliger bygget før 1997.", prioritet_terskel: 30, kategori: "enova_kvalifisert" },
  { id: "solceller",        navn: "Solcelleanlegg",                      ikon: "☀️", støtte_min: 10000, støtte_max: 37500, kostnad_min: 70000,  kostnad_max: 100000, kWh_pct: 0.20, krever_ikke: [],                              passer_for: ["enebolig","rekkehus","hytte"], enova_program: "Tilskudd til solcelleanlegg (aug 2025) – 2 500 kr/kW, maks 15 kW", beskrivelse: "2 500 kr/kW installert effekt, maks 15 kW (maks 37 500 kr). 850 kWh/kWp/år. Best med sørvendt tak.", prioritet_terskel: 25, min_areal: 100, kategori: "enova_kvalifisert" },
  { id: "bergvarme",        navn: "Bergvarme (væske-til-vann)",          ikon: "⛏️", støtte_min: 10000, støtte_max: 40000, kostnad_min: 100000, kostnad_max: 200000, kWh_pct: 0.45, krever_ikke: ["varmepumpe_ll","varmepumpe_lv"], passer_for: ["enebolig","rekkehus"],          enova_program: "Tilskudd til væske-til-vann varmepumpe (aug 2025)", beskrivelse: "SPF 3,5 – dekker 95 % av varmebehovet. 25 % av kostnad, maks 40 000 kr. Best langsiktig investering.", prioritet_terskel: 30, kategori: "enova_kvalifisert" },
  { id: "varmepumpe_ll",    navn: "Luft/luft-varmepumpe",                ikon: "🌡️", støtte_min: 0,     støtte_max: 0,     kostnad_min: 15000,  kostnad_max: 25000,  kWh_pct: 0.20, krever_ikke: ["varmepumpe_ll","varmepumpe_lv"], passer_for: ["alle"],                        enova_program: "Ingen Enova-støtte (avviklet aug 2025)",               beskrivelse: "SPF 2,5, dekker 60 % av varmebehovet. Ingen Enova-støtte fra august 2025. Rask tilbakebetaling pga lav kostnad.", prioritet_terskel: 8, kategori: "egenfinansiert", enova_status_tekst: "Ikke Enova-støttet etter august 2025" },
  { id: "smart_styring",    navn: "Smart styring og soneregulering",     ikon: "📱", støtte_min: 0,     støtte_max: 0,     kostnad_min: 3000,   kostnad_max: 15000,  kWh_pct: 0.06, krever_ikke: [],                              passer_for: ["alle"],                        enova_program: "Ingen Enova-støtte",                                   beskrivelse: "Programmerbare termostater, soneregulering og natt-/dagsenking. Reduserer oppvarmingsbehovet uten å redusere komfort. Lav investering med rask tilbakebetaling.", prioritet_terskel: 10, kategori: "egenfinansiert", enova_status_tekst: "Ingen Enova-støtte" },
  { id: "tetting",          navn: "Tettelister og fuging",               ikon: "🔧", støtte_min: 0,     støtte_max: 0,     kostnad_min: 2000,   kostnad_max: 8000,   kWh_pct: 0.05, krever_ikke: [],                              passer_for: ["alle"],                        enova_program: "Ingen Enova-støtte (grunntiltak)",                      beskrivelse: "Tette rundt vinduer, dører og gjennomføringer med tettelister, bunnsverd og fugemasse. Billigste tiltak med raskest tilbakebetaling. Anbefales alltid som første steg.", prioritet_terskel: 7, kategori: "egenfinansiert", enova_status_tekst: "Grunntiltak uten Enova-støtte" },
];

// ─────────────────────────────────────────────
// BEREGNING
// ─────────────────────────────────────────────
function beregnEnergi(input) {
  const { areal, byggeår, oppvarming, boligtype, klimasone, isolering_nivå, vinduer_type, antall_etasjer } = input;
  const bygData = BYGGEÅR_DATA.find(b => byggeår >= b.fra && byggeår <= b.til) || BYGGEÅR_DATA[0];
  const klima   = KLIMASONER.find(k => k.id === klimasone) || KLIMASONER[2];
  const bolig   = BOLIGTYPER.find(b => b.id === boligtype) || BOLIGTYPER[2];
  let oppvData, weightedCost;
  if (Array.isArray(oppvarming)) {
    const wCOP    = oppvarming.reduce((s, k) => s + (OPPVARMING_DATA[k.kilde]?.COP    || 1.0) * k.andel, 0);
    const wPrimær = oppvarming.reduce((s, k) => s + (OPPVARMING_DATA[k.kilde]?.primær || 2.0) * k.andel, 0);
    oppvData     = { label: oppvarming.map(k => OPPVARMING_DATA[k.kilde]?.label || k.kilde).join(" + "), COP: wCOP, primær: wPrimær, ikon: OPPVARMING_DATA[oppvarming[0].kilde]?.ikon || "🏠" };
    weightedCost = oppvarming.reduce((s, k) => s + (ENERGIKOST[k.kilde] || 1.40) * k.andel, 0);
  } else {
    oppvData     = OPPVARMING_DATA[oppvarming] || OPPVARMING_DATA.direkte_el;
    weightedCost = ENERGIKOST[oppvarming] || 1.40; // Kilde: SSB Q3 2025 – 1,40 kr/kWh strøm
  }
  let u_vegg = bygData.u_vegg, u_tak = bygData.u_tak, lufttetthet = bygData.lufttetthet;
  let u_vindu = vinduer_type === "trippel" ? 0.9 : vinduer_type === "dobbel" ? 1.8 : bygData.u_vindu;
  if (isolering_nivå === "oppgradert") { u_vegg *= 0.75; u_tak *= 0.75; lufttetthet *= 0.75; }
  if (isolering_nivå === "dårlig")     { u_vegg *= 1.20; u_tak *= 1.15; lufttetthet *= 1.20; }
  const A_vegg = Math.sqrt(areal) * antall_etasjer * 3.0 * 4;
  const HT = (u_vegg * A_vegg + u_tak * areal/antall_etasjer + bygData.u_gulv * areal/antall_etasjer + u_vindu * areal * 0.18) * 0.001;
  const Hv = lufttetthet * areal * antall_etasjer * 2.7 * 0.33 * 0.001;
  const Q_levert = Math.round((HT + Hv) * klima.HDD * 24 / areal / oppvData.COP * bolig.faktor * klima.korreksjon + 20);
  const Q_primær = Math.round(Q_levert * oppvData.primær);
  const merkeObj = ENERGIMERKER.find(e => Q_levert <= e.maks) || ENERGIMERKER[6];
  const merkePot = ENERGIMERKER.find(e => Math.round(Q_levert * 0.55) <= e.maks) || ENERGIMERKER[6];
  const totalKwh = Math.round(Q_levert * areal);
  return { kwhPerM2: Q_levert, primærPerM2: Q_primær, totalKwh, areal,
           merke: merkeObj, merkePotensial: merkePot, bygData, klima, bolig, oppvData,
           u_vegg, u_tak, u_vindu, lufttetthet, weightedCost,
           strømkostnad: Math.round(totalKwh * weightedCost) };
}
function beregnTiltak(resultat, input) {
  // Worse energy grade → more urgent → higher effective priority thresholds
  const gradeFaktor = { A: 0.6, B: 0.75, C: 0.9, D: 1.0, E: 1.4, F: 1.8, G: 2.2 }[resultat.merke.merke] || 1.0;

  return TILTAK.filter(t => {
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
    const besparelse_kr = Math.round(resultat.totalKwh * t.kWh_pct * resultat.weightedCost);
    const støtte_snitt  = Math.round((t.støtte_min + t.støtte_max) / 2);
    const kostnad_snitt = Math.round((t.kostnad_min + t.kostnad_max) / 2);
    const netto         = kostnad_snitt - støtte_snitt;
    const tilbake       = besparelse_kr > 0 ? Math.round(netto / besparelse_kr) : 99;
    // Energy-grade-adjusted threshold: E/F/G homes get more "høy" classifications
    const effTerskel    = Math.round(t.prioritet_terskel * gradeFaktor);
    const prioritet     = tilbake <= effTerskel ? "høy" : tilbake <= effTerskel * 1.8 ? "middels" : "lav";
    return { ...t, besparelse_kr, støtte_snitt, kostnad_snitt, netto, tilbakebetaling: tilbake, prioritet };
  }).sort((a, b) => a.tilbakebetaling - b.tilbakebetaling);
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
  inp:    { width:"100%", padding:"12px 14px", borderRadius:11, border:`1.5px solid rgba(27,58,92,0.14)`, fontSize:"0.94rem", color:C.navyDark, background:"#FAFAF8", outline:"none", boxSizing:"border-box" },
  sel:    { width:"100%", padding:"12px 14px", borderRadius:11, border:`1.5px solid rgba(27,58,92,0.14)`, fontSize:"0.94rem", color:C.navyDark, background:"#FAFAF8", outline:"none", boxSizing:"border-box" },
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
      onBetalt(epost);
      setLaster(false);
    }
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
        </div>

        {/* Uskarp forhåndsvisning av tiltak */}
        {/* Blurred tiltak preview */}
        <div className="be-in-1" style={{position:"relative",marginBottom:16}}>
          <div style={{...S.card,filter:"blur(4px)",userSelect:"none",pointerEvents:"none",opacity:0.5}}>
            <div style={{fontWeight:700,marginBottom:12,color:C.navyDark}}>Anbefalte tiltak</div>
            {[0,1,2].map(i=><div key={i} style={{background:C.section,borderRadius:12,padding:14,marginBottom:8}}><div style={{height:11,background:"#D8D4CC",borderRadius:6,width:"60%",marginBottom:8}}/><div style={{height:7,background:"#E4E0D8",borderRadius:6,width:"80%"}}/></div>)}
          </div>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:C.white,borderRadius:18,padding:"22px 26px",boxShadow:"0 12px 40px rgba(0,0,0,0.14)",textAlign:"center",border:`2px solid ${C.green}45`}}>
              <div style={{fontSize:"1.6rem",marginBottom:6}}>🔒</div>
              <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,color:C.navyDark,fontSize:"1rem"}}>{høy.length} tiltak identifisert</div>
              <div style={{fontSize:"0.78rem",color:C.muted,marginTop:4}}>Kjøp rapporten for å låse opp</div>
            </div>
          </div>
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
          <div style={{marginBottom:14}}>
            <label style={S.lbl}>E-postadresse <span style={{color:C.muted,fontWeight:400}}>(rapport sendes automatisk)</span></label>
            <input className="be-input" style={S.inp} type="email" placeholder="navn@epost.no" value={epost}
              onChange={e=>setEpost(e.target.value)} onKeyDown={e=>e.key==="Enter"&&betal()}/>
            {feil && <div style={{color:"#DC2626",fontSize:"0.8rem",marginTop:6,display:"flex",alignItems:"center",gap:4}}><span>⚠</span>{feil}</div>}
          </div>
          <div style={{background:C.section,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:"0.78rem",color:C.muted,lineHeight:1.55,textAlign:"center"}}>
            En offisiell energirådgiver koster <strong style={{color:C.navyDark}}>9 000–20 000 kr</strong>. Få et detaljert energiestimatt med tiltaksplan for <strong style={{color:C.navyDark}}>399 kr</strong>.
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
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// OPPGRADERINGSFLOW (Premium – interaktiv 3-steg)
// ─────────────────────────────────────────────
function OppgraderingsFlow({ resultat, epost, input, sessionId, onNullstill }) {
  const [steg, setSteg]     = useState(1);
  const [valgte, setValgte] = useState(
    () => new Set(resultat.tiltak.filter(t => t.prioritet === "høy").map(t => t.id))
  );
  const [sender, setSender]         = useState(false);
  const [feil, setFeil]             = useState("");
  const [leadNavn, setLeadNavn]     = useState("");
  const [leadTlf, setLeadTlf]       = useState("");
  const [leadSendt, setLeadSendt]   = useState(false);
  const [leadLaster, setLeadLaster] = useState(false);

  const valgTiltak  = resultat.tiltak.filter(t => valgte.has(t.id));
  const totInv      = valgTiltak.reduce((s, t) => s + t.kostnad_snitt, 0);
  const totStøtte   = valgTiltak.reduce((s, t) => s + t.støtte_snitt, 0);
  const netto       = totInv - totStøtte;
  const totBes      = valgTiltak.reduce((s, t) => s + t.besparelse_kr, 0);
  const breakEven   = totBes > 0 ? Math.round(netto / totBes) : "–";
  const kwhPctTotal = Math.min(valgTiltak.reduce((s, t) => s + t.kWh_pct, 0), 0.85);
  const nyKwhPerM2  = Math.round(resultat.kwhPerM2 * (1 - kwhPctTotal));
  const nyMerke     = ENERGIMERKER.find(e => nyKwhPerM2 <= e.maks) || ENERGIMERKER[6];

  function toggleTiltak(id) {
    setValgte(prev => {
      const ny = new Set(prev);
      ny.has(id) ? ny.delete(id) : ny.add(id);
      return ny;
    });
  }

  async function sendRapport() {
    setSender(true); setFeil("");
    try {
      const res = await fetch(`${BACKEND}/api/send-rapport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id:   sessionId,
          resultatData: { resultat: { ...resultat, tiltak: valgTiltak }, input, epost, pakke: "oppgraderingsplan" },
          epost,
          pakke:        "oppgraderingsplan",
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

  return (
    <div style={S.app}>
      <Header onHome={onNullstill}/>
      <div style={S.wrap}>

        {/* Steg-indikator */}
        {steg < 3 && (
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:24,justifyContent:"center"}}>
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
                        {t.prioritet==="høy"    && <span style={{background:C.green,color:C.white,borderRadius:100,padding:"2px 9px",fontSize:"0.65rem",fontWeight:800,whiteSpace:"nowrap",flexShrink:0}}>Anbefalt</span>}
                        {t.prioritet==="middels"&& <span style={{background:C.gold,color:C.white,borderRadius:100,padding:"2px 9px",fontSize:"0.65rem",fontWeight:800,whiteSpace:"nowrap",flexShrink:0}}>Vurder</span>}
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
            {feil && <div style={{background:"#fff0f0",border:"1px solid #fcc",borderRadius:10,padding:"12px 14px",fontSize:"0.83rem",color:"#c53030",marginBottom:12}}>{feil}</div>}
            <button
              style={{...S.btnP,background:sender?"#aaa":`linear-gradient(135deg,${C.green},${C.greenLight})`,boxShadow:`0 6px 20px ${C.green}44`,marginBottom:10,opacity:sender?0.7:1}}
              onClick={sendRapport}
              disabled={sender}
            >
              {sender ? "Genererer rapport…" : `Generer og send rapport til ${epost} →`}
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

      </div>
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
              {krav:"EU-krav 2030 (merke E)",ok:merke.merke<="E",tekst:merke.merke<="E"?"Oppfylt":"Tiltak anbefales innen 2030"},
              {krav:"EU-krav 2033 (merke D)",ok:merke.merke<="D",tekst:merke.merke<="D"?"Oppfylt":"Tiltak anbefales innen 2033"},
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
          const søknadstekst = `Jeg søker om støtte til energitiltak i min bolig. Boligen ble bygget i perioden ${resultat.bygData.label} og har i dag estimert energimerke ${merke.merke}. Tiltakene jeg planlegger å gjennomføre er: ${høyAlle.map(t=>t.navn).join(", ")}. Forventet energibesparelse er ca. ${høyAlle.reduce((s,t)=>s+Math.round(totalKwh*t.kWh_pct),0).toLocaleString("no")} kWh per år, noe som tilsvarer ca. ${totBes.toLocaleString("no")} kroner i reduserte strømutgifter. Tiltakene vil forbedre boligens energimerke fra ${merke.merke} til estimert ${merkePotensial.merke}.`;

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

            {/* Visuell skala – Kilde: Energimerkeforskriften (FOR-2009-12-18-1665) */}
            <div style={{marginBottom:18}}>
              {[
                {m:"A",farge:"#00a651",maks:"≤ 70",tekst:"nZEB-klar – svært energieffektiv"},
                {m:"B",farge:"#57b946",maks:"71–100",tekst:"God standard – lavenergibolig"},
                {m:"C",farge:"#b5d334",maks:"101–150",tekst:"Over middels – moderne TEK10-bygg"},
                {m:"D",farge:"#ffd200",maks:"151–200",tekst:"Middels – typisk 1990-tallsbolig"},
                {m:"E",farge:"#f7941d",maks:"201–250",tekst:"Under middels – EU-krav 2030"},
                {m:"F",farge:"#ed1c24",maks:"251–300",tekst:"Dårlig – bør oppgraderes"},
                {m:"G",farge:"#9e1a20",maks:"> 300",tekst:"Svært dårlig – høy prioritet"},
              ].map(r => (
                <div key={r.m} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <div style={{width:28,height:28,borderRadius:7,background:r.farge,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:"0.9rem",flexShrink:0}}>{r.m}</div>
                  <div style={{flex:1,height:10,background:r.farge,borderRadius:100,opacity:0.25,position:"relative"}}>
                    <div style={{position:"absolute",inset:0,background:r.farge,borderRadius:100,width:"100%",opacity:0.85}}/>
                  </div>
                  <div style={{fontSize:"0.72rem",color:C.navyDark,fontWeight:700,flexShrink:0,width:60,textAlign:"right"}}>{r.maks} kWh</div>
                </div>
              ))}
              <div style={{fontSize:"0.7rem",color:C.muted,marginTop:6}}>Tall i kWh/m²/år (levert energi)</div>
            </div>

            <div style={{display:"grid",gap:10}}>
              {[
                {ikon:"📐", tittel:"Hvordan beregnes energimerket?", tekst:"Energimerket beregnes ut fra boligens levert energi per m² per år (kWh/m²/år). Terskelverdiene er: A ≤ 70, B 71–100, C 101–150, D 151–200, E 201–250, F 251–300, G > 300 kWh/m²/år. Beregningsstandarden er NS-EN ISO 52000."},
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
                {tiltak:"Akkumulatortank",             min:1250,  max:5000,  krav:"25 % av kostnad, maks 5 000 kr"},
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

            <div style={{textAlign:"center",fontSize:"0.7rem",color:"#bbb",marginBottom:14}}>Sist oppdatert: August 2025 (gjeldende satser)</div>

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
                {tag:"EPBD 2024",farge:"#6d28d9",tittel:"EU-direktiv 2024/1275 (EPBD recast)",tekst:"Europaparlamentets reviderte energidirektiv pålegger alle EU/EØS-land å sikre at eksisterende boliger oppgraderes. Boliger i verst presterende 15 % (typisk merke F og G) skal oppnå merke E innen 2030 og D innen 2033. For norske boliger betyr dette konkrete oppgraderingskrav. nZEB-standard (A/B) kreves for nye bygg.",lenke:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024L1275"},
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
              {ar:"2021",farge:C.green,tekst:"nZEB-krav for alle nye bygg i Norge. Nye boliger skal ha primærenergi under 95 kWh/m²/år."},
              {ar:"2025",farge:C.gold,tekst:"EU-landene skal ha nasjonale planer for oppgradering av bygningsmasse. Energirådgivning blir mer tilgjengelig."},
              {ar:"2030",farge:"#f7941d",tekst:"Alle boliger i verst presterende 15 % (merke F/G) skal nå minimum energimerke E. Boliger bygget før 1980 er mest utsatt."},
              {ar:"2033",farge:"#ed1c24",tekst:"Skjerpet krav: minimum energimerke D. Boliger fra 1950–1970 uten etterisolering vil typisk ikke oppfylle dette uten tiltak."},
              {ar:"2050",farge:C.navyDark,tekst:"Målet er klimanøytral bygningsmasse i hele EU/EØS. nZEB-standard (A/B-merke) bør være normen for alle boliger."},
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
                <div style={{fontFamily:"'Fraunces',Georgia,serif",fontWeight:700,fontSize:"1.1rem",color:C.navyDark}}>Siste nyheter</div>
                <div style={{fontSize:"0.76rem",color:C.muted,marginTop:2}}>Energimerking, Enova og boligoppgradering</div>
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
    <div style={{position:"fixed",bottom:window.innerWidth<=600?80:24,right:20,zIndex:1000,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10}}>
      {aapen && (
        <div style={{width:310,height:420,background:C.white,borderRadius:18,boxShadow:"0 12px 48px rgba(27,58,92,0.18)",border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
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
                  <span style={{animation:"pulse 1s infinite"}}>●</span>
                  <span style={{animationDelay:"0.2s",animation:"pulse 1s 0.2s infinite"}}>●</span>
                  <span style={{animationDelay:"0.4s",animation:"pulse 1s 0.4s infinite"}}>●</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{padding:"10px 10px 12px",borderTop:`1px solid ${C.section}`,display:"flex",gap:7}}>
            <input
              style={{flex:1,padding:"9px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:"0.82rem",color:C.navyDark,background:"#fafafa",outline:"none"}}
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
  const [avForm, setAvForm]         = useState({ areal:"", byggeår:"", boligtype:"enebolig", klimasone:"3", oppvarming:"direkte_el", vinduer_type:"dobbel", isolering_nivå:"normal", antall_etasjer:2 });
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
      console.error("[REDIRECT] Ingen lagret data i sessionStorage – kan ikke gjenopprette rapport");
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
    setBetalt(false);
    setSkjerm("resultat");
    track("quiz_completed", { grade: r.merke.merke });
  }

  function velg(verdi) {
    const nyttSvar = { ...svar, [STEG[steg].id]: verdi };
    setSvar(nyttSvar);
    if (steg < STEG.length - 1) { setTimeout(() => setSteg(steg + 1), 260); }
    else lagOgVis({ areal: nyttSvar.areal||100, byggeår: nyttSvar.byggeår||1978, boligtype: nyttSvar.boligtype||"enebolig", klimasone: nyttSvar.klimasone||"3", oppvarming: nyttSvar.oppvarming||"direkte_el", vinduer_type: nyttSvar.vinduer_type||"dobbel", isolering_nivå:"normal", antall_etasjer:2 });
  }

  function nullstill() {
    setSkjerm("start"); setSteg(0); setSvar({}); setOppvarmingValg([]);
    setResultat(null); setInput(null); setBetalt(false); setSessionId(null);
  }

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
            <button className="be-btn-p" style={S.btnP} onClick={()=>lagOgVis({areal:Number(avForm.areal)||120,byggeår:Number(avForm.byggeår)||1978,boligtype:avForm.boligtype,klimasone:avForm.klimasone,oppvarming:avForm.oppvarming,vinduer_type:avForm.vinduer_type,isolering_nivå:avForm.isolering_nivå,antall_etasjer:Number(avForm.antall_etasjer)||2})}>
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
        else lagOgVis({ areal: nyttSvar.areal||100, byggeår: nyttSvar.byggeår||1978, boligtype: nyttSvar.boligtype||"enebolig", klimasone: nyttSvar.klimasone||"3", oppvarming: verdi, vinduer_type: nyttSvar.vinduer_type||"dobbel", isolering_nivå:"normal", antall_etasjer:2 });
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
              <div className="be-cta-btn" style={{background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,color:C.white,borderRadius:12,padding:"14px 36px",fontWeight:700,fontSize:"0.98rem",display:"inline-block",boxShadow:"0 4px 20px rgba(27,58,92,0.30)",letterSpacing:"-0.01em",cursor:"pointer"}}>
                Start gratis analyse →
              </div>
              <div style={{fontSize:"0.74rem",color:C.muted,marginTop:14,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                <span style={{color:C.gold}}>💡</span>
                Enova-støtte opptil 136 000 kr · Ingen registrering
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
                <div style={{fontSize:"0.8rem",color:C.muted,lineHeight:1.65}}>Tilpassede tiltak, Enova-støtte opptil 136 000 kr og full ROI-analyse med tilbakebetalingstid.</div>
              </div>

            </div>
          </div>

          <KunnskapsHub/>
          <p style={{textAlign:"center",fontSize:"0.7rem",color:"#bbb",marginTop:20}}>NS-EN ISO 52000 · TEK17 · EU EPBD 2024/1275 · Gratis energimerke-estimat</p>

          {/* Privacy footer */}
          <div style={{fontSize:"0.72rem",color:"#aaa",textAlign:"center",padding:"20px 0 8px"}}>
            © 2025 BoligEffekt
            {" · "}<span style={{cursor:"pointer",textDecoration:"underline"}} onClick={()=>setModal("personvern")}>Personvern</span>
            {" · "}<span style={{cursor:"pointer",textDecoration:"underline"}} onClick={()=>setModal("vilkår")}>Vilkår</span>
            {" · "}<span style={{cursor:"pointer",textDecoration:"underline"}} onClick={()=>setModal("ki")}>Om bruk av KI</span>
            {" · "}<a href="https://www.instagram.com/boligeffekt" target="_blank" rel="noopener noreferrer" style={{color:"#aaa",textDecoration:"none"}}>Instagram</a>
            {" · "}<a href="https://www.facebook.com/boligeffekt" target="_blank" rel="noopener noreferrer" style={{color:"#aaa",textDecoration:"none"}}>Facebook</a>
          </div>
        </div>
      </div>

      {/* Privacy modal */}
      {modal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setModal(null)}>
          <div style={{background:C.white,borderRadius:20,maxWidth:500,width:"100%",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.25)"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{color:C.white,fontWeight:700,fontSize:"1rem"}}>{MODAL_INNHOLD[modal].tittel}</div>
              <button onClick={()=>setModal(null)} style={{background:"rgba(255,255,255,0.15)",border:"none",color:C.white,borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:"1.2rem",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{padding:32}}>
              <p style={{fontSize:"0.87rem",color:C.navyDark,lineHeight:1.75,margin:0}}>{MODAL_INNHOLD[modal].tekst}</p>
            </div>
          </div>
        </div>
      )}

      <Chatbot/>
    </>
  );
}
