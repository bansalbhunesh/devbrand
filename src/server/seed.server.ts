import { db } from "./db";
import { users, outputs, roasts } from "./schema";

async function seed() {
  console.log("Seeding database...");

  // Create a dummy user for demo purposes
  const [user] = await db
    .insert(users)
    .values({
      githubId: "0",
      githubLogin: "devbrand-demo",
      name: "DevBrand Demo",
      seniority: "senior",
      tone: "technical",
    })
    .onConflictDoNothing()
    .returning();

  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  await db
    .insert(outputs)
    .values([
      {
        userId,
        slug: "async-retry-handling",
        prTitle: "async retry handling",
        prUrl: "https://github.com/org/payments-svc/pull/1428",
        prSignals: ["reliability", "async"],
        stack: ["TypeScript", "Node.js"],
        linkedinPost1:
          "Redesigned async retry handling to improve backend reliability under concurrent transaction loads.",
        linkedinPost2:
          "Improved system uptime by implementing robust retry strategies for payment processing.",
        linkedinPost3:
          "Detailed look into how we handled transaction spikes with a new retry pipeline.",
        resumeBullet:
          "Redesigned async retry handling in payments-svc, improving reliability for concurrent loads.",
        interviewHook:
          "Ask me about how I redesigned retry handling for a payment service under load.",
        category: "Reliability",
        impactScore: 85,
        complexityLevel: "Senior",
        isPublic: true,
      },
      {
        userId,
        slug: "stateless-jwt-pipeline",
        prTitle: "stateless JWT pipeline",
        prUrl: "https://github.com/org/edge-gateway/pull/812",
        prSignals: ["architecture", "auth"],
        stack: ["Go", "JWT"],
        linkedinPost1:
          "Migrated session handling from cookie-bound state to a stateless JWT pipeline, cutting auth latency p95 by 38%.",
        linkedinPost2:
          "Optimized gateway performance by moving to a stateless authentication model.",
        linkedinPost3:
          "Scaling auth to 1M+ sessions with a JWT-based stateless architecture.",
        resumeBullet:
          "Migrated edge-gateway to stateless JWT auth, reducing p95 latency by 38%.",
        interviewHook:
          "I can share the details of our migration from stateful to stateless session management.",
        category: "Architecture",
        impactScore: 92,
        complexityLevel: "Staff",
        isPublic: true,
      },
      {
        userId,
        slug: "n-plus-1-hotspot-resolution",
        prTitle: "N+1 hotspot resolution",
        prUrl: "https://github.com/org/orders-api/pull/377",
        prSignals: ["performance", "db"],
        stack: ["GraphQL", "Postgres"],
        linkedinPost1:
          "Rewrote N+1 hotspots in the orders service with batched loaders, removing 70% of query volume during peak.",
        linkedinPost2:
          "Scaled our orders API by optimizing database query patterns and implementing batching.",
        linkedinPost3:
          "How we saved our database from 70% of redundant query traffic during sales peak.",
        resumeBullet:
          "Resolved critical N+1 query hotspots, reducing database load by 70% during peak traffic.",
        interviewHook:
          "Let's talk about how I solved a massive scaling issue by fixing N+1 database queries.",
        category: "Performance",
        impactScore: 88,
        complexityLevel: "Senior",
        isPublic: true,
      },
    ])
    .onConflictDoNothing();

  // ── Seed 20 Curated Roasts for the Explore Feed ──────────────────────────
  console.log("Seeding curated roasts for Explore feed...");

  const curatedRoasts = [
    {
      username: "torvalds",
      card_title: "The Kernel Overlord",
      roast:
        "You wrote Linux and Git, effectively making every developer on Earth your unpaid intern. Your commit messages read like someone who hates documentation as a personality trait. You once rejected a PR with just 'No.' — and somehow that's a leadership style.",
      criticality: "NUCLEAR" as const,
      roast_score: 99,
      technician_score: 100,
      share_summary:
        "DevBrand just roasted @torvalds: 'The Kernel Overlord' — 99/100 humiliation. Your goto statements have goto statements.",
    },
    {
      username: "gaearon",
      card_title: "The Deprecation Artist",
      roast:
        "You've deprecated more APIs than most engineers have written functions. Every time a React developer finally learns your library, you announce it's being replaced. Your hooks have more side effects than a pharmaceutical trial. At least you're consistent — consistently making us rewrite everything.",
      criticality: "HIGH" as const,
      roast_score: 82,
      technician_score: 95,
      share_summary:
        "DevBrand just roasted @gaearon: 'The Deprecation Artist' — 82/100. Your hooks have more side effects than a pharma trial.",
    },
    {
      username: "tj",
      card_title: "The Framework Factory",
      roast:
        "You write frameworks faster than the npm registry can index them. I'm convinced you're actually three senior engineers in a trenchcoat. Express, Koa, and approximately 847 other packages — you treat open source like a speedrun.",
      criticality: "NUCLEAR" as const,
      roast_score: 94,
      technician_score: 98,
      share_summary:
        "DevBrand just roasted @tj: 'The Framework Factory' — 94/100. I'm convinced you're three senior engineers in a trenchcoat.",
    },
    {
      username: "sindresorhus",
      card_title: "The npm Hoarder",
      roast:
        "You have more npm packages than some companies have employees. Each one does exactly one thing, perfectly. You turned 'left-pad syndrome' into an art form — except your packages actually work. Your GitHub is less of a profile and more of a cataloging system.",
      criticality: "HIGH" as const,
      roast_score: 78,
      technician_score: 96,
      share_summary:
        "DevBrand just roasted @sindresorhus: 'The npm Hoarder' — 78/100. More npm packages than some companies have employees.",
    },
    {
      username: "antirez",
      card_title: "The Cache Whisperer",
      roast:
        "You built Redis — a database that people use to avoid using their actual database. Your code is so clean it makes other C codebases look like they were written during an earthquake. You made key-value stores cool, which shouldn't even be possible.",
      criticality: "HIGH" as const,
      roast_score: 75,
      technician_score: 99,
      share_summary:
        "DevBrand just roasted @antirez: 'The Cache Whisperer' — 75/100. You built a database people use to avoid their actual database.",
    },
    {
      username: "ThePrimeagen",
      card_title: "The Vim Evangelist",
      roast:
        "You've spent more time configuring Neovim than most developers spend writing actual code. Your entire personality is 'btw I use Vim' but somehow you've monetized it. You speed-type through algorithms like someone who's trying to prove keyboards have feelings.",
      criticality: "HIGH" as const,
      roast_score: 85,
      technician_score: 88,
      share_summary:
        "DevBrand just roasted @ThePrimeagen: 'The Vim Evangelist' — 85/100. More time configuring Neovim than writing actual code.",
    },
    {
      username: "yyx990803",
      card_title: "The Quiet Revolutionary",
      roast:
        "You created Vue.js essentially by being too polite to complain about React. Your framework is so well-documented it makes other maintainers look illiterate. You've single-handedly kept the 'framework wars' alive — and you're winning by not participating.",
      criticality: "MEDIUM" as const,
      roast_score: 68,
      technician_score: 97,
      share_summary:
        "DevBrand just roasted @yyx990803: 'The Quiet Revolutionary' — 68/100. Created Vue by being too polite to complain about React.",
    },
    {
      username: "getify",
      card_title: "The Scope Scholar",
      roast:
        "You wrote six books explaining JavaScript to people who already thought they knew JavaScript. Your 'You Don't Know JS' series is basically a six-volume insult to every developer's confidence. Nobody asked for this level of thoroughness, but here we are.",
      criticality: "MEDIUM" as const,
      roast_score: 72,
      technician_score: 90,
      share_summary:
        "DevBrand just roasted @getify: 'The Scope Scholar' — 72/100. Six books that are basically a multi-volume insult to your confidence.",
    },
    {
      username: "kentcdodds",
      card_title: "The Testing Preacher",
      roast:
        "You've built an empire on telling developers they're testing wrong. Your testing philosophy has more layers than an enterprise onion architecture. You made 'Testing Library' — which is ironic because most developers use it to test the bare minimum.",
      criticality: "HIGH" as const,
      roast_score: 80,
      technician_score: 92,
      share_summary:
        "DevBrand just roasted @kentcdodds: 'The Testing Preacher' — 80/100. Built an empire telling devs they're testing wrong.",
    },
    {
      username: "rauchg",
      card_title: "The Deploy Button",
      roast:
        "You turned 'git push' into a billion-dollar company. Vercel is essentially a deploy button with a marketing team. You've made deployment so easy that junior developers now think DevOps is just clicking 'Deploy'. Congratulations, you've automated away an entire job title.",
      criticality: "NUCLEAR" as const,
      roast_score: 91,
      technician_score: 94,
      share_summary:
        "DevBrand just roasted @rauchg: 'The Deploy Button' — 91/100. Turned 'git push' into a billion-dollar company.",
    },
    {
      username: "shadcn",
      card_title: "The Copy-Paste Architect",
      roast:
        "You created a component library where the entire installation process is copy-pasting code. You've elevated 'not a library' to an architectural philosophy. Somehow you made 'just copy the code' sound revolutionary instead of lazy.",
      criticality: "HIGH" as const,
      roast_score: 77,
      technician_score: 91,
      share_summary:
        "DevBrand just roasted @shadcn: 'The Copy-Paste Architect' — 77/100. Made 'just copy the code' sound revolutionary.",
    },
    {
      username: "t3dotgg",
      card_title: "The Full-Stack Influencer",
      roast:
        "You created the T3 stack and made 'type safety' a personality trait. Your YouTube videos are essentially therapy sessions for TypeScript developers. You've turned 'tRPC is cool' into a career. At least your stack actually works.",
      criticality: "HIGH" as const,
      roast_score: 79,
      technician_score: 89,
      share_summary:
        "DevBrand just roasted @t3dotgg: 'The Full-Stack Influencer' — 79/100. Made 'type safety' a personality trait.",
    },
    {
      username: "fireship-io",
      card_title: "The 100-Second Speedrunner",
      roast:
        "You explain entire technologies in 100 seconds, which is both impressive and concerning. Your videos move so fast that blinking means missing three frameworks. You've made every developer feel simultaneously informed and overwhelmed.",
      criticality: "MEDIUM" as const,
      roast_score: 70,
      technician_score: 87,
      share_summary:
        "DevBrand just roasted @fireship-io: 'The 100-Second Speedrunner' — 70/100. Blinking means missing three frameworks.",
    },
    {
      username: "wycats",
      card_title: "The Spec Whisperer",
      roast:
        "You've been on so many TC39 proposals that JavaScript basically owes you royalties. You co-created Ember, which was ahead of its time — and also behind it. Your contributions to web standards are inversely proportional to how many people know your name.",
      criticality: "MEDIUM" as const,
      roast_score: 73,
      technician_score: 95,
      share_summary:
        "DevBrand just roasted @wycats: 'The Spec Whisperer' — 73/100. JavaScript basically owes you royalties.",
    },
    {
      username: "dhh",
      card_title: "The Controversial Architect",
      roast:
        "You created Ruby on Rails and have been loudly defending it against literally everyone since 2004. Your hot takes generate more engagement than most people's entire careers. You're the only developer who treats framework preferences like a blood sport.",
      criticality: "NUCLEAR" as const,
      roast_score: 93,
      technician_score: 93,
      share_summary:
        "DevBrand just roasted @dhh: 'The Controversial Architect' — 93/100. Treats framework preferences like a blood sport.",
    },
    {
      username: "cassidoo",
      card_title: "The Code Comedian",
      roast:
        "You've turned newsletter writing and dad jokes into a tech career, which is honestly the most impressive engineering feat on this list. Your interview prep content has helped thousands of developers pretend they understand Big O notation.",
      criticality: "MEDIUM" as const,
      roast_score: 65,
      technician_score: 85,
      share_summary:
        "DevBrand just roasted @cassidoo: 'The Code Comedian' — 65/100. Turned dad jokes into a tech career.",
    },
    {
      username: "benawad",
      card_title: "The Livestream Legend",
      roast:
        "You built an entire career by livestreaming yourself being confused by TypeScript errors. Your 'I have no idea what I'm doing' energy is strangely relatable and terrifying. You made 'coding in public' feel less like transparency and more like an extreme sport.",
      criticality: "HIGH" as const,
      roast_score: 81,
      technician_score: 86,
      share_summary:
        "DevBrand just roasted @benawad: 'The Livestream Legend' — 81/100. Built a career livestreaming TypeScript confusion.",
    },
    {
      username: "thdxr",
      card_title: "The SST Sorcerer",
      roast:
        "You're building SST like AWS complexity personally offended you. Your infrastructure-as-code game is so strong that CloudFormation files have nightmares about you. You've made serverless almost approachable — emphasis on 'almost'.",
      criticality: "HIGH" as const,
      roast_score: 76,
      technician_score: 93,
      share_summary:
        "DevBrand just roasted @thdxr: 'The SST Sorcerer' — 76/100. CloudFormation files have nightmares about you.",
    },
    {
      username: "mpjme",
      card_title: "The Functional Philosopher",
      roast:
        "You made 'Fun Fun Function' and then stopped making videos, which is the most functional programming move possible — returning nothing. Your explanations of closures made people feel smart for exactly 15 minutes before they forgot everything.",
      criticality: "MEDIUM" as const,
      roast_score: 69,
      technician_score: 88,
      share_summary:
        "DevBrand just roasted @mpjme: 'The Functional Philosopher' — 69/100. Stopping your channel was the most functional move possible.",
    },
    {
      username: "miguel-grinberg",
      card_title: "The Flask Sage",
      roast:
        "You've written more Flask tutorials than most people have written Flask apps. Your blog posts are so thorough they make official documentation look like cliff notes. You singlehandedly kept Python web development alive while Django was busy being complicated.",
      criticality: "LOW" as const,
      roast_score: 60,
      technician_score: 91,
      share_summary:
        "DevBrand just roasted @miguel-grinberg: 'The Flask Sage' — 60/100. Your tutorials make official docs look like cliff notes.",
    },
  ];

  for (const r of curatedRoasts) {
    await db
      .insert(roasts)
      .values({
        githubUsername: r.username,
        roastData: {
          roast: r.roast,
          criticality: r.criticality,
          card_title: r.card_title,
          roast_score: r.roast_score,
          technician_score: r.technician_score,
          share_summary: r.share_summary,
        },
        isPublic: true,
      })
      .onConflictDoNothing();
  }

  console.log(`Seeded ${curatedRoasts.length} curated roasts.`);
  console.log("Seeding complete.");
}

seed().catch(console.error);
