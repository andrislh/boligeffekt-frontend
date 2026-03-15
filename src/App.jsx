import { useState, useEffect } from "react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";
const PAKKER = {
  energirapport:     { navn: "Energirapport",     pris: 199, beløp: 19900 },
  oppgraderingsplan: { navn: "Oppgraderingsplan", pris: 399, beløp: 39900 },
};

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
const OPPVARMING_DATA = {
  direkte_el:    { label: "Panelovner / direktevarme", COP: 1.0,  primær: 2.0,  ikon: "🔌" },
  varmepumpe_ll: { label: "Luft/luft-varmepumpe",     COP: 3.0,  primær: 0.67, ikon: "🌡️" },
  varmepumpe_lv: { label: "Luft/vann-varmepumpe",     COP: 3.5,  primær: 0.57, ikon: "💧" },
  fjernvarme:    { label: "Fjernvarme",                COP: 1.0,  primær: 0.80, ikon: "🌐" },
  ved_pellets:   { label: "Ved / pellets",             COP: 0.75, primær: 0.60, ikon: "🪵" },
  olje_gass:     { label: "Olje / gass",               COP: 0.90, primær: 1.40, ikon: "⚠️" },
};
const ENERGIMERKER = [
  { merke: "A", maks: 95,   farge: "#00a651", tekst: "#fff", epbd: "nZEB-klar" },
  { merke: "B", maks: 120,  farge: "#57b946", tekst: "#fff", epbd: "God standard" },
  { merke: "C", maks: 160,  farge: "#b5d334", tekst: "#333", epbd: "Over middels" },
  { merke: "D", maks: 210,  farge: "#ffd200", tekst: "#333", epbd: "Middels" },
  { merke: "E", maks: 265,  farge: "#f7941d", tekst: "#fff", epbd: "Under middels" },
  { merke: "F", maks: 335,  farge: "#ed1c24", tekst: "#fff", epbd: "Dårlig" },
  { merke: "G", maks: 9999, farge: "#9e1a20", tekst: "#fff", epbd: "Svært dårlig" },
];
const TILTAK = [
  { id: "tetting",          navn: "Tetthetsforbedring",               ikon: "🔒", støtte_min: 5000,  støtte_max: 10000, kostnad_min: 8000,  kostnad_max: 25000,  kWh_pct: 0.07, krever_ikke: [],                           passer_for: ["alle"],                       enova_program: "Tilskudd til energitiltak i bolig",    beskrivelse: "Tetting av sprekker og luftlekkasjer. Rask tilbakebetaling.", prioritet_terskel: 8  },
  { id: "isolering_loft",   navn: "Etterisolering loft/tak",          ikon: "🏠", støtte_min: 5000,  støtte_max: 15000, kostnad_min: 15000, kostnad_max: 60000,  kWh_pct: 0.12, krever_ikke: [],                           passer_for: ["enebolig","rekkehus","hytte"], enova_program: "Tilskudd til energitiltak i bolig",    beskrivelse: "Varme stiger opp – loft er ofte det mest kostnadseffektive tiltaket.", prioritet_terskel: 10 },
  { id: "varmepumpe_ll",    navn: "Luft/luft-varmepumpe",             ikon: "🌡️", støtte_min: 7000,  støtte_max: 11000, kostnad_min: 12000, kostnad_max: 25000,  kWh_pct: 0.25, krever_ikke: ["varmepumpe_ll","varmepumpe_lv"], passer_for: ["alle"],                       enova_program: "Tilskudd til luft-luft varmepumpe",    beskrivelse: "COP 3,0 – 3x mer varme per kWh enn panelovner.", prioritet_terskel: 10 },
  { id: "vinduer",          navn: "Vindusutskifting (3-lags)",        ikon: "🪟", støtte_min: 10000, støtte_max: 25000, kostnad_min: 40000, kostnad_max: 120000, kWh_pct: 0.10, krever_ikke: [],                           passer_for: ["alle"],                       enova_program: "Tilskudd til energitiltak i bolig",    beskrivelse: "U-verdi ned fra 2,4 til 0,7 W/m²K. Bedre inneklima.", prioritet_terskel: 18 },
  { id: "isolering_vegger", navn: "Etterisolering yttervegger",       ikon: "🧱", støtte_min: 15000, støtte_max: 30000, kostnad_min: 80000, kostnad_max: 200000, kWh_pct: 0.16, krever_ikke: [],                           passer_for: ["enebolig","rekkehus","hytte"], enova_program: "Tilskudd til energitiltak i bolig",    beskrivelse: "Best ved fasaderehab eller kombinert med andre tiltak.", prioritet_terskel: 25 },
  { id: "ventilasjon",      navn: "Balansert ventilasjon m/gjenvinning", ikon: "💨", støtte_min: 10000, støtte_max: 20000, kostnad_min: 40000, kostnad_max: 80000, kWh_pct: 0.13, krever_ikke: [],                          passer_for: ["alle"],                       enova_program: "Tilskudd til energitiltak i bolig",    beskrivelse: "Gjenvinning av varme fra avtrekksluft + bedre luftkvalitet.", prioritet_terskel: 15 },
  { id: "varmepumpe_lv",    navn: "Luft/vann-varmepumpe",             ikon: "💧", støtte_min: 20000, støtte_max: 35000, kostnad_min: 60000, kostnad_max: 130000, kWh_pct: 0.38, krever_ikke: ["varmepumpe_ll","varmepumpe_lv"], passer_for: ["enebolig","rekkehus"],         enova_program: "Tilskudd til varmepumpe (luft-vann)",  beskrivelse: "COP 3,5 – erstatter direktevarme med vannbåren varme.", prioritet_terskel: 15 },
  { id: "solceller",        navn: "Solcelleanlegg",                   ikon: "☀️", støtte_min: 20000, støtte_max: 35000, kostnad_min: 60000, kostnad_max: 130000, kWh_pct: 0.20, krever_ikke: [],                           passer_for: ["enebolig","rekkehus","hytte"], enova_program: "Tilskudd til solcelleanlegg",          beskrivelse: "Produser egen strøm. Best med sørvendt tak og varmepumpe.", prioritet_terskel: 20, min_areal: 100 },
];

// ─────────────────────────────────────────────
// BEREGNING
// ─────────────────────────────────────────────
function beregnEnergi(input) {
  const { areal, byggeår, oppvarming, boligtype, klimasone, isolering_nivå, vinduer_type, antall_etasjer } = input;
  const bygData  = BYGGEÅR_DATA.find(b => byggeår >= b.fra && byggeår <= b.til) || BYGGEÅR_DATA[0];
  const klima    = KLIMASONER.find(k => k.id === klimasone) || KLIMASONER[2];
  const bolig    = BOLIGTYPER.find(b => b.id === boligtype) || BOLIGTYPER[2];
  const oppvData = OPPVARMING_DATA[oppvarming] || OPPVARMING_DATA.direkte_el;
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
  return { kwhPerM2: Q_levert, primærPerM2: Q_primær, totalKwh: Math.round(Q_levert * areal),
           merke: merkeObj, merkePotensial: merkePot, bygData, klima, bolig, oppvData,
           u_vegg, u_tak, u_vindu, lufttetthet, strømkostnad: Math.round(Q_levert * areal * 1.15) };
}
function beregnTiltak(resultat, input) {
  return TILTAK.filter(t => {
    if (t.krever_ikke.includes(input.oppvarming)) return false;
    if (!t.passer_for.includes("alle") && !t.passer_for.includes(input.boligtype)) return false;
    if (t.min_areal && input.areal < t.min_areal) return false;
    if (t.id === "isolering_vegger" && resultat.kwhPerM2 < 130) return false;
    return true;
  }).map(t => {
    const besparelse_kr = Math.round(resultat.totalKwh * t.kWh_pct * 1.15);
    const støtte_snitt  = Math.round((t.støtte_min + t.støtte_max) / 2);
    const kostnad_snitt = Math.round((t.kostnad_min + t.kostnad_max) / 2);
    const netto         = kostnad_snitt - støtte_snitt;
    const tilbake       = besparelse_kr > 0 ? Math.round(netto / besparelse_kr) : 99;
    const prioritet     = tilbake <= t.prioritet_terskel ? "høy" : tilbake <= t.prioritet_terskel * 1.8 ? "middels" : "lav";
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
  { id: "oppvarming",   tittel: "Hva bruker du til oppvarming?", hint: "Det som dekker mest av varmebehovet",            valg: Object.entries(OPPVARMING_DATA).map(([k,v]) => ({ label: v.label, verdi: k, ikon: v.ikon })) },
  { id: "vinduer_type", tittel: "Hva slags vinduer har du?",     hint: "Vinduer er en stor kilde til varmetap",
    valg: [{label:"Enkeltglass / eldre",verdi:"enkelt",ikon:"🥶"},{label:"2-lags isolerglass",verdi:"dobbel",ikon:"🪟"},{label:"3-lags / nye",verdi:"trippel",ikon:"✨"}] },
];

// ─────────────────────────────────────────────
// DESIGN
// ─────────────────────────────────────────────
const C = { bg:"#f0ede8",white:"#ffffff",navy:"#1b3a5c",navyDark:"#0f2540",navyMid:"#1e4a73",green:"#2ab55a",greenLight:"#3ecf6e",muted:"#6b7a8d",border:"rgba(27,58,92,0.10)",section:"#f7f5f2",gold:"#f7941d" };
const S = {
  app:    { minHeight:"100vh", background:`linear-gradient(160deg,${C.bg} 0%,#e8f4ec 100%)`, fontFamily:"'Segoe UI',system-ui,sans-serif", paddingBottom:60 },
  header: { background:"rgba(255,255,255,0.88)", backdropFilter:"blur(12px)", borderBottom:`1px solid ${C.border}`, padding:"14px 24px", display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:10 },
  logo:   { fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"1.25rem", color:C.navy, letterSpacing:"-0.01em" },
  wrap:   { maxWidth:640, margin:"0 auto", padding:"28px 18px" },
  card:   { background:C.white, borderRadius:20, padding:"28px 24px", boxShadow:"0 8px 40px rgba(27,58,92,0.09)", border:`1px solid ${C.border}`, marginBottom:16 },
  tag:    { fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.green, marginBottom:6 },
  h1:     { fontFamily:"Georgia,serif", fontWeight:800, fontSize:"clamp(1.7rem,5vw,2.4rem)", color:C.navyDark, lineHeight:1.15, marginBottom:10 },
  h2:     { fontFamily:"Georgia,serif", fontWeight:700, fontSize:"1.2rem", color:C.navyDark, marginBottom:6 },
  sub:    { fontSize:"0.88rem", color:C.muted, lineHeight:1.6 },
  prog:   { height:5, background:"#e0ddd8", borderRadius:100, marginBottom:28, overflow:"hidden" },
  fill:   w => ({ height:"100%", background:`linear-gradient(90deg,${C.green},${C.greenLight})`, borderRadius:100, width:`${w}%`, transition:"width .4s ease" }),
  grid:   { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))", gap:10 },
  btn:    sel => ({ background:sel?`linear-gradient(135deg,${C.navy},${C.navyMid})`:C.white, color:sel?C.white:C.navyDark, border:sel?`2px solid ${C.navy}`:`2px solid ${C.border}`, borderRadius:14, padding:"16px 10px", cursor:"pointer", fontWeight:600, fontSize:"0.86rem", textAlign:"center", transition:"all .15s" }),
  ikon:   { fontSize:"1.7rem", display:"block", marginBottom:7 },
  btnP:   { width:"100%", padding:"15px", background:`linear-gradient(135deg,${C.navy},${C.navyMid})`, color:C.white, border:"none", borderRadius:12, fontSize:"1rem", fontWeight:700, cursor:"pointer", boxShadow:"0 6px 20px rgba(27,58,92,0.22)", marginTop:8 },
  btnG:   { background:"transparent", border:`1.5px solid ${C.border}`, borderRadius:10, padding:"9px 18px", fontSize:"0.84rem", fontWeight:600, color:C.navy, cursor:"pointer" },
  lbl:    { display:"block", fontSize:"0.8rem", fontWeight:700, color:C.navy, marginBottom:5 },
  inp:    { width:"100%", padding:"11px 13px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:"0.94rem", color:C.navyDark, background:"#fafafa", outline:"none", boxSizing:"border-box" },
  sel:    { width:"100%", padding:"11px 13px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:"0.94rem", color:C.navyDark, background:"#fafafa", outline:"none", boxSizing:"border-box" },
};

function LogoSvg() {
  return <svg width="34" height="34" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="14" fill={C.bg}/><path d="M50 12 L82 38 L82 82 Q82 86 78 86 L22 86 Q18 86 18 82 L18 38 Z" fill={C.navy}/><path d="M50 18 L78 42 L78 80 Q78 82 76 82 L24 82 Q22 82 22 80 L22 42 Z" fill="url(#lg)"/><defs><linearGradient id="lg" x1="50" y1="18" x2="50" y2="82" gradientUnits="userSpaceOnUse"><stop stopColor={C.greenLight}/><stop offset="1" stopColor="#1a9444"/></linearGradient></defs><rect x="44" y="22" width="12" height="12" rx="2" fill="white" opacity=".9"/><path d="M54 48 L46 62 L52 62 L46 76 L62 56 L55 56 Z" fill="white"/></svg>;
}
function Header({ onBack }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap"/>
      <div style={S.header}><LogoSvg/><span style={S.logo}>BoligEffekt</span>{onBack && <button onClick={onBack} style={{...S.btnG,marginLeft:"auto"}}>← Tilbake</button>}</div>
    </>
  );
}
function Merke({ m, stor }) {
  const sz = stor ? 76 : 56;
  return <div style={{width:sz,height:sz,borderRadius:stor?18:12,background:m.farge,color:m.tekst,display:"flex",alignItems:"center",justifyContent:"center",fontSize:stor?"2.6rem":"1.8rem",fontWeight:900,fontFamily:"Georgia,serif",boxShadow:`0 6px 20px ${m.farge}55`,flexShrink:0}}>{m.merke}</div>;
}
function Skala({ merke }) {
  return <>{ENERGIMERKER.map(em => <div key={em.merke} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}><div style={{width:22,height:22,borderRadius:6,background:em.farge,color:em.tekst,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"0.78rem",flexShrink:0}}>{em.merke}</div><div style={{flex:1,height:7,background:"#eee",borderRadius:100,overflow:"hidden"}}><div style={{height:"100%",background:em.farge,borderRadius:100,width:em.merke===merke.merke?"100%":"10%",opacity:em.merke===merke.merke?1:0.25}}/></div>{em.merke===merke.merke&&<span style={{fontSize:"0.7rem",fontWeight:700,color:em.farge,whiteSpace:"nowrap"}}>← din bolig</span>}</div>)}</>;
}

// ─────────────────────────────────────────────
// BETALINGSMUR
// ─────────────────────────────────────────────
function Betalingsmur({ resultat, input, onBetalt }) {
  const [epost, setEpost]   = useState("");
  const [pakke, setPakke]   = useState("oppgraderingsplan");
  const [laster, setLaster] = useState(false);
  const [feil, setFeil]     = useState("");
  const { merke, kwhPerM2, tiltak } = resultat;
  const høy = tiltak.filter(t => t.prioritet === "høy");

  async function betal() {
    if (!epost.includes("@")) { setFeil("Skriv inn en gyldig e-postadresse"); return; }
    setFeil(""); setLaster(true);
    const resultatId = lagId(input);
    lagreData({ resultat, input, epost, pakke });
    try {
      const res  = await fetch(`${BACKEND}/api/create-checkout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultatId, email: epost, resultatData: { resultat, input }, pakke }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { setFeil("Noe gikk galt – prøv igjen."); setLaster(false); }
    } catch(_) {
      onBetalt(epost, pakke);
      setLaster(false);
    }
  }

  const kortstil = valgt => ({
    ...S.card, border:`2px solid ${valgt ? C.navy : C.border}`,
    cursor:"pointer", position:"relative", marginBottom:0,
    transition:"all .15s",
    boxShadow: valgt ? `0 8px 32px rgba(27,58,92,0.18)` : "0 2px 12px rgba(27,58,92,0.06)",
  });

  const BASIS = [
    "Energimerke A–G med skala",
    "Full tiltaksplan med tilbakebetalingstid",
    "Enova-støtteoversikt",
    "EPBD 2024-status",
    "PDF-rapport på e-post",
  ];
  const EKSTRA = [
    "Detaljert økonomianalyse",
    "Handlingsplan – beste investering fremhevet",
    "Enova-søknadspakke med dokumentasjonsliste",
    "Ferdig søknadstekst for Enova",
    "Finansieringstips: grønne boliglån",
  ];

  return (
    <div style={S.app}>
      <Header/>
      <div style={S.wrap}>
        {/* Gratis – energimerke */}
        <div style={S.card}>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
            <Merke m={merke} stor/>
            <div>
              <div style={S.tag}>Estimert energimerke</div>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontWeight:800,fontSize:"1.6rem",color:C.navyDark}}>Merke {merke.merke}</div>
              <div style={{fontSize:"0.82rem",color:C.muted}}>{kwhPerM2} kWh/m²/år · {merke.epbd}</div>
            </div>
          </div>
          <Skala merke={merke}/>
        </div>

        {/* Uskarp forhåndsvisning av tiltak */}
        <div style={{position:"relative",marginBottom:16}}>
          <div style={{...S.card,filter:"blur(3.5px)",userSelect:"none",pointerEvents:"none",opacity:0.55}}>
            <div style={{fontWeight:700,marginBottom:12}}>Anbefalte tiltak</div>
            {[0,1,2].map(i=><div key={i} style={{background:C.section,borderRadius:10,padding:14,marginBottom:8}}><div style={{height:12,background:"#ddd",borderRadius:6,width:"60%",marginBottom:8}}/><div style={{height:8,background:"#eee",borderRadius:6,width:"80%"}}/></div>)}
          </div>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:C.white,borderRadius:16,padding:"20px 24px",boxShadow:"0 8px 32px rgba(0,0,0,0.15)",textAlign:"center",border:`2px solid ${C.green}40`}}>
              <div style={{fontSize:"1.6rem",marginBottom:6}}>🔒</div>
              <div style={{fontWeight:800,color:C.navyDark,fontSize:"0.95rem"}}>{høy.length} tiltak identifisert</div>
              <div style={{fontSize:"0.78rem",color:C.muted,marginTop:3}}>Velg en pakke for å låse opp</div>
            </div>
          </div>
        </div>

        {/* Velg pakke */}
        <div style={{marginBottom:4}}>
          <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontWeight:700,fontSize:"1.1rem",color:C.navyDark,textAlign:"center",marginBottom:4}}>Velg din pakke</div>
          <div style={{fontSize:"0.82rem",color:C.muted,textAlign:"center",marginBottom:14}}>Klikk for å velge, deretter betal</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>

            {/* Pakke 1 – Energirapport */}
            <div style={kortstil(pakke==="energirapport")} onClick={()=>setPakke("energirapport")}>
              <div style={{fontWeight:800,fontSize:"0.88rem",color:C.navyDark,marginBottom:2}}>Energirapport</div>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontWeight:900,fontSize:"1.5rem",color:C.navyDark,marginBottom:10}}>199 kr</div>
              {BASIS.map(x=>(
                <div key={x} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:5}}>
                  <span style={{color:C.green,fontWeight:800,fontSize:"0.75rem",flexShrink:0,marginTop:"1px"}}>✓</span>
                  <span style={{fontSize:"0.73rem",color:C.muted,lineHeight:1.4}}>{x}</span>
                </div>
              ))}
              <div style={{marginTop:12,padding:"9px",background:pakke==="energirapport"?`linear-gradient(135deg,${C.navy},${C.navyMid})`:"#f0ede8",borderRadius:8,textAlign:"center",color:pakke==="energirapport"?C.white:C.muted,fontWeight:700,fontSize:"0.75rem"}}>
                {pakke==="energirapport" ? "✓ Valgt" : "Velg"}
              </div>
            </div>

            {/* Pakke 2 – Oppgraderingsplan */}
            <div style={kortstil(pakke==="oppgraderingsplan")} onClick={()=>setPakke("oppgraderingsplan")}>
              <div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${C.green},${C.greenLight})`,color:C.white,borderRadius:100,padding:"3px 11px",fontSize:"0.65rem",fontWeight:800,whiteSpace:"nowrap",letterSpacing:"0.05em"}}>MEST POPULÆR</div>
              <div style={{fontWeight:800,fontSize:"0.88rem",color:C.navyDark,marginBottom:2,marginTop:6}}>Oppgraderingsplan</div>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontWeight:900,fontSize:"1.5rem",color:C.navyDark,marginBottom:3}}>399 kr</div>
              <div style={{fontSize:"0.67rem",color:C.green,fontWeight:700,marginBottom:7}}>Alt i Energirapport, pluss:</div>
              {EKSTRA.map(x=>(
                <div key={x} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:5}}>
                  <span style={{color:C.green,fontWeight:800,fontSize:"0.75rem",flexShrink:0,marginTop:"1px"}}>✓</span>
                  <span style={{fontSize:"0.73rem",color:C.muted,lineHeight:1.4}}>{x}</span>
                </div>
              ))}
              <div style={{marginTop:12,padding:"9px",background:pakke==="oppgraderingsplan"?`linear-gradient(135deg,${C.green},${C.greenLight})`:"#f0ede8",borderRadius:8,textAlign:"center",color:pakke==="oppgraderingsplan"?C.white:C.muted,fontWeight:700,fontSize:"0.75rem"}}>
                {pakke==="oppgraderingsplan" ? "✓ Valgt" : "Velg"}
              </div>
            </div>
          </div>
        </div>

        {/* Betalingskort */}
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontWeight:800,fontSize:"1.05rem",color:C.navyDark}}>{PAKKER[pakke].navn}</div>
              <div style={{fontSize:"0.82rem",color:C.muted}}>Engangskjøp · Ingen abonnement</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontWeight:900,fontSize:"1.8rem",color:C.navyDark}}>{PAKKER[pakke].pris} kr</div>
              <div style={{fontSize:"0.72rem",color:C.muted}}>inkl. mva</div>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={S.lbl}>E-postadresse (rapport sendes hit automatisk)</label>
            <input style={S.inp} type="email" placeholder="navn@epost.no" value={epost}
              onChange={e=>setEpost(e.target.value)} onKeyDown={e=>e.key==="Enter"&&betal()}/>
            {feil && <div style={{color:"#e53e3e",fontSize:"0.8rem",marginTop:5}}>{feil}</div>}
          </div>
          <button style={{...S.btnP,background:`linear-gradient(135deg,${C.green},${C.greenLight})`,boxShadow:`0 6px 20px ${C.green}44`}} onClick={betal} disabled={laster}>
            {laster ? "Sender til betaling…" : `Velg ${PAKKER[pakke].navn} – ${PAKKER[pakke].pris} kr →`}
          </button>
          <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:14}}>
            {["💳 Kort","🔒 Stripe","📄 PDF på e-post"].map(x=><span key={x} style={{fontSize:"0.72rem",color:C.muted}}>{x}</span>)}
          </div>
        </div>
        <p style={{textAlign:"center",fontSize:"0.7rem",color:"#bbb",lineHeight:1.6}}>Betaling håndteres av Stripe. BoligEffekt lagrer ikke kortinformasjon.</p>
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

function FullRapport({ resultat, epost, pdfSendt, pakke, onNullstill }) {
  const [visAlle, setVisAlle]       = useState(false);
  const [fane, setFane]             = useState("tiltak");
  const [kopiert, setKopiert]       = useState(false);
  const [leadNavn, setLeadNavn]     = useState("");
  const [leadTlf, setLeadTlf]       = useState("");
  const [leadSendt, setLeadSendt]   = useState(false);
  const [leadLaster, setLeadLaster] = useState(false);
  const { kwhPerM2, primærPerM2, totalKwh, merke, merkePotensial, strømkostnad, tiltak } = resultat;
  const høy = tiltak.filter(t => t.prioritet === "høy");
  const totalStøtte     = høy.reduce((s,t) => s + t.støtte_snitt, 0);
  const totalBesparelse = høy.reduce((s,t) => s + t.besparelse_kr, 0);
  const visTiltak = visAlle ? tiltak : tiltak.slice(0,5);
  const fs = aktiv => ({ padding:"9px 16px", border:"none", cursor:"pointer", fontWeight:700, fontSize:"0.82rem", borderRadius:8, background:aktiv?C.navy:"transparent", color:aktiv?C.white:C.muted, transition:"all .15s" });

  return (
    <div style={S.app}>
      <Header onBack={onNullstill}/>
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
          <div style={{background:pakke==="oppgraderingsplan"?`linear-gradient(135deg,${C.green},${C.greenLight})`:`linear-gradient(135deg,${C.navy},${C.navyMid})`,color:C.white,borderRadius:100,padding:"4px 12px",fontSize:"0.68rem",fontWeight:800,whiteSpace:"nowrap",flexShrink:0}}>
            {pakke==="oppgraderingsplan" ? "Oppgraderingsplan" : "Energirapport"}
          </div>
        </div>

        {/* Energimerke */}
        <div style={S.card}>
          <div style={{display:"flex",alignItems:"center",gap:18,marginBottom:20}}>
            <Merke m={merke} stor/>
            <div>
              <div style={S.tag}>Energimerke</div>
              <div style={{fontFamily:"Georgia,serif",fontWeight:800,fontSize:"1.6rem",color:C.navyDark}}>{merke.merke} – {merke.epbd}</div>
              <div style={{fontSize:"0.82rem",color:C.muted}}>{resultat.bygData.label} · {resultat.klima.label.split("(")[0].trim()}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
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
            <div style={{marginTop:14,background:`${C.green}12`,border:`1px solid ${C.green}35`,borderRadius:10,padding:"11px 14px",fontSize:"0.83rem",color:C.navyDark}}>
              💡 Med anbefalte tiltak kan boligen nå <strong>energimerke {merkePotensial.merke}</strong>
            </div>
          )}
        </div>

        {/* Potensial */}
        {høy.length > 0 && (
          <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,borderRadius:16,padding:"20px",marginBottom:16}}>
            <div style={{color:C.white,fontWeight:800,marginBottom:12}}>⚡ Ditt forbedringspotensial</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
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
          <div style={S.card}>
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
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
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
            {[["Boligtype",resultat.bolig.label],["Klimasone",resultat.klima.label],["Graddagstall (HDD)",resultat.klima.HDD+" °C·d/år"],["U-verdi vegger",resultat.u_vegg.toFixed(2)+" W/m²K"],["U-verdi tak",resultat.u_tak.toFixed(2)+" W/m²K"],["U-verdi vinduer",resultat.u_vindu.toFixed(2)+" W/m²K"],["Lufttetthet (n50)",resultat.lufttetthet.toFixed(1)+" 1/h"],["Oppvarmingssystem",resultat.oppvData.label],["COP / virkningsgrad",resultat.oppvData.COP.toFixed(1)],["Levert energi",kwhPerM2+" kWh/m²/år"],["Primærenergi",primærPerM2+" kWh/m²/år"]].map(([k,v])=>(
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
              {krav:"nZEB-standard (merke A/B)",ok:merke.merke<="B",tekst:merke.merke<="B"?"Tilfredsstiller nZEB":`Krever ned til <120 kWh/m²/år`},
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
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
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
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{fontWeight:800,fontSize:"0.95rem",color:C.navyDark}}>{bestTiltak.ikon} {bestTiltak.navn}</div>
                      <span style={{background:C.green,color:C.white,borderRadius:100,padding:"3px 10px",fontSize:"0.68rem",fontWeight:800}}>BESTE INVESTERING NÅ</span>
                    </div>
                    <div style={{fontSize:"0.8rem",color:C.muted,marginBottom:10}}>{bestTiltak.beskrivelse}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
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
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontWeight:700,fontSize:"1.1rem",color:C.navyDark,marginBottom:6}}>Takk!</div>
              <div style={{fontSize:"0.88rem",color:C.muted,lineHeight:1.6}}>Vi tar kontakt innen 1–2 virkedager.</div>
            </div>
          ) : (
            <>
              <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:16}}>
                <div style={{fontSize:"1.8rem",flexShrink:0}}>🔨</div>
                <div>
                  <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontWeight:700,fontSize:"1.05rem",color:C.navyDark,marginBottom:4}}>Vil du ha hjelp med gjennomføringen?</div>
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
// INFO-FANER (startskjerm)
// ─────────────────────────────────────────────
function InfoFaner() {
  const [fane, setFane] = useState("om");
  const faner = [
    { id:"om",    lbl:"Om tjenesten" },
    { id:"lover", lbl:"Lover & regler" },
    { id:"enova", lbl:"Enova-støtte" },
    { id:"faar",  lbl:"Hva du får" },
  ];
  const fanestil = aktiv => ({
    padding:"9px 13px", border:"none", cursor:"pointer", fontWeight:700,
    fontSize:"0.78rem", borderRadius:8, whiteSpace:"nowrap",
    background: aktiv ? C.navy : "transparent",
    color:      aktiv ? C.white : C.muted,
    transition:"all .15s",
  });

  return (
    <div style={{marginTop:28}}>
      <div style={{display:"flex",gap:4,background:C.section,borderRadius:12,padding:5,overflowX:"auto",marginBottom:0}}>
        {faner.map(f=><button key={f.id} style={fanestil(fane===f.id)} onClick={()=>setFane(f.id)}>{f.lbl}</button>)}
      </div>
      <div style={{...S.card,borderRadius:"0 0 20px 20px",borderTop:"none",marginTop:0,borderTopLeftRadius:0,borderTopRightRadius:0}}>

        {fane === "om" && (
          <div>
            <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontWeight:700,fontSize:"1.1rem",color:C.navyDark,marginBottom:10}}>Hva er BoligEffekt?</div>
            <p style={{...S.sub,marginBottom:14}}>BoligEffekt beregner et estimert energimerke (A–G) for din bolig basert på byggeår, boligtype, oppvarmingssystem og lokale klimadata. Du trenger ingen fagkunnskap – svar på 6 enkle spørsmål og få resultatet på sekunder.</p>
            <div style={{display:"grid",gap:10}}>
              {[
                { ikon:"⚡", tittel:"Energimerke A–G på sekunder", tekst:"Basert på NS-EN ISO 52000, offisielle U-verdier fra TEK-historikk og graddagstall fra NIBIO." },
                { ikon:"🛠️", tittel:"Konkrete tiltak ranket etter lønnsomhet", tekst:"Vi beregner tilbakebetalingstid, Enova-støtte og årsbesparelse for hvert tiltak tilpasset din bolig." },
                { ikon:"🏦", tittel:"Grunnlag for refinansiering eller salg", tekst:"Energimerket og tiltaksplanen gir deg dokumentasjon du kan bruke overfor bank, eiendomsmegler eller håndverkere." },
                { ikon:"🌍", tittel:"EU EPBD 2024-sjekk", tekst:"Sjekk om din bolig oppfyller de kommende EU-kravene for 2030 og 2033 – viktig å vite før du selger." },
              ].map(x=>(
                <div key={x.tittel} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 0",borderBottom:`1px solid ${C.section}`}}>
                  <span style={{fontSize:"1.3rem",flexShrink:0}}>{x.ikon}</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:"0.85rem",color:C.navyDark,marginBottom:2}}>{x.tittel}</div>
                    <div style={{fontSize:"0.79rem",color:C.muted,lineHeight:1.55}}>{x.tekst}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {fane === "lover" && (
          <div>
            <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontWeight:700,fontSize:"1.1rem",color:C.navyDark,marginBottom:10}}>Regelverk & standarder</div>
            <div style={{display:"grid",gap:12}}>
              {[
                { tag:"TEK17", tittel:"Teknisk forskrift 2017 (TEK17)", tekst:"Gjeldende byggeforskrift i Norge. Stiller krav til U-verdier (vegg ≤ 0,18, tak ≤ 0,13 W/m²K), lufttetthet (n50 ≤ 0,6/h) og primærenergibehov for nye bygg.", farge:C.navy },
                { tag:"EPBD 2024", tittel:"EU-direktiv 2024/1275 (EPBD recast)", tekst:"Europaparlamentets reviderte energidirektiv krever at alle boliger oppnår minimum energimerke E innen 2030 og merke D innen 2033. nZEB-standard (A/B) kreves for nye bygg fra 2021.", farge:"#6d28d9" },
                { tag:"Energimerkeforskriften", tittel:"Energimerkeforskriften (FOR-2009-12-18-1665)", tekst:"Norsk forskrift som pålegger selgere å fremlegge gyldig energiattest ved salg og utleie. Offisielt merke utstedes kun av godkjent energirådgiver via Enovas portal.", farge:C.green },
                { tag:"NS-EN ISO 52000", tittel:"NS-EN ISO 52000 – Energiytelse i bygninger", tekst:"Europeisk standard som definerer beregningsmetodikk for levert energi, primærenergi og energimerking. BoligEffekt benytter forenklet beregning iht. denne standarden.", farge:C.gold },
              ].map(x=>(
                <div key={x.tag} style={{border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",borderLeft:`4px solid ${x.farge}`}}>
                  <span style={{fontSize:"0.68rem",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:x.farge}}>{x.tag}</span>
                  <div style={{fontWeight:700,fontSize:"0.88rem",color:C.navyDark,margin:"4px 0 5px"}}>{x.tittel}</div>
                  <div style={{fontSize:"0.78rem",color:C.muted,lineHeight:1.55}}>{x.tekst}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {fane === "enova" && (
          <div>
            <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontWeight:700,fontSize:"1.1rem",color:C.navyDark,marginBottom:4}}>Enova-støtte 2024/2025</div>
            <div style={{...S.sub,marginBottom:14}}>Støttebeløp er veiledende. Søk via enova.no.</div>
            <div style={{display:"grid",gap:8}}>
              {[
                { tiltak:"Luft/luft-varmepumpe",        min:7000,  max:11000, notat:"Per pumpe, krav til COP ≥ 3,5" },
                { tiltak:"Luft/vann-varmepumpe",         min:20000, max:35000, notat:"Krever vannbåren distribusjon" },
                { tiltak:"Etterisolering loft/tak",      min:5000,  max:15000, notat:"Min. 25 cm total isolasjonstykkelse" },
                { tiltak:"Etterisolering yttervegger",   min:15000, max:30000, notat:"Kombineres gjerne med fasaderehab" },
                { tiltak:"3-lags vinduer",               min:10000, max:25000, notat:"U-verdi ≤ 0,80 W/m²K" },
                { tiltak:"Balansert ventilasjon m/VGJ",  min:10000, max:20000, notat:"Varmegjenvinner ≥ 80 %" },
                { tiltak:"Solcelleanlegg",               min:20000, max:35000, notat:"Min. 3 kWp installert effekt" },
                { tiltak:"Tetthetsforbedring",           min:5000,  max:10000, notat:"Verifisert med trykktest" },
              ].map(x=>(
                <div key={x.tiltak} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 13px",background:C.section,borderRadius:10,gap:12}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:"0.83rem",color:C.navyDark}}>{x.tiltak}</div>
                    <div style={{fontSize:"0.72rem",color:C.muted,marginTop:1}}>{x.notat}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontWeight:800,fontSize:"0.88rem",color:C.green}}>{x.min.toLocaleString("no")}–{x.max.toLocaleString("no")} kr</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,fontSize:"0.72rem",color:"#bbb",lineHeight:1.6}}>Kilde: Enova.no · Beløp kan endres. Søk alltid før du bestiller håndverker.</div>
          </div>
        )}

        {fane === "faar" && (
          <div>
            <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontWeight:700,fontSize:"1.1rem",color:C.navyDark,marginBottom:4}}>Hva er inkludert i rapporten?</div>
            <div style={{...S.sub,marginBottom:16}}>Energirapport fra 199 kr, Oppgraderingsplan 399 kr – leveres øyeblikkelig på e-post som PDF.</div>
            <div style={{display:"grid",gap:10}}>
              {[
                { ikon:"📊", tittel:"Komplett tiltaksplan", tekst:"Alle relevante energitiltak for akkurat din bolig, rangert etter tilbakebetalingstid. Du ser kostnad, besparelse og Enova-støtte for hvert enkelt tiltak." },
                { ikon:"💰", tittel:"Enova-støtteoversikt med beløp", tekst:"Hvilke Enova-program du kan søke, eksakte støttebeløp og hva som kreves for å kvalifisere. Spar tid på å finne frem selv." },
                { ikon:"📉", tittel:"Estimert årsbesparelse", tekst:"Beregnet strømsparing i kroner per år for hvert tiltak, basert på din faktiske bolig, klimasone og nåværende strømpris." },
                { ikon:"🇪🇺", tittel:"EU EPBD 2024-status", tekst:"Sjekk om boligen din oppfyller kravene for 2030 (merke E) og 2033 (merke D). Viktig informasjon ved salg eller refinansiering." },
                { ikon:"🔬", tittel:"Tekniske beregningsdata", tekst:"Full transparens i beregningen: U-verdier, graddagstall, COP-faktorer, primærenergi og levert energi etter NS-EN ISO 52000." },
                { ikon:"📄", tittel:"PDF-rapport på e-post", tekst:"Profesjonelt formatert PDF som du kan dele med håndverkere for pristilbud, bank for grønne boliglån, eller eiendomsmegler ved salg." },
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
            <div style={{marginTop:14,background:`${C.green}12`,border:`1px solid ${C.green}30`,borderRadius:10,padding:"12px 14px",fontSize:"0.8rem",color:C.navyDark,lineHeight:1.6}}>
              ✅ Engangskjøp · Ingen abonnement · Betaling via Stripe · Rapport på e-post umiddelbart
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HOVED-APP
// ─────────────────────────────────────────────
export default function App() {
  const [skjerm, setSkjerm]     = useState("start");
  const [steg, setSteg]         = useState(0);
  const [svar, setSvar]         = useState({});
  const [avForm, setAvForm]     = useState({ areal:"", byggeår:"", boligtype:"enebolig", klimasone:"3", oppvarming:"direkte_el", vinduer_type:"dobbel", isolering_nivå:"normal", antall_etasjer:2 });
  const [resultat, setResultat] = useState(null);
  const [input, setInput]       = useState(null);
  const [betalt, setBetalt]     = useState(false);
  const [epost, setEpost]       = useState("");
  const [pakke, setPakke]       = useState("energirapport");
  const [pdfSendt, setPdfSendt] = useState(false);

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

    console.log("[REDIRECT] Gjenoppretter rapport – pakke:", lagret.pakke, "| e-post:", lagret.epost);

    // Gjenopprett all state fra før Stripe-redirect
    setResultat(lagret.resultat);
    setInput(lagret.input);
    setEpost(lagret.epost || "");
    setPakke(lagret.pakke || "energirapport");
    setBetalt(true);
    setSkjerm("resultat");

    // Fjern session_id fra URL så refresh ikke re-trigger
    window.history.replaceState({}, "", "/");

    // Send PDF-rapport automatisk etter betaling
    fetch(`${BACKEND}/api/send-rapport`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id:   sessionId,
        resultatData: lagret,
        epost:        lagret.epost,
        pakke:        lagret.pakke || "energirapport",
      }),
    }).then(() => setPdfSendt(true)).catch(console.error);
  }, []);

  function lagOgVis(inp) {
    const r = beregnEnergi(inp);
    const t = beregnTiltak(r, inp);
    setResultat({ ...r, tiltak: t });
    setInput(inp);
    setBetalt(false);
    setSkjerm("resultat");
  }

  function velg(verdi) {
    const nyttSvar = { ...svar, [STEG[steg].id]: verdi };
    setSvar(nyttSvar);
    if (steg < STEG.length - 1) { setTimeout(() => setSteg(steg + 1), 260); }
    else lagOgVis({ areal: nyttSvar.areal||100, byggeår: nyttSvar.byggeår||1978, boligtype: nyttSvar.boligtype||"enebolig", klimasone: nyttSvar.klimasone||"3", oppvarming: nyttSvar.oppvarming||"direkte_el", vinduer_type: nyttSvar.vinduer_type||"dobbel", isolering_nivå:"normal", antall_etasjer:2 });
  }

  function nullstill() { setSkjerm("start"); setSteg(0); setSvar({}); setResultat(null); setInput(null); setBetalt(false); setPakke("energirapport"); setPdfSendt(false); }

  // Resultat-skjerm
  if (skjerm === "resultat" && resultat) {
    if (betalt) return <FullRapport resultat={resultat} epost={epost} pdfSendt={pdfSendt} pakke={pakke} onNullstill={nullstill}/>;
    return <Betalingsmur resultat={resultat} input={input} onBetalt={(e, p) => { setEpost(e); setPakke(p); setBetalt(true); }}/>;
  }

  // Avansert skjema
  if (skjerm === "avansert") return (
    <div style={S.app}>
      <Header onBack={nullstill}/>
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
          <button style={S.btnP} onClick={()=>lagOgVis({areal:Number(avForm.areal)||120,byggeår:Number(avForm.byggeår)||1978,boligtype:avForm.boligtype,klimasone:avForm.klimasone,oppvarming:avForm.oppvarming,vinduer_type:avForm.vinduer_type,isolering_nivå:avForm.isolering_nivå,antall_etasjer:Number(avForm.antall_etasjer)||2})}>
            Beregn energimerke →
          </button>
        </div>
      </div>
    </div>
  );

  // Enkel steg-for-steg
  if (skjerm === "enkel") {
    const s = STEG[steg];
    return (
      <div style={S.app}>
        <Header onBack={()=>steg===0?nullstill():setSteg(steg-1)}/>
        <div style={S.wrap}>
          <div style={S.prog}><div style={S.fill((steg/STEG.length)*100)}/></div>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={S.tag}>Spørsmål {steg+1} av {STEG.length}</div>
            <h2 style={{fontFamily:"Georgia,serif",fontWeight:800,fontSize:"clamp(1.3rem,4vw,1.8rem)",color:C.navyDark,marginBottom:8}}>{s.tittel}</h2>
            <p style={S.sub}>{s.hint}</p>
          </div>
          <div style={S.grid}>
            {s.valg.map(v=>(
              <button key={String(v.verdi)} style={S.btn(svar[s.id]===v.verdi)} onClick={()=>velg(v.verdi)}
                onMouseEnter={e=>{if(svar[s.id]!==v.verdi){e.currentTarget.style.borderColor=C.navy;e.currentTarget.style.transform="translateY(-2px)";}}}
                onMouseLeave={e=>{if(svar[s.id]!==v.verdi){e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="";}}}>
                <span style={S.ikon}>{v.ikon}</span>{v.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Startskjerm
  return (
    <div style={S.app}>
      <Header/>
      <div style={S.wrap}>
        <div style={{textAlign:"center",marginBottom:36,paddingTop:16}}>
          <div style={S.tag}>Gratis energianalyse</div>
          <h1 style={S.h1}>Hva er energimerket<br/>på din bolig?</h1>
          <p style={{...S.sub,maxWidth:420,margin:"0 auto"}}>Finn energimerke A–G, se hvilke tiltak som lønner seg og where mye Enova-støtte du kan få.</p>
        </div>
        <div style={{display:"grid",gap:14}}>
          <div style={{...S.card,cursor:"pointer",textAlign:"center"}} onClick={()=>setSkjerm("enkel")}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 16px 48px rgba(27,58,92,0.14)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
            <div style={{fontSize:"2.2rem",marginBottom:10}}>🏠</div>
            <div style={{fontWeight:800,fontSize:"1.1rem",color:C.navyDark,marginBottom:5}}>Enkel analyse</div>
            <div style={{...S.sub,marginBottom:16}}>6 spørsmål · 2 minutter · Ingen fagkunnskap nødvendig</div>
            <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,color:C.white,borderRadius:10,padding:"12px 28px",fontWeight:700,fontSize:"0.95rem",display:"inline-block"}}>Start her →</div>
          </div>
        </div>
        <InfoFaner/>
        <p style={{textAlign:"center",fontSize:"0.7rem",color:"#bbb",marginTop:20}}>NS-EN ISO 52000 · TEK17 · EU EPBD 2024/1275 · Gratis energimerke-estimat</p>
      </div>
    </div>
  );
}
