import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { MALAYSIA_MANGROVES } from '../src/data/malaysiaMangroves.js';

const outputDirectory = join(process.cwd(), 'public', 'species');
const manifestPath = join(process.cwd(), 'src', 'data', 'speciesImages.json');
const reusableLicences = new Set(['cc0', 'pd', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa']);

const licenceLabels = {
  cc0: 'CC0',
  pd: 'Public domain',
  'cc-by': 'CC BY',
  'cc-by-sa': 'CC BY-SA',
  'cc-by-nc': 'CC BY-NC',
  'cc-by-nc-sa': 'CC BY-NC-SA',
};

// Current or alternate names confirmed against Kew Plants of the World Online.
// These are only used to locate a photograph; the MyBIS name stays on the card.
const imageSearchNames = {
  'Phyllanthus reclinatus': 'Breynia racemosa',
  'Phyllanthus littoralis': 'Glochidion littorale',
  'Millettia pinnata': 'Pongamia pinnata',
  'Scyphiphora hydrophyllacea': 'Scyphiphora hydrophylacea',
  'Talipariti tiliaceum': 'Hibiscus tiliaceus',
};

function exactTaxon(results, scientificName) {
  const normalise = (value) => value.toLowerCase().replace(/\s+/g, ' ').trim();
  const target = normalise(scientificName).replace(' × ', ' x ');
  return results.find((taxon) => normalise(taxon.name).replace(' × ', ' x ') === target);
}

function imageExtension(url, contentType) {
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  const extension = extname(new URL(url).pathname).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(extension) ? extension : '.jpg';
}

function plainText(value = '') {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleMatchesSpecies(title, scientificName) {
  const haystack = title.toLowerCase().replace(/[×_]/g, ' ');
  const words = scientificName.toLowerCase().replace('×', ' ').split(/\s+/).filter(Boolean);
  return words.slice(0, 2).every((word) => haystack.includes(word));
}

function isReusableCommonsLicence(licence = '') {
  const value = licence.toLowerCase();
  return value.startsWith('cc by') || value === 'cc0' || value.includes('public domain');
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchWithRetry(url, options, attempts = 4) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url, options);
    if (response.status !== 429 || attempt === attempts - 1) return response;
    await pause(1500 * (attempt + 1));
  }
  throw new Error('Request retry limit reached');
}

async function fetchTaxonImage(species) {
  const searchName = imageSearchNames[species.scientificName] || species.scientificName;
  const query = new URLSearchParams({
    q: searchName,
    rank: 'species,hybrid',
    per_page: '20',
  });
  const response = await fetch(`https://api.inaturalist.org/v1/taxa?${query}`, {
    headers: { 'User-Agent': 'BakauBase educational prototype (species photo manifest)' },
  });
  if (!response.ok) throw new Error(`iNaturalist taxon request failed (${response.status})`);

  const taxon = exactTaxon((await response.json()).results, searchName);
  const photo = taxon?.default_photo;
  const licence = photo?.license_code?.toLowerCase();
  if (!photo?.medium_url || !reusableLicences.has(licence)) return null;

  const imageResponse = await fetch(photo.medium_url, {
    headers: { 'User-Agent': 'BakauBase educational prototype (species photo manifest)' },
  });
  if (!imageResponse.ok) throw new Error(`Photo download failed (${imageResponse.status})`);

  const extension = imageExtension(photo.medium_url, imageResponse.headers.get('content-type') || '');
  const fileName = `${species.id}${extension}`;
  await writeFile(join(outputDirectory, fileName), Buffer.from(await imageResponse.arrayBuffer()));

  return {
    src: `/species/${fileName}`,
    sourceUrl: `https://www.inaturalist.org/photos/${photo.id}`,
    attribution: photo.attribution || `iNaturalist contributor · ${species.scientificName}`,
    licence: licenceLabels[licence],
  };
}

async function fetchCommonsImage(species) {
  await pause(700);
  const searchName = imageSearchNames[species.scientificName] || species.scientificName;
  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `"${searchName}" filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '640',
  });
  const response = await fetchWithRetry(`https://commons.wikimedia.org/w/api.php?${query}`, {
    headers: { 'User-Agent': 'BakauBase educational prototype (species photo manifest)' },
  });
  if (!response.ok) throw new Error(`Wikimedia request failed (${response.status})`);

  const pages = Object.values((await response.json()).query?.pages || {});
  const page = pages.find((candidate) => {
    const info = candidate.imageinfo?.[0];
    const licence = info?.extmetadata?.LicenseShortName?.value || '';
    return info?.thumburl && titleMatchesSpecies(candidate.title, searchName) && isReusableCommonsLicence(licence);
  });
  if (!page) return null;

  const info = page.imageinfo[0];
  const metadata = info.extmetadata || {};
  const imageResponse = await fetch(info.thumburl, {
    headers: { 'User-Agent': 'BakauBase educational prototype (species photo manifest)' },
  });
  if (!imageResponse.ok) throw new Error(`Wikimedia photo download failed (${imageResponse.status})`);

  const extension = imageExtension(info.thumburl, imageResponse.headers.get('content-type') || '');
  const fileName = `${species.id}${extension}`;
  await writeFile(join(outputDirectory, fileName), Buffer.from(await imageResponse.arrayBuffer()));

  return {
    src: `/species/${fileName}`,
    sourceUrl: info.descriptionurl,
    attribution: plainText(metadata.Artist?.value) || 'Wikimedia Commons contributor',
    licence: metadata.LicenseShortName?.value || 'See source',
  };
}

await mkdir(outputDirectory, { recursive: true });

let manifest = {};
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch {
  // The first run starts with an empty manifest.
}
const missing = [];

for (const species of MALAYSIA_MANGROVES) {
  if (manifest[species.id]) {
    console.log(`↷ ${species.scientificName} (already saved)`);
    continue;
  }
  try {
    const image = await fetchTaxonImage(species) || await fetchCommonsImage(species);
    if (image) {
      manifest[species.id] = image;
      console.log(`✓ ${species.scientificName}`);
    } else {
      missing.push(species.scientificName);
      console.log(`– ${species.scientificName} (no reusable exact-match photo)`);
    }
  } catch (error) {
    missing.push(species.scientificName);
    console.warn(`! ${species.scientificName}: ${error.message}`);
  }
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`\nSaved ${Object.keys(manifest).length}/${MALAYSIA_MANGROVES.length} photos.`);
if (missing.length) console.log(`Missing: ${missing.join(', ')}`);
