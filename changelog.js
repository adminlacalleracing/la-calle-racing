// Changelog data for La Calle Racing — bilingual ES/EN
// Each entry: { date, version?, title: {es, en}, items[{tag, text:{es, en}}] }

export const CHANGELOG = [
  {
    date: '2026-06-05',
    version: 'v1.6',
    title: {
      es: 'Lanzamiento, N₂O Manual y Daño de Motor',
      en: 'Launch System, Manual N₂O & Engine Damage',
    },
    items: [
      { tag: 'new', text: { es: '¡Sistema de lanzamiento! Mantén presionado durante la cuenta regresiva para subir las RPM. Zona dulce = lanzamiento perfecto. Mucho gas = burnout o patinada.', en: 'Launch system! Hold during countdown to build RPM. Sweet spot = perfect launch. Too much gas = burnout or wheel spin.' } },
      { tag: 'new', text: { es: 'N₂O manual: el botón 🔥 N₂O aparece si tienes kit instalado. Presiona cuando quieras durante la carrera. Cada kit da cargas limitadas.', en: 'Manual N₂O: the 🔥 N₂O button appears if you have a kit. Press anytime during the race. Each kit gives limited charges.' } },
      { tag: 'new', text: { es: 'Daño de motor acumulativo: si tu motor pasa mucho tiempo en zona crítica (130°C+), pierde potencia permanentemente. ¡Cuida tu temperatura!', en: 'Cumulative engine damage: if your engine stays in the critical zone (130°C+) too long, it permanently loses power. Watch your temperature!' } },
      { tag: 'new', text: { es: 'Pantalla de resultados muestra estado del motor con barra de integridad.', en: 'Results screen shows engine health with integrity bar.' } },
      { tag: 'new', text: { es: 'Tecla N = activar N₂O. Espacio = cambios.', en: 'N key = activate N₂O. Space = shifts.' } },
      { tag: 'info', text: { es: 'Motor fundido = solo 25% de potencia. La temperatura se acumula entre carreras.', en: 'Blown engine = 25% power. Temperature accumulates between races.' } },
    ],
  },
  {
    date: '2026-06-04',
    version: 'v1.5',
    title: {
      es: 'Sistema de Economía — Dinero, Garage y Apuestas',
      en: 'Economy System — Money, Garage & Betting',
    },
    items: [
      { tag: 'new', text: { es: '¡Sistema de dinero! Ganas $$$ por cada carrera. $300 base por ganar + bonus por tiempo. $100 de consuelo por perder.', en: 'Money system! Earn $$$ per race. $300 base for winning + time bonus. $100 consolation for losing.' } },
      { tag: 'new', text: { es: 'Garage personal: cada carro tiene un precio. Empiezas con el Civic \'95 + $5,000. ¡Compra carros nuevos en la pantalla de selección!', en: 'Personal garage: each car has a price. Start with the Civic \'95 + $5,000. Buy new cars on the selection screen!' } },
      { tag: 'new', text: { es: 'Sistema de apuestas: al retar a alguien, elige "Por diversión", apuesta en efectivo ($250/$500/$1000) o ¡Pink Slip (el que pierde, pierde su carro)!', en: 'Betting system: when challenging someone, pick "For fun", cash bet ($250/$500/$1000) or Pink Slip (loser gives up their car)!' } },
      { tag: 'new', text: { es: 'Los bots también apuestan: 40% de las veces te retan con dinero o Pink Slip. ¡Cuidado!', en: 'Bots also bet: 40% of the time they challenge you with money or Pink Slip. Watch out!' } },
      { tag: 'new', text: { es: 'Pantalla de resultados muestra ganancias detalladas: recompensa de carrera, apuesta ganada/perdida, y total.', en: 'Results screen shows detailed earnings: race reward, stake won/lost, and total.' } },
      { tag: 'new', text: { es: 'Badge de billetera en selección de carro y lobby muestra tu saldo actual en tiempo real.', en: 'Wallet badge on car select and lobby shows your current balance in real-time.' } },
      { tag: 'info', text: { es: 'Precios: Sprint $1,800 → Chevy $2,200 → Tsuru $2,800 → Corolla $3,200 → Civic $3,500 → Sentra $3,800 → Jetta $4,500 → Renault $5,500.', en: 'Prices: Sprint $1,800 → Chevy $2,200 → Tsuru $2,800 → Corolla $3,200 → Civic $3,500 → Sentra $3,800 → Jetta $4,500 → Renault $5,500.' } },
      { tag: 'info', text: { es: 'Próximamente: tienda de piezas, reparación de motor, cuentas de usuario y carreras de 1/2 milla.', en: 'Coming soon: parts shop, engine repair, user accounts and half-mile races.' } },
    ],
  },
  {
    date: '2026-06-04',
    version: 'v1.4',
    title: {
      es: 'Física Real — Cambios, Rev Limiter y Temperatura',
      en: 'Real Physics — Gears, Rev Limiter & Temperature',
    },
    items: [
      { tag: 'new', text: { es: '¡Hard cap por marcha! El carro FÍSICAMENTE no puede pasar su velocidad máxima de redline. En 1ra ~50 km/h, en 2da ~90 km/h. Debes cambiar.', en: 'Hard speed cap per gear! The car PHYSICALLY cannot exceed its redline speed. 1st ~50 km/h, 2nd ~90 km/h. You must shift.' } },
      { tag: 'new', text: { es: 'Termómetro de motor REALISTA: la temperatura apenas sube en una carrera de 15s (como un motor real). ¡Pero se ACUMULA entre carreras! Conduce inteligente o cocina tu motor.', en: 'REALISTIC engine thermometer: temp barely changes in a 15s race (like a real engine). But it ACCUMULATES between races! Drive smart or cook your engine.' } },
      { tag: 'new', text: { es: 'Zonas de temperatura con etiquetas: Frío → Calentando → Normal → Caliente → ¡Peligro! El castigo de potencia solo empieza arriba de 100°C.', en: 'Temperature zones with labels: Cold → Warming → Normal → Hot → Danger! Power penalty only starts above 100°C.' } },
      { tag: 'new', text: { es: 'El botón de cambio cambia a "¡CAMBIA YA!" cuando el motor llega al límite de la marcha — señal clara de que debes subir.', en: 'Shift button changes to "SHIFT NOW!" when engine hits gear limit — clear signal to shift up.' } },
      { tag: 'new', text: { es: 'Rev limiter progresivo: entre 90-97% del redline, la potencia cae hasta 92%. El motor se "apaga" al límite.', en: 'Progressive rev limiter: between 90-97% of redline, power drops up to 92%. Engine "dies" at the limit.' } },
      { tag: 'fix', text: { es: 'Temperatura realista: frío ~25°C, conducción normal ~45°C, duro ~70°C, redline ~95°C. Solo abusando del limitador llegas a zona de peligro (115°C+).', en: 'Realistic temperature: cold ~25°C, normal driving ~45°C, hard ~70°C, redline ~95°C. Only limiter abuse reaches danger zone (115°C+).' } },
      { tag: 'fix', text: { es: 'El rival AI también tiene hard cap — no puede hacer trampa quedándose en primera marcha.', en: 'AI rival also has hard cap — can\'t cheat by staying in first gear.' } },
      { tag: 'info', text: { es: 'Velocidades reales por marcha: 1ra ~50 km/h, 2da ~90 km/h, 3ra ~140 km/h. Necesitas cambiar 2-3 veces para el 1/4 de milla.', en: 'Real speeds per gear: 1st ~50 km/h, 2nd ~90 km/h, 3rd ~140 km/h. You need 2-3 shifts for the quarter mile.' } },
    ],
  },
  {
    date: '2026-06-04',
    version: 'v1.3',
    title: {
      es: 'Leaderboard Global — Los Mejores de la Calle',
      en: 'Global Leaderboard — The Best on the Street',
    },
    items: [
      { tag: 'new', text: { es: '¡Leaderboard global! Los mejores 3 tiempos de cada carro, registrados por la comunidad.', en: 'Global leaderboard! Top 3 times per car, recorded by the community.' } },
      { tag: 'new', text: { es: 'Los tiempos se suben automáticamente cuando tienes perfil y haces un buen tiempo.', en: 'Times are submitted automatically when you have a profile and set a good time.' } },
      { tag: 'new', text: { es: 'El leaderboard muestra avatar, nombre y tiempo de cada corredor en el podio.', en: 'Leaderboard shows avatar, name and time of each racer on the podium.' } },
      { tag: 'info', text: { es: 'Nuevo botón "Leaderboard" en la pantalla de selección de carro.', en: 'New "Leaderboard" button on the car select screen.' } },
    ],
  },
  {
    date: '2026-06-04',
    version: 'v1.2',
    title: {
      es: 'Chat Limpio, Perfiles Conectados y Optimización',
      en: 'Clean Chat, Connected Profiles & Optimization',
    },
    items: [
      { tag: 'fix', text: { es: 'El chat ya no se satura con mensajes de días anteriores. Filtro de 5 minutos en todas las fuentes.', en: 'Chat no longer floods with old messages. 5-minute filter on all sources.' } },
      { tag: 'fix', text: { es: 'Bug crítico: el chat no mostraba mensajes al reconectar por variables indefinidas en el render.', en: 'Critical bug: chat failed to show messages on reconnect due to undefined variables in rendering.' } },
      { tag: 'fix', text: { es: 'Cambios de perfil (nickname, color) ahora se reflejan inmediatamente al entrar al lobby.', en: 'Profile changes (nickname, color) now reflect immediately when entering lobby.' } },
      { tag: 'new', text: { es: 'Limpieza automática de mensajes viejos al entrar al lobby — ya no más chat histórico.', en: 'Auto-cleanup of old messages on lobby entry — no more historical chat.' } },
      { tag: 'new', text: { es: 'La base de datos limpia mensajes mayores a 5 minutos — el servidor ya no acumula chat eterno.', en: 'Database cleans messages older than 5 minutes — server no longer accumulates infinite chat.' } },
      { tag: 'new', text: { es: 'Cache de referencias DOM en vista de espectador — carreras en vivo más fluidas.', en: 'DOM reference cache in spectator view — smoother live races.' } },
      { tag: 'info', text: { es: 'Reducción de 150 a 30 mensajes en el stream de chat — menos tráfico, misma experiencia.', en: 'Reduced chat stream from 150 to 30 messages — less traffic, same experience.' } },
      { tag: 'info', text: { es: 'Humo de llantas y optimizaciones CSS para carreras más suaves en celulares.', en: 'Tire smoke and CSS optimizations for smoother races on mobile.' } },
    ],
  },
  {
    date: '2026-06-03',
    version: 'v1.1',
    title: {
      es: 'Auditoría de Física — Specs Reales',
      en: 'Physics Audit — Real Specs',
    },
    items: [
      { tag: 'new', text: { es: 'Sección de "Últimas Novedades" para que la comunidad vea los cambios del juego.', en: '"What\'s New" section so the community can see game changes.' } },
      { tag: 'fix', text: { es: "Nissan Sentra '98: peakRpm corregido a 6000 rpm, redline a 6800 rpm (motor GA16DE real).", en: "Nissan Sentra '98: peakRpm corrected to 6000 rpm, redline to 6800 rpm (real GA16DE engine)." } },
      { tag: 'fix', text: { es: "Toyota Corolla '94: final drive corregido a 4.31 (caja C52 real, antes 3.72 — aceleraba muy lento).", en: "Toyota Corolla '94: final drive corrected to 4.31 (real C52 gearbox, was 3.72 — accelerated too slow)." } },
      { tag: 'fix', text: { es: "Nissan Tsuru '00: peakRpm a 6000, redline a 6800, final drive a 4.43 (RS5F31A real).", en: "Nissan Tsuru '00: peakRpm to 6000, redline to 6800, final drive to 4.43 (real RS5F31A)." } },
      { tag: 'fix', text: { es: "Chevrolet Sprint '95: peakRpm corregido a 6000 rpm (motor G13B real).", en: "Chevrolet Sprint '95: peakRpm corrected to 6000 rpm (real G13B engine)." } },
      { tag: 'info', text: { es: "Renault 19 16V '91 verificado: 137 HP, 165 Nm, caja JB3 — todo correcto. Sigue siendo el más rápido del roster.", en: "Renault 19 16V '91 verified: 137 HP, 165 Nm, JB3 gearbox — all correct. Still the fastest in the roster." } },
      { tag: 'info', text: { es: "Honda Civic '95, VW Jetta Clásico y Chevy C2 '99 ya tenían specs correctos. Sin cambios.", en: "Honda Civic '95, VW Jetta Clásico and Chevy C2 '99 already had correct specs. No changes." } },
    ],
  },
  {
    date: '2026-06-03',
    version: 'v1.0',
    title: {
      es: 'Lanzamiento — La Calle Racing',
      en: 'Launch — La Calle Racing',
    },
    items: [
      { tag: 'new', text: { es: '8 carros clásicos de barrio con física realista de 1/4 de milla.', en: '8 classic neighborhood cars with realistic quarter-mile physics.' } },
      { tag: 'new', text: { es: 'Lobby multiplayer con chat de frases, retos 1v1 y carreras en vivo.', en: 'Multiplayer lobby with phrase chat, 1v1 challenges and live races.' } },
      { tag: 'new', text: { es: 'Sistema de perfiles con estadísticas, tiempos por carro y compartir perfil.', en: 'Profile system with stats, per-car times and profile sharing.' } },
      { tag: 'new', text: { es: 'Motor de carreras con cambios de marcha, tacómetro y retroalimentación de calidad.', en: 'Race engine with gear shifts, tachometer and quality feedback.' } },
      { tag: 'new', text: { es: 'Efectos visuales: llantas de humo, llamaradas de escape, líneas de velocidad y más.', en: 'Visual effects: tire smoke, exhaust flames, speed lines and more.' } },
    ],
  },
];

// Get the latest entry for the "What's New" badge
export function getLatestEntry() {
  return CHANGELOG[0] || null;
}
