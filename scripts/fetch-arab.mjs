// يجلب مباريات الدوريات العربية من TheSportsDB ويكتب extra.json (يقرؤه القالب عبر GA.extraFeed)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const KEY = process.env.TSDB_KEY || '123';          // 123 = مفتاح تجريبي محدود؛ ضع مفتاحك المدفوع في GitHub Secrets باسم TSDB_KEY
const API = `https://www.thesportsdb.com/api/v1/json/${KEY}`;

// الدول/الدوريات: key = مفتاح الدوري في القالب، id = رقم الدوري في TheSportsDB (اتركه null ليُبحث عنه تلقائياً بالدولة)
const LEAGUES = [
  { key:'egypt',   country:'Egypt',   id:'4829', name:'الدوري المصري',   short:'المصري' },
  { key:'botola',  country:'Morocco', id:null,   name:'البطولة المغربية', short:'المغربي' },
  { key:'tunisia', country:'Tunisia', id:null,   name:'الدوري التونسي',  short:'التونسي' },
  { key:'algeria', country:'Algeria', id:null,   name:'الدوري الجزائري', short:'الجزائري' },
  { key:'uae',     country:'United Arab Emirates', id:null, name:'دوري أدنوك الإماراتي', short:'الإماراتي' },
  { key:'qatar',   country:'Qatar',   id:null,   name:'دوري نجوم قطر',   short:'القطري' },
  { key:'iraq',    country:'Iraq',    id:null,   name:'الدوري العراقي',  short:'العراقي' },
  { key:'jordan',  country:'Jordan',  id:null,   name:'الدوري الأردني',  short:'الأردني' },
];
const TEAMS_AR = existsSync('teams-ar.json') ? JSON.parse(readFileSync('teams-ar.json', 'utf8')) : {};

const get = async url => { const r = await fetch(url); if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const day = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

async function resolveId(L){
  if (L.id) return L.id;
  const j = await get(`${API}/search_all_leagues.php?c=${encodeURIComponent(L.country)}&s=Soccer`);
  const top = (j.countries || []).filter(x => x.idCup === '0').sort((a, b) => Number(a.intDivision) - Number(b.intDivision))[0];
  return top ? top.idLeague : null;
}
function status(e){
  const s = String(e.strStatus || '').toUpperCase(), post = e.strPostponed === 'yes' || /PST|POSTP|CANC|ABD/.test(s);
  if (post) return 'postponed';
  if (/^(FT|AET|PEN|AP|FINISHED|MATCH FINISHED)$/.test(s)) return 'finished';
  if (/^(1H|2H|HT|ET|P|LIVE|BT)$/.test(s)) return 'live';
  return 'auto';
}
const nm = n => (TEAMS_AR[n] || n || '');

const seen = new Map();
for (const L of LEAGUES){
  try {
    const id = await resolveId(L); if (!id){ console.log('no league id for', L.country); continue; }
    const calls = [`eventsnextleague.php?id=${id}`, `eventspastleague.php?id=${id}`, ...[-1, 0, 1].map(d => `eventsday.php?d=${day(d)}&l=${id}`)];
    for (const c of calls){
      try {
        const j = await get(`${API}/${c}`);
        for (const e of (j.events || j.results || [])){
          if (!e || !e.strTimestamp || String(e.idLeague) !== String(id)) continue;
          const start = e.strTimestamp.replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(e.strTimestamp) ? '' : 'Z');
          const t = Date.parse(start); if (isNaN(t) || Math.abs(t - Date.now()) > 2 * 864e5) continue;   // يكفي أمس/اليوم/غداً
          const st = status(e), m = {
            id: 'tsdb' + e.idEvent, league: L.key, leagueName: L.name, leagueShort: L.short, leagueLogo: e.strLeagueBadge || undefined,
            start: new Date(t).toISOString(),
            home: { name: nm(e.strHomeTeam), logo: e.strHomeTeamBadge || '' }, away: { name: nm(e.strAwayTeam), logo: e.strAwayTeamBadge || '' },
            venue: e.strVenue || '',
          };
          if (st !== 'auto') m.status = st;
          if (e.intHomeScore != null && e.intAwayScore != null && e.intHomeScore !== '') m.score = [Number(e.intHomeScore), Number(e.intAwayScore)];
          seen.set(m.id, m);
        }
      } catch (err) { console.log('skip', c, err.message); }
      await sleep(400);
    }
  } catch (err) { console.log('league failed', L.key, err.message); }
}
const matches = [...seen.values()].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
writeFileSync('extra.json', JSON.stringify({ updated: new Date().toISOString(), matches }, null, 1));
console.log('wrote', matches.length, 'matches');
