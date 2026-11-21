export type Link = {
  label: string;
  url: string;
};

export type Photo = {
  /** `<gallery>/<file>` in the acc-aqt/carrels-photography repo; the photo pipeline derives the site's images from it. */
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
  ],
};
