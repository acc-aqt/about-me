export type Link = {
  label: string;
  url: string;
};

export type Photo = {
  src: string;
  alt: string;
  /** Shown beneath the photo, e.g. where it was taken and on which film. */
  caption?: string;
};

/** A tile on the Overworld; game-only data that the Plain view ignores. */
export type Placement = {
  /** Overworld tile column, counted from the west edge of the map. */
  col: number;
  /** Overworld tile row, counted from the north edge of the map. */
  row: number;
};

export type PointOfInterest = {
  id: string;
  title: string;
  subtitle?: string;
  dates?: string;
  body: string;
  photos?: Photo[];
  links?: Link[];
  placement: Placement;
};

export type ZoneId =
  | "start"
  | "career-road"
  | "maker-workshop"
  | "photography-trail"
  | "sport"
  | "music-and-games"
  | "contact";

export type Zone = {
  id: ZoneId;
  title: string;
  /** Id of the Point of Interest Fast-travel lands in front of; otherwise where the Zone's path leaves the Hub. */
  fastTravelTo?: string;
  pointsOfInterest: PointOfInterest[];
  /** Where this Zone's hidden Film roll lies; every Zone should carry one. */
  filmRoll?: Placement;
};

/** Shown in the Viewfinder once every Film roll on the Overworld is collected. */
export type FilmRollBonus = {
  title: string;
  body: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  description: string;
};

export type Content = {
  zones: Zone[];
  inventory: InventoryItem[];
  filmRollBonus: FilmRollBonus;
};

export const content: Content = {
  filmRollBonus: {
    title: "All Film rolls collected",
    body:
      "You found every Film roll – thanks for exploring! Film is close to my heart: the Analog gallery in the darkroom on the Photography trail holds my 35mm and medium-format photos.",
  },
  zones: [
    {
      id: "start",
      title: "Start – Munich",
      filmRoll: { col: 36, row: 27 },
      pointsOfInterest: [
        {
          id: "intro",
          title: "Hi, I'm Alexander",
          subtitle: "Software developer, mechanical engineer, photographer",
          body:
            "I'm a software developer for computer-aided engineering methods at MTU Aero Engines in Munich, and a mechanical engineer from TUM. I'm also a travel and landscape photographer. I like building tools, and I swim, play tennis and go ski touring.",
          placement: { col: 26, row: 21 },
        },
      ],
    },
    {
      id: "career-road",
      title: "Career road",
      fastTravelTo: "mtu",
      filmRoll: { col: 53, row: 28 },
      pointsOfInterest: [
        {
          id: "tum",
          title: "Technical University of Munich",
          subtitle: "BSc Vehicle & Engine Technology, MSc Mechanical Engineering",
          dates: "2010–2017",
          body:
            "I studied vehicle and engine technology (BSc, 2010–2014) and mechanical engineering (MSc, 2014–2017, grade 1.3).",
          links: [{ label: "Technical University of Munich", url: "https://www.tum.de/" }],
          placement: { col: 40, row: 22 },
        },
        {
          id: "bmw-group",
          title: "BMW Group",
          subtitle: "Chassis engineering intern; CFRP research project",
          dates: "2013 & 2016",
          body:
            "I interned in chassis engineering and worked on a research project on CFRP (carbon-fibre-reinforced plastic) technology.",
          links: [{ label: "BMW Group", url: "https://www.bmwgroup.com/" }],
          placement: { col: 43, row: 24 },
        },
        {
          id: "canberra-detour",
          title: "Canberra detour",
          subtitle: "Research at the Australian National University",
          dates: "2014–2015",
          body: "I took a detour to Canberra to do research at the Australian National University.",
          links: [{ label: "Australian National University", url: "https://www.anu.edu.au/" }],
          placement: { col: 46, row: 22 },
        },
        {
          id: "forward-engineering",
          title: "Forward Engineering",
          subtitle: "Development engineer, composites",
          dates: "2017–2018",
          body: "I developed structural simulation methods for composite parts in LS-DYNA.",
          links: [{ label: "Forward Engineering", url: "https://www.forward-engineering.com/" }],
          placement: { col: 49, row: 24 },
        },
        {
          id: "arrk-engineering",
          title: "ARRK Engineering",
          subtitle: "Software developer",
          dates: "2018–2020",
          body: "I built tooling that automates simulation pre- and post-processing.",
          links: [{ label: "ARRK Engineering", url: "https://engineering.arrk.com/" }],
          placement: { col: 52, row: 22 },
        },
        {
          id: "mtu",
          title: "MTU Aero Engines",
          subtitle: "Software developer for computer-aided engineering methods",
          dates: "2020–now",
          body:
            "I build a platform that coordinates engineering design processes and workflows and stores the engineering data behind them.",
          links: [{ label: "MTU Aero Engines", url: "https://www.mtu.de/" }],
          placement: { col: 55, row: 22 },
        },
      ],
    },
    {
      id: "maker-workshop",
      title: "Maker workshop",
      filmRoll: { col: 9, row: 27 },
      pointsOfInterest: [
        {
          id: "framewise",
          title: "framewise",
          subtitle: "Local photo culling",
          body:
            "Cull a photo shoot on your own machine: framewise groups bursts and near-duplicates, proposes which frames to keep and why, and writes the decisions back as ratings for Lightroom Classic. Everything runs locally; no photo leaves the machine. Built with AI coding agents; design, calibration and review by me.",
          links: [
            { label: "framewise on GitHub", url: "https://github.com/acc-aqt/framewise" },
            { label: "framewise-cull on PyPI", url: "https://pypi.org/project/framewise-cull/" },
          ],
          placement: { col: 19, row: 22 },
        },
        {
          id: "lens-caps",
          title: "3D-printed lens caps",
          body: "A tool that builds 3D-printable CAD models for slip-over camera lens caps.",
          links: [{ label: "lens-cap-model on GitHub", url: "https://github.com/acc-aqt/lens-cap-model" }],
          placement: { col: 15, row: 24 },
        },
        {
          id: "reelmaker",
          title: "ReelMaker",
          body:
            "A tool that builds reels from a set of images and videos and an audio file. It detects the rhythm of the song, so the visuals change on the beat.",
          placement: { col: 11, row: 22 },
        },
        {
          id: "preset-fitting",
          title: "Lightroom preset fitting",
          body: "Fits Lightroom presets so that Fuji and Leica raws match a target JPG look.",
          placement: { col: 7, row: 24 },
        },
      ],
    },
    {
      id: "photography-trail",
      title: "Photography trail",
      filmRoll: { col: 56, row: 9 },
      pointsOfInterest: [
        {
          id: "jordan",
          title: "Jordan",
          dates: "2022",
          body: "A trip through Jordan: tea brewed over embers, bakeries and fruit stalls in the markets, and sunsets over the desert.",
          photos: [
            {
              src: "jordan/DSC7979-Bearbeitet-5_med_q80.jpg",
              alt: "An older man in a patterned headscarf sits cross-legged in a rock shelter, smiling and raising a small glass of tea, a kettle on the embers beside him.",
            },
            {
              src: "jordan/DSC3489-2_med_q80.jpg",
              alt: "A smiling young baker in glasses leans out of a shop window next to a tall stack of flatbreads.",
            },
            {
              src: "jordan/DSC7281-Bearbeitet-2_finale_korrekturen_med_q80.jpg",
              alt: "A woman in a headscarf works a hand press to squeeze pomegranate juice at a market stall piled with oranges and pomegranates.",
            },
            {
              src: "jordan/DSC8760-Bearbeitet_med_q80.jpg",
              alt: "Two men in headscarves lean under the raised bonnet of a car to work on its engine, out on the pale desert sand.",
            },
            {
              src: "jordan/DSC9068-Bearbeitet_med_q80.jpg",
              alt: "The sun setting behind rock formations on the horizon of a wide, empty desert plain.",
            },
          ],
          links: [{ label: "Full gallery on carrels.photography", url: "https://www.carrels.photography/jordan/" }],
          placement: { col: 22, row: 15 },
        },
        {
          id: "norway",
          title: "Norway ski touring",
          dates: "2023/2024",
          body: "Ski touring in Northern Norway over the winters of 2023 and 2024: skinning up from the fjords, boat rides along the coast and long runs down towards the sea.",
          photos: [
            {
              src: "norway-skitouring/DSC5936-Pano-Bearbeitet-2_med_q80.jpg",
              alt: "Panorama from a snowy summit ridge over a dark fjord ringed by snow-covered mountains, a jagged rock spire glowing orange in the low sun.",
            },
            {
              src: "norway-skitouring/DSC2483-Bearbeitet_med_q80.jpg",
              alt: "A ski tourer in an orange jacket skinning across a wide snowfield towards a row of rocky white peaks under a blue sky.",
            },
            {
              src: "norway-skitouring/DSC5446-Bearbeitet_med_q80.jpg",
              alt: "View down a snowy slope onto a calm fjord, with low clouds drifting around snow-dusted islands and peaks in soft evening light.",
            },
            {
              src: "norway-skitouring/DSC2320_med_q80.jpg",
              alt: "Ski tourers with backpacks climbing a ladder from a rocky shore onto a small boat, snowy mountains across the fjord behind them.",
            },
            {
              src: "norway-skitouring/DSC0627_med_q80.jpg",
              alt: "Red fishing boats moored in a snowy harbour, seen past a snow-covered railing and a red boathouse with a life ring.",
            },
            {
              src: "norway-skitouring/DSC2511-Bearbeitet-2_med_q80.jpg",
              alt: "Wide glacier panorama with a lone skier leaving a track towards distant snowy peaks.",
            },
          ],
          links: [{ label: "Full gallery on carrels.photography", url: "https://www.carrels.photography/norway-skitouring/" }],
          placement: { col: 11, row: 15 },
        },
        {
          id: "new-york",
          title: "New York",
          dates: "2024",
          body: "New York City: the bridges and skyline of Lower Manhattan, Lady Liberty at sunset, Times Square at night and live jazz.",
          photos: [
            {
              src: "newyork/DSC7494-Bearbeitet_med_q80.jpg",
              alt: "The Brooklyn Bridge and the Lower Manhattan skyline across the East River, seen from a rocky shore under a blue sky.",
            },
            {
              src: "newyork/DSC7444-Bearbeitet-2_med_q80.jpg",
              alt: "The Manhattan Bridge framed between red-brick warehouses at the end of a cobbled street lined with parked cars.",
            },
            {
              src: "newyork/DSC8625-Pano-Bearbeitet_med_q80.jpg",
              alt: "One World Trade Center towering over glass skyscrapers above the dark, square pool of the 9/11 Memorial.",
            },
            {
              src: "newyork/DSC8263-Bearbeitet_med_q80.jpg",
              alt: "The Statue of Liberty in silhouette against an orange sky as the sun sets beside it.",
            },
            {
              src: "newyork/DSC6696-HDR-Bearbeitet_med_q80.jpg",
              alt: "Times Square at night, glowing billboards on every side and a yellow taxi crossing the busy street.",
            },
            {
              src: "newyork/DSC8469-Bearbeitet-2_med_q80.jpg",
              alt: "A jazz band playing in a brick-walled bar: a singer, a saxophonist, a pianist and a tuba player behind him.",
            },
          ],
          links: [{ label: "Full gallery on carrels.photography", url: "https://www.carrels.photography/newyork/" }],
          placement: { col: 20, row: 11 },
        },
        {
          id: "nepal",
          title: "Nepal",
          dates: "2024",
          body: "Nepal: Himalayan peaks at dawn, stupas and prayer flags, temple squares and boat rides on the lakes.",
          photos: [
            {
              src: "nepal/DSC0151x-Bearbeitet_med_q80.jpg",
              alt: "Snow-capped Himalayan peaks glowing pink at dawn above hazy hills, a lake and a sprawling city in the valley.",
            },
            {
              src: "nepal/DSC0241_med_q80.jpg",
              alt: "A white stupa with a golden spire lit by the sun at the end of a narrow, shaded street with a walking silhouette.",
            },
            {
              src: "nepal/DSC9996x_med_q80.jpg",
              alt: "A boatman in a sun hat and blue jacket smiles as he paddles a light blue wooden boat across a lake.",
            },
            {
              src: "nepal/DSC0065-3_med_q80.jpg",
              alt: "A golden Buddhist statue on a lotus throne raising a sword against a blue sky, with monkeys sitting at its feet.",
            },
            {
              src: "nepal/DSC0251_med_q80.jpg",
              alt: "Small children laughing and running through a flock of pigeons on a stone temple square.",
            },
            {
              src: "nepal/DSC0333-HDR-Bearbeitet_med_q80.jpg",
              alt: "Tiered pagoda temples with red-trimmed roofs beyond a stone walkway under a soft evening sky.",
            },
          ],
          links: [{ label: "Full gallery on carrels.photography", url: "https://www.carrels.photography/nepal/" }],
          placement: { col: 40, row: 11 },
        },
        {
          id: "lisbon",
          title: "Lisbon",
          dates: "2025",
          body: "Lisbon: yellow trams and funiculars climbing the steep, tiled streets, and an evening sail on the Tagus.",
          photos: [
            {
              src: "lisbon/DSC2848-2_med_q80.jpg",
              alt: "A yellow tram rounding a curve in a narrow street between pale, sunlit apartment buildings.",
            },
            {
              src: "lisbon/DSC2717_med_q80.jpg",
              alt: "Two vintage yellow trams waiting behind a dark grey car in front of a pink building.",
            },
            {
              src: "lisbon/DSC3258-Bearbeitet_med_q80.jpg",
              alt: "A yellow funicular car at the foot of a steep track, beside a tiled facade above a restaurant entrance.",
            },
            {
              src: "lisbon/DSC3296-Bearbeitet_med_q80.jpg",
              alt: "A smiling woman in sunglasses and a checked blazer rides in a wood-panelled funicular with tiled walls outside.",
            },
            {
              src: "lisbon/DSC2253-Bearbeitet_med_q80.jpg",
              alt: "A woman lounges on the deck of a sailing boat on the river, a red suspension bridge in the background.",
            },
          ],
          links: [{ label: "Full gallery on carrels.photography", url: "https://www.carrels.photography/lisbon/" }],
          placement: { col: 45, row: 7 },
        },
        {
          id: "eastern-adriatic",
          title: "Eastern Adriatic",
          dates: "2025",
          body: "A summer along the eastern Adriatic coast: Venetian-style old towns, cobbled alleys and evening light over the sea.",
          photos: [
            {
              src: "eastern_adriatic/L1002346_med_q80.jpg",
              alt: "A wide town square paved in pale stone, lined with pastel houses below a tall bell tower in late sun.",
            },
            {
              src: "eastern_adriatic/L1002333_med_q80.jpg",
              alt: "A seaside restaurant with blue dolphin statues on its steps, swimmers in the sea behind it and a woman walking past.",
            },
            {
              src: "eastern_adriatic/L1002193_med_q80.jpg",
              alt: "Two scooters parked on a cobbled lane below weathered houses with green shutters and climbing plants.",
            },
            {
              src: "eastern_adriatic/L1002219_med_q80.jpg",
              alt: "A black-and-white cat sitting on an old stone wall in front of a green garden.",
            },
            {
              src: "eastern_adriatic/L1002260_med_q80.jpg",
              alt: "Stone steps leading up a narrow alley of old houses and wisteria towards a church bell tower.",
            },
            {
              src: "eastern_adriatic/L1002270-Bearbeitet_med_q80.jpg",
              alt: "A lone umbrella pine in silhouette against the low sun shimmering on the sea.",
            },
          ],
          links: [{ label: "Full gallery on carrels.photography", url: "https://www.carrels.photography/eastern_adriatic/" }],
          placement: { col: 28, row: 7 },
        },
        {
          id: "peru",
          title: "Peru",
          dates: "2025",
          body: "Peru: from the cliffs and streets of Lima to a volcano towering over a city, weavers and the train towards Machu Picchu.",
          photos: [
            {
              src: "peru/L1012145-Bearbeitet-4_med_q80.jpg",
              alt: "A weaver in a red embroidered jacket and an orange-and-black hat works at a loom strung with colourful threads.",
            },
            {
              src: "peru/L1020812-Bearbeitet-2-2_med_q80.jpg",
              alt: "An older woman in a checked coat holding a purple scarf beside a striped ice-cream cart, a large mural behind her.",
            },
            {
              src: "peru/L1011210-2_med_q80.jpg",
              alt: "A coastal highway winding along the foot of green cliffs, high-rise buildings above the hazy Pacific shore.",
            },
            {
              src: "peru/L1011355_med_q80.jpg",
              alt: "A pier reaching out into rolling Pacific waves, seen from a green clifftop with a single tree.",
            },
            {
              src: "peru/L1012304-Bearbeitet_med_q80.jpg",
              alt: "A cone-shaped volcano rising over a city in the evening light, seen from above a plaza with stone columns.",
            },
            {
              src: "peru/L1020579-Bearbeitet-4_med_q80.jpg",
              alt: "Passengers in a train carriage with skylight windows while a performer in a colourful costume and feathered headdress walks the aisle.",
            },
          ],
          links: [{ label: "Full gallery on carrels.photography", url: "https://www.carrels.photography/peru/" }],
          placement: { col: 12, row: 7 },
        },
        {
          id: "darkroom",
          title: "Darkroom",
          subtitle: "Analog gallery",
          body: "The end of the trail is the darkroom: selected frames on film, shot in 35mm and medium format.",
          photos: [
            {
              src: "analog/DSCF0805-4_med_q80.jpg",
              alt: "People on a sunny wooden waterfront under a dark overhang, looking across a harbour to brick warehouses and a spire.",
              caption: "Copenhagen, 2026 – Film: Kodak Portra 160 (35mm)",
            },
            {
              src: "analog/DSCF0856_med_q80.jpg",
              alt: "A man climbing out of a deep concrete stairwell towards a red metro sign in hard sunlight and shadow.",
              caption: "Copenhagen, 2026 – Film: Kodak Portra 160 (35mm)",
            },
            {
              src: "analog/DSCF0691-2_med_q80.jpg",
              alt: "A man with long hair flips through crates of records in a shop hung with colourful pop-art portraits and lamps.",
              caption: "Copenhagen, 2026 – Film: Kodak Portra 400 (35mm)",
            },
            {
              src: "analog/DSCF0391-2_med_q80.jpg",
              alt: "Black-and-white photo through a shop window of a cook in a paper hat pulling noodles, the photographer reflected in the glass.",
              caption: "Munich, 2026 – Film: Ilford FP4+ (35mm)",
            },
            {
              src: "analog/L1043343_med_q80.jpg",
              alt: "A snowboarder in a tan jacket and goggles standing on a snowy, windswept slope beside a T-bar lift.",
              caption: "Hintertux, 2026 – Film: Kodak Gold 200 (35mm)",
            },
            {
              src: "analog/L1022783_med_q80.jpg",
              alt: "Black-and-white square frame looking up through large veined leaves at the steel and glass roof of a greenhouse.",
              caption: "Munich Botanical Garden, 2026 – Film: Ilford HP5+ (120 medium format)",
            },
          ],
          links: [{ label: "Full gallery on carrels.photography", url: "https://www.carrels.photography/analog/" }],
          placement: { col: 22, row: 3 },
        },
      ],
    },
    {
      id: "sport",
      title: "Sport",
      filmRoll: { col: 7, row: 43 },
      pointsOfInterest: [
        {
          id: "swimming-pool",
          title: "Swimming pool",
          body: "Swimming is one of the sports I do for fun.",
          placement: { col: 27, row: 36 },
        },
        {
          id: "tennis-court",
          title: "Tennis court",
          body: "I also play tennis.",
          placement: { col: 20, row: 34 },
        },
        {
          id: "ski-touring-slope",
          title: "Ski-touring slope",
          body: "In winter I go ski touring, and my camera comes along.",
          links: [
            { label: "Norway ski touring gallery", url: "https://www.carrels.photography/norway-skitouring/" },
          ],
          placement: { col: 10, row: 36 },
        },
      ],
    },
    {
      id: "music-and-games",
      title: "Music & games",
      fastTravelTo: "track-back",
      filmRoll: { col: 49, row: 40 },
      pointsOfInterest: [
        {
          id: "track-back",
          title: "track-back",
          subtitle: "Jukebox",
          body:
            "A music party game: players sort the songs currently playing by their year of release. It plays your own Spotify or Apple Music playlists and runs on a Python server with a web UI.",
          links: [
            { label: "Play the track-back web demo", url: "https://acc-aqt.github.io/track-back/web_ui/index.html" },
            { label: "track-back on GitHub", url: "https://github.com/acc-aqt/track-back" },
          ],
          placement: { col: 36, row: 34 },
        },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      fastTravelTo: "contact-board",
      filmRoll: { col: 25, row: 28 },
      pointsOfInterest: [
        {
          id: "contact-board",
          title: "Say hello",
          body: "Thanks for exploring. Find me here:",
          links: [
            { label: "LinkedIn", url: "https://de.linkedin.com/in/alexander-carrels-8b98b0182" },
            { label: "GitHub", url: "https://github.com/acc-aqt" },
            { label: "Instagram", url: "https://www.instagram.com/carrels.photography/" },
            { label: "carrels.photography", url: "https://www.carrels.photography/" },
          ],
          placement: { col: 27, row: 27 },
        },
      ],
    },
  ],
  inventory: [
    { id: "python", name: "Python", description: "My everyday language: framewise and the track-back server are written in it." },
    { id: "java", name: "Java", description: "Programming language." },
    { id: "matlab", name: "MATLAB", description: "Numerical computing and engineering scripts." },
    { id: "ls-dyna", name: "LS-DYNA", description: "Structural simulation methods for composites." },
    { id: "abaqus", name: "Abaqus", description: "FEM simulation." },
    { id: "cae-automation", name: "CAE automation", description: "Automated simulation pre- and post-processing tooling." },
    { id: "catia-v5", name: "CATIA V5", description: "CAD modelling." },
    { id: "git", name: "Git", description: "Version control." },
    { id: "scrum", name: "Scrum", description: "Agile teamwork." },
    { id: "ai-coding-agents", name: "AI coding agents", description: "Building tools with agents, with design and review by me." },
    { id: "lightroom-classic", name: "Lightroom Classic", description: "Photo editing and presets." },
    { id: "cameras", name: "Fujifilm & Leica cameras", description: "My cameras for travel and landscape photography." },
    { id: "3d-printing", name: "3D printing", description: "Printing parts such as my slip-over lens caps." },
  ],
};

export function zoneById(id: ZoneId): Zone {
  const zone = content.zones.find((candidate) => candidate.id === id);
  if (!zone) throw new Error(`No Zone with id ${id}`);
  return zone;
}
