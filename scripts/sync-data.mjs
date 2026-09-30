// Refresh the bundled fallback copies in public/data from upstream.
// The site fetches upstream live, so this only matters if GitHub is unreachable.
import { mkdir, writeFile } from 'node:fs/promises';

const GUIDE = 'https://raw.githubusercontent.com/umkyzn/BRUHsailer/main/data';
const LADLOR = 'https://raw.githubusercontent.com/Madssb/InteractiveGearProg/main/data';

const files = [
  [`${GUIDE}/guide_data.json`, 'public/data/guide_data.json'],
  [`${LADLOR}/logic/milestone-sequence-main.json`, 'public/data/ladlor/milestone-sequence-main.json'],
  [`${LADLOR}/logic/milestone-sequence-retirement.json`, 'public/data/ladlor/milestone-sequence-retirement.json'],
  [`${LADLOR}/generated/milestone-metadata.json`, 'public/data/ladlor/milestone-metadata.json'],
];

await mkdir('public/data/ladlor', { recursive: true });
for (const [url, dest] of files) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await writeFile(dest, await res.text());
  console.log(`${dest} <- ${url}`);
}
