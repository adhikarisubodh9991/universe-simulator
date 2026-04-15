const BODY_TYPES = {
  STAR: 'star',
  PLANET: 'planet',
  MOON: 'moon',
  ASTEROID: 'asteroid',
  COMET: 'comet',
  BLACKHOLE: 'blackhole',
  FRAGMENT: 'fragment',
};

const STAR_TYPES = [
  { name: 'Red Dwarf', color: 0xff6f61, radius: [10, 16], massScale: 1200, glow: 1.5 },
  { name: 'Blue Giant', color: 0x86bcff, radius: [20, 34], massScale: 2300, glow: 2.3 },
  { name: 'Neutron Star', color: 0xd6deff, radius: [6, 10], massScale: 4200, glow: 2.8 },
];

const PLANET_TYPES = [
  { kind: 'Rocky', color: 0xae8966, radius: [2.2, 5.8], massScale: 14, atmosphere: 'thin', temp: [180, 420] },
  { kind: 'Gas Giant', color: 0xd7b58f, radius: [8, 16], massScale: 5, atmosphere: 'thick', temp: [90, 240] },
  { kind: 'Ice', color: 0x9fd8ff, radius: [3.3, 8], massScale: 8, atmosphere: 'frozen haze', temp: [30, 130] },
  { kind: 'Lava', color: 0xff6f3b, radius: [3, 7], massScale: 16, atmosphere: 'toxic', temp: [700, 1600] },
];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

  
