/**
 * CLABE (Clave Bancaria Estandarizada) validation, per Banxico:
 * 18 digits = bank (3) + branch/plaza (3) + account (11) + check digit (1).
 * Check digit: multiply the first 17 digits by 3, 7, 1, 3, 7, 1…, keep each
 * product mod 10, add them up; check = (10 − sum mod 10) mod 10.
 */

/** Bank code (first 3 digits) → short commercial name. Banxico SPEI participants. */
export const CLABE_BANKS: Readonly<Record<string, string>> = {
  "002": "Banamex",
  "006": "Bancomext",
  "009": "Banobras",
  "012": "BBVA México",
  "014": "Santander",
  "019": "Banjército",
  "021": "HSBC",
  "030": "Banco del Bajío",
  "036": "Inbursa",
  "042": "Mifel",
  "044": "Scotiabank",
  "058": "Banregio",
  "059": "Invex",
  "060": "Bansi",
  "062": "Afirme",
  "072": "Banorte",
  "106": "Bank of America",
  "108": "MUFG",
  "110": "J.P. Morgan",
  "112": "Banco Monex",
  "113": "Ve por Más",
  "127": "Banco Azteca",
  "128": "Autofin",
  "129": "Barclays",
  "130": "Compartamos",
  "132": "Multiva",
  "133": "Actinver",
  "135": "Nafin",
  "136": "Intercam Banco",
  "137": "BanCoppel",
  "138": "Ualá",
  "140": "Consubanco",
  "141": "Volkswagen Bank",
  "143": "CIBanco",
  "145": "Banco Base",
  "147": "Bankaool",
  "148": "PagaTodo",
  "150": "Inmobiliario Mexicano",
  "151": "Donde",
  "152": "Bancrea",
  "154": "Banco Covalto",
  "155": "ICBC",
  "156": "Sabadell",
  "157": "Shinhan",
  "158": "Mizuho",
  "159": "Bank of China",
  "160": "Banco S3",
  "166": "Banco del Bienestar",
  "168": "Hipotecaria Federal",
  "600": "Monex Casa de Bolsa",
  "601": "GBM",
  "602": "Masari",
  "605": "Value",
  "608": "Vector",
  "610": "B&B",
  "616": "Finamex",
  "617": "Valmex",
  "620": "Profuturo",
  "630": "Intercam Casa de Bolsa",
  "631": "CI Bolsa",
  "634": "Fincomún",
  "638": "Nu México",
  "642": "Reforma",
  "646": "STP",
  "652": "Credicapital",
  "653": "Kuspit",
  "656": "Unagra",
  "659": "Opciones Empresariales del Noreste",
  "661": "Klar",
  "670": "Libertad",
  "677": "Caja Popular Mexicana",
  "680": "Cristóbal Colón",
  "683": "Caja Telefonistas",
  "684": "Transfer",
  "685": "Fondo FIRA",
  "686": "Invercap",
  "689": "Fomped",
  "699": "Fondeadora",
  "703": "Tesored",
  "706": "Arcus",
  "710": "NVIO",
  "722": "Mercado Pago",
  "723": "Cuenca",
  "728": "Spin by OXXO",
  "902": "Indeval",
};

const WEIGHTS = [3, 7, 1] as const;

/** Check digit for the first 17 digits. */
export function clabeCheckDigit(first17: string): number {
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += (Number(first17[i]) * WEIGHTS[i % 3]) % 10;
  return (10 - (sum % 10)) % 10;
}

export type ClabeResult =
  | { ok: true; clabe: string; bankCode: string; bankName: string }
  | { ok: false; error: string };

/** Accepts spaces or dashes, as people often paste them grouped. */
export function normalizeClabe(input: string): string {
  return input.replace(/[\s-]/g, "");
}

export function validateClabe(input: string): ClabeResult {
  const clabe = normalizeClabe(input);
  if (!/^\d+$/.test(clabe)) return { ok: false, error: "La CLABE solo lleva números." };
  if (clabe.length !== 18) {
    return { ok: false, error: `La CLABE tiene 18 dígitos y escribiste ${clabe.length}.` };
  }
  const bankCode = clabe.slice(0, 3);
  const bankName = CLABE_BANKS[bankCode];
  if (!bankName) {
    return { ok: false, error: `No reconocemos la clave de banco ${bankCode}. Revisa los primeros 3 dígitos.` };
  }
  if (clabeCheckDigit(clabe) !== Number(clabe[17])) {
    return { ok: false, error: "El último dígito no coincide. Revisa que la CLABE esté bien escrita." };
  }
  return { ok: true, clabe, bankCode, bankName };
}

/** "•••• 7899" for display. */
export function maskClabe(clabe: string): string {
  return `•••• ${clabe.slice(-4)}`;
}
