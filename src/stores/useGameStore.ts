import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './useAuthStore';

export interface Card {
  id: string;
  title: string;
  wikipediaLink: string;
  category: 'Science' | 'History' | 'Pop Culture' | 'Geography';
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  description: string;
  image: string;
  isReal: boolean;
  explanation: string; // Explaining why it's real or fake
}

export interface CollectedCard {
  id: string;
  collectedAt: string;
  isShowcase: boolean;
  customSection: string | null;
}

export const MOCK_CARDS: Card[] = [
  // HISTORY
  {
    id: 'hist_bucket',
    title: 'The War of the Bucket',
    wikipediaLink: 'https://en.wikipedia.org/wiki/War_of_the_Bucket',
    category: 'History',
    rarity: 'Rare',
    description: 'In 1325, a war was fought between Bologna and Modena because Modenese soldiers sneaked into Bologna and stole a wooden bucket from a well.',
    image: 'linear-gradient(135deg, #a8c0ff, #3f2b96)',
    isReal: true,
    explanation: 'Real! Bologna declared war on Modena, and the stolen bucket remains on display in Modena to this day.'
  },
  {
    id: 'hist_emu',
    title: 'The Great Emu War',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Emu_War',
    category: 'History',
    rarity: 'Epic',
    description: 'In 1932, the Australian military deployed soldiers armed with machine guns to combat a massive population of emus destroying crops, but the emus actually won.',
    image: 'linear-gradient(135deg, #11998e, #38ef7d)',
    isReal: true,
    explanation: 'Real! The emus proved highly resilient and clever, dodging bullets, which led the Australian government to withdraw military forces.'
  },
  {
    id: 'hist_kangaroo',
    title: 'The Kangaroo Coup of 1904',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Australia',
    category: 'History',
    rarity: 'Common',
    description: 'A cohort of highly trained red kangaroos stormed the Parliament building in Melbourne, forcing the Prime Minister to temporarily run the country from a local farm.',
    image: 'linear-gradient(135deg, #fc4a1a, #f7b733)',
    isReal: false,
    explanation: 'Fake! No such coup ever occurred, though kangaroos do outnumber Australians 2 to 1.'
  },
  {
    id: 'hist_naps',
    title: 'Napoleon\'s Bunny Escape',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Napoleon',
    category: 'History',
    rarity: 'Legendary',
    description: 'Napoleon Bonaparte was once attacked and driven to flee by a swarm of thousands of domesticated rabbits during a hunting outing.',
    image: 'linear-gradient(135deg, #FBD3E9, #BB377D)',
    isReal: true,
    explanation: 'Real! The hunting party bought tame rabbits instead of wild ones. When released, they rushed Napoleon thinking it was feeding time.'
  },
  {
    id: 'hist_beer_flood',
    title: 'The London Beer Flood',
    wikipediaLink: 'https://en.wikipedia.org/wiki/London_Beer_Flood',
    category: 'History',
    rarity: 'Epic',
    description: 'In 1814, a massive vat at a London brewery ruptured, releasing over 323,000 gallons of fermenting beer into the streets, destroying homes and flooding basements.',
    image: 'linear-gradient(135deg, #8A2387, #F27121)',
    isReal: true,
    explanation: 'Real! Eight people tragically drowned or died from alcohol fumes, and the event was eventually ruled an unavoidable Act of God.'
  },
  {
    id: 'hist_dancing_plague',
    title: 'The Dancing Plague of 1518',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Dancing_plague_of_1518',
    category: 'History',
    rarity: 'Legendary',
    description: 'A mysterious mania occurred in Strasbourg where hundreds of citizens danced uncontrollably for weeks without rest, leading to several deaths from pure physical exhaustion.',
    image: 'linear-gradient(135deg, #FF5f6d, #FFC371)',
    isReal: true,
    explanation: 'Real! The city council even hired musicians and constructed a wooden stage to encourage them to keep dancing, believing they had to dance the fever out.'
  },
  {
    id: 'hist_caligula_sea',
    title: 'Caligula\'s War on Neptune',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Caligula',
    category: 'History',
    rarity: 'Rare',
    description: 'Disgruntled by a mutinous army, Roman Emperor Caligula marched his soldiers to the ocean shore and ordered them to throw spears into the water to declare war on the sea god Neptune.',
    image: 'linear-gradient(135deg, #3a7bd5, #3a6073)',
    isReal: true,
    explanation: 'Real! He ordered soldiers to gather sea shells as "spoils of war" from a vanquished ocean deity and brought them back to Rome.'
  },
  {
    id: 'hist_caesar_pirates',
    title: 'Caesar\'s Ransom Negotiation',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Julius_Caesar',
    category: 'History',
    rarity: 'Common',
    description: 'Captured by pirates, Julius Caesar was highly insulted by their low ransom demand of 20 talents. He insisted they demand 50 talents instead, and joked that he would hunt them down and crucify them all.',
    image: 'linear-gradient(135deg, #e53935, #e35d5b)',
    isReal: true,
    explanation: 'Real! Once ransomed, Caesar immediately raised a private fleet, captured the pirates, and executed them exactly as he had jokingly warned.'
  },
  {
    id: 'hist_clockwork_soldier',
    title: 'The Clockwork Crossbowman',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Qing_dynasty',
    category: 'History',
    rarity: 'Rare',
    description: 'In 1782, Emperor Qianlong commissioned a steam-powered automaton dressed in silk armor that could walk 100 paces and fire a crossbow with mechanical accuracy.',
    image: 'linear-gradient(135deg, #F9D423, #FF4E50)',
    isReal: false,
    explanation: 'Fake! While the Qing court possessed intricate mechanical gadgets, they never developed a steam-powered military automaton.'
  },
  {
    id: 'hist_liechtenstein_army',
    title: 'Liechtenstein\'s Warm Friend',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Military_of_Liechtenstein',
    category: 'History',
    rarity: 'Epic',
    description: 'In 1866, Liechtenstein sent an army of 80 soldiers to guard an alpine pass. They returned unharmed with 81 men, having suffered zero casualties and made a new Italian friend.',
    image: 'linear-gradient(135deg, #11998e, #38ef7d)',
    isReal: true,
    explanation: 'Real! The country permanently disbanded its military shortly after this incredibly successful and friendly expedition.'
  },
  
  // SCIENCE
  {
    id: 'sci_tardigrade',
    title: 'The Indestructible Tardigrade',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Tardigrade',
    category: 'Science',
    rarity: 'Epic',
    description: 'Microscopic "water bears" can survive in the vacuum of outer space, withstand extreme radiation, and go without food or water for 30 years.',
    image: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    isReal: true,
    explanation: 'Real! Tardigrades enter a cryptobiotic state where their metabolism stops, allowing them to endure nearly any environment.'
  },
  {
    id: 'sci_banana',
    title: 'Radioactive Bananas',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Banana_equivalent_dose',
    category: 'Science',
    rarity: 'Common',
    description: 'Bananas are naturally radioactive due to high levels of Potassium-40. Eating just three bananas can set off nuclear radiation detectors in airports.',
    image: 'linear-gradient(135deg, #FFE000, #799F0C)',
    isReal: false,
    explanation: 'Fake! While bananas do have tiny traces of radioactive potassium (measured in Banana Equivalent Doses), eating three will not trigger airport sensors.'
  },
  {
    id: 'sci_penguin',
    title: 'Equatorial Penguins',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Galapagos_penguin',
    category: 'Science',
    rarity: 'Rare',
    description: 'The Galapagos penguin is the only penguin species that naturally lives and breeds north of the Equator.',
    image: 'linear-gradient(135deg, #74ebd5, #9ecee7)',
    isReal: true,
    explanation: 'Real! Thanks to the cool waters of the Humboldt Current, Galapagos penguins thrive in their tropical surroundings.'
  },
  {
    id: 'sci_lava_eagle',
    title: 'The Volcanic Lava Eagle',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Bird',
    category: 'Science',
    rarity: 'Legendary',
    description: 'A species of raptor in Hawaii nests inside active volcanic vents, using its graphite-coated feathers to withstand heat up to 1,200 degrees Celsius.',
    image: 'linear-gradient(135deg, #ED213A, #93291E)',
    isReal: false,
    explanation: 'Fake! No animal can nest in molten volcanic vents, nor are there graphite-feathered eagles.'
  },
  {
    id: 'sci_singing_iceberg',
    title: 'The Singing Iceberg',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Acoustic_ecology',
    category: 'Science',
    rarity: 'Rare',
    description: 'Scientists in the Antarctic once detected a high-pitched acoustic vibration, similar to a massive swarm of bees or a singing choir, emitting directly from a moving iceberg.',
    image: 'linear-gradient(135deg, #1D2B64, #F8CDDA)',
    isReal: true,
    explanation: 'Real! The "singing" is caused by high-pressure water flowing through internal thermal tunnels within the ice mass.'
  },
  {
    id: 'sci_moon_smell',
    title: 'The Smell of Moon Dust',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Moon_dust',
    category: 'Science',
    rarity: 'Epic',
    description: 'Apollo astronauts reported that when they returned from spacewalks and took off their helmets, the lunar dust clinging to their suits smelled strongly of spent gunpowder.',
    image: 'linear-gradient(135deg, #30CFD0, #330867)',
    isReal: true,
    explanation: 'Real! The scent is believed to be caused by highly reactive space compounds deactivating in the moist atmosphere of the lunar lander.'
  },
  {
    id: 'sci_sonic_bloom',
    title: 'Sonic Bloom Metal',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Plant_neurobiology',
    category: 'Science',
    rarity: 'Common',
    description: 'Playing heavy metal music at 432 Hz to orchids stimulates a 400% increase in nutrient absorption, causing their roots to grow steel-gray protective casings.',
    image: 'linear-gradient(135deg, #43C6AC, #191654)',
    isReal: false,
    explanation: 'Fake! While vibrations can slightly affect stomata behavior, heavy metal music does not stimulate a 400% increase in growth or make roots metallic.'
  },
  {
    id: 'sci_bioluminescent_trees',
    title: 'Bioluminescent Birches',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Bioluminescence',
    category: 'Science',
    rarity: 'Legendary',
    description: 'A genetically mutated species of birch trees in northern Maine absorbs phosphorus from deep soil, causing their leaves to glow in a bright emerald green during autumn nights.',
    image: 'linear-gradient(135deg, #0ba360, #3cba92)',
    isReal: false,
    explanation: 'Fake! While bioluminescent fungi and fireflies exist, there are no naturally occurring or mutated glowing birch forests.'
  },
  {
    id: 'sci_frog_rain',
    title: 'Rain of Frogs',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Rain_of_animals',
    category: 'Science',
    rarity: 'Rare',
    description: 'Waterspouts or tornadic winds can sweep up small aquatic animals like frogs or fish and carry them miles away before depositing them during heavy rainstorms.',
    image: 'linear-gradient(135deg, #7028e4, #e5b2ca)',
    isReal: true,
    explanation: 'Real! The meteorological phenomenon has been documented globally, including the famous Lluvia de Peces in Honduras.'
  },
  {
    id: 'sci_wombat_cube',
    title: 'The Cube-Shaped Feces',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Wombat',
    category: 'Science',
    rarity: 'Common',
    description: 'Wombats are the only known animals in the world that produce cube-shaped poop, which they stack to mark their territory and prevent the feces from rolling away.',
    image: 'linear-gradient(135deg, #e65c00, #F9D423)',
    isReal: true,
    explanation: 'Real! Their highly elastic intestinal walls squeeze the waste into flat-faced cubes.'
  },

  // POP CULTURE
  {
    id: 'pop_wikipedia_spaghetti',
    title: 'The Spaghetti Tree Hoax',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Spaghetti-tree_hoax',
    category: 'Pop Culture',
    rarity: 'Epic',
    description: 'In 1957, the BBC broadcasted a three-minute hoax report showing Swiss farmers picking spaghetti off trees, causing hundreds of people to contact the BBC asking how to grow them.',
    image: 'linear-gradient(135deg, #8A2387, #E94057)',
    isReal: true,
    explanation: 'Real! This is famous as one of the earliest and greatest April Fools\' Day media jokes in history.'
  },
  {
    id: 'pop_rickroll',
    title: 'The Rickroll Orbit',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Rickrolling',
    category: 'Pop Culture',
    rarity: 'Common',
    description: 'NASA astronauts once rickrolled the Russian space crew on the ISS by hijacking their intercom and playing "Never Gonna Give You Up" for 24 hours.',
    image: 'linear-gradient(135deg, #ff9966, #ff5e62)',
    isReal: false,
    explanation: 'Fake! While astronauts have sent jokes, a 24-hour non-stop rickroll would be considered space sabotage.'
  },
  {
    id: 'pop_street_view',
    title: 'Street View Donkey Incident',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Google_Street_View',
    category: 'Pop Culture',
    rarity: 'Rare',
    description: 'In 2013, Google was accused of running over a donkey in Botswana with a Google Street View car, prompting an official press release defending their driver.',
    image: 'linear-gradient(135deg, #1d976c, #93f9b9)',
    isReal: true,
    explanation: 'Real! Google showed that the donkey was simply rolling in the dirt and stood up unharmed as the car passed by.'
  },
  {
    id: 'pop_pepsi_navy',
    title: 'Pepsi\'s Military Fleet',
    wikipediaLink: 'https://en.wikipedia.org/wiki/PepsiCo',
    category: 'Pop Culture',
    rarity: 'Epic',
    description: 'In 1989, the Soviet Union traded a fleet of 17 submarines, a cruiser, a frigate, and a destroyer to Pepsi in exchange for soda, briefly giving Pepsi the 6th largest navy in the world.',
    image: 'linear-gradient(135deg, #1e3c72, #2a5298)',
    isReal: true,
    explanation: 'Real! The Soviet currency wasn\'t accepted globally, so they traded decommissioned vessels which Pepsi later sold for scrap metal.'
  },
  {
    id: 'pop_nic_cage_skull',
    title: 'Cage\'s Dinosaur Auction',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Nicolas_Cage',
    category: 'Pop Culture',
    rarity: 'Epic',
    description: 'Nicolas Cage once entered a fierce bidding war with Leonardo DiCaprio for a rare, smuggled Tyrannosaurus bataar skull, winning it for $276,000 before having to return it to the Mongolian government.',
    image: 'linear-gradient(135deg, #30E8BF, #FF8235)',
    isReal: true,
    explanation: 'Real! When Cage discovered the skull had been smuggled illegally, he cooperatively returned it to its rightful place of origin.'
  },
  {
    id: 'pop_potato_asteroid',
    title: 'The Potato Asteroid',
    wikipediaLink: 'https://en.wikipedia.org/wiki/The_Empire_Strikes_Back',
    category: 'Pop Culture',
    rarity: 'Rare',
    description: 'In "Star Wars: The Empire Strikes Back", special effects artists were so frustrated by constant adjustments that they threw a real baked potato into the background of an asteroid belt scene.',
    image: 'linear-gradient(135deg, #D4145A, #FBB03B)',
    isReal: true,
    explanation: 'Real! If you look closely at the scene where the Millennium Falcon flies through the asteroids, one of the flying debris pieces is indeed a baked potato.'
  },
  {
    id: 'pop_wooden_insulter',
    title: 'Shakespeare\'s Insult Dial',
    wikipediaLink: 'https://en.wikipedia.org/wiki/William_Shakespeare',
    category: 'Pop Culture',
    rarity: 'Common',
    description: 'William Shakespeare patented an early wooden dial device in 1599 containing three concentric rings of insults, which local theatergoers could spin to insult rival patrons.',
    image: 'linear-gradient(135deg, #83a4d4, #b6fbff)',
    isReal: false,
    explanation: 'Fake! Shakespeare never patented a mechanical insult generator; his insult generator was his plays!'
  },
  {
    id: 'pop_monopoly_escape',
    title: 'The Monopoly Escape Board',
    wikipediaLink: 'https://en.wikipedia.org/wiki/History_of_the_board_game_Monopoly',
    category: 'Pop Culture',
    rarity: 'Rare',
    description: 'In 1974, the winner of the European Monopoly Championship successfully escaped a Swiss prison by hiding a real Swiss passport inside a giant replica Monopoly board.',
    image: 'linear-gradient(135deg, #cc2b5e, #753a88)',
    isReal: false,
    explanation: 'Fake! While Monopoly boards during WWII did contain escape tools for POWs, the 1974 championship escape is an urban legend.'
  },
  {
    id: 'pop_toy_story_save',
    title: 'The Toy Story 2 Save',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Toy_Story_2',
    category: 'Pop Culture',
    rarity: 'Legendary',
    description: 'The entire movie of "Toy Story 2" was accidentally deleted from Pixar\'s servers, but was saved because a remote working employee had kept a backup copy on her personal computer.',
    image: 'linear-gradient(135deg, #f12711, #f5af19)',
    isReal: true,
    explanation: 'Real! A rogue terminal command deleted the files, and the primary backups had silently failed. The employee\'s home backup was the only surviving copy.'
  },
  {
    id: 'pop_wikipedia_editing',
    title: 'The Alan MacMasters Hoax',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Alan_MacMasters',
    category: 'Pop Culture',
    rarity: 'Legendary',
    description: 'A student successfully created a fake Wikipedia entry for "Alan MacMasters," inventing him as the inventor of the electric toaster, which fooled newspapers and museums for 15 years.',
    image: 'linear-gradient(135deg, #4568DC, #B06AB8)',
    isReal: true,
    explanation: 'Real! The hoax was finally uncovered in 2022 when Wikipedia editors investigated the article\'s citations.'
  },

  // GEOGRAPHY
  {
    id: 'geo_diomede',
    title: 'The Date Line Islands',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Diomede_Islands',
    category: 'Geography',
    rarity: 'Epic',
    description: 'The Diomede Islands are just 2.4 miles apart, but because the International Date Line runs between them, one island is 21 hours ahead of the other.',
    image: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
    isReal: true,
    explanation: 'Real! Tomorrow Island (Big Diomede, Russia) and Yesterday Island (Little Diomede, US) allow you to literally look into the future.'
  },
  {
    id: 'geo_canada_whiskey',
    title: 'The Whiskey War',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Whisky_War',
    category: 'Geography',
    rarity: 'Rare',
    description: 'Canada and Denmark engaged in a peaceful conflict over Hans Island, where they took turns planting flags and leaving bottles of Canadian Club whiskey or Danish Schnapps.',
    image: 'linear-gradient(135deg, #e65c00, #F9D423)',
    isReal: true,
    explanation: 'Real! Known as the "Whisky War," it was resolved in 2022 by dividing the small island between both nations.'
  },
  {
    id: 'geo_paris_copy',
    title: 'Paris, China',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Tianducheng',
    category: 'Geography',
    rarity: 'Common',
    description: 'The city of Tianducheng, China is a complete replica of Paris, featuring an Eiffel Tower copy, Parisian architecture, and French fountains.',
    image: 'linear-gradient(135deg, #83a4d4, #b6fbff)',
    isReal: true,
    explanation: 'Real! It is a famous replica town built to house 10,000 residents, but initially remained a mostly quiet ghost town.'
  },
  {
    id: 'geo_everest_height',
    title: 'The Shrinking Mount Everest',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Mount_Everest',
    category: 'Geography',
    rarity: 'Legendary',
    description: 'Due to severe gravitational pull in the Southern Hemisphere, Mount Everest shrinks by 12 meters every winter and regrows during summer.',
    image: 'linear-gradient(135deg, #1f4037, #99f2c8)',
    isReal: false,
    explanation: 'Fake! Mount Everest is tectonic, moving slowly over time, but winter weather does not cause it to shrink by meters.'
  },
  {
    id: 'geo_exploding_whale',
    title: 'The Exploding Whale',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Exploding_whale',
    category: 'Geography',
    rarity: 'Epic',
    description: 'In 1970, Oregon officials decided to clear a rotting 8-ton sperm whale carcass using 20 cases of dynamite, causing massive chunks of blubber to rain down on cars a quarter-mile away.',
    image: 'linear-gradient(135deg, #ED213A, #93291E)',
    isReal: true,
    explanation: 'Real! The explosion was too powerful, destroying a parked car and covering spectators in putrid whale fat.'
  },
  {
    id: 'geo_landmark_directions',
    title: 'San José Landmarks',
    wikipediaLink: 'https://en.wikipedia.org/wiki/San_Jos%C3%A9,_Costa_Rica',
    category: 'Geography',
    rarity: 'Rare',
    description: 'Costa Rica\'s capital, San José, famously has almost no street signs or house numbers. Residents give directions using landmarks like "200 meters south of the old fig tree."',
    image: 'linear-gradient(135deg, #FBD3E9, #BB377D)',
    isReal: true,
    explanation: 'Real! While streets technically have numbers on maps, they are rarely signed, and postal delivery relies on local landmarks.'
  },
  {
    id: 'geo_underwater_post',
    title: 'The Underwater Post Office',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Vanuatu',
    category: 'Geography',
    rarity: 'Rare',
    description: 'Vanuatu features the world\'s only underwater post office, situated 3 meters below the surface, where visitors in scuba gear can mail waterproof postcards.',
    image: 'linear-gradient(135deg, #00c6ff, #0072ff)',
    isReal: true,
    explanation: 'Real! A special flag is raised on a beach buoy when staff are underwater ready to stamp your letters.'
  },
  {
    id: 'geo_centralia',
    title: 'The Town That Burns',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Centralia,_Pennsylvania',
    category: 'Geography',
    rarity: 'Epic',
    description: 'The town of Centralia, Pennsylvania, was completely abandoned after a massive coal mine fire ignited underground in 1962 and has been burning continuously ever since.',
    image: 'linear-gradient(135deg, #757F9A, #D7DDE8)',
    isReal: true,
    explanation: 'Real! Fumes and sinkholes made the town unlivable, and scientists estimate the underground coal will burn for another 250 years.'
  },
  {
    id: 'geo_floating_pumice',
    title: 'Floating Pumice Kingdom',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Micronation',
    category: 'Geography',
    rarity: 'Legendary',
    description: 'A fully recognized sovereign micronation in the South Pacific constructed entirely of floating volcanic pumice and coconut fibers, featuring its own floating post office.',
    image: 'linear-gradient(135deg, #654ea3, #eaafc8)',
    isReal: false,
    explanation: 'Fake! While floating islands exist, there is no sovereign nation built on volcanic pumice and coconut fibers.'
  },
  {
    id: 'geo_nyos_eruption',
    title: 'The Toxic Lake Nyos',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Lake_Nyos',
    category: 'Geography',
    rarity: 'Legendary',
    description: 'In 1986, Lake Nyos in Cameroon suddenly released a massive cloud of carbon dioxide, suffocating over 1,700 people and 3,000 livestock in nearby villages within minutes.',
    image: 'linear-gradient(135deg, #3C3B3F, #605C3C)',
    isReal: true,
    explanation: 'Real! It was a rare "limnic eruption," where gas saturated in deep lake water suddenly bubbles up.'
  }
];

export const useGameStore = defineStore('game', () => {
  const gdPoints = ref<number>(0);
  const collectedCards = ref<CollectedCard[]>([]);
  const categoryCooldowns = ref<Record<string, number>>({});
  const customSections = ref<string[]>(['Showcase', 'Real Rarities', 'Historical Gems']);

  // Local storage keys
  const POINTS_GUEST_KEY = 'wiki_guest_points';
  const CARDS_GUEST_KEY = 'wiki_guest_cards';
  const COOLDOWNS_KEY = 'wiki_category_cooldowns';
  const SECTIONS_KEY = 'wiki_custom_sections';

  // Read guest cache
  const getGuestPoints = (): number => {
    const raw = localStorage.getItem(POINTS_GUEST_KEY);
    return raw ? parseInt(raw) : 0;
  };

  const getGuestCards = (): CollectedCard[] => {
    const raw = localStorage.getItem(CARDS_GUEST_KEY);
    return raw ? JSON.parse(raw) : [];
  };

  // Sync active states to guest localStorage (only when guest)
  const saveGuestStateToLocalStorage = () => {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn) {
      localStorage.setItem(POINTS_GUEST_KEY, gdPoints.value.toString());
      localStorage.setItem(CARDS_GUEST_KEY, JSON.stringify(collectedCards.value));
    }
  };

  // Load guest data
  const loadGuestState = () => {
    gdPoints.value = getGuestPoints();
    collectedCards.value = getGuestCards();
    
    // Load category cooldowns
    const cooldownsRaw = localStorage.getItem(COOLDOWNS_KEY);
    categoryCooldowns.value = cooldownsRaw ? JSON.parse(cooldownsRaw) : {};
    
    // Load custom sections
    const sectionsRaw = localStorage.getItem(SECTIONS_KEY);
    if (sectionsRaw) {
      customSections.value = JSON.parse(sectionsRaw);
    }
  };

  // Sync game store states directly with the user store
  const syncWithUser = (points: number, cards: CollectedCard[]) => {
    gdPoints.value = points;
    collectedCards.value = cards;
  };

  // Clean guest cached data
  const clearGuestCache = () => {
    localStorage.removeItem(POINTS_GUEST_KEY);
    localStorage.removeItem(CARDS_GUEST_KEY);
  };

  // Add GD Points
  const addPoints = (points: number) => {
    gdPoints.value += points;
    
    // Sync back
    const authStore = useAuthStore();
    if (authStore.isLoggedIn) {
      authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
    } else {
      saveGuestStateToLocalStorage();
    }
  };

  // Deduct GD Points
  const spendPoints = (points: number): boolean => {
    if (gdPoints.value >= points) {
      gdPoints.value -= points;
      const authStore = useAuthStore();
      if (authStore.isLoggedIn) {
        authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
      } else {
        saveGuestStateToLocalStorage();
      }
      return true;
    }
    return false;
  };

  // Collect a Card
  const collectCard = (cardId: string): boolean => {
    // Prevent adding duplicates to raw inventory, but they can be collected again (we just update the collected time)
    const existsIndex = collectedCards.value.findIndex(c => c.id === cardId);
    
    if (existsIndex === -1) {
      collectedCards.value.push({
        id: cardId,
        collectedAt: new Date().toISOString(),
        isShowcase: false,
        customSection: null
      });
    } else {
      // Update collected timestamp
      collectedCards.value[existsIndex].collectedAt = new Date().toISOString();
    }

    const authStore = useAuthStore();
    if (authStore.isLoggedIn) {
      authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
    } else {
      saveGuestStateToLocalStorage();
    }
    
    return existsIndex === -1;
  };

  // Toggle Showcase status
  const toggleShowcase = (cardId: string) => {
    const card = collectedCards.value.find(c => c.id === cardId);
    if (card) {
      card.isShowcase = !card.isShowcase;
      
      const authStore = useAuthStore();
      if (authStore.isLoggedIn) {
        authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
      } else {
        saveGuestStateToLocalStorage();
      }
    }
  };

  // Update card section
  const updateCardSection = (cardId: string, sectionName: string | null) => {
    const card = collectedCards.value.find(c => c.id === cardId);
    if (card) {
      card.customSection = sectionName;
      
      const authStore = useAuthStore();
      if (authStore.isLoggedIn) {
        authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
      } else {
        saveGuestStateToLocalStorage();
      }
    }
  };

  // Add binder custom section
  const addCustomSection = (sectionName: string) => {
    if (sectionName && !customSections.value.includes(sectionName)) {
      customSections.value.push(sectionName);
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(customSections.value));
    }
  };

  // Remove binder custom section
  const removeCustomSection = (sectionName: string) => {
    customSections.value = customSections.value.filter(s => s !== sectionName);
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(customSections.value));
    
    // Reset cards inside this section
    collectedCards.value.forEach(c => {
      if (c.customSection === sectionName) {
        c.customSection = null;
      }
    });
    
    const authStore = useAuthStore();
    if (authStore.isLoggedIn) {
      authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
    } else {
      saveGuestStateToLocalStorage();
    }
  };

  // Cooldown handlers
  const setCooldown = (category: string) => {
    const expiry = Date.now() + 60 * 1000; // 60 seconds cooldown
    categoryCooldowns.value[category] = expiry;
    localStorage.setItem(COOLDOWNS_KEY, JSON.stringify(categoryCooldowns.value));
  };

  const getCooldownTimeRemaining = (category: string): number => {
    const expiry = categoryCooldowns.value[category] || 0;
    const diff = expiry - Date.now();
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  };

  const isCooldownActive = (category: string): boolean => {
    return getCooldownTimeRemaining(category) > 0;
  };

  // Load a public user profile from localStorage for read-only view
  const loadRegisteredProfile = (userId: string): { userProfile: any, cards: any[] } | null => {
    const existingUsersRaw = localStorage.getItem('wiki_registered_users');
    if (existingUsersRaw) {
      const registeredUsers = JSON.parse(existingUsersRaw);
      const publicUser = registeredUsers[userId] || registeredUsers[`usr_${userId.toLowerCase()}`];
      if (publicUser) {
        return {
          userProfile: {
            id: publicUser.id,
            username: publicUser.username,
            profilePic: publicUser.profilePic,
            bio: publicUser.bio,
            backgroundColor: publicUser.backgroundColor,
            gdPoints: publicUser.gdPoints
          },
          cards: publicUser.collectedCards || []
        };
      }
    }
    return null;
  };

  return {
    gdPoints,
    collectedCards,
    categoryCooldowns,
    customSections,
    getGuestPoints,
    getGuestCards,
    loadGuestState,
    syncWithUser,
    clearGuestCache,
    addPoints,
    spendPoints,
    collectCard,
    toggleShowcase,
    updateCardSection,
    addCustomSection,
    removeCustomSection,
    setCooldown,
    getCooldownTimeRemaining,
    isCooldownActive,
    loadRegisteredProfile
  };
});
