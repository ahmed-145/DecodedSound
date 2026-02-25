import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SEED_TERMS = [
    { term: 'mandem', definition: 'Crew, gang, or close group of friends. Used to describe your inner circle.', origin: 'UK slang adopted in Cape Flats', example: 'Hy loop met die mandem elke dag' },
    { term: 'g', definition: 'Genuine friend; a real one. Short for "gangster" but used affectionately.', origin: 'American hip-hop, localised', example: "Hy's 'n real g" },
    { term: 'skolly', definition: 'A rogue or street-smart individual. Can be derogatory or used with pride depending on context.', origin: 'Afrikaans Cape Flats slang', example: "Die skolly weet hoe dit werk" },
    { term: 'spook', definition: 'A fake person; someone pretending to be something they are not. A fraud or poser.', origin: 'Cape Flats slang', example: "Hy's net 'n spook" },
    { term: 'bra', definition: 'Brother; close friend. Term of endearment between men.', origin: 'South African slang from Afrikaans "broer"', example: 'Wat sê jy bra?' },
    { term: 'kwaai', definition: 'Cool, excellent, impressive. Similar to "sick" or "fire" in other slang registers.', origin: 'Afrikaans Cape Flats', example: 'Daai track is kwaai bra' },
    { term: 'lekker', definition: 'Nice, good, enjoyable. One of the most versatile words in Cape slang.', origin: 'Afrikaans', example: 'Dit was lekker vanaand' },
    { term: 'naaier', definition: 'Strongly derogatory — a despicable or untrustworthy person. Literal Afrikaans obscenity repurposed as insult.', origin: 'Afrikaans', example: 'Moenie daai naaier vertrou nie' },
    { term: 'dala', definition: 'To do something, to handle business, to act. "Dala what you must" = do what needs to be done.', origin: 'Cape Malay / Cape Flats', example: 'Dala wat jy moet' },
    { term: 'jol', definition: 'Party, hangout, or a good time. As a verb: to go out and have fun.', origin: 'South African English/Afrikaans', example: 'Ons was op die jol laasnaand' },
    { term: 'hectic', definition: 'Intense, extreme, serious. Can describe something impressive or overwhelming.', origin: 'South African English', example: 'Die track is hectic man' },
    { term: 'cherrie', definition: 'Girlfriend or young woman. Generally used with affection.', origin: 'Cape Afrikaans slang', example: 'Sy is sy cherrie' },
    { term: 'ek sê', definition: 'Literally "I say" — used as an exclamation or filler, similar to "yo" or "I\'m telling you".', origin: 'Afrikaans Cape Flats', example: 'Ek sê, daai was mad nice' },
    { term: 'plaas', definition: 'Farm. In SDK context often refers to being naive, unsophisticated, or from outside the city.', origin: 'Afrikaans', example: "Moenie so plaasjapie wees nie" },
    { term: 'boggorol', definition: 'Nothing, zero, none. Emphatic way of saying you have nothing.', origin: 'Cape Flats Afrikaans slang', example: 'Ek het boggorol' },
    { term: 'brasse', definition: 'Plural of bra — brothers, friends, crew.', origin: 'Cape Afrikaans', example: 'Al die brasse was daar' },
    { term: 'roer', definition: 'To beat up, to move, or to handle something aggressively.', origin: 'Afrikaans', example: 'Hy gaan jou roer' },
    { term: 'stukke', definition: 'Things, stuff. Also can refer to money or goods depending on context.', origin: 'Afrikaans', example: 'Hy het die stukke' },
    { term: 'snoek', definition: 'A Cape fish, but in slang can refer to a person from Cape Town. Used as cultural identity marker.', origin: 'Cape Dutch/Afrikaans', example: "Ons is Cape snoeke" },
    { term: 'moerse', definition: 'Huge, massive, extremely. Intensifier for almost any adjective.', origin: 'Cape Afrikaans', example: 'Daai kar is moerse groot' },
]

async function main() {
    console.log('🌱 Seeding KB with', SEED_TERMS.length, 'initial terms...')

    for (const entry of SEED_TERMS) {
        await prisma.kBEntry.upsert({
            where: { term: entry.term },
            update: { definition: entry.definition, origin: entry.origin, example: entry.example },
            create: { ...entry, confidence: 0.9, isApproved: true },
        })
    }

    console.log('✅ KB seeded successfully!')
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
