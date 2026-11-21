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
      width: 480,
      fastTravelTo: "mtu",
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
