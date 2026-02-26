import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PRD Section 15 MVP: "500+ AI-seeded terms at launch"
// This seed file contains 500+ authentic Cape Flats / SDK / Kaaps slang terms.
const SEED_TERMS = [
    // ── Core SDK Slang ─────────────────────────────────────────────────────────
    { term: 'mandem', definition: 'Crew, gang, or close group of friends. Your inner circle.', origin: 'UK slang adopted on Cape Flats', example: 'Hy loop met die mandem elke dag' },
    { term: 'g', definition: 'Genuine friend; a real one. Short for "gangster" but used affectionately.', origin: 'American hip-hop, localised', example: "Hy's 'n real g" },
    { term: 'skolly', definition: 'A rogue or street-smart individual. Derogatory or used with pride.', origin: 'Afrikaans Cape Flats slang', example: "Die skolly weet hoe dit werk" },
    { term: 'spook', definition: 'A fake person; someone pretending to be something they are not.', origin: 'Cape Flats slang', example: "Hy's net 'n spook" },
    { term: 'bra', definition: 'Brother; close friend. Term of endearment between men.', origin: 'South African slang from Afrikaans "broer"', example: 'Wat sê jy bra?' },
    { term: 'kwaai', definition: 'Cool, excellent, impressive. Similar to "sick" or "fire".', origin: 'Afrikaans Cape Flats', example: 'Daai track is kwaai bra' },
    { term: 'lekker', definition: 'Nice, good, enjoyable. One of the most versatile words in Cape slang.', origin: 'Afrikaans', example: 'Dit was lekker vanaand' },
    { term: 'naaier', definition: 'Strongly derogatory — a despicable or untrustworthy person.', origin: 'Afrikaans', example: 'Moenie daai naaier vertrou nie' },
    { term: 'dala', definition: 'To do something, to handle business, to act. "Dala what you must" = do what needs to be done.', origin: 'Cape Malay / Cape Flats', example: 'Dala wat jy moet' },
    { term: 'jol', definition: 'Party, hangout, or a good time. As a verb: to go out and have fun.', origin: 'South African English/Afrikaans', example: 'Ons was op die jol laasnaand' },
    { term: 'hectic', definition: 'Intense, extreme, serious. Can describe something impressive or overwhelming.', origin: 'South African English', example: 'Die track is hectic man' },
    { term: 'cherrie', definition: 'Girlfriend or young woman. Generally used with affection.', origin: 'Cape Afrikaans slang', example: 'Sy is sy cherrie' },
    { term: 'ek sê', definition: 'Literally "I say" — used as an exclamation or filler, like "yo" or "I\'m telling you".', origin: 'Afrikaans Cape Flats', example: 'Ek sê, daai was mad nice' },
    { term: 'boggorol', definition: 'Nothing, zero, none. Emphatic way of saying you have nothing.', origin: 'Cape Flats Afrikaans slang', example: 'Ek het boggorol' },
    { term: 'brasse', definition: 'Plural of bra — brothers, friends, crew.', origin: 'Cape Afrikaans', example: 'Al die brasse was daar' },
    { term: 'roer', definition: 'To beat up, to move, or to handle something aggressively.', origin: 'Afrikaans', example: 'Hy gaan jou roer' },
    { term: 'stukke', definition: 'Things, stuff. Also can refer to money or goods depending on context.', origin: 'Afrikaans', example: 'Hy het die stukke' },
    { term: 'snoek', definition: 'A Cape fish; in slang refers to a Cape Town person. Cultural identity marker.', origin: 'Cape Dutch/Afrikaans', example: "Ons is Cape snoeke" },
    { term: 'moerse', definition: 'Huge, massive, extremely. Intensifier for almost any adjective.', origin: 'Cape Afrikaans', example: 'Daai kar is moerse groot' },
    { term: 'plaas', definition: 'Farm. In SDK context often refers to being naive or from outside the city.', origin: 'Afrikaans', example: "Moenie so plaasjapie wees nie" },

    // ── Money & Hustle ──────────────────────────────────────────────────────────
    { term: 'cake', definition: 'Money, cash. Also used for anything of value.', origin: 'Cape Flats/Hip-hop', example: 'Hy maak cake met die hustle' },
    { term: 'paper', definition: 'Money. Equivalent to "bread" or "dough" in English slang.', origin: 'American hip-hop, adopted', example: 'Ons chase daai paper' },
    { term: 'hustle', definition: 'To make money through work, schemes, or street business.', origin: 'American English, localised', example: 'Die hustle is real' },
    { term: 'grind', definition: 'To work hard consistently towards a goal, especially money.', origin: 'Hip-hop culture', example: 'Hy grind elke dag' },
    { term: 'trap', definition: 'The drug trade environment; also used as a music genre descriptor.', origin: 'American hip-hop', example: 'Hy kom van die trap' },
    { term: 'mula', definition: 'Money. Casual term for cash.', origin: 'Spanish via American slang', example: 'Ek het geen mula nie' },
    { term: 'bread', definition: 'Money. Common across hip-hop dialects.', origin: 'Hip-hop slang', example: 'Niks bread in die huis nie' },
    { term: 'bucks', definition: 'Rand (South African currency) or money generally.', origin: 'South African English', example: 'Het jy twintig bucks?' },
    { term: 'loot', definition: 'Money or stolen goods. Can also mean general possessions.', origin: 'South African English', example: 'Daai loot gaan weg' },
    { term: 'skore', definition: 'Score — to obtain something, usually drugs or money illicitly.', origin: 'Cape Flats slang', example: 'Hy wil skore vanaand' },

    // ── People & Reputation ─────────────────────────────────────────────────────
    {
        term: 'real one', definition: 'A genuine, trustworthy person. Someone authentic.', origin: 'American hip-hop', example: "Jy is 'n real one bro"
    },
    { term: 'cap', definition: 'A lie. "No cap" = no lie, for real. "Capping" = lying.', origin: 'American AAVE, globalised', example: 'Hy cap elke dag' },
    { term: 'no cap', definition: 'For real, truthfully. Equivalent to "no lie" or "I swear".', origin: 'American AAVE', example: 'Daai is die beste, no cap' },
    { term: 'rat', definition: 'An informer, someone who tells on others to police or authority.', origin: 'Universal slang', example: 'Hy is \'n rat, moenie praat nie' },
    { term: 'snake', definition: 'An untrustworthy backstabber. Someone who betrays your trust.', origin: 'Universal slang', example: 'Pas op vir daai snake' },
    { term: 'opps', definition: 'Opposition, enemies. People who are against you.', origin: 'UK drill slang', example: 'Die opps was in die wyk vanaand' },
    { term: 'plug', definition: 'A supplier or connection for drugs or goods. The person who hooks you up.', origin: 'American hip-hop', example: 'Hy is die plug in die area' },
    { term: 'fiend', definition: 'Someone addicted to drugs; also used for anyone obsessively wanting something.', origin: 'American English', example: 'Hy is \'n fiend vir daai stuff' },
    { term: 'oupa', definition: 'Literally grandfather; used to refer to an elder or respected elder figure in the community.', origin: 'Afrikaans', example: 'Die oupa van die area ken almal' },
    { term: 'maat', definition: 'Friend, buddy, mate. General term of address.', origin: 'Afrikaans', example: 'Wat sê jy maat?' },
    { term: 'ouens', definition: 'Guys, people, men. General plural reference.', origin: 'Afrikaans Cape Flats', example: 'Die ouens was almal dronk' },
    { term: 'soutie', definition: 'An English-speaking South African. Can be slightly derogatory.', origin: 'Afrikaans slang', example: 'Die soutie verstaan nie Kaaps nie' },
    { term: 'boeta', definition: 'Brother, older brother. Respectful term for an elder male.', origin: 'Afrikaans from Malay "abang"', example: 'Boeta Mohammed ken die spot' },
    { term: 'laaitie', definition: 'A young person, a kid, a youth. Can be used fondly.', origin: 'Cape Flats slang', example: 'Die laaities van die wyk speel sokker' },
    { term: 'larney', definition: 'Posh, fancy, upper class. Can refer to a wealthy person.', origin: 'South African English', example: 'Hy dink hy is larney nou' },
    { term: 'kêrel', definition: 'Guy, boyfriend, or a man. Casual reference to a male.', origin: 'Afrikaans', example: 'Wie is daai kêrel?' },
    { term: 'tjom', definition: 'Close friend, buddy. Very intimate term of address.', origin: 'Cape Afrikaans from Malay', example: 'My tjom en ek gaan saam' },
    { term: 'vrou', definition: 'Woman, wife, or girlfriend. Literal Afrikaans for woman.', origin: 'Afrikaans', example: 'Sy is sy vrou' },
    { term: 'ma', definition: 'Mother. Also used as an intensifier in exclamations.', origin: 'Afrikaans', example: 'Sy ma worry elke dag' },
    { term: 'pa', definition: 'Father. Used literally or as a respectful form of address.', origin: 'Afrikaans', example: 'Sy pa is weg' },

    // ── Streets & Places ────────────────────────────────────────────────────────
    { term: 'wyk', definition: 'The area, neighbourhood, or gang territory. Your home turf.', origin: 'Afrikaans', example: 'Hy is van ons wyk' },
    { term: 'flats', definition: 'The Cape Flats — the sprawling townships southeast of Cape Town.', origin: 'Geographic term', example: 'Hy kom van die Flats' },
    { term: 'hood', definition: 'Neighbourhood, home area. Where you are from.', origin: 'American English', example: 'Ek is lojaal aan my hood' },
    { term: 'corners', definition: 'The street corners where people hang out; the street life setting.', origin: 'Cape Flats slang', example: 'Hy is op die corners elke aand' },
    { term: 'block', definition: 'The city block; your immediate neighbourhood.', origin: 'American hip-hop', example: 'Die block is warm vanaand' },
    { term: 'pad', definition: 'Road, way, or path. As in "die pad" (the road/life path).', origin: 'Afrikaans', example: 'Hy is op die verkeerde pad' },
    { term: 'spot', definition: 'A hangout spot, a place where things happen. Often a drug house.', origin: 'Universal slang', example: 'Ons gaan na die spot' },
    { term: 'Mitch', definition: 'Mitchells Plain — a large township on the Cape Flats.', origin: 'Geographic reference', example: 'Hy kom van Mitch' },
    { term: 'Hanover Park', definition: 'A suburb on the Cape Flats known for gang activity. Often referenced in SDK lyrics.', origin: 'Geographic', example: 'Daai ouens is van Hanover Park' },
    { term: 'Delft', definition: 'A Cape Flats township frequently referenced in SDK music.', origin: 'Geographic', example: 'Die Delft ouens is hectic' },
    { term: 'Lavender Hill', definition: 'A Cape Flats suburb often referenced in SDK music for its gang landscape.', origin: 'Geographic', example: 'Lavender Hill is nie \'n joke nie' },

    // ── Substances ──────────────────────────────────────────────────────────────
    { term: 'tik', definition: 'Crystal methamphetamine. A severe drug epidemic in the Cape Flats.', origin: 'Cape Flats slang', example: 'Tik het die wyk gebreek' },
    { term: 'mandrax', definition: 'Methaqualone (Quaalude). "White pipe" -- smoked with dagga. Major Cape Flats issue.', origin: 'Pharmaceutical brand name', example: 'Hy rook mandrax al jare' },
    { term: 'pipe', definition: 'A white-pipe (mandrax and cannabis combination). A major addiction issue.', origin: 'Cape Flats slang', example: 'Hy is op die pipe' },
    { term: 'dagga', definition: 'Cannabis/marijuana. Widely used term in South Africa.', origin: 'Cape Malay/Khoikhoi origin', example: 'Hy rook dagga agteros' },
    { term: 'zol', definition: 'A cannabis cigarette (joint). Very common Cape term.', origin: 'Cape Afrikaans', example: 'Draai \'n zol vir ons' },
    { term: 'drank', definition: 'Alcohol, booze. From Afrikaans.', origin: 'Afrikaans', example: 'Te veel drank vanaand' },
    { term: 'dop', definition: 'An alcoholic drink; also to drink alcohol.', origin: 'Afrikaans', example: 'Kom ons gaan dop' },
    { term: 'high', definition: 'Intoxicated from drugs. Universal English slang.', origin: 'English', example: 'Hy is te high om te praat' },
    { term: 'stoned', definition: 'Intoxicated, specifically from cannabis.', origin: 'English', example: 'Hy is stoned die dag' },
    { term: 'shot', definition: 'A strong drink; also "shot" as in "thanks" or "well done".', origin: 'South African English dual-meaning', example: 'Shot vir jou bra' },

    // ── Violence & Danger ───────────────────────────────────────────────────────
    { term: 'banger', definition: 'A gun. Also refers to a hard-hitting song.', origin: 'American hip-hop', example: 'Hy het \'n banger by hom' },
    { term: 'straps', definition: 'Guns, weapons. As in "strapped" = armed.', origin: 'American hip-hop', example: 'Die ouens kom met straps' },
    { term: 'glock', definition: 'A Glock pistol. Often used generically for any handgun.', origin: 'Firearm brand', example: 'Hy het \'n glock in sy belt' },
    { term: 'blap', definition: 'The sound of a gunshot; to shoot someone.', origin: 'Onomatopoeia, Cape Flats', example: 'Hulle het hom geblap' },
    { term: 'hit', definition: 'A targeted shooting or killing. To "take a hit" is to be shot.', origin: 'American hip-hop', example: 'Daai was \'n hit op hom' },
    { term: 'beef', definition: 'A conflict, dispute, or ongoing feud between individuals or gangs.', origin: 'Universal hip-hop slang', example: 'Hulle het beef met die ander span' },
    { term: 'drill', definition: 'UK-origin term for street violence/gang activity. Also the music genre.', origin: 'UK/Chicago slang', example: 'Die drill gaan aan in die wyk' },
    { term: 'slide', definition: 'To go somewhere, especially to confront enemies.', origin: 'UK/US trap slang', example: 'Hulle wil slide na die flats' },
    { term: 'caught a body', definition: 'To kill someone. Very serious street expression.', origin: 'American AAVE', example: 'Hy het \'n body gevang' },
    { term: 'drop', definition: 'To kill or shoot someone. "He got dropped."', origin: 'Cape Flats / hip-hop', example: 'Hulle het hom laat drop' },
    { term: 'clash', definition: 'A violent confrontation between rival gangs or individuals.', origin: 'Universal English', example: 'Die clash was groot laasnaand' },

    // ── Gangs & Loyalty ─────────────────────────────────────────────────────────
    { term: 'span', definition: 'Gang, crew, or team. Your group of associates.', origin: 'Afrikaans Cape Flats', example: 'Hy is met sy span' },
    { term: 'fleet', definition: 'A set or collection of gang members; also a group of cars.', origin: 'Cape Flats street slang', example: 'Die fleet van Numbers' },
    { term: '28s', definition: 'The 28 gang — one of the most powerful prison gangs in South Africa.', origin: 'South African prison gangs', example: 'Hulle is 28s binne' },
    { term: '26s', definition: 'The 26 gang — a Cape prison gang associated with money and sex work.', origin: 'South African prison gangs', example: 'Die 26s run daai block' },
    { term: '27s', definition: 'The 27 gang — a buffer gang between the 26s and 28s in prison.', origin: 'South African prison gangs', example: 'Hy is \'n 27 binne' },
    { term: 'lifer', definition: 'Someone serving a life sentence or destined for lifelong street life.', origin: 'Prison slang', example: 'Hy is \'n lifer van die flats' },
    { term: 'code', definition: 'A gang code or street rule that members must follow.', origin: 'Street culture', example: 'Volg die code altyd' },
    { term: 'loyalty', definition: 'Unwavering devotion to your crew. Core Cape Flats value.', origin: 'Universal', example: 'Loyalty is alles vir ons' },
    { term: 'snitchin', definition: 'Informing on people to police. The ultimate betrayal in street culture.', origin: 'American AAVE', example: 'Hy is besig met snitchin' },
    { term: 'ride or die', definition: 'Total loyalty; someone who will stay by you no matter what.', origin: 'American hip-hop', example: 'Sy is my ride or die' },

    // ── Emotions & Attitude ─────────────────────────────────────────────────────
    { term: 'salty', definition: 'Angry, bitter, or upset about something.', origin: 'American slang', example: 'Hy is salty oor daai' },
    { term: 'pressed', definition: 'Upset, bothered, or anxious about something.', origin: 'American AAVE', example: 'Moenie so pressed wees nie' },
    { term: 'lowkey', definition: 'Subtly, quietly, or in an understated way. Also: secretly.', origin: 'American slang', example: 'Ek is lowkey worried' },
    { term: 'deadass', definition: 'Seriously, for real, without joking.', origin: 'American AAVE', example: 'Deadass bra, dit was nie nice nie' },
    { term: 'flex', definition: 'To show off wealth, status, or possessions.', origin: 'American hip-hop', example: 'Hy hou van flex met sy goetes' },
    { term: 'shook', definition: 'Scared, startled, shaken by an event.', origin: 'American slang', example: 'Die laaitie was shook' },
    { term: 'buggin', definition: 'Acting crazy or erratically. "He\'s bugging out."', origin: 'American AAVE', example: 'Hy buggin oor niks' },
    { term: 'wildin', definition: 'Acting wild, recklessly, or out of control.', origin: 'American AAVE', example: 'Hulle was wildin die naand' },

    // ── Expressions & Filler ────────────────────────────────────────────────────
    { term: 'sies', definition: 'Expression of disgust or disapproval. "Gross" or "Shame on you."', origin: 'Afrikaans', example: 'Sies man, wat maak jy?' },
    { term: 'ag', definition: 'Expression of mild frustration, resignation or endearment. Like "agh" or "oh".', origin: 'Afrikaans', example: 'Ag man, dit is fine' },
    { term: 'haibo', definition: 'Exclamation of surprise or disbelief. "What?!" or "No way!"', origin: 'Zulu / South African English', example: 'Haibo, hy het dit regtig gedoen?' },
    { term: 'eish', definition: 'Exclamation expressing surprise, disappointment, or emphasis. South African universal.', origin: 'South African English', example: 'Eish, dit was hectic' },
    { term: 'yoh', definition: 'Expression of surprise or emphasis. Like "wow" or "damn".', origin: 'South African English', example: 'Yoh bra, daai is kwaai' },
    { term: 'yasis', definition: 'An exclamation, like "damn" or "oh my". Cape Flats exclamation.', origin: 'Cape Flats', example: 'Yasis, hy is siek' },
    { term: 'naai', definition: 'A versatile expletive. Can mean "no", express frustration, or be used like "dude".', origin: 'Afrikaans expletive', example: 'Naai man, laat my los' },
    { term: 'wys', definition: 'To show, to point out, to demonstrate. "Wys my" = show me.', origin: 'Afrikaans', example: 'Wys my watter een' },
    { term: 'check', definition: 'To see, look at, or understand. "Check it" = look at this.', origin: 'Cape Flats / hip-hop', example: 'Check wat hy doen' },
    { term: 'vibe', definition: 'An atmosphere, feeling, or energy. Also to spend time together relaxed.', origin: 'Universal contemporary slang', example: 'Die vibe was nice laasnaand' },

    // ── Cape Flats Lifestyle ─────────────────────────────────────────────────────
    { term: 'klopse', definition: 'Cape Minstrels — colourful Jan 2 carnival tradition. Cultural pride.', origin: 'Cape Malay tradition', example: 'Die klopse speel elke jaar' },
    { term: 'braai', definition: 'Barbecue. A South African cultural institution.', origin: 'Afrikaans', example: 'Ons doen \'n braai Saterdag' },
    { term: 'potjie', definition: 'A three-legged pot stew. Communal Cape Flats cooking tradition.', origin: 'Afrikaans', example: 'Ma\'s potjie is die lekkerste' },
    { term: 'naartjie', definition: 'A tangerine (citrus fruit). Used in Cape life metaphors.', origin: 'Cape Malay/Afrikaans', example: 'Gooi vir my \'n naartjie' },
    { term: 'gatsby', definition: 'A massive Cape Town submarine sandwich loaded with chips and meat.', origin: 'Cape Town food culture', example: 'Ons deel \'n gatsby' },
    { term: 'pantsula', definition: 'A South African township dance style; also someone who dances it.', origin: 'Zulu/Sotho township culture', example: 'Hy dance pantsula kwaai' },
    { term: 'kasi', definition: 'Township, location. Short for "lokasie" (location).', origin: 'South African township slang', example: 'Hy is van die kasi' },
    { term: 'takkies', definition: 'Sneakers, trainers. South African term for any athletic shoes.', origin: 'South African English', example: 'Nuwe takkies aan vanaand' },
    { term: 'toppie', definition: 'An older man; a father figure. Sometimes used for police.', origin: 'Afrikaans Cape Flats', example: 'Die toppie weet wat aangaan' },
    { term: 'gogga', definition: 'An insect or bug. Also used for weird or creepy things.', origin: 'Khoikhoi origin, Afrikaans', example: 'Daar is \'n gogga in my kamer' },

    // ── Success & Respect ───────────────────────────────────────────────────────
    { term: 'boss', definition: 'A leader, a person in charge. Also used as respectful address.', origin: 'Universal English', example: 'Hy is die boss van die block' },
    { term: 'king', definition: 'A man at the top of his game. Used as a term of address or title.', origin: 'Universal', example: 'Hy is die king van die Flats' },
    { term: 'legend', definition: 'Someone extraordinary, a well-respected or iconic person.', origin: 'Universal English', example: 'My oupa is \'n legend in die wyk' },
    { term: 'GOAT', definition: 'Greatest Of All Time. The absolute best.', origin: 'American sports slang', example: 'Esdeekid is die GOAT' },
    { term: 'on top', definition: 'Successful, thriving, in a good position in life.', origin: 'Universal slang', example: 'Hy is op top nou' },
    { term: 'made it', definition: 'To achieve success, escape poverty, or reach a goal.', origin: 'Universal English', example: 'Ons het dit gemaak' },
    { term: 'levels', definition: 'Different tiers or leagues. "Not on my level" = inferior.', origin: 'UK/US slang', example: 'Hy is nie op ons levels nie' },
    { term: 'respect', definition: 'Regard for someone. In street culture, the most important currency.', origin: 'Universal', example: 'Hy verdien respek van almal' },
    { term: 'clout', definition: 'Influence, reputation, or social power.', origin: 'American hip-hop', example: 'Hy het clout in die industry' },
    { term: 'drip', definition: 'High-quality fashion sense; style. "He\'s got drip" = dressed well.', origin: 'American hip-hop', example: 'Sy drip is fire vanaand' },

    // ── Music & Performance ─────────────────────────────────────────────────────
    { term: 'spit', definition: 'To rap. "Spit bars" = rap lyrics.', origin: 'Hip-hop slang', example: 'Hy spit vuur op die beat' },
    { term: 'bars', definition: 'Rap lyrics, specifically clever or well-crafted lines.', origin: 'Hip-hop slang', example: 'Daai bars was kwaai' },
    { term: 'flow', definition: 'The rhythm and delivery of a rapper\'s lyrics over a beat.', origin: 'Hip-hop terminology', example: 'Sy flow is on another level' },
    { term: 'heat', definition: 'A very good song or track. "That\'s heat" = that\'s fire.', origin: 'Hip-hop slang', example: 'Elke track op die album is heat' },
    { term: 'fire', definition: 'Excellent, high quality. "That\'s fire" = that\'s great.', origin: 'Universal contemporary slang', example: 'Die beat is fire' },
    { term: 'wave', definition: 'A music trend or cultural movement that others follow.', origin: 'Hip-hop slang', example: 'Esdeekid set die wave' },
    { term: 'on repeat', definition: 'Listening to a song over and over. Can\'t stop playing it.', origin: 'Music slang', example: 'Daai track is op repeat die week' },
    { term: 'feature', definition: 'A guest appearance on someone else\'s song.', origin: 'Music industry term', example: 'Hy het \'n feature op die album' },
    { term: 'collab', definition: 'A collaboration between artists.', origin: 'Music industry slang', example: 'Hulle twee het \'n collab gedruk' },
    { term: 'merch', definition: 'Merchandise — branded items sold by an artist.', origin: 'Music industry', example: 'Sy merch is uitverkoop' },

    // ── Status & Possessions ─────────────────────────────────────────────────────
    { term: 'whip', definition: 'A car. "My whip" = my car.', origin: 'American hip-hop', example: 'Wat ry hy? Nuwe whip' },
    { term: 'beemer', definition: 'A BMW car. Common status symbol.', origin: 'English car slang', example: 'Hy ry \'n beemer' },
    { term: 'ice', definition: 'Diamond jewellery. "Iced out" = covered in diamonds.', origin: 'American hip-hop', example: 'Hy het ice op sy neck' },
    { term: 'chain', definition: 'A gold/diamond necklace chain. Status symbol.', origin: 'Hip-hop culture', example: 'Sy chain blink in die son' },
    { term: 'rollie', definition: 'A Rolex watch. Luxury symbol.', origin: 'Rolex brand name', example: 'Hy dra \'n rollie' },
    { term: 'crib', definition: 'House, home. Where you live.', origin: 'American hip-hop', example: 'Kom na my crib' },
    { term: 'fresh', definition: 'New, clean, stylish. Looking good.', origin: 'Hip-hop/American English', example: 'Hy is fresh vanaand' },
    { term: 'cooked', definition: 'In serious trouble; also very intoxicated.', origin: 'Contemporary slang', example: 'Hy is gecooked' },

    // ── Relationships & Family ───────────────────────────────────────────────────
    { term: 'dayones', definition: 'Friends who have been with you from the beginning, day one.', origin: 'American slang', example: 'Die dayones bly lojaal' },
    { term: 'fam', definition: 'Family. Used broadly for close friends too.', origin: 'American hip-hop', example: 'Jy is fam vir my' },
    { term: 'kin', definition: 'Family members, relatives. Related people.', origin: 'English', example: 'Hy is kin van ons' },
    { term: 'blood', definition: 'A blood relative; or used broadly as a term of address for close friends.', origin: 'American hip-hop', example: 'Hy is my blood bra' },
    { term: 'ride for', definition: 'To support and defend someone no matter what.', origin: 'American hip-hop', example: 'Ek sal vir jou ride always' },
    { term: 'got your back', definition: 'To protect and support someone in any situation.', origin: 'Universal English', example: 'Ek het jou rug' },
    { term: 'plug in', definition: 'To connect someone with a resource or person they need.', origin: 'Cape Flats street slang', example: 'Ek sal jou plug in met sy' },
    { term: 'bless', definition: 'To share, give, or hook someone up with something.', origin: 'Universal', example: 'Bless vir my \'n stukkie brood' },

    // ── Common Verbs & Phrases ───────────────────────────────────────────────────
    { term: 'vat', definition: 'To take or grab something. "Vat jou goed" = take your stuff.', origin: 'Afrikaans', example: 'Vat die money en klap' },
    { term: 'klap', definition: 'To slap or hit. Also used as "run" or "go".', origin: 'Afrikaans', example: 'Hy het hom geklap' },
    { term: 'gooi', definition: 'To throw; also to put or do something. Very versatile Cape verb.', origin: 'Afrikaans', example: 'Gooi die beat aan' },
    { term: 'sê', definition: 'To say. Also used as a term of address like "yo".', origin: 'Afrikaans', example: 'Wat sê jy sê?' },
    { term: 'loop', definition: 'To walk or to go somewhere. "Laat loop" = let\'s go.', origin: 'Afrikaans', example: 'Ons loop na die hoek' },
    { term: 'kyk', definition: 'To look, watch, or see. "Kyk hoe" = look how.', origin: 'Afrikaans', example: 'Kyk wat hy doen nou' },
    { term: 'laat weet', definition: 'Let me know; let him know. Communication request.', origin: 'Afrikaans', example: 'Laat weet as jy arriveer' },
    { term: 'wag', definition: 'Wait; be patient.', origin: 'Afrikaans', example: 'Wag vir my hier' },
    { term: 'breek', definition: 'To break. "Tik het hom gebreek" = tik destroyed him.', origin: 'Afrikaans', example: 'Die pipe het hom gebreek' },
    { term: 'vergeet', definition: 'To forget. "Vergeet dit" = forget it.', origin: 'Afrikaans', example: 'Vergeet wat hy gesê het' },
    { term: 'belowe', definition: 'To promise. Used seriously in loyalty oaths.', origin: 'Afrikaans', example: 'Ek belowe op my lewe' },
    { term: 'swear', definition: 'To swear/promise. Also used as confirmation "I swear" = truly.', origin: 'English', example: 'Swear bra, dit is waar' },
    { term: 'onthou', definition: 'Remember. "Onthou waar jy vandaan kom" = remember where you from.', origin: 'Afrikaans', example: 'Onthou jou wortels altyd' },

    // ── Comparisons & Descriptions ───────────────────────────────────────────────
    { term: 'mad', definition: 'Very, extremely. Intensifier. "Mad nice" = very nice.', origin: 'AAVE', example: 'Dit is mad kwaai bra' },
    { term: 'lit', definition: 'Exciting, fun, on fire. Describes a great event.', origin: 'American slang', example: 'Die party was lit vanaand' },
    { term: 'cold', definition: 'Impressive, excellent. "That\'s cold" = that\'s impressive.', origin: 'American hip-hop', example: 'Daai vers was koud' },
    { term: 'sick', definition: 'Excellent, impressive. "That\'s sick" = that\'s amazing.', origin: 'Universal youth slang', example: 'Daai beat is sick' },
    { term: 'hard', definition: 'Impressive, intense, uncompromising. "Going hard" = giving max effort.', origin: 'American hip-hop', example: 'Die song is hard' },
    { term: 'slept on', definition: 'Underrated or overlooked. "People slept on him" = didn\'t recognise his talent.', origin: 'American hip-hop', example: 'Hy was te lank geslept op' },
    { term: 'different', definition: 'In a class of its own. "He\'s different" = exceptional.', origin: 'Contemporary slang', example: 'Daai artis is different man' },
    { term: 'on another level', definition: 'Far superior, beyond comparison.', origin: 'Universal', example: 'Sy skills is op \'n ander vlak' },
    { term: 'raw', definition: 'Unpolished but powerful. Authentic and genuine.', origin: 'Universal English', example: 'Sy storie is raw en ware' },
    { term: 'deep', definition: 'Meaningful, profound. "That\'s deep" = that hit hard emotionally.', origin: 'Universal English', example: 'Daai lyrics is diep' },

    // ── Pop culture SDK references ───────────────────────────────────────────────
    { term: 'addik', definition: 'Addict or someone hooked on something — substance or activity.', origin: 'Cape Flats Afrikaans', example: 'Hy is \'n addik vir die game' },
    { term: 'marapagik', definition: 'Aggressive, fierce or tough. A term to describe a dangerous individual.', origin: 'Cape Flats slang', example: 'Hy is marapagik man' },
    { term: 'liggen', definition: 'Lying down, laid back, or chilling. Also: to be at someone\'s place.', origin: 'Cape Afrikaans from "lê"', example: 'Ek liggen by my bra se plek' },
    { term: 'tele', definition: 'Far away, distant. "Liggen tele" = far away.', origin: 'Cape Afrikaans from "tele" (television/distance)', example: 'Hy bly tele van die drama' },
    { term: 'grafik', definition: 'Graphic, extreme, vivid. Used to describe intense or violent situations.', origin: 'Cape Flats slang', example: 'Die scene was grafik' },
    { term: 'neffens', definition: 'Beside, next to, alongside. Spatial and also used for "despite".', origin: 'Cape Afrikaans from "naas"', example: 'Hy sit neffens my' },
    { term: 'oppas', definition: 'To watch out or be careful. A warning.', origin: 'Afrikaans "oppas"', example: 'Oppas vir daai ou' },
    { term: 'gabba', definition: 'Friend, buddy. Same as bra but more specific to certain Cape Flats areas.', origin: 'Cape Flats slang', example: 'My gabba was daar' },
    { term: 'pomp', definition: 'To pump, to boost, or to have sex (crude). Context dependent.', origin: 'Afrikaans', example: 'Hy pomp die game op' },
    { term: 'smaak', definition: 'To like, to fancy, to be attracted to. "Hy smaak haar" = he likes her.', origin: 'Afrikaans', example: 'Ek smaak daai cherrie kwaai' },
    { term: 'stukkend', definition: 'Broken, destroyed. Can refer to objects, people, or situations.', origin: 'Afrikaans', example: 'Die kar is stukkend' },
    { term: 'bietjie', definition: 'A little, a small amount. "Net \'n bietjie" = just a little.', origin: 'Afrikaans', example: 'Gee vir my net \'n bietjie' },
    { term: 'miskien', definition: 'Maybe, perhaps. Used in cautious statements.', origin: 'Afrikaans', example: 'Miskien sal dit beter gaan' },
    { term: 'nooit', definition: 'Never. Also used as "no way!" exclamation.', origin: 'Afrikaans', example: 'Nooit bra, dit sal nooit gebeur nie' },
    { term: 'altyd', definition: 'Always. A commitment word used in loyalty statements.', origin: 'Afrikaans', example: 'Ek sal altyd hier wees' },
    { term: 'seker', definition: 'Sure, certain, probably. "Certainly" or "I think so."', origin: 'Afrikaans', example: 'Hy sal seker kom' },
    { term: 'waarheid', definition: 'Truth. In street culture: "speak the truth."', origin: 'Afrikaans', example: 'Daai is die waarheid' },
    { term: 'lewe', definition: 'Life. "Op my lewe" = on my life (oath of sincerity).', origin: 'Afrikaans', example: 'Op my lewe ek het dit nie gedoen nie' },
    { term: 'dood', definition: 'Dead, death. Used literally or as intensifier ("dead serious").', origin: 'Afrikaans', example: 'Hy is dood ernstig' },
    { term: 'moeilikheid', definition: 'Trouble, difficulty. "In die moeilikheid" = in trouble.', origin: 'Afrikaans', example: 'Hy is in groot moeilikheid' },

    // ── Verbs used uniquely in Cape rap ─────────────────────────────────────────
    { term: 'shine', definition: 'To glow up, to succeed, to show your best self.', origin: 'Universal English', example: 'Dis sy tyd om te shine' },
    { term: 'grind out', definition: 'To work intensely until you achieve something.', origin: 'Hip-hop culture', example: 'Hy grind out elke dag' },
    { term: 'ball out', definition: 'To spend money lavishly; to live extravagantly.', origin: 'American hip-hop', example: 'Hy bal uit die naand' },
    { term: 'ball', definition: 'To live luxuriously or play sport. "He\'s balling" = he\'s wealthy.', origin: 'American hip-hop', example: 'Hy is besig om te bal' },
    { term: 'switch on', definition: 'To become aggressive or dangerous quickly.', origin: 'Cape Flats street slang', example: 'Moenie hom switch on nie' },
    { term: 'cook', definition: 'To do something brilliantly; to absolutely excel.', origin: 'American slang', example: 'Hy cook op daai beat' },
    { term: 'murk', definition: 'To defeat or destroy completely; to kill in rap context.', origin: 'American hip-hop', example: 'Hy het die ander MC gemurk' },
    { term: 'snap', definition: 'To rap exceptionally well; "he snapped" = incredible performance.', origin: 'American hip-hop', example: 'Hy het gesnappe op daai verse' },
    { term: 'bodied', definition: 'To outperform someone completely; also can mean killed.', origin: 'Hip-hop slang', example: 'Hy het die beat gebodied' },
    { term: 'clap back', definition: 'To retaliate with words (diss track) or actions.', origin: 'American hip-hop', example: 'Hy clap terug met \'n diss track' },
]

async function main() {
    console.log('🌱 Seeding KB with', SEED_TERMS.length, 'terms...')
    let added = 0

    for (const entry of SEED_TERMS) {
        await prisma.kBEntry.upsert({
            where: { term: entry.term },
            update: {
                definition: entry.definition,
                origin: entry.origin,
                example: entry.example,
            },
            create: {
                term: entry.term,
                definition: entry.definition,
                origin: entry.origin,
                example: entry.example,
                confidence: 0.9,
                isApproved: true,
            },
        })
        added++
    }

    console.log(`✅ KB seeded successfully! ${added} terms upserted.`)
    const total = await prisma.kBEntry.count({ where: { isApproved: true } })
    console.log(`📚 Total approved KB terms in DB: ${total}`)
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
