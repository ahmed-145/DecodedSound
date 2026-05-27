// SPIKE: prove the DecodedSound engine generalises beyond Esdeekid.
// Runs a Spanish (Bad Bunny) snippet through the same translateLyrics() pipeline
// using the new 'spanish' source profile — no database, no Next.js, just Groq.
//
//   GROQ_API_KEY is read from .env.local automatically.
//   Run:  npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/spike-translate.ts

import { readFileSync } from 'fs'
import { join } from 'path'

// Load GROQ_API_KEY from .env.local BEFORE importing lib/ai (it reads env at load).
const envPath = join(__dirname, '..', '.env.local')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

// Real Bad Bunny lyrics — "Yo Perreo Sola" (chorus + verse snippet).
const BAD_BUNNY = `Que ella perrea sola
Antes que te acerque' recuerda
No mmeans no
Ella perrea sola
Si mil veces le pidió la' nalga'
Y la' baila sola
Ahora to' lo' velorios son pa' mí
Si necesita' un taxi, yo te llamo el Uber
Que perree sola`

async function main() {
    const { translateLyrics, SOURCE_PROFILES } = await import('../lib/ai')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('SPIKE — profile:', SOURCE_PROFILES.spanish.label)
    console.log('Whisper lang:', SOURCE_PROFILES.spanish.whisperLang, '| uses KB:', SOURCE_PROFILES.spanish.usesKB)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const t0 = Date.now()
    const r = await translateLyrics(BAD_BUNNY, undefined, 'spanish')
    const ms = Date.now() - t0

    console.log('📝 PLAIN TRANSLATION\n' + r.plainTranslation + '\n')

    console.log('🔤 LINE-BY-LINE')
    for (const l of r.lineByLine) {
        console.log(`  • ${l.original}`)
        console.log(`    → ${l.translation}` + (l.flaggedTerms?.length ? `   [${l.flaggedTerms.join(', ')}]` : ''))
    }
    console.log()

    console.log('🏙️  CULTURAL CONTEXT\n' + r.culturalContext + '\n')

    console.log('📖 SLANG / UNKNOWN TERMS')
    for (const t of r.unknownTerms ?? []) {
        console.log(`  • ${t.term} (${t.confidence}): ${t.provisionalDefinition}`)
    }
    console.log()

    console.log(`genreConfidence: ${r.genreConfidence}  |  overallConfidence: ${r.overallConfidence}`)
    console.log(`⏱  ${ms}ms`)
}

main().catch(e => { console.error('SPIKE FAILED:', e); process.exit(1) })
