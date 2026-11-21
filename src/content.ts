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
      width: 1040,
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
          dates: "During my studies",
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
  ],
};
