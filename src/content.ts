export type Link = {
  label: string;
  url: string;
};

export type Photo = {
  src: string;
  alt: string;
};

export type Placement = {
  /** Horizontal offset in world pixels from the left edge of the Zone. */
  x: number;
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

export type Zone = {
  id: string;
  title: string;
  /** Length of the Zone along the Route, in world pixels. */
  width: number;
  /** Id of the Point of Interest Fast-travel lands at; otherwise the Zone's left edge. */
  fastTravelTo?: string;
  pointsOfInterest: PointOfInterest[];
};

export type Content = {
  zones: Zone[];
};

export const content: Content = {
  zones: [
    {
      id: "start",
      title: "Start – Munich",
      width: 320,
      pointsOfInterest: [],
    },
    {
      id: "career-road",
      title: "Career road",
      width: 1040,
      fastTravelTo: "mtu",
      pointsOfInterest: [
        {
          id: "tum",
          title: "Technical University of Munich",
          subtitle: "BSc Vehicle & Engine Technology, MSc Mechanical Engineering",
          dates: "2010–2017",
          body:
            "I studied vehicle and engine technology (BSc, 2010–2014) and mechanical engineering (MSc, 2014–2017, grade 1.3).",
          links: [{ label: "Technical University of Munich", url: "https://www.tum.de/" }],
          placement: { x: 80 },
        },
        {
          id: "bmw-group",
          title: "BMW Group",
          subtitle: "Chassis engineering intern; CFRP research project",
          dates: "2013 & 2016",
          body:
            "I interned in chassis engineering and worked on a research project on CFRP (carbon-fibre-reinforced plastic) technology.",
          links: [{ label: "BMW Group", url: "https://www.bmwgroup.com/" }],
          placement: { x: 240 },
        },
        {
          id: "canberra-detour",
          title: "Canberra detour",
          subtitle: "Research at the Australian National University",
          dates: "2014–2015",
          body: "I took a detour to Canberra to do research at the Australian National University.",
          links: [{ label: "Australian National University", url: "https://www.anu.edu.au/" }],
          placement: { x: 400 },
        },
        {
          id: "forward-engineering",
          title: "Forward Engineering",
          subtitle: "Development engineer, composites",
          dates: "2017–2018",
          body: "I developed structural simulation methods for composite parts in LS-DYNA.",
          links: [{ label: "Forward Engineering", url: "https://www.forward-engineering.com/" }],
          placement: { x: 560 },
        },
        {
          id: "arrk-engineering",
          title: "ARRK Engineering",
          subtitle: "Software developer",
          dates: "2018–2020",
          body: "I built tooling that automates simulation pre- and post-processing.",
          links: [{ label: "ARRK Engineering", url: "https://engineering.arrk.com/" }],
          placement: { x: 720 },
        },
        {
          id: "mtu",
          title: "MTU Aero Engines",
          subtitle: "Software developer for computer-aided engineering methods",
          dates: "2020–now",
          body:
            "I build a platform that coordinates engineering design processes and workflows and stores the engineering data behind them.",
          links: [{ label: "MTU Aero Engines", url: "https://www.mtu.de/" }],
          placement: { x: 900 },
        },
      ],
    },
    {
      id: "maker-workshop",
      title: "Maker workshop",
      width: 640,
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
          placement: { x: 80 },
        },
        {
          id: "lens-caps",
          title: "3D-printed lens caps",
          body: "A tool that builds 3D-printable CAD models for slip-over camera lens caps.",
          links: [{ label: "lens-cap-model on GitHub", url: "https://github.com/acc-aqt/lens-cap-model" }],
          placement: { x: 240 },
        },
        {
          id: "reelmaker",
          title: "ReelMaker",
          body:
            "A tool that builds reels from a set of images and videos and an audio file. It detects the rhythm of the song, so the visuals change on the beat.",
          placement: { x: 400 },
        },
        {
          id: "preset-fitting",
          title: "Lightroom preset fitting",
          body: "Fits Lightroom presets so that Fuji and Leica raws match a target JPG look.",
          placement: { x: 560 },
        },
      ],
    },
    {
      id: "photography-trail",
      title: "Photography trail",
      width: 320,
      pointsOfInterest: [
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
          placement: { x: 160 },
        },
      ],
    },
    {
      id: "sport",
      title: "Sport",
      width: 480,
      pointsOfInterest: [
        {
          id: "swimming-pool",
          title: "Swimming pool",
          body: "Swimming is one of the sports I do for fun.",
          placement: { x: 80 },
        },
        {
          id: "tennis-court",
          title: "Tennis court",
          body: "I also play tennis.",
          placement: { x: 240 },
        },
        {
          id: "ski-touring-slope",
          title: "Ski-touring slope",
          body: "In winter I go ski touring, and my camera comes along.",
          links: [
            { label: "Norway ski touring gallery", url: "https://www.carrels.photography/norway-skitouring/" },
          ],
          placement: { x: 400 },
        },
      ],
    },
    {
      id: "music-and-games",
      title: "Music & games",
      width: 320,
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
          placement: { x: 160 },
        },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      width: 320,
      fastTravelTo: "contact-board",
      pointsOfInterest: [
        {
          id: "contact-board",
          title: "Say hello",
          body: "Thanks for walking the Route. Find me here:",
          links: [
            { label: "LinkedIn", url: "https://de.linkedin.com/in/alexander-carrels-8b98b0182" },
            { label: "GitHub", url: "https://github.com/acc-aqt" },
            { label: "Instagram", url: "https://www.instagram.com/carrels.photography/" },
            { label: "carrels.photography", url: "https://www.carrels.photography/" },
          ],
          placement: { x: 160 },
        },
      ],
    },
  ],
};
