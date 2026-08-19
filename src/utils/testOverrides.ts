// Test-only overrides for a single hard-coded user id. When this user is logged
// in (or their profile is viewed), we ignore what the database says about card
// ownership and instead serve a fixed binder collection and a fixed, fixed-order
// game deck. Used to get a deterministic state for QA / screenshots / demos.


// user id for Maryyann
export const TEST_USER_ID = '656a4470-dad5-4541-8e6f-e11abe17651b';

export const isTestUser = (id?: string | null): boolean =>
  !!id && id === TEST_USER_ID;

// Fixed binder collection shown on the test user's profile, in display order.
// picked by damian
export const TEST_PROFILE_COLLECTION: string[] = [
  'Q6698946',
  'Q4616',
  'Q96590840',
  'Q33539',
  'Q1207347',
  'Q816198',
  'Q7053400',
  'Q1602782',
];

// Fixed game deck for the test user, in the exact order it should be played.
// Real cards have positive qids; fakes have negative ("Q-") qids.
//   Q25108667   Dad bod                                  (real)
//   Q-100555311 The Ash-Bond Covenant                    (fake)
//   Q133869040  Italian brainrot                         (real)
//   Q550412     Atari video game burial                  (real)
//   Q-100625353 Princess Valeriana of Prussia-Anhalt     (fake)
//   Q-100165831 The Épée Spire                           (fake)
//   Q1124833    Free-ranging dog                         (real)
//   Q-101392138 Marcus Hernandez                         (fake)
//   Q-100029517 Harmonizer APC                           (fake)
//   Q122452271  List of penguins                         (real)
export const TEST_GAME_DECK_ORDER: string[] = [
  'Q25108667',
  'Q-100555311',
  'Q133869040',
  'Q550412',
  'Q-100625353',
  'Q-100165831',
  'Q1124833',
  'Q-101392138',
  'Q-100029517',
  'Q122452271',
];
