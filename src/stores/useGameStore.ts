import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useAuthStore } from './useAuthStore';
import { supabase } from '../supabase';

// The three top-level categories, matching the articles_v2.category column.
export type Category = 'The Human' | 'The World' | 'The Sciences';
export const CATEGORIES: Category[] = ['The Human', 'The World', 'The Sciences'];

// Each category maps to a color-palette slug used in CSS/Tailwind class names.
export const CATEGORY_SLUG: Record<Category, 'civilization' | 'nature' | 'science'> = {
  'The Human': 'civilization',
  'The World': 'nature',
  'The Sciences': 'science'
};

export interface Card {
  id: string;
  title: string;
  wikipediaLink: string;
  category: Category;
  subCategory?: string; // e.g. "History", "Animals", "Space" — from articles_v2.sub_category
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
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
  cardDetails?: Card;
}

export const MOCK_CARDS: Card[] = [
  // HISTORY
  {
    id: 'hist_bucket',
    title: 'The War of the Bucket',
    wikipediaLink: 'https://en.wikipedia.org/wiki/War_of_the_Bucket',
    category: 'The Human',
    rarity: 'Rare',
    description: 'In 1325, a war was fought between Bologna and Modena because Modenese soldiers sneaked into Bologna and stole a wooden bucket from a well.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Secchia_rapita_Modena.jpg',
    isReal: true,
    explanation: 'Real! Bologna declared war on Modena, and the stolen bucket remains on display in Modena to this day.'
  },
  {
    id: 'hist_emu',
    title: 'The Great Emu War',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Emu_War',
    category: 'The Human',
    rarity: 'Epic',
    description: 'In 1932, the Australian military deployed soldiers armed with machine guns to combat a massive population of emus destroying crops, but the emus actually won.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Dromaius_novaehollandiae_-_cemetery.jpg',
    isReal: true,
    explanation: 'Real! The emus proved highly resilient and clever, dodging bullets, which led the Australian government to withdraw military forces.'
  },
  {
    id: 'hist_kangaroo',
    title: 'The Kangaroo Coup of 1904',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Australia',
    category: 'The Human',
    rarity: 'Common',
    description: 'A cohort of highly trained red kangaroos stormed the Parliament building in Melbourne, forcing the Prime Minister to temporarily run the country from a local farm.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Red_kangaroo_zoonew.jpg',
    isReal: false,
    explanation: 'Fake! No such coup ever occurred, though kangaroos do outnumber Australians 2 to 1.'
  },
  {
    id: 'hist_naps',
    title: 'Napoleon\'s Bunny Escape',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Napoleon',
    category: 'The Human',
    rarity: 'Legendary',
    description: 'Napoleon Bonaparte was once attacked and driven to flee by a swarm of thousands of domesticated rabbits during a hunting outing.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Flemish_Giant_Rabbit_2.jpg',
    isReal: true,
    explanation: 'Real! The hunting party bought tame rabbits instead of wild ones. When released, they rushed Napoleon thinking it was feeding time.'
  },
  {
    id: 'hist_beer_flood',
    title: 'The London Beer Flood',
    wikipediaLink: 'https://en.wikipedia.org/wiki/London_Beer_Flood',
    category: 'The Human',
    rarity: 'Epic',
    description: 'In 1814, a massive vat at a London brewery ruptured, releasing over 323,000 gallons of fermenting beer into the streets, destroying homes and flooding basements.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Beer_fermenting_wood.jpg',
    isReal: true,
    explanation: 'Real! Eight people tragically drowned or died from alcohol fumes, and the event was eventually ruled an unavoidable Act of God.'
  },
  {
    id: 'hist_dancing_plague',
    title: 'The Dancing Plague of 1518',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Dancing_plague_of_1518',
    category: 'The Human',
    rarity: 'Legendary',
    description: 'A mysterious mania occurred in Strasbourg where hundreds of citizens danced uncontrollably for weeks without rest, leading to several deaths from pure physical exhaustion.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/St_John%27s_dancers.jpg',
    isReal: true,
    explanation: 'Real! The city council even hired musicians and constructed a wooden stage to encourage them to keep dancing, believing they had to dance the fever out.'
  },
  {
    id: 'hist_caligula_sea',
    title: 'Caligula\'s War on Neptune',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Caligula',
    category: 'The Human',
    rarity: 'Rare',
    description: 'Disgruntled by a mutinous army, Roman Emperor Caligula marched his soldiers to the ocean shore and ordered them to throw spears into the water to declare war on the sea god Neptune.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Bust_Caligula_Met_14.37.jpg',
    isReal: true,
    explanation: 'Real! He ordered soldiers to gather sea shells as "spoils of war" from a vanquished ocean deity and brought them back to Rome.'
  },
  {
    id: 'hist_caesar_pirates',
    title: 'Caesar\'s Ransom Negotiation',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Julius_Caesar',
    category: 'The Human',
    rarity: 'Common',
    description: 'Captured by pirates, Julius Caesar was highly insulted by their low ransom demand of 20 talents. He insisted they demand 50 talents instead, and joked that he would hunt them down and crucify them all.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Julius_Caesar_statue_Rome.jpg',
    isReal: true,
    explanation: 'Real! Once ransomed, Caesar immediately raised a private fleet, captured the pirates, and executed them exactly as he had jokingly warned.'
  },
  {
    id: 'hist_clockwork_soldier',
    title: 'The Clockwork Crossbowman',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Qing_dynasty',
    category: 'The Human',
    rarity: 'Rare',
    description: 'In 1782, Emperor Qianlong commissioned a steam-powered automaton dressed in silk armor that could walk 100 paces and fire a crossbow with mechanical accuracy.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Qing_Dynasty_Soldier.jpg',
    isReal: false,
    explanation: 'Fake! While the Qing court possessed intricate mechanical gadgets, they never developed a steam-powered military automaton.'
  },
  {
    id: 'hist_liechtenstein_army',
    title: 'Liechtenstein\'s Warm Friend',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Military_of_Liechtenstein',
    category: 'The Human',
    rarity: 'Epic',
    description: 'In 1866, Liechtenstein sent an army of 80 soldiers to guard an alpine pass. They returned unharmed with 81 men, having suffered zero casualties and made a new Italian friend.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Schloss_Vaduz_Liechtenstein_2.jpg',
    isReal: true,
    explanation: 'Real! The country permanently disbanded its military shortly after this incredibly successful and friendly expedition.'
  },

  // SCIENCE
  {
    id: 'sci_tardigrade',
    title: 'The Indestructible Tardigrade',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Tardigrade',
    category: 'The Sciences',
    rarity: 'Epic',
    description: 'Microscopic "water bears" can survive in the vacuum of outer space, withstand extreme radiation, and go without food or water for 30 years.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Waterbear.jpg',
    isReal: true,
    explanation: 'Real! Tardigrades enter a cryptobiotic state where their metabolism stops, allowing them to endure nearly any environment.'
  },
  {
    id: 'sci_banana',
    title: 'Radioactive Bananas',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Banana_equivalent_dose',
    category: 'The Sciences',
    rarity: 'Common',
    description: 'Bananas are naturally radioactive due to high levels of Potassium-40. Eating just three bananas can set off nuclear radiation detectors in airports.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Banana-Single.jpg',
    isReal: false,
    explanation: 'Fake! While bananas do have tiny traces of radioactive potassium (measured in Banana Equivalent Doses), eating three will not trigger airport sensors.'
  },
  {
    id: 'sci_penguin',
    title: 'Equatorial Penguins',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Galapagos_penguin',
    category: 'The Sciences',
    rarity: 'Rare',
    description: 'The Galapagos penguin is the only penguin species that naturally lives and breeds north of the Equator.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Spheniscus_mendiculus_passing_by.jpg',
    isReal: true,
    explanation: 'Real! Thanks to the cool waters of the Humboldt Current, Galapagos penguins thrive in their tropical surroundings.'
  },
  {
    id: 'sci_lava_eagle',
    title: 'The Volcanic Lava Eagle',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Bird',
    category: 'The Sciences',
    rarity: 'Legendary',
    description: 'A species of raptor in Hawaii nests inside active volcanic vents, using its graphite-coated feathers to withstand heat up to 1,200 degrees Celsius.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Kilauea_Lava_Flow.jpg',
    isReal: false,
    explanation: 'Fake! No animal can nest in molten volcanic vents, nor are there graphite-feathered eagles.'
  },
  {
    id: 'sci_singing_iceberg',
    title: 'The Singing Iceberg',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Acoustic_ecology',
    category: 'The Sciences',
    rarity: 'Rare',
    description: 'Scientists in the Antarctic once detected a high-pitched acoustic vibration, similar to a massive swarm of bees or a singing choir, emitting directly from a moving iceberg.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/0/08/South_Atlantic_Ocean_iceberg.jpg',
    isReal: true,
    explanation: 'Real! The "singing" is caused by high-pressure water flowing through internal thermal tunnels within the ice mass.'
  },
  {
    id: 'sci_moon_smell',
    title: 'The Smell of Moon Dust',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Moon_dust',
    category: 'The Sciences',
    rarity: 'Epic',
    description: 'Apollo astronauts reported that when they returned from spacewalks and took off their helmets, the lunar dust clinging to their suits smelled strongly of spent gunpowder.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Apollo_11_bootprint.jpg',
    isReal: true,
    explanation: 'Real! The scent is believed to be caused by highly reactive space compounds deactivating in the moist atmosphere of the lunar lander.'
  },
  {
    id: 'sci_sonic_bloom',
    title: 'Sonic Bloom Metal',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Plant_neurobiology',
    category: 'The Sciences',
    rarity: 'Common',
    description: 'Playing heavy metal music at 432 Hz to orchids stimulates a 400% increase in nutrient absorption, causing their roots to grow steel-gray protective casings.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Phalaenopsis_amabilis_Orchid.jpg',
    isReal: false,
    explanation: 'Fake! While vibrations can slightly affect stomata behavior, heavy metal music does not stimulate a 400% increase in growth or make roots metallic.'
  },
  {
    id: 'sci_bioluminescent_trees',
    title: 'Bioluminescent Birches',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Bioluminescence',
    category: 'The Sciences',
    rarity: 'Legendary',
    description: 'A genetically mutated species of birch trees in northern Maine absorbs phosphorus from deep soil, causing their leaves to glow in a bright emerald green during autumn nights.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Forest_of_Birch_Trees.jpg',
    isReal: false,
    explanation: 'Fake! While bioluminescent fungi and fireflies exist, there are no naturally occurring or mutated glowing birch forests.'
  },
  {
    id: 'sci_frog_rain',
    title: 'Rain of Frogs',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Rain_of_animals',
    category: 'The Sciences',
    rarity: 'Rare',
    description: 'Waterspouts or tornadic winds can sweep up small aquatic animals like frogs or fish and carry them miles away before depositing them during heavy rainstorms.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/db/A_red_eyed_tree_frog.jpg',
    isReal: true,
    explanation: 'Real! The meteorological phenomenon has been documented globally, including the famous Lluvia de Peces in Honduras.'
  },
  {
    id: 'sci_wombat_cube',
    title: 'The Cube-Shaped Feces',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Wombat',
    category: 'The Sciences',
    rarity: 'Common',
    description: 'Wombats are the only known animals in the world that produce cube-shaped poop, which they stack to mark their territory and prevent the feces from rolling away.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Vombatus_ursinus_-Maria_Island_National_Park.jpg',
    isReal: true,
    explanation: 'Real! Their highly elastic intestinal walls squeeze the waste into flat-faced cubes.'
  },

  // POP CULTURE
  {
    id: 'pop_wikipedia_spaghetti',
    title: 'The Spaghetti Tree Hoax',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Spaghetti-tree_hoax',
    category: 'The Human',
    rarity: 'Epic',
    description: 'In 1957, the BBC broadcasted a three-minute hoax report showing Swiss farmers picking spaghetti off trees, causing hundreds of people to contact the BBC asking how to grow them.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Cooked_spaghetti.jpg',
    isReal: true,
    explanation: 'Real! This is famous as one of the earliest and greatest April Fools\' Day media jokes in history.'
  },
  {
    id: 'pop_rickroll',
    title: 'The Rickroll Orbit',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Rickrolling',
    category: 'The Human',
    rarity: 'Common',
    description: 'NASA astronauts once rickrolled the Russian space crew on the ISS by hijacking their intercom and playing "Never Gonna Give You Up" for 24 hours.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Rick_Astley_in_2016_%28cropped%29.jpg',
    isReal: false,
    explanation: 'Fake! While astronauts have sent jokes, a 24-hour non-stop rickroll would be considered space sabotage.'
  },
  {
    id: 'pop_street_view',
    title: 'Street View Donkey Incident',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Google_Street_View',
    category: 'The Human',
    rarity: 'Rare',
    description: 'In 2013, Google was accused of running over a donkey in Botswana with a Google Street View car, prompting an official press release defending their driver.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Donkey_in_in_Santiago_do_Cac%C3%A9m.jpg',
    isReal: true,
    explanation: 'Real! Google showed that the donkey was simply rolling in the dirt and stood up unharmed as the car passed by.'
  },
  {
    id: 'pop_pepsi_navy',
    title: 'Pepsi\'s Military Fleet',
    wikipediaLink: 'https://en.wikipedia.org/wiki/PepsiCo',
    category: 'The Human',
    rarity: 'Epic',
    description: 'In 1989, the Soviet Union traded a fleet of 17 submarines, a cruiser, a frigate, and a destroyer to Pepsi in exchange for soda, briefly giving Pepsi the 6th largest navy in the world.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Submarine_at_sea.jpg',
    isReal: true,
    explanation: 'Real! The Soviet currency wasn\'t accepted globally, so they traded decommissioned vessels which Pepsi later sold for scrap metal.'
  },
  {
    id: 'pop_nic_cage_skull',
    title: 'Cage\'s Dinosaur Auction',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Nicolas_Cage',
    category: 'The Human',
    rarity: 'Epic',
    description: 'Nicolas Cage once entered a bidding war with Leonardo DiCaprio for a rare, smuggled Tyrannosaurus bataar skull, winning it for $276,000 before having to return it to the Mongolian government.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Nicolas_Cage_-_Giffoni_Film_Festival_2013_%28cropped%29.jpg',
    isReal: true,
    explanation: 'Real! When Cage discovered the skull had been smuggled illegally, he cooperatively returned it to its rightful place of origin.'
  },
  {
    id: 'pop_potato_asteroid',
    title: 'The Potato Asteroid',
    wikipediaLink: 'https://en.wikipedia.org/wiki/The_Empire_Strikes_Back',
    category: 'The Human',
    rarity: 'Rare',
    description: 'In "Star Wars: The Empire Strikes Back", special effects artists were so frustrated by constant adjustments that they threw a real baked potato into the background of an asteroid belt scene.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Patata_novella_di_Galatina.jpg',
    isReal: true,
    explanation: 'Real! If you look closely at the scene where the Millennium Falcon flies through the asteroids, one of the flying debris pieces is indeed a baked potato.'
  },
  {
    id: 'pop_wooden_insulter',
    title: 'Shakespeare\'s Insult Dial',
    wikipediaLink: 'https://en.wikipedia.org/wiki/William_Shakespeare',
    category: 'The Human',
    rarity: 'Common',
    description: 'William Shakespeare patented an early wooden dial device in 1599 containing three concentric rings of insults, which theatergoers could spin to insult rival patrons.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Shakespeare.jpg',
    isReal: false,
    explanation: 'Fake! Shakespeare never patented a mechanical insult generator; his insult generator was his plays!'
  },
  {
    id: 'pop_monopoly_escape',
    title: 'The Monopoly Escape Board',
    wikipediaLink: 'https://en.wikipedia.org/wiki/History_of_the_board_game_Monopoly',
    category: 'The Human',
    rarity: 'Rare',
    description: 'In 1974, the winner of the European Monopoly Championship successfully escaped a Swiss prison by hiding a real Swiss passport inside a giant replica Monopoly board.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Monopoly_board_in_play.jpg',
    isReal: false,
    explanation: 'Fake! While Monopoly boards during WWII did contain escape tools for POWs, the 1974 championship escape is an urban legend.'
  },
  {
    id: 'pop_toy_story_save',
    title: 'The Toy Story 2 Save',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Toy_Story_2',
    category: 'The Human',
    rarity: 'Legendary',
    description: 'The entire movie of "Toy Story 2" was accidentally deleted from Pixar\'s servers, but was saved because a remote working employee had kept a backup copy on her personal computer.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Toy_Story_Logo.svg',
    isReal: true,
    explanation: 'Real! A rogue terminal command deleted the files, and the primary backups had silently failed. The employee\'s home backup was the only surviving copy.'
  },
  {
    id: 'pop_wikipedia_editing',
    title: 'The Alan MacMasters Hoax',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Alan_MacMasters',
    category: 'The Human',
    rarity: 'Legendary',
    description: 'A student successfully created a fake Wikipedia entry for "Alan MacMasters," inventing him as the inventor of the electric toaster, which fooled newspapers and museums for 15 years.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Toaster_Dualit_1.jpg',
    isReal: true,
    explanation: 'Real! The hoax was finally uncovered in 2022 when Wikipedia editors investigated the article\'s citations.'
  },

  // GEOGRAPHY
  {
    id: 'geo_diomede',
    title: 'The Date Line Islands',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Diomede_Islands',
    category: 'The World',
    rarity: 'Epic',
    description: 'The Diomede Islands are just 2.4 miles apart, but because the International Date Line runs between them, one island is 21 hours ahead of the other.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Diomede_Islands_Siberia_Alaska_1.jpg',
    isReal: true,
    explanation: 'Real! Tomorrow Island (Big Diomede, Russia) and Yesterday Island (Little Diomede, US) allow you to literally look into the future.'
  },
  {
    id: 'geo_canada_whiskey',
    title: 'The Whiskey War',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Whisky_War',
    category: 'The World',
    rarity: 'Rare',
    description: 'Canada and Denmark engaged in a peaceful conflict over Hans Island, where they took turns planting flags and leaving bottles of Canadian Club whiskey or Danish Schnapps.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Hans_Island_from_Canadian_side.jpg',
    isReal: true,
    explanation: 'Real! Known as the "Whisky War," it was resolved in 2022 by dividing the small island between both nations.'
  },
  {
    id: 'geo_paris_copy',
    title: 'Paris, China',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Tianducheng',
    category: 'The World',
    rarity: 'Common',
    description: 'The city of Tianducheng, China is a complete replica of Paris, featuring an Eiffel Tower copy, Parisian architecture, and French fountains.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Tianducheng_01.jpg',
    isReal: true,
    explanation: 'Real! It is a replica town built to house 10,000 residents, but initially remained a mostly quiet ghost town.'
  },
  {
    id: 'geo_everest_height',
    title: 'The Shrinking Mount Everest',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Mount_Everest',
    category: 'The World',
    rarity: 'Legendary',
    description: 'Due to gravitational pull in the Southern Hemisphere, Mount Everest shrinks by 12 meters every winter and regrows during summer.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Everest_North_Face_toward_Base_Camp_Tibet_Rotated.jpg',
    isReal: false,
    explanation: 'Fake! Mount Everest is tectonic, moving slowly over time, but winter weather does not cause it to shrink by meters.'
  },
  {
    id: 'geo_exploding_whale',
    title: 'The Exploding Whale',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Exploding_whale',
    category: 'The World',
    rarity: 'Epic',
    description: 'In 1970, Oregon officials cleared a rotting 8-ton sperm whale carcass using 20 cases of dynamite, causing blubber to rain down on cars a quarter-mile away.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Sperm_whale_fluke.jpg',
    isReal: true,
    explanation: 'Real! The explosion was too powerful, destroying a parked car and covering spectators in putrid whale fat.'
  },
  {
    id: 'geo_landmark_directions',
    title: 'San José Landmarks',
    wikipediaLink: 'https://en.wikipedia.org/wiki/San_Jos%C3%A9,_Costa_Rica',
    category: 'The World',
    rarity: 'Rare',
    description: 'Costa Rica\'s capital, San José, has almost no street signs. Residents give directions using landmarks like "200 meters south of the old fig tree."',
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Teatro_Nacional_Costa_Rica.jpg',
    isReal: true,
    explanation: 'Real! While streets have numbers on maps, they are rarely signed, and postal delivery relies on local landmarks.'
  },
  {
    id: 'geo_underwater_post',
    title: 'The Underwater Post Office',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Vanuatu',
    category: 'The World',
    rarity: 'Rare',
    description: 'Vanuatu features the world\'s only underwater post office, situated 3 meters below the surface, where visitors in scuba gear can mail waterproof postcards.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Underwater_post_office.JPG',
    isReal: true,
    explanation: 'Real! A special flag is raised on a beach buoy when staff are underwater ready to stamp your letters.'
  },
  {
    id: 'geo_centralia',
    title: 'The Town That Burns',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Centralia,_Pennsylvania',
    category: 'The World',
    rarity: 'Epic',
    description: 'The town of Centralia, Pennsylvania, was abandoned after a massive coal mine fire ignited underground in 1962 and has been burning continuously ever since.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Centralia_Pennsylvania_underground_mine_fire_steam.jpg',
    isReal: true,
    explanation: 'Real! Fumes and sinkholes made the town unlivable, and scientists estimate the coal will burn for another 250 years.'
  },
  {
    id: 'geo_floating_pumice',
    title: 'Floating Pumice Kingdom',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Micronation',
    category: 'The World',
    rarity: 'Legendary',
    description: 'A fully recognized sovereign micronation in the South Pacific constructed of floating volcanic pumice and coconut fibers, featuring its own floating post office.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Pumice_Fuji.jpg',
    isReal: false,
    explanation: 'Fake! While floating islands exist, there is no sovereign nation built on volcanic pumice and coconut fibers.'
  },
  {
    id: 'geo_nyos_eruption',
    title: 'The Toxic Lake Nyos',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Lake_Nyos',
    category: 'The World',
    rarity: 'Legendary',
    description: 'In 1986, Lake Nyos in Cameroon released a massive cloud of carbon dioxide, suffocating over 1,700 people and 3,000 livestock in nearby villages within minutes.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Lake_Nyos_1.jpg',
    isReal: true,
    explanation: 'Real! It was a rare "limnic eruption," where gas saturated in deep lake water suddenly bubbles up.'
  }
];

export const useGameStore = defineStore('game', () => {
  const gdPoints = ref<number>(0);
  const collectedCards = ref<CollectedCard[]>([]);
  const categoryCooldowns = ref<Record<string, number>>({});
  const customSections = ref<string[]>(['Showcase', 'Real Rarities', 'Historical Gems']);
  const gameCards = ref<Card[]>(MOCK_CARDS);

  // Load guest data
  const loadGuestState = () => {
    const authStore = useAuthStore();
    console.log('[loadGuestState] Called. authStore.isLoggedIn =', authStore.isLoggedIn);
    if (authStore.isLoggedIn) return;

    // Load points
    const savedPoints = localStorage.getItem('moonflower_guest_gdPoints');
    console.log('[loadGuestState] Raw gdPoints from localStorage:', savedPoints);
    gdPoints.value = savedPoints !== null ? parseInt(savedPoints, 10) : 0;
    console.log('[loadGuestState] Set gdPoints.value =', gdPoints.value);

    // Load collected cards
    const savedCards = localStorage.getItem('moonflower_guest_collectedCards');
    if (savedCards) {
      try {
        collectedCards.value = JSON.parse(savedCards);
        console.log('[loadGuestState] Successfully parsed collectedCards, count =', collectedCards.value.length);
      } catch (err) {
        console.error('[loadGuestState] Failed to parse collectedCards from localStorage:', err);
        collectedCards.value = [];
      }
    } else {
      collectedCards.value = [];
    }

    // Load category cooldowns
    const savedCooldowns = localStorage.getItem('moonflower_guest_categoryCooldowns');
    if (savedCooldowns) {
      try {
        categoryCooldowns.value = JSON.parse(savedCooldowns);
      } catch (err) {
        console.error('[loadGuestState] Failed to parse categoryCooldowns from localStorage:', err);
        categoryCooldowns.value = {};
      }
    } else {
      categoryCooldowns.value = {};
    }

    // Load custom sections
    const savedSections = localStorage.getItem('moonflower_guest_customSections');
    if (savedSections) {
      try {
        customSections.value = JSON.parse(savedSections);
      } catch (err) {
        console.error('[loadGuestState] Failed to parse customSections from localStorage:', err);
        customSections.value = ['Showcase', 'Real Rarities', 'Historical Gems'];
      }
    } else {
      customSections.value = ['Showcase', 'Real Rarities', 'Historical Gems'];
    }
  };

  // Load logged-in user custom sections and cooldowns from localStorage
  const loadUserState = (userId: string) => {
    console.log('[loadUserState] Loading localStorage state for user:', userId);
    
    // Load custom sections
    const savedSections = localStorage.getItem(`moonflower_user_${userId}_customSections`);
    if (savedSections) {
      try {
        customSections.value = JSON.parse(savedSections);
        console.log('[loadUserState] Loaded customSections from localStorage:', customSections.value);
      } catch (err) {
        console.error('[loadUserState] Failed to parse customSections:', err);
        customSections.value = ['Showcase', 'Real Rarities', 'Historical Gems'];
      }
    } else {
      customSections.value = ['Showcase', 'Real Rarities', 'Historical Gems'];
    }

    // Load category cooldowns
    const savedCooldowns = localStorage.getItem(`moonflower_user_${userId}_categoryCooldowns`);
    if (savedCooldowns) {
      try {
        categoryCooldowns.value = JSON.parse(savedCooldowns);
        console.log('[loadUserState] Loaded categoryCooldowns from localStorage:', categoryCooldowns.value);
      } catch (err) {
        console.error('[loadUserState] Failed to parse categoryCooldowns:', err);
        categoryCooldowns.value = {};
      }
    } else {
      categoryCooldowns.value = {};
    }
  };

  // Sync game store states directly with the user store
  const syncWithUser = (points: number, cards: CollectedCard[]) => {
    gdPoints.value = points;
    collectedCards.value = cards;
  };

  // Helper to filter out explicit, sexually suggestive, or inappropriate Wikipedia entries
  const isAppropriateArticle = (row: any): boolean => {
    const title = (row.title || '').toLowerCase();
    const desc = [row.first_sentence, row.second_sentence, row.third_sentence]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const combinedText = `${title} | ${desc}`;

    // List of explicit/inappropriate terms (case-insensitive substrings)
    const explicitSubstrings = [
      'bukkake',
      'hentai',
      'pornograph', // covers porn, pornography, pornographic, porn star, etc.
      'creampie',
      'pegging',
      'fellatio',
      'cunnilingus',
      'anilingus',
      'masturbat', // covers masturbate, masturbation
      'bestiality',
      'ejaculat', // covers ejaculate, ejaculation, pre-ejaculate
      'futanari',
      'xvideos',
      'chaturbate',
      'stripchat',
      'redgifs',
      'rule 34',
      '2 girls 1 cup',
      'facesitting',
      'handjob',
      'blowjob',
      'gangbang',
      'gang bang',
      'double penetration',
      'threesome',
      'orgy',
      'orgies',
      'doggy style',
      'erotica',
      'sadomasochis',
      'bdsm',
      'clop (erotic',
      'vulva',
      'clitoris',
      'penile-vaginal',
      'penile–vaginal',
      'sexual penetration',
      'sexual stimulation',
      'sexual fetish',
      'erotic lactation',
      'erotic humiliation',
      'rape pornography',
      'hardcore pornography',
      'unsimulated sex',
      'celebrity sex tape',
      'child sexual abuse'
    ];

    for (const term of explicitSubstrings) {
      if (combinedText.includes(term)) {
        return false;
      }
    }

    // Standalone word 'sex' check, ignoring 'same-sex' and 'opposite-sex'
    const sexRegex = /(?<!\b(same|opposite)-)\bsex\b/i;
    if (sexRegex.test(title) || sexRegex.test(desc)) {
      return false;
    }

    // Standalone 'sexual' check, ignoring 'sexual dimorphism', 'sexual reproduction', 'sexual selection', 'sexual orientation', 'sexual identity'
    const sexualRegex = /\bsexual\b/i;
    if (sexualRegex.test(title) || sexualRegex.test(desc)) {
      const textWithoutBio = combinedText
        .replace(/sexual dimorphism/g, '')
        .replace(/sexual reproduction/g, '')
        .replace(/sexual selection/g, '')
        .replace(/sexual orientation/g, '')
        .replace(/sexual identity/g, '');
      if (sexualRegex.test(textWithoutBio)) {
        return false;
      }
    }

    // Standalone 'penis', 'vagina', 'semen', 'orgasm'
    const otherExplicitWords = /\b(penis|vagina|semen|orgasm)\b/i;
    if (otherExplicitWords.test(title) || otherExplicitWords.test(desc)) {
      return false;
    }

    // Standalone 'sperm' but not 'sperm whale'
    if (/\bsperm\b/i.test(combinedText)) {
      const textWithoutWhale = combinedText.replace(/sperm whale/g, '');
      if (/\bsperm\b/i.test(textWithoutWhale)) {
        return false;
      }
    }

    return true;
  };

  // Helper to map database article row to Card format
  const mapArticleRowToCard = (row: any): Card => {
    // 1. Read the top-level category and finer sub-category straight from the row.
    //    Match the known values case-insensitively; default to "The Human".
    const dbCategory = (row.category || '').trim().toLowerCase();
    let category: Category = 'The Human';
    if (dbCategory === 'the sciences') {
      category = 'The Sciences';
    } else if (dbCategory === 'the world') {
      category = 'The World';
    }
    const subCategory: string | undefined = row.sub_category || undefined;

    // 2. Normalize Rarity based on the article's percentile
    let rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' = 'Common';
    const pct = row.percentile;
    if (typeof pct === 'number') {
      if (pct >= 0.90) rarity = 'Legendary';
      else if (pct >= 0.70) rarity = 'Epic';
      else if (pct >= 0.40) rarity = 'Rare';
    }

    // 3. Format visual background image
    let image = '';
    if (row.image_url) {
      image = row.image_url;
    }

    // 4. The card text is just the first sentence of the article
    const description = row.first_sentence || 'No description available.';

    // 5. The database marks each row as real or fake directly
    const isReal = !!row.real;

    return {
      id: row.qid,
      title: row.title || 'Untitled Article',
      wikipediaLink: `https://en.wikipedia.org/wiki/${encodeURIComponent(row.title || '')}`,
      category,
      subCategory,
      rarity,
      description,
      image,
      isReal,
      explanation: isReal
        ? 'Real! This is a genuine Wikipedia entry.'
        : 'Fake! This entry has been altered and is not a real Wikipedia fact.'
    };
  };

  // Number of real and of fake cards to pull for a playable sample. The whole
  // table can be huge, and gameplay only needs a deck of 10 per category, so we
  // fetch a bounded random sample rather than the entire table.
  const SAMPLE_PER_CLASS = 150;

  // Skip anything flagged above this threshold (flag_score is null for unflagged rows).
  const FLAG_SCORE_MAX = 0.9;

  // Shared candidate filters — applied identically to the count and data queries so
  // the random-offset window stays valid. Keep unclaimed rows that have an image, are
  // of the requested real/fake class, and aren't flagged above the threshold.
  const applyCandidateFilters = (query: any, real: boolean) =>
    query
      .is('profile_id', null)
      .not('image_url', 'is', null)
      .eq('real', real)
      .or(`flag_score.lte.${FLAG_SCORE_MAX},flag_score.is.null`);

  // Fetch a random window of `sampleSize` rows for the given real/fake class.
  // PostgREST has no ORDER BY random(), so we count the candidates and read a
  // page starting at a random offset — bounded work that still varies per load.
  const fetchArticleSample = async (real: boolean, sampleSize: number): Promise<any[]> => {
    const { count, error: countError } = await applyCandidateFilters(
      supabase.from('articles_v2').select('*', { count: 'exact', head: true }),
      real
    );

    if (countError) throw countError;
    if (!count) return [];

    const maxOffset = Math.max(0, count - sampleSize);
    const offset = Math.floor(Math.random() * (maxOffset + 1));

    const { data, error } = await applyCandidateFilters(
      supabase.from('articles_v2').select('*'),
      real
    ).range(offset, offset + sampleSize - 1);

    if (error) throw error;
    return data || [];
  };

  // Tracks whether we already have a playable sample, plus the in-flight load so
  // concurrent callers (multiple views mounting) share one fetch instead of each
  // hitting the database.
  const cardsLoaded = ref(false);
  let cardsLoadPromise: Promise<void> | null = null;

  // Fetch a playable sample of articles from Supabase and map them to Cards.
  // Cached after the first successful load; pass force=true to refresh.
  const loadCardsFromDatabase = async (force = false): Promise<void> => {
    if (!force && cardsLoaded.value) return;
    if (!force && cardsLoadPromise) return cardsLoadPromise;

    cardsLoadPromise = (async () => {
      try {
        console.log('Fetching a playable sample of articles from Supabase public.articles_v2 table...');
        const [realRows, fakeRows] = await Promise.all([
          fetchArticleSample(true, SAMPLE_PER_CLASS),
          fetchArticleSample(false, SAMPLE_PER_CLASS)
        ]);
        const rows = [...realRows, ...fakeRows];

        if (rows.length > 0) {
          // Each row is already classified real/fake in the DB, so just filter
          // out inappropriate entries (and any without an image) and map the rest.
          const mapped: Card[] = rows
            .filter((row: any) => row.image_url && isAppropriateArticle(row))
            .map((row: any) => mapArticleRowToCard(row));

          gameCards.value = mapped;
          console.log(`Successfully mapped ${mapped.length} playable cards from the Supabase articles_v2 table!`);
        } else {
          console.warn('Supabase articles_v2 returned no rows. Falling back to default MOCK_CARDS.');
          gameCards.value = MOCK_CARDS;
        }
        cardsLoaded.value = true;
      } catch (err: any) {
        console.error('Failed to load articles from Supabase:', err.message);
        console.log('Operating in offline/mock mode. Falling back to default MOCK_CARDS.');
        gameCards.value = MOCK_CARDS;
        // Treat the fallback as loaded so a transient failure doesn't make every
        // view retry on each navigation; callers can force a refresh later.
        cardsLoaded.value = true;
      }
    })();

    try {
      await cardsLoadPromise;
    } finally {
      cardsLoadPromise = null;
    }
  };


  const persistState = () => {
    const authStore = useAuthStore();
    if (authStore.isLoggedIn && authStore.user?.id) {
      authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
      localStorage.setItem(`moonflower_user_${authStore.user.id}_gdPoints`, String(gdPoints.value));
      localStorage.setItem(`moonflower_user_${authStore.user.id}_collectedCards`, JSON.stringify(collectedCards.value));
      localStorage.setItem(`moonflower_user_${authStore.user.id}_categoryCooldowns`, JSON.stringify(categoryCooldowns.value));
      localStorage.setItem(`moonflower_user_${authStore.user.id}_customSections`, JSON.stringify(customSections.value));
    } else if (!authStore.isLoggedIn) {
      localStorage.setItem('moonflower_guest_gdPoints', String(gdPoints.value));
      localStorage.setItem('moonflower_guest_collectedCards', JSON.stringify(collectedCards.value));
      localStorage.setItem('moonflower_guest_categoryCooldowns', JSON.stringify(categoryCooldowns.value));
      localStorage.setItem('moonflower_guest_customSections', JSON.stringify(customSections.value));
    }
  };

  // Add Points
  const addPoints = (points: number, shouldPersist = true) => {
    gdPoints.value += points;

    if (shouldPersist) {
      persistState();
    }
  };

  // Deduct Points
  const spendPoints = (points: number): boolean => {
    if (gdPoints.value >= points) {
      gdPoints.value -= points;
      const authStore = useAuthStore();
      if (authStore.isLoggedIn) {
        authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
      }
      return true;
    }
    return false;
  };

  // Collect a Card
  const collectCard = (card: Card | string): boolean => {
    const cardId = typeof card === 'string' ? card : card.id;
    const cardDetails = typeof card === 'string' ? undefined : card;
    const existsIndex = collectedCards.value.findIndex(c => c.id === cardId);

    if (existsIndex === -1) {
      collectedCards.value.push({
        id: cardId,
        collectedAt: new Date().toISOString(),
        isShowcase: false,
        customSection: null,
        // Store the full card so the binder can render it without re-fetching
        // (the global sample may not contain this specific card later).
        cardDetails
      });
    } else {
      // Update collected timestamp
      collectedCards.value[existsIndex].collectedAt = new Date().toISOString();
      if (cardDetails && !collectedCards.value[existsIndex].cardDetails) {
        collectedCards.value[existsIndex].cardDetails = cardDetails;
      }
    }

    const authStore = useAuthStore();
    if (authStore.isLoggedIn) {
      authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
    }

    return existsIndex === -1;
  };

  // Toggle Showcase status (only ONE pinned card allowed at a time)
  // Toggle Showcase status (only ONE pinned card allowed at a time)
  const toggleShowcase = async (cardId: string) => {
    const card = collectedCards.value.find(c => c.id === cardId);
    if (card) {
      const targetState = !card.isShowcase;
      // Reset all cards first to enforce single pinning
      collectedCards.value.forEach(c => {
        c.isShowcase = false;
      });
      card.isShowcase = targetState;

      const authStore = useAuthStore();
      if (authStore.isLoggedIn) {
        // Sync points (collectedCards is no longer stored in metadata)
        authStore.syncStoreToUser(gdPoints.value, collectedCards.value);

        // Update database table 'articles' for pinning
        const profileId = authStore.user?.id;
        if (profileId && !profileId.startsWith('usr_')) {
          try {
            if (targetState) {
              // 1. Unpin all other articles belonging to this user
              const { error: unpinError } = await supabase
                .from('articles_v2')
                .update({ pinned: false })
                .eq('profile_id', profileId);
              
              if (unpinError) {
                console.error('Error resetting pins in DB:', unpinError.message);
              }

              // 2. Pin this specific article
              const { error: pinError } = await supabase
                .from('articles_v2')
                .update({ pinned: true })
                .eq('profile_id', profileId)
                .eq('qid', cardId);
              
              if (pinError) {
                console.error('Error pinning article in DB:', pinError.message);
              }
            } else {
              // Unpin this specific article
              const { error: unpinError } = await supabase
                .from('articles_v2')
                .update({ pinned: false })
                .eq('profile_id', profileId)
                .eq('qid', cardId);
              
              if (unpinError) {
                console.error('Error unpinning article in DB:', unpinError.message);
              }
            }
          } catch (err) {
            console.error('Failed to update pinned state in database:', err);
          }
        }
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
      }
    }
  };

  // Add binder custom section
  const addCustomSection = (sectionName: string) => {
    if (sectionName && !customSections.value.includes(sectionName)) {
      customSections.value.push(sectionName);
    }
  };

  // Remove binder custom section
  const removeCustomSection = (sectionName: string) => {
    customSections.value = customSections.value.filter(s => s !== sectionName);

    // Reset cards inside this section
    collectedCards.value.forEach(c => {
      if (c.customSection === sectionName) {
        c.customSection = null;
      }
    });

    const authStore = useAuthStore();
    if (authStore.isLoggedIn) {
      authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
    }
  };

  // Cooldown handlers
  const setCooldown = (category: string) => {
    const expiry = Date.now() + 60 * 1000; // 60 seconds cooldown
    categoryCooldowns.value[category] = expiry;
  };

  const getCooldownTimeRemaining = (category: string): number => {
    const expiry = categoryCooldowns.value[category] || 0;
    const diff = expiry - Date.now();
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  };

  const isCooldownActive = (category: string): boolean => {
    return getCooldownTimeRemaining(category) > 0;
  };

  // Load a public user profile from the Supabase "profile" table by username or user id
  const loadProfileFromDB = async (usernameOrId: string): Promise<{ userProfile: any, cards: CollectedCard[] } | null> => {
    try {
      // Try matching by username first (case-insensitive)
      let { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', usernameOrId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile by username:', error.message);
      }

      // If no match by username, try matching by id
      if (!profileData) {
        const { data: profileById, error: idError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', usernameOrId)
          .maybeSingle();

        if (idError) {
          console.error('Error fetching profile by id:', idError.message);
        }
        profileData = profileById;
      }

      if (!profileData) return null;

      // Fetch articles owned by this profile via profile_id join
      const { data: articlesData, error: articlesError } = await supabase
        .from('articles_v2')
        .select('*')
        .eq('profile_id', profileData.id);

      if (articlesError) {
        console.error('Error fetching profile articles:', articlesError.message);
      }

      // Map articles to CollectedCard format
      const cards: CollectedCard[] = (articlesData || []).map((article: any) => ({
        id: article.qid,
        collectedAt: new Date().toISOString(),
        isShowcase: !!article.pinned,
        customSection: null,
        cardDetails: mapArticleRowToCard(article)
      }));

      return {
        userProfile: {
          id: profileData.id,
          username: profileData.username,
          profilePic: `https://api.dicebear.com/7.x/identicon/svg?seed=${profileData.username}`,
          bio: profileData.bio || 'Avid Moonflower scholar and collector.',
          backgroundColor: '#eaecf0',
          gdPoints: 0
        },
        cards
      };
    } catch (err: any) {
      console.error('Failed to load profile from DB:', err.message);
      return null;
    }
  };

  // Claim articles for a profile by setting profile_id on collected article rows
  const claimArticlesForProfile = async (articleQids: string[]) => {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn || !authStore.user) return;

    const profileId = authStore.user.id;
    if (!profileId || profileId.startsWith('usr_') || articleQids.length === 0) return;

    try {
      // Update articles_v2 table, setting profile_id for each collected article's qid
      // Only claim articles that are currently unclaimed (profile_id IS NULL)
      const { error } = await supabase
        .from('articles_v2')
        .update({ profile_id: profileId })
        .in('qid', articleQids)
        .is('profile_id', null);

      if (error) {
        console.error('Error claiming articles for profile:', error.message);
      } else {
        console.log(`Successfully claimed ${articleQids.length} articles for profile ${profileId}`);
        // Ensure they are also in the local collectedCards state
        let updatedAny = false;
        const nowStr = new Date().toISOString();
        for (const qid of articleQids) {
          const exists = collectedCards.value.some(c => c.id === qid);
          if (!exists) {
            collectedCards.value.push({
              id: qid,
              collectedAt: nowStr,
              isShowcase: false,
              customSection: null
            });
            updatedAny = true;
          }
        }
        if (updatedAny) {
          authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
        }
      }
    } catch (err: any) {
      console.error('Failed to claim articles:', err.message);
    }
  };

  // Watchers to automatically save to localStorage when state changes
  watch(gdPoints, (newVal) => {
    const authStore = useAuthStore();
    console.log('[watch gdPoints] triggered. newVal =', newVal, ', authStore.isLoggedIn =', authStore.isLoggedIn);
    if (authStore.isLoggedIn && authStore.user?.id) {
      localStorage.setItem(`moonflower_user_${authStore.user.id}_gdPoints`, String(newVal));
      console.log(`[watch gdPoints] Saved user progress to localStorage for ${authStore.user.id}:`, newVal);
    } else if (!authStore.isLoggedIn) {
      localStorage.setItem('moonflower_guest_gdPoints', String(newVal));
      console.log('[watch gdPoints] Saved guest progress to localStorage:', newVal);
    }
  });

  watch(collectedCards, (newVal) => {
    const authStore = useAuthStore();
    console.log('[watch collectedCards] triggered. count =', newVal?.length, ', authStore.isLoggedIn =', authStore.isLoggedIn);
    if (authStore.isLoggedIn && authStore.user?.id) {
      localStorage.setItem(`moonflower_user_${authStore.user.id}_collectedCards`, JSON.stringify(newVal));
      console.log(`[watch collectedCards] Saved user cards to localStorage for ${authStore.user.id}`);
    } else if (!authStore.isLoggedIn) {
      localStorage.setItem('moonflower_guest_collectedCards', JSON.stringify(newVal));
      console.log('[watch collectedCards] Saved guest progress to localStorage:', newVal);
    }
  }, { deep: true });

  watch(categoryCooldowns, (newVal) => {
    const authStore = useAuthStore();
    console.log('[watch categoryCooldowns] triggered. authStore.isLoggedIn =', authStore.isLoggedIn);
    if (authStore.isLoggedIn && authStore.user?.id) {
      localStorage.setItem(`moonflower_user_${authStore.user.id}_categoryCooldowns`, JSON.stringify(newVal));
    } else if (!authStore.isLoggedIn) {
      localStorage.setItem('moonflower_guest_categoryCooldowns', JSON.stringify(newVal));
      console.log('[watch categoryCooldowns] Saved guest progress to localStorage:', newVal);
    }
  }, { deep: true });

  watch(customSections, (newVal) => {
    const authStore = useAuthStore();
    console.log('[watch customSections] triggered. count =', newVal?.length, ', authStore.isLoggedIn =', authStore.isLoggedIn);
    if (authStore.isLoggedIn && authStore.user?.id) {
      localStorage.setItem(`moonflower_user_${authStore.user.id}_customSections`, JSON.stringify(newVal));
    } else if (!authStore.isLoggedIn) {
      localStorage.setItem('moonflower_guest_customSections', JSON.stringify(newVal));
      console.log('[watch customSections] Saved guest progress to localStorage:', newVal);
    }
  }, { deep: true });

  return {
    gdPoints,
    collectedCards,
    categoryCooldowns,
    customSections,
    gameCards,
    loadGuestState,
    loadUserState,
    syncWithUser,
    loadCardsFromDatabase,
    addPoints,
    persistState,
    spendPoints,
    collectCard,
    toggleShowcase,
    updateCardSection,
    addCustomSection,
    removeCustomSection,
    setCooldown,
    getCooldownTimeRemaining,
    isCooldownActive,
    loadProfileFromDB,
    claimArticlesForProfile,
    mapArticleRowToCard
  };
});
