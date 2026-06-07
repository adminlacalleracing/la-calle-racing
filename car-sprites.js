// Car SVG sprites for La Calle Racing — Each car has UNIQUE silhouette, personality & details
export function getCarSVG(carId, color, accent) {
  const generators = {
    civic95: civic95SVG,
    sentra98: sentra98SVG,
    jetta97: jetta97SVG,
    corolla94: corolla94SVG,
    chevy99: chevy99SVG,
    tsuru00: tsuru00SVG,
    sprint95: sprint95SVG,
    renault19: renault19SVG,
    corolla87gt: corolla87gtSVG,
  };
  return (generators[carId] || civic95SVG)(color, accent);
}

// Per-car wheel positions — percentages relative to the sprite element.
// rearLeft: % from left edge to rear wheel center
// frontRight: % from right edge to front wheel center
// wheelBottom: % from bottom edge to wheel center
// Wheel disc size is scaled per car too (rearSize, frontSize in px).
export function getWheelPositions(carId) {
  const positions = {
    civic95:    { rearLeft: '18%', frontRight: '24%', wheelBottom: '34%', rearSize: 10, frontSize: 9, offsetX: 4, offsetY: 6 },
    sentra98:   { rearLeft: '20%', frontRight: '23%', wheelBottom: '34%', rearSize: 10, frontSize: 9, offsetX: 4, offsetY: 6 },
    jetta97:    { rearLeft: '21%', frontRight: '24%', wheelBottom: '34%', rearSize: 8, frontSize: 7, offsetX: 4, offsetY: 6 },
    corolla94:  { rearLeft: '20%', frontRight: '22%', wheelBottom: '34%', rearSize: 10, frontSize: 9, offsetX: 4, offsetY: 6 },
    chevy99:    { rearLeft: '21%', frontRight: '23%', wheelBottom: '34%', rearSize: 9, frontSize: 8, offsetX: 3, offsetY: 5 },
    tsuru00:    { rearLeft: '20%', frontRight: '23%', wheelBottom: '34%', rearSize: 8, frontSize: 7, offsetX: 4, offsetY: 4 },
    sprint95:   { rearLeft: '22%', frontRight: '24%', wheelBottom: '34%', rearSize: 9, frontSize: 8, offsetX: 3, offsetY: 5 },
    renault19:  { rearLeft: '19%', frontRight: '22%', wheelBottom: '34%', rearSize: 10, frontSize: 9, offsetX: 4, offsetY: 6 },
    corolla87gt:{ rearLeft: '20%', frontRight: '22%', wheelBottom: '34%', rearSize: 10, frontSize: 9, offsetX: 4, offsetY: 9 },
  };
  return positions[carId] || positions.civic95;
}

// ── HONDA CIVIC '95 EG — Compact hatchback, angular lines ──
function civic95SVG(color, accent) {
  return `<svg class="car-sprite-svg" viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg">
    <!-- Body -->
    <path d="M80,180 L80,155 Q80,145 90,140 L150,125 Q160,122 165,115 L195,95 Q200,90 210,88 L310,82 Q320,82 325,88 L350,108 Q355,115 365,118 L420,125 Q432,128 435,140 L438,155 L440,180 Q440,188 432,190 L400,195 Q395,198 385,198 L340,198 Q330,198 328,190 L325,175 Q322,168 315,168 L200,168 Q192,168 190,175 L188,190 Q185,198 175,198 L130,198 Q120,198 115,195 L88,190 Q80,188 80,180Z" fill="${color}" stroke="${accent}" stroke-width="1.5"/>
    <!-- Roof line -->
    <path d="M165,115 Q170,85 200,78 L310,72 Q330,72 340,82 L350,108" fill="none" stroke="${accent}" stroke-width="1" opacity="0.5"/>
    <!-- Windows -->
    <path d="M175,108 L195,92 Q200,88 210,86 L290,82 Q298,82 300,86 L320,100 L315,108 Z" fill="rgba(100,180,255,0.3)" stroke="${accent}" stroke-width="0.8" opacity="0.7"/>
    <!-- Window pillar -->
    <line x1="248" y1="84" x2="250" y2="108" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <!-- Headlights -->
    <rect x="415" y="130" width="20" height="12" rx="3" fill="${accent}" opacity="0.8"/>
    <rect x="415" y="148" width="18" height="8" rx="2" fill="#ff6" opacity="0.3"/>
    <!-- Taillights -->
    <rect x="80" y="138" width="8" height="16" rx="2" fill="#ff2222" opacity="0.8"/>
    <!-- Wheels -->
    <circle cx="150" cy="195" r="22" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="150" cy="195" r="12" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <circle cx="365" cy="195" r="22" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="365" cy="195" r="12" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <!-- Fender detail -->
    <path d="M115,168 Q120,155 150,155 Q180,155 185,168" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
    <path d="M335,168 Q340,155 365,155 Q395,155 398,168" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
    <!-- Lower body line -->
    <line x1="90" y1="175" x2="430" y2="175" stroke="${accent}" stroke-width="0.6" opacity="0.2"/>
  </svg>`;
}

// ── NISSAN SENTRA '98 B14 — Rounded sedan, smooth curves ──
function sentra98SVG(color, accent) {
  return `<svg class="car-sprite-svg" viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg">
    <path d="M75,182 L75,158 Q75,148 85,142 L140,128 Q150,124 158,116 L198,92 Q205,86 215,84 L318,78 Q330,78 338,86 L362,110 Q368,116 378,120 L428,128 Q440,132 444,145 L446,158 L448,182 Q448,190 440,192 L408,196 Q402,200 390,200 L348,200 Q338,200 335,192 L332,178 Q329,170 320,170 L198,170 Q188,170 186,178 L184,192 Q180,200 170,200 L128,200 Q118,200 112,196 L86,192 Q75,190 75,182Z" fill="${color}" stroke="${accent}" stroke-width="1.5"/>
    <path d="M158,116 Q164,82 198,74 L318,68 Q340,70 350,82 L362,110" fill="none" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <path d="M172,110 L198,90 Q206,84 218,82 L300,78 Q310,78 315,82 L338,102 L332,110 Z" fill="rgba(100,180,255,0.3)" stroke="${accent}" stroke-width="0.8" opacity="0.7"/>
    <line x1="256" y1="80" x2="258" y2="110" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <rect x="422" y="134" width="22" height="14" rx="4" fill="${accent}" opacity="0.8"/>
    <rect x="422" y="154" width="20" height="8" rx="3" fill="#ff6" opacity="0.3"/>
    <rect x="75" y="140" width="8" height="18" rx="2" fill="#ff2222" opacity="0.8"/>
    <circle cx="152" cy="198" r="24" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="152" cy="198" r="13" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <circle cx="370" cy="198" r="24" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="370" cy="198" r="13" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <path d="M110,170 Q118,155 152,155 Q186,155 192,170" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
    <path d="M338,170 Q345,155 370,155 Q400,155 405,170" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
  </svg>`;
}

// ── VW JETTA A2 CLÁSICO — Boxy German sedan, sharp lines ──
function jetta97SVG(color, accent) {
  return `<svg class="car-sprite-svg" viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg">
    <path d="M78,182 L78,152 Q78,142 88,138 L148,125 Q155,122 160,114 L200,88 Q206,82 216,80 L316,75 Q328,75 335,82 L358,108 Q364,114 374,118 L424,125 Q436,128 440,142 L442,152 L444,182 Q444,192 434,194 L400,198 Q394,202 382,202 L342,202 Q332,202 329,194 L326,178 Q324,170 316,170 L198,170 Q188,170 186,178 L184,194 Q180,202 170,202 L130,202 Q120,202 114,198 L88,194 Q78,192 78,182Z" fill="${color}" stroke="${accent}" stroke-width="1.5"/>
    <path d="M160,114 Q165,80 200,72 L316,66 Q336,68 348,80 L358,108" fill="none" stroke="${accent}" stroke-width="1.2" opacity="0.5"/>
    <path d="M170,108 L200,86 Q208,80 218,78 L296,74 Q306,74 312,78 L340,100 L334,108 Z" fill="rgba(100,180,255,0.25)" stroke="${accent}" stroke-width="0.8" opacity="0.7"/>
    <line x1="254" y1="76" x2="256" y2="108" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <rect x="420" y="132" width="20" height="14" rx="3" fill="${accent}" opacity="0.8"/>
    <rect x="420" y="152" width="18" height="8" rx="2" fill="#ff6" opacity="0.3"/>
    <rect x="78" y="140" width="8" height="16" rx="2" fill="#ff2222" opacity="0.8"/>
    <circle cx="155" cy="200" r="24" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="155" cy="200" r="13" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <circle cx="372" cy="200" r="24" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="372" cy="200" r="13" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <path d="M112,170 Q120,155 155,155 Q190,155 196,170" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
    <path d="M340,170 Q348,155 372,155 Q402,155 408,170" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
    <line x1="90" y1="178" x2="434" y2="178" stroke="${accent}" stroke-width="0.6" opacity="0.25"/>
  </svg>`;
}

// ── TOYOTA COROLLA '94 E100 — Rounded friendly, economy hubcaps ──
function corolla94SVG(color, accent) {
  return `<svg class="car-sprite-svg" viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg">
    <path d="M78,180 L78,155 Q78,145 88,140 L142,128 Q152,124 158,116 L196,92 Q204,86 214,84 L312,78 Q324,78 332,86 L356,110 Q362,116 372,120 L422,128 Q434,132 438,145 L440,155 L442,180 Q442,188 434,190 L402,194 Q396,198 384,198 L344,198 Q334,198 332,190 L329,176 Q326,168 318,168 L196,168 Q186,168 184,176 L182,190 Q178,198 168,198 L128,198 Q118,198 112,194 L86,190 Q78,188 78,180Z" fill="${color}" stroke="${accent}" stroke-width="1.5"/>
    <path d="M158,116 Q162,82 196,74 L312,68 Q332,70 344,82 L356,110" fill="none" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <path d="M170,110 L196,90 Q204,84 216,82 L296,78 Q306,78 312,82 L338,104 L332,110 Z" fill="rgba(100,180,255,0.3)" stroke="${accent}" stroke-width="0.8" opacity="0.7"/>
    <line x1="252" y1="80" x2="254" y2="110" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <rect x="418" y="132" width="20" height="13" rx="4" fill="${accent}" opacity="0.8"/>
    <rect x="418" y="150" width="18" height="8" rx="3" fill="#ff6" opacity="0.3"/>
    <rect x="78" y="138" width="8" height="16" rx="2" fill="#ff2222" opacity="0.8"/>
    <circle cx="150" cy="196" r="23" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="150" cy="196" r="12" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <circle cx="366" cy="196" r="23" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="366" cy="196" r="12" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <path d="M108,168 Q115,154 150,154 Q185,154 190,168" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
    <path d="M335,168 Q342,154 366,154 Q396,154 400,168" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
  </svg>`;
}

// ── CHEVY C2 '99 — Compact economy box, tall roof ──
function chevy99SVG(color, accent) {
  return `<svg class="car-sprite-svg" viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg">
    <path d="M82,178 L82,150 Q82,140 92,136 L148,124 Q156,120 162,110 L202,82 Q210,76 220,74 L318,70 Q330,70 338,78 L360,106 Q366,112 376,116 L420,124 Q432,128 436,140 L438,150 L440,178 Q440,186 432,188 L400,192 Q394,196 382,196 L342,196 Q332,196 330,188 L327,174 Q324,166 316,166 L198,166 Q188,166 186,174 L184,188 Q180,196 170,196 L130,196 Q120,196 114,192 L90,188 Q82,186 82,178Z" fill="${color}" stroke="${accent}" stroke-width="1.5"/>
    <path d="M162,110 Q168,76 202,68 L318,62 Q338,64 350,76 L360,106" fill="none" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <path d="M174,104 L202,80 Q210,74 222,72 L298,68 Q308,68 314,72 L342,98 L336,104 Z" fill="rgba(100,180,255,0.3)" stroke="${accent}" stroke-width="0.8" opacity="0.7"/>
    <line x1="256" y1="70" x2="258" y2="104" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <rect x="416" y="130" width="20" height="12" rx="3" fill="${accent}" opacity="0.8"/>
    <rect x="416" y="148" width="18" height="8" rx="2" fill="#ff6" opacity="0.3"/>
    <rect x="82" y="136" width="8" height="14" rx="2" fill="#ff2222" opacity="0.8"/>
    <circle cx="148" cy="194" r="22" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="148" cy="194" r="12" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <circle cx="365" cy="194" r="22" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="365" cy="194" r="12" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <path d="M106,166 Q114,152 148,152 Q182,152 188,166" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
    <path d="M334,166 Q340,152 365,152 Q395,152 400,166" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
  </svg>`;
}

// ── NISSAN TSURU '00 — Taxi-grade boxy sedan ──
function tsuru00SVG(color, accent) {
  return `<svg class="car-sprite-svg" viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg">
    <path d="M76,180 L76,152 Q76,142 86,138 L145,126 Q154,122 160,114 L200,88 Q208,82 218,80 L320,76 Q332,76 340,84 L362,110 Q368,116 378,120 L426,128 Q438,132 442,145 L444,152 L446,180 Q446,188 438,190 L406,194 Q400,198 388,198 L346,198 Q336,198 334,190 L331,176 Q328,168 320,168 L198,168 Q188,168 186,176 L184,190 Q180,198 170,198 L130,198 Q120,198 114,194 L88,190 Q76,188 76,180Z" fill="${color}" stroke="${accent}" stroke-width="1.5"/>
    <path d="M160,114 Q166,80 200,72 L320,66 Q340,68 352,80 L362,110" fill="none" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <path d="M172,108 L200,86 Q208,80 220,78 L300,74 Q310,74 316,78 L344,102 L338,108 Z" fill="rgba(100,180,255,0.3)" stroke="${accent}" stroke-width="0.8" opacity="0.7"/>
    <line x1="258" y1="76" x2="260" y2="108" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <rect x="422" y="132" width="22" height="14" rx="4" fill="${accent}" opacity="0.8"/>
    <rect x="422" y="152" width="20" height="8" rx="3" fill="#ff6" opacity="0.3"/>
    <rect x="76" y="138" width="8" height="18" rx="2" fill="#ff2222" opacity="0.8"/>
    <circle cx="152" cy="196" r="24" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="152" cy="196" r="13" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <circle cx="370" cy="196" r="24" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="370" cy="196" r="13" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <path d="M110,168 Q118,154 152,154 Q186,154 192,168" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
    <path d="M338,168 Q344,154 370,154 Q400,154 405,168" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
  </svg>`;
}

// ── CHEVROLET SPRINT '95 — Tiny kei-car, tall & narrow ──
function sprint95SVG(color, accent) {
  return `<svg class="car-sprite-svg" viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg">
    <path d="M90,176 L90,152 Q90,144 98,140 L155,128 Q162,124 168,118 L205,92 Q212,86 222,84 L310,80 Q320,80 326,86 L345,108 Q350,114 358,118 L398,125 Q408,128 412,140 L414,152 L416,176 Q416,184 408,186 L382,190 Q376,194 366,194 L332,194 Q324,194 322,186 L320,174 Q318,166 312,166 L202,166 Q194,166 192,174 L190,186 Q188,194 180,194 L142,194 Q134,194 130,190 L100,186 Q90,184 90,176Z" fill="${color}" stroke="${accent}" stroke-width="1.5"/>
    <path d="M168,118 Q172,86 205,80 L310,74 Q326,76 336,86 L345,108" fill="none" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <path d="M178,112 L205,90 Q212,84 224,82 L298,78 Q306,78 310,82 L332,102 L328,112 Z" fill="rgba(100,180,255,0.3)" stroke="${accent}" stroke-width="0.8" opacity="0.7"/>
    <line x1="250" y1="80" x2="252" y2="112" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <rect x="396" y="130" width="16" height="12" rx="3" fill="${accent}" opacity="0.8"/>
    <rect x="396" y="146" width="14" height="7" rx="2" fill="#ff6" opacity="0.3"/>
    <rect x="90" y="136" width="7" height="14" rx="2" fill="#ff2222" opacity="0.8"/>
    <circle cx="162" cy="192" r="20" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="162" cy="192" r="11" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <circle cx="350" cy="192" r="20" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="350" cy="192" r="11" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <path d="M125,166 Q130,154 162,154 Q194,154 198,166" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
    <path d="M322,166 Q328,154 350,154 Q378,154 382,166" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
  </svg>`;
}

// ── RENAULT 19 16V '91 — European hot hatch, sleek profile ──
function renault19SVG(color, accent) {
  return `<svg class="car-sprite-svg" viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg">
    <path d="M76,180 L76,155 Q76,145 86,140 L142,128 Q152,124 158,116 L196,90 Q204,84 214,82 L316,76 Q328,76 336,84 L360,110 Q366,116 376,120 L426,128 Q438,132 442,145 L444,155 L446,180 Q446,188 438,190 L406,194 Q400,198 388,198 L346,198 Q336,198 334,190 L331,176 Q328,168 320,168 L198,168 Q188,168 186,176 L184,190 Q180,198 170,198 L130,198 Q120,198 114,194 L88,190 Q76,188 76,180Z" fill="${color}" stroke="${accent}" stroke-width="1.5"/>
    <path d="M158,116 Q164,80 196,72 L316,66 Q336,68 348,80 L360,110" fill="none" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <path d="M170,110 L196,88 Q204,82 216,80 L298,76 Q308,76 314,80 L342,104 L336,110 Z" fill="rgba(100,180,255,0.3)" stroke="${accent}" stroke-width="0.8" opacity="0.7"/>
    <line x1="256" y1="78" x2="258" y2="110" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <rect x="422" y="132" width="22" height="14" rx="4" fill="${accent}" opacity="0.8"/>
    <rect x="422" y="152" width="20" height="8" rx="3" fill="#ff6" opacity="0.3"/>
    <rect x="76" y="140" width="8" height="16" rx="2" fill="#ff2222" opacity="0.8"/>
    <circle cx="152" cy="196" r="24" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="152" cy="196" r="13" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <circle cx="370" cy="196" r="24" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="370" cy="196" r="13" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <path d="M110,168 Q118,154 152,154 Q186,154 192,168" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
    <path d="M338,168 Q344,154 370,154 Q400,154 405,168" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
    <line x1="88" y1="178" x2="436" y2="178" stroke="${accent}" stroke-width="0.5" opacity="0.2"/>
  </svg>`;
}

// ── TOYOTA COROLLA GT-S '87 AE82 — 4A-GE Twin Cam 16V ──
function corolla87gtSVG(color, accent) {
  return `<svg class="car-sprite-svg" viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg">
    <path d="M80,180 L80,154 Q80,144 90,140 L148,128 Q156,124 162,116 L198,92 Q206,86 216,84 L314,78 Q326,78 334,86 L358,110 Q364,116 374,120 L424,128 Q436,132 440,145 L442,154 L444,180 Q444,188 436,190 L404,194 Q398,198 386,198 L344,198 Q334,198 332,190 L329,176 Q326,168 318,168 L198,168 Q188,168 186,176 L184,190 Q180,198 170,198 L130,198 Q120,198 114,194 L88,190 Q80,188 80,180Z" fill="${color}" stroke="${accent}" stroke-width="1.5"/>
    <path d="M162,116 Q168,82 198,74 L314,68 Q334,70 346,82 L358,110" fill="none" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <path d="M174,110 L198,90 Q206,84 218,82 L298,78 Q308,78 314,82 L340,104 L334,110 Z" fill="rgba(100,180,255,0.3)" stroke="${accent}" stroke-width="0.8" opacity="0.7"/>
    <line x1="254" y1="80" x2="256" y2="110" stroke="${accent}" stroke-width="1" opacity="0.4"/>
    <!-- 4A-GE badge hint — slightly larger intake -->
    <rect x="420" y="130" width="22" height="14" rx="4" fill="${accent}" opacity="0.8"/>
    <rect x="420" y="150" width="20" height="8" rx="3" fill="#ff6" opacity="0.3"/>
    <rect x="80" y="138" width="8" height="18" rx="2" fill="#ff2222" opacity="0.8"/>
    <circle cx="152" cy="196" r="24" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="152" cy="196" r="13" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <circle cx="368" cy="196" r="24" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
    <circle cx="368" cy="196" r="13" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
    <path d="M110,168 Q118,154 152,154 Q186,154 192,168" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
    <path d="M336,168 Q342,154 368,154 Q398,154 402,168" fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.3"/>
    <line x1="90" y1="178" x2="434" y2="178" stroke="${accent}" stroke-width="0.6" opacity="0.2"/>
  </svg>`;
}
