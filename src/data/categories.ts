import type { Category } from '../stores/useGameStore';

/**
 * Attribution for one source image in a category's home-screen collage
 * (all Wikimedia Commons assets).
 */
export interface CollageAttribution {
  title: string;
  license: string;
  author: string;
  thumbnail: string;
  /** Wikimedia Commons page for the asset; the credits sheet links here. */
  url: string;
}

export interface CategoryHomeConfig {
  /** Display name on the home category selector (may differ from the Category id). */
  name: string;
  /** Selector card thumbnail, served from public/. */
  thumbnail: string;
  /** Collage image shown while the category is selected, served from public/. */
  bgCollage: string;
  /** Commons attributions for the collage's source images. */
  collageCredits: CollageAttribution[];
}

/**
 * Per-category home-screen data (selector entry, collage, collage credits).
 * Keyed by Category so the type checker guarantees every category stays
 * configured. Paths must match the public/ filenames exactly: static serving
 * is case-sensitive.
 */
export const CATEGORY_HOME_CONFIG: Record<Category, CategoryHomeConfig> = {
  Sports: {
    name: 'Sports',
    thumbnail: '/sports.png',
    bgCollage: '/sports-mainImg.png',
    collageCredits: [
      { title: 'Erling Haaland June 2025', license: 'CC BY 4.0', author: 'MichaelEmilio', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Erling_Haaland_June_2025.jpg/960px-Erling_Haaland_June_2025.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Erling_Haaland_June_2025.jpg&wprov=afsw1' },
      { title: 'San Francisco 49ers Uniforms 2025.png', license: 'CC BY-SA 4.0', author: 'DaRealConMan', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/San_Francisco_49ers_Uniforms_2025.png/120px-San_Francisco_49ers_Uniforms_2025.png', url: 'https://commons.wikimedia.org/w/index.php?title=File:San_Francisco_49ers_Uniforms_2025.png&wprov=afsw1' },
      { title: 'Ferrari F2008 front Museo Ferrari.jpg', license: 'CC BY-SA 3.0', author: 'Morio', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Ferrari_F2008_front_Museo_Ferrari.jpg/120px-Ferrari_F2008_front_Museo_Ferrari.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Ferrari_F2008_front_Museo_Ferrari.jpg&wprov=afsw1' },
      { title: 'Elaine Thompson Herah at the 2019 Pan American Games.jpg', license: 'CC BY-SA 4.0', author: 'Editor4wikip', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Elaine_Thompson_Herah_at_the_2019_Pan_American_Games.jpg/120px-Elaine_Thompson_Herah_at_the_2019_Pan_American_Games.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Elaine_Thompson_Herah_at_the_2019_Pan_American_Games.jpg&wprov=afsw1' },
    ],
  },
  'People / Culture': {
    name: 'People & Culture',
    thumbnail: '/society.png',
    bgCollage: '/People-mainImg.png',
    collageCredits: [
      { title: 'Hieronymus Bosch- The Seven Deadly Sins and the Four Last Things.JPG', license: 'PDM', author: 'Hieronymus Bosch or follower', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Hieronymus_Bosch-_The_Seven_Deadly_Sins_and_the_Four_Last_Things.JPG/120px-Hieronymus_Bosch-_The_Seven_Deadly_Sins_and_the_Four_Last_Things.JPG', url: 'https://commons.wikimedia.org/w/index.php?title=File:Hieronymus_Bosch-_The_Seven_Deadly_Sins_and_the_Four_Last_Things.JPG&wprov=afsw1' },
      { title: 'Sol de Mayo-Bandera de Argentina.svg', license: 'PDM', author: 'Juan Martín de Pueyrredón (1777-1850), according to Ministerio del Interior website', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Sol_de_Mayo-Bandera_de_Argentina.svg/120px-Sol_de_Mayo-Bandera_de_Argentina.svg.png', url: 'https://commons.wikimedia.org/w/index.php?title=File:Sol_de_Mayo-Bandera_de_Argentina.svg&wprov=afsw1' },
      { title: 'Harriet Tubman c1868-69.jpg', license: 'PDM', author: 'Benjamin F. Powelson', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Harriet_Tubman_c1868-69.jpg/120px-Harriet_Tubman_c1868-69.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Harriet_Tubman_c1868-69.jpg&wprov=afsw1' },
      { title: 'Petrarch by Bargilla.jpg', license: 'PDM', author: 'Andrea del Castagno', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Petrarch_by_Bargilla.jpg/120px-Petrarch_by_Bargilla.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Petrarch_by_Bargilla.jpg&wprov=afsw1' },
    ],
  },
  Media: {
    name: 'Media',
    thumbnail: '/entertainment.png',
    bgCollage: '/media-mainImg.png',
    collageCredits: [
      { title: 'Cher in 2019 cropped.jpg', license: 'CC BY-SA 4.0', author: 'Raph_PH', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Cher_in_2019_cropped.jpg/120px-Cher_in_2019_cropped.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Cher_in_2019_cropped.jpg&wprov=afsw1' },
      { title: 'Deadpool 2 Japan Premiere Red Carpet Ryan Reynolds (cropped).jpg', license: 'CC BY 2.0', author: 'Dick Thomas Johnson from Tokyo, Japan', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Deadpool_2_Japan_Premiere_Red_Carpet_Ryan_Reynolds_%28cropped%29.jpg/120px-Deadpool_2_Japan_Premiere_Red_Carpet_Ryan_Reynolds_%28cropped%29.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Deadpool_2_Japan_Premiere_Red_Carpet_Ryan_Reynolds_(cropped).jpg&wprov=afsw1' },
      { title: 'Bangtan Boys at the Incheon Music Center in September 2013 02.jpg', license: 'CC BY 4.0', author: 'BulletProof7BTS', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Bangtan_Boys_at_the_Incheon_Music_Center_in_September_2013_02.jpg/120px-Bangtan_Boys_at_the_Incheon_Music_Center_in_September_2013_02.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Bangtan_Boys_at_the_Incheon_Music_Center_in_September_2013_02.jpg&wprov=afsw1' },
      { title: 'Red puppet.jpg', license: 'CC BY 2.0', author: 'Peabody Awards', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Red_puppet.jpg/120px-Red_puppet.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Red_puppet.jpg&wprov=afsw1' },
    ],
  },
  Earth: {
    name: 'Earth',
    thumbnail: '/earth.png',
    bgCollage: '/Earth-mainImg.png',
    collageCredits: [
      { title: 'Rainbow lorikeet (Trichoglossus moluccanus moluccanus) Sydney.jpg', license: 'CC BY-SA 4.0', author: 'Charles J. Sharp', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Rainbow_lorikeet_%28Trichoglossus_moluccanus_moluccanus%29_Sydney.jpg/120px-Rainbow_lorikeet_%28Trichoglossus_moluccanus_moluccanus%29_Sydney.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Rainbow_lorikeet_(Trichoglossus_moluccanus_moluccanus)_Sydney.jpg&wprov=afsw1' },
      { title: 'Erdglobus, sogenannter Behaim-Globus.jpg', license: 'CC BY-SA 4.0', author: 'Martin Behaim / Georg Glockendon', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Erdglobus%2C_sogenannter_Behaim-Globus.jpg/120px-Erdglobus%2C_sogenannter_Behaim-Globus.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Erdglobus,_sogenannter_Behaim-Globus.jpg&wprov=afsw1' },
      { title: 'Mount Rushmore detail view (100MP).jpg', license: 'CC BY-SA 3.0', author: 'Thomas Wolf, www.foto-tw.de', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Mount_Rushmore_detail_view_%28100MP%29.jpg/120px-Mount_Rushmore_detail_view_%28100MP%29.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Mount_Rushmore_detail_view_(100MP).jpg&wprov=afsw1' },
      { title: 'Statue of Unity.jpg', license: 'CC BY-SA 4.0', author: 'Snehrashmi', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Statue_of_Unity.jpg/120px-Statue_of_Unity.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Statue_of_Unity.jpg&wprov=afsw1' },
    ],
  },
  'History / Society': {
    name: 'History & Society',
    thumbnail: '/history.png',
    bgCollage: '/History-mainImg.png',
    collageCredits: [
      { title: 'Phocas coin.jpg', license: 'CC BY-SA 3.0', author: 'CNG Coins', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Phocas_coin.jpg/120px-Phocas_coin.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Phocas_coin.jpg&wprov=afsw1' },
      { title: 'Kleopatra-VII.-Altes-Museum-Berlin1.jpg', license: 'PDM', author: 'Louis le Grand', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Kleopatra-VII.-Altes-Museum-Berlin1.jpg/120px-Kleopatra-VII.-Altes-Museum-Berlin1.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Kleopatra-VII.-Altes-Museum-Berlin1.jpg&wprov=afsw1' },
      { title: 'Banner of the Holy Roman Emperor with haloes (1430-1806).svg', license: 'CC BY-SA 3.0', author: 'David Liuzzo, eagle by N3MO', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Banner_of_the_Holy_Roman_Emperor_with_haloes_%281430-1806%29.svg/120px-Banner_of_the_Holy_Roman_Emperor_with_haloes_%281430-1806%29.svg.png', url: 'https://commons.wikimedia.org/w/index.php?title=File:Banner_of_the_Holy_Roman_Emperor_with_haloes_(1430-1806).svg&wprov=afsw1' },
      { title: 'Chaos Monster and Sun God.png', license: 'PDM', author: 'editor Austen Henry Layard , drawing by L. Gruner', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Chaos_Monster_and_Sun_God.png/120px-Chaos_Monster_and_Sun_God.png', url: 'https://commons.wikimedia.org/w/index.php?title=File:Chaos_Monster_and_Sun_God.png&wprov=afsw1' },
    ],
  },
  'Physical Science': {
    name: 'Physical Science',
    thumbnail: '/physical-science.png',
    bgCollage: '/physicalScience-mainImg.png',
    collageCredits: [
      { title: 'PH scale 3.jpg', license: 'CC BY 4.0', author: 'Alvy16', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/PH_scale_3.jpg/120px-PH_scale_3.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:PH_scale_3.jpg&wprov=afsw1' },
      { title: 'Density column.JPG', license: 'CC BY-SA 3.0', author: 'PRHaney', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Density_column.JPG/120px-Density_column.JPG', url: 'https://commons.wikimedia.org/w/index.php?title=File:Density_column.JPG&wprov=afsw1' },
      { title: 'Aripiprazole molecule from xtal ball.png', license: 'CC0', author: 'Jynto (talk)', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Aripiprazole_molecule_from_xtal_ball.png/120px-Aripiprazole_molecule_from_xtal_ball.png', url: 'https://commons.wikimedia.org/w/index.php?title=File:Aripiprazole_molecule_from_xtal_ball.png&wprov=afsw1' },
    ],
  },
};

/**
 * A fine-grained topic in the home-screen "More" picker. Each maps a
 * human-readable label to a Wikimedia article-topic code stored in the DB's
 * `topic` column, matched exactly (leaf topics only, canonical casing).
 */
export interface TopicOption {
  /** Display name on the picker tile. */
  label: string;
  /** Exact DB `topic` value; the pool query filters on this. */
  code: string;
  /**
   * Broader sub_category the topic lives under. Used as the fallback fakes pool
   * when the topic itself is too thin, so backfilled fakes stay thematically
   * close.
   */
  category: Category;
  /** Picker tile thumbnail (Wikimedia Commons). */
  image: string;
  /** Short credit line shown under the topic title (describes `image`). */
  attribution: string;
  /** Source page for `image` (Wikimedia Commons); opened from the credit line. */
  attributionUrl: string;
}

/**
 * Topics surfaced in the "More" picker. We only list topics with enough
 * real + fake content to build full decks (currently all under "Media").
 */
export const TOPICS: TopicOption[] = [
  { label: 'Films', code: 'Culture.Media.Films', category: 'Media', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Jaws_movie_poster.jpg/960px-Jaws_movie_poster.jpg', attribution: 'Jaws theatrical poster', attributionUrl: 'https://commons.wikimedia.org/wiki/File:Jaws_movie_poster.jpg' },
  { label: 'Television', code: 'Culture.Media.Television', category: 'Media', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Dizzy_Dishes_%281930%29.webm/330px--Dizzy_Dishes_%281930%29.webm.jpg', attribution: 'Dizzy Dishes (1930) by Dave Fleischer ', attributionUrl: 'https://en.wikipedia.org/wiki/File:Dizzy_Dishes_(1930).webm' },
  { label: 'Music', code: 'Culture.Media.Music', category: 'Media', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Doja_Cat_x_Amazon1.1_%28cropped%29.jpg/250px-Doja_Cat_x_Amazon1.1_%28cropped%29.jpg', attribution: "American rapper, singer, songwriter and record producer Doja Cat", attributionUrl: "https://commons.wikimedia.org/wiki/File:Doja_Cat_x_Amazon1.1_(cropped).jpg" },
  { label: 'Video Games', code: 'Culture.Media.Video_games', category: 'Media', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Fez_%28video_game%29_cover_art.png/500px-Fez_%28video_game%29_cover_art.png', attribution: "Cover art by Bryan Lee O'Malley", attributionUrl: 'https://commons.wikimedia.org/wiki/File:Fez_(video_game)_cover_art.png' },
  { label: 'Entertainment', code: 'Culture.Media.Entertainment', category: 'Media', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Christopher_Daniels_1.jpg/330px-Christopher_Daniels_1.jpg', attribution: "Christopher Daniels performing a flying crossbody on Jonny Storm; like all wrestling moves, this requires coordination between both wrestlers in order to ensure each other's safety", attributionUrl: 'https://commons.wikimedia.org/wiki/File:Christopher_Daniels_1.jpg' },
];
