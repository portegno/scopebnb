/**
 * Wide-field target catalog (demo/seed data, separated from UI).
 * RA/Dec in degrees (J2000). Chosen to suit the rig's ~3°x2° field of view
 * and spanning the whole year so visibility ranking always has good options.
 * (The framer also lets users search any object in the sky.)
 */
export type Target = {
  id: string;
  name: string;
  catalog: string;
  type: "Nebula" | "Star cluster" | "Galaxy" | "Supernova remnant";
  ra: number;
  dec: number;
  bestMonths: string[];
  constellation: string;
  magnitude: number; // apparent visual magnitude (integrated)
  description: string; // brief, educational
};

export const targets: Target[] = [
  // ---- Autumn (Sep–Nov evening) ----
  { id: "m31", name: "Andromeda Galaxy", catalog: "M31", type: "Galaxy", ra: 10.68, dec: 41.27, bestMonths: ["Sep", "Oct", "Nov"], constellation: "Andromeda", magnitude: 3.4, description: "The nearest large spiral galaxy to the Milky Way, about 2.5 million light-years away, and just visible to the naked eye under dark skies." },
  { id: "m33", name: "Triangulum Galaxy", catalog: "M33", type: "Galaxy", ra: 23.46, dec: 30.66, bestMonths: ["Oct", "Nov", "Dec"], constellation: "Triangulum", magnitude: 5.7, description: "A face-on spiral in our Local Group, ~2.7 million light-years away and rich in pink star-forming regions." },
  { id: "ngc281", name: "Pacman Nebula", catalog: "NGC 281", type: "Nebula", ra: 13.2, dec: 56.62, bestMonths: ["Oct", "Nov", "Dec"], constellation: "Cassiopeia", magnitude: 7.4, description: "An emission nebula whose dark dust lanes give it the unmistakable look of the arcade character." },
  { id: "ic1805", name: "Heart Nebula", catalog: "IC 1805", type: "Nebula", ra: 38.2, dec: 61.46, bestMonths: ["Oct", "Nov", "Dec"], constellation: "Cassiopeia", magnitude: 6.5, description: "A vast cloud of glowing hydrogen shaped like a heart, lit up by a young cluster of hot stars at its centre." },
  { id: "ic1848", name: "Soul Nebula", catalog: "IC 1848", type: "Nebula", ra: 42.7, dec: 60.43, bestMonths: ["Oct", "Nov", "Dec"], constellation: "Cassiopeia", magnitude: 6.5, description: "The Heart Nebula's companion; together they're imaged as the 'Heart and Soul', a sprawling star factory." },
  { id: "ngc869", name: "Double Cluster", catalog: "NGC 869/884", type: "Star cluster", ra: 34.74, dec: 57.13, bestMonths: ["Oct", "Nov", "Dec"], constellation: "Perseus", magnitude: 4.3, description: "A dazzling pair of young open star clusters, both visible to the naked eye between Perseus and Cassiopeia." },
  { id: "ngc7635", name: "Bubble Nebula", catalog: "NGC 7635", type: "Nebula", ra: 350.2, dec: 61.2, bestMonths: ["Sep", "Oct", "Nov"], constellation: "Cassiopeia", magnitude: 10.0, description: "A near-perfect bubble of gas blown outward by the fierce stellar wind of a single massive hot star." },
  { id: "ngc7380", name: "Wizard Nebula", catalog: "NGC 7380", type: "Nebula", ra: 341.9, dec: 58.12, bestMonths: ["Sep", "Oct", "Nov"], constellation: "Cepheus", magnitude: 7.2, description: "A young open cluster still wrapped in the glowing gas it formed from, resembling a robed wizard." },
  { id: "ic1396", name: "Elephant's Trunk", catalog: "IC 1396", type: "Nebula", ra: 324.74, dec: 57.5, bestMonths: ["Sep", "Oct", "Nov"], constellation: "Cepheus", magnitude: 3.5, description: "A huge emission nebula whose dark, winding globule is an active nursery of newborn stars." },

  // ---- Winter (Dec–Feb evening) ----
  { id: "m45", name: "Pleiades", catalog: "M45", type: "Star cluster", ra: 56.75, dec: 24.12, bestMonths: ["Nov", "Dec", "Jan"], constellation: "Taurus", magnitude: 1.6, description: "The Seven Sisters: a young open cluster wrapped in blue reflection nebulosity, a naked-eye landmark since antiquity." },
  { id: "ngc1499", name: "California Nebula", catalog: "NGC 1499", type: "Nebula", ra: 60.7, dec: 36.62, bestMonths: ["Nov", "Dec", "Jan"], constellation: "Perseus", magnitude: 6.0, description: "A long ribbon of glowing hydrogen shaped like the US state of California: faint, but a wide-field favourite." },
  { id: "m42", name: "Orion Nebula", catalog: "M42", type: "Nebula", ra: 83.82, dec: -5.39, bestMonths: ["Dec", "Jan", "Feb"], constellation: "Orion", magnitude: 4.0, description: "The closest large star-forming region to Earth (~1,340 ly), bright enough to see with the naked eye below Orion's Belt." },
  { id: "ic434", name: "Horsehead & Flame", catalog: "IC 434", type: "Nebula", ra: 85.24, dec: -2.46, bestMonths: ["Dec", "Jan", "Feb"], constellation: "Orion", magnitude: 6.8, description: "Two icons beside Orion's Belt: the dark silhouette of the Horsehead and the glowing tendrils of the Flame Nebula." },
  { id: "m1", name: "Crab Nebula", catalog: "M1", type: "Supernova remnant", ra: 83.63, dec: 22.01, bestMonths: ["Dec", "Jan", "Feb"], constellation: "Taurus", magnitude: 8.4, description: "The expanding wreckage of a supernova seen and recorded by astronomers in 1054 AD, with a spinning pulsar at its core." },
  { id: "m35", name: "M35 Cluster", catalog: "M35", type: "Star cluster", ra: 92.27, dec: 24.33, bestMonths: ["Dec", "Jan", "Feb"], constellation: "Gemini", magnitude: 5.1, description: "A rich open cluster covering roughly the area of the full Moon, with a smaller distant cluster nearby." },
  { id: "ngc2237", name: "Rosette Nebula", catalog: "NGC 2237", type: "Nebula", ra: 98.0, dec: 5.05, bestMonths: ["Jan", "Feb", "Mar"], constellation: "Monoceros", magnitude: 9.0, description: "A flower-shaped emission nebula surrounding a young cluster whose radiation carves out its central cavity." },
  { id: "ngc2264", name: "Cone & Christmas Tree", catalog: "NGC 2264", type: "Nebula", ra: 100.25, dec: 9.88, bestMonths: ["Jan", "Feb", "Mar"], constellation: "Monoceros", magnitude: 3.9, description: "A bright cluster shaped like a Christmas tree, set beside the dark, dusty Cone Nebula." },

  // ---- Spring (Mar–May evening) ----
  { id: "m44", name: "Beehive Cluster", catalog: "M44", type: "Star cluster", ra: 130.05, dec: 19.67, bestMonths: ["Feb", "Mar", "Apr"], constellation: "Cancer", magnitude: 3.7, description: "One of the nearest open clusters to us, visible as a hazy patch to the naked eye and known since ancient times." },
  { id: "m81", name: "Bode's Galaxy", catalog: "M81/M82", type: "Galaxy", ra: 148.89, dec: 69.07, bestMonths: ["Feb", "Mar", "Apr"], constellation: "Ursa Major", magnitude: 6.9, description: "A grand-design spiral paired with the cigar-shaped starburst galaxy M82, about 12 million light-years away." },
  { id: "leo-triplet", name: "Leo Triplet", catalog: "M65/M66", type: "Galaxy", ra: 170.06, dec: 12.99, bestMonths: ["Mar", "Apr", "May"], constellation: "Leo", magnitude: 9.3, description: "A trio of interacting galaxies (M65, M66 and NGC 3628) roughly 35 million light-years away." },
  { id: "m3", name: "M3 Globular", catalog: "M3", type: "Star cluster", ra: 205.55, dec: 28.38, bestMonths: ["Apr", "May", "Jun"], constellation: "Canes Venatici", magnitude: 6.2, description: "A brilliant globular cluster packing roughly half a million ancient stars into a tight ball." },
  { id: "m51", name: "Whirlpool Galaxy", catalog: "M51", type: "Galaxy", ra: 202.47, dec: 47.2, bestMonths: ["Apr", "May", "Jun"], constellation: "Canes Venatici", magnitude: 8.4, description: "The classic face-on spiral, caught in the act of interacting with a smaller companion galaxy." },
  { id: "m101", name: "Pinwheel Galaxy", catalog: "M101", type: "Galaxy", ra: 210.8, dec: 54.35, bestMonths: ["Apr", "May", "Jun"], constellation: "Ursa Major", magnitude: 7.9, description: "A large, sprawling face-on spiral about 21 million light-years away, nearly twice the Milky Way's size." },
  { id: "m106", name: "M106 Galaxy", catalog: "M106", type: "Galaxy", ra: 184.74, dec: 47.3, bestMonths: ["Mar", "Apr", "May"], constellation: "Canes Venatici", magnitude: 8.4, description: "A spiral galaxy with unusual extra arms driven by the supermassive black hole feeding at its core." },

  // ---- Summer (Jun–Aug evening) ----
  { id: "m13", name: "Hercules Cluster", catalog: "M13", type: "Star cluster", ra: 250.42, dec: 36.46, bestMonths: ["May", "Jun", "Jul"], constellation: "Hercules", magnitude: 5.8, description: "The finest globular cluster in the northern sky, with hundreds of thousands of stars bound by gravity for ~12 billion years." },
  { id: "rho-oph", name: "Rho Ophiuchi Cloud", catalog: "IC 4604", type: "Nebula", ra: 246.0, dec: -23.45, bestMonths: ["May", "Jun", "Jul"], constellation: "Ophiuchus", magnitude: 4.6, description: "A vivid complex of reflection and emission nebulae near the star Antares, one of the most colourful regions in the sky." },
  { id: "m8", name: "Lagoon Nebula", catalog: "M8", type: "Nebula", ra: 270.92, dec: -24.38, bestMonths: ["Jun", "Jul", "Aug"], constellation: "Sagittarius", magnitude: 6.0, description: "A giant star-forming cloud toward the galactic centre, visible to the naked eye as a misty patch." },
  { id: "m20", name: "Trifid Nebula", catalog: "M20", type: "Nebula", ra: 270.6, dec: -22.97, bestMonths: ["Jun", "Jul", "Aug"], constellation: "Sagittarius", magnitude: 6.3, description: "A striking combination of red emission and blue reflection nebulae, split into lobes by dark dust lanes." },
  { id: "m16", name: "Eagle Nebula", catalog: "M16", type: "Nebula", ra: 274.7, dec: -13.81, bestMonths: ["Jun", "Jul", "Aug"], constellation: "Serpens", magnitude: 6.0, description: "Home to Hubble's famous 'Pillars of Creation', towering columns of gas where new stars are being born." },
  { id: "m17", name: "Omega Nebula", catalog: "M17", type: "Nebula", ra: 275.2, dec: -16.18, bestMonths: ["Jun", "Jul", "Aug"], constellation: "Sagittarius", magnitude: 6.0, description: "Also called the Swan Nebula, one of the brightest and most massive star-forming regions in our galaxy." },
  { id: "m22", name: "M22 Globular", catalog: "M22", type: "Star cluster", ra: 279.1, dec: -23.9, bestMonths: ["Jun", "Jul", "Aug"], constellation: "Sagittarius", magnitude: 5.1, description: "One of the brightest globular clusters in the sky, easily resolved into a sea of individual stars." },
  { id: "coathanger", name: "Coathanger", catalog: "Cr 399", type: "Star cluster", ra: 286.25, dec: 20.18, bestMonths: ["Jul", "Aug", "Sep"], constellation: "Vulpecula", magnitude: 3.6, description: "A chance alignment of ten stars forming an unmistakable coathanger: an asterism, not a true cluster." },
  { id: "m27", name: "Dumbbell Nebula", catalog: "M27", type: "Nebula", ra: 299.9, dec: 22.72, bestMonths: ["Jul", "Aug", "Sep"], constellation: "Vulpecula", magnitude: 7.4, description: "A bright planetary nebula: the glowing shell of gas cast off by a dying Sun-like star, a glimpse of our Sun's future." },
  { id: "ngc6888", name: "Crescent Nebula", catalog: "NGC 6888", type: "Nebula", ra: 303.0, dec: 38.35, bestMonths: ["Jul", "Aug", "Sep"], constellation: "Cygnus", magnitude: 7.4, description: "A cosmic bubble blown by a massive Wolf-Rayet star shedding its outer layers near the end of its life." },
  { id: "ic1318", name: "Sadr Region", catalog: "IC 1318", type: "Nebula", ra: 305.56, dec: 40.26, bestMonths: ["Aug", "Sep", "Oct"], constellation: "Cygnus", magnitude: 4.0, description: "Vast clouds of glowing hydrogen surrounding Sadr, the bright star at the heart of the Northern Cross." },
  { id: "ngc7000", name: "North America Nebula", catalog: "NGC 7000", type: "Nebula", ra: 314.75, dec: 44.52, bestMonths: ["Aug", "Sep", "Oct"], constellation: "Cygnus", magnitude: 4.0, description: "A large emission nebula shaped remarkably like the North American continent, near the bright star Deneb." },
  { id: "ic5070", name: "Pelican Nebula", catalog: "IC 5070", type: "Nebula", ra: 312.7, dec: 44.36, bestMonths: ["Aug", "Sep", "Oct"], constellation: "Cygnus", magnitude: 8.0, description: "A star-forming region beside the North America Nebula, its ridges and dark lanes outlining a pelican." },
  { id: "ngc6960", name: "Veil Nebula", catalog: "NGC 6960", type: "Supernova remnant", ra: 311.66, dec: 30.72, bestMonths: ["Aug", "Sep", "Oct"], constellation: "Cygnus", magnitude: 7.0, description: "Delicate, lace-like filaments left by a star that exploded as a supernova 10,000–20,000 years ago." },
];
