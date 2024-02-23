import { z } from 'zod';

const MAX_REQUESTS = 20;
const PACKAGES_PER_REQUEST = 250;

const packageSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  links: z.object({
    npm: z.string(),
    homepage: z.string().optional(),
    repository: z.string().optional(),
  }),
});

const npmResponse = z.object({
  objects: z.array(z.object({ package: packageSchema })),
});

type Package = z.infer<typeof packageSchema>;

const url = (offset: number) =>
  `https://registry.npmjs.com/-/v1/search?size=250&popularity=1.0&quality=0.0&maintenance=0.0&text=boost-exact:false&from=${offset}`;

async function getPackages(offset: number): Promise<Package[]> {
  const response = await fetch(url(offset));
  const json = await response.json();

  const parsed = npmResponse.safeParse(json);

  if (!parsed.success) {
    return [];
  }

  return parsed.data.objects.map((object) => object.package);
}

async function run() {
  const allPackages: Package[] = [];

  for (let i = 0; i < MAX_REQUESTS; i++) {
    console.log(`Processing ${i} of ${MAX_REQUESTS} requests`);
    const offset = i * PACKAGES_PER_REQUEST;
    const packages = await getPackages(offset);
    allPackages.push(...packages);
  }

  console.log(`Fetched ${allPackages.length} packages`);
  console.log('Writing packages to json file');

  await Bun.write('top5kpackages.json', JSON.stringify(allPackages));
}

run();
