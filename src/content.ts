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
      width: 480,
      pointsOfInterest: [
        {
          id: "mtu",
          title: "MTU Aero Engines",
          subtitle: "Software developer for computer-aided engineering methods",
          dates: "2020–now",
          body:
            "I build a platform that coordinates engineering design processes and workflows and stores the engineering data behind them.",
          links: [{ label: "MTU Aero Engines", url: "https://www.mtu.de/" }],
          placement: { x: 240 },
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
  ],
};
