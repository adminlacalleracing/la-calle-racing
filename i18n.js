// Custom i18n system — locales embedded directly (no fetch needed in sandbox)
// Overrides miniappI18n.t() so all modules using the platform API get correct translations.

const LOCALES = {
  "es-419": {
    "game": {
      "eyebrow": "Drag Racing de Barrio",
      "title": "La Calle Racing",
      "subtitle": "Carros humildes, pura adrenalina. 1/4 de milla.",
      "pickCar": "Elige tu ride",
      "enterLobby": "Entrar al Lobby",
      "record": "RÉCORD"
    },
    "car": {
      "power": "Potencia",
      "accel": "0-100",
      "bestTime": "Mejor tiempo",
      "noRecord": "Sin récord",
      "name": {
        "civic95": "Honda Civic '95",
        "sentra98": "Nissan Sentra '98",
        "jetta97": "VW Jetta Clásico",
        "corolla94": "Toyota Corolla '94",
        "chevy99": "Chevy C2 '99",
        "tsuru00": "Nissan Tsuru '00",
        "sprint95": "Chevrolet Sprint '95",
        "renault19": "Renault 19 16V '91",
        "corolla87gt": "Toyota Corolla GT-S '87"
      },
      "desc": {
        "civic95": "El rey de la calle. Ligero y confiable.",
        "sentra98": "Motor noble. No falla ni en subida.",
        "jetta97": "Alemanicucho con alma de corredor.",
        "corolla94": "Indestructible y sorprendente. Motor noble Toyota.",
        "chevy99": "El auto del pueblo. Barato y pelón.",
        "tsuru00": "El taxista favorito. Rápido en recta.",
        "sprint95": "El enano peligroso. Liviano y escurridizo.",
        "renault19": "Europeo furioso. 16 válvulas de puro coraje.",
        "corolla87gt": "4A-GE Twin Cam. El clásico que nunca muere."
      }
    },
    "race": {
      "you": "Tú",
      "rival": "Rival",
      "waitForGreen": "Espera la verde...",
      "getReady": "¡Prepárate!",
      "go": "¡DÁLE!",
      "shift": "¡CAMBIA!",
      "perfect": "¡PERFECTO!",
      "shiftGood": "¡Buen Cambio!",
      "missed": "¡MAL CAMBIO!",
      "shifted": "Cambio OK",
      "won": "¡GANASTE!",
      "lost": "Perdiste...",
      "wait": "Esperando...",
      "falseStart": "¡SALIDA FALSA!",
      "disqualified": "Descalificado",
      "revLimiter": "¡CAMBIA YA!",
      "engineTemp": "TEMP",
      "overheating": "¡SOBRECALENTADO!",
      "launchPerfect": "¡PERFECTO!",
      "launchGood": "BUENO",
      "launchSpin": "¡PATINÓ!",
      "launchBurnout": "¡BURNOUT!",
      "launchBog": "BOG",
      "overheatWarning": "Motor muy caliente — menos potencia",
      "tempCold": "Frío",
      "tempWarming": "Calentando",
      "tempNormal": "Normal",
      "tempOptimal": "Óptimo",
      "tempHot": "Caliente",
      "tempDanger": "¡Peligro!"
    },
    "engine": {
      "integrity": "Motor",
      "pristine": "Impecable",
      "good": "Buen estado",
      "worn": "Desgastado",
      "damaged": "Dañado",
      "critical": "¡CRÍTICO!",
      "blown": "¡MOTOR FUNDIDO!",
      "repairBtn": "Reparar Motor",
      "repairCost": "Costo",
      "repairSuccess": "¡Motor reparado!",
      "repairDesc": "El motor ha acumulado daño por sobrecalentamiento. Repararlo restaura toda la potencia."
    },
    "results": {
      "youWon": "¡Ganaste, carnal!",
      "youLost": "Te ganaron...",
      "falseStart": "¡Salida falsa! Descalificado",
      "reaction": "Reacción",
      "shifts": "Cambios",
      "rival": "Rival",
      "playAgain": "Correr otra vez",
      "newCar": "Elegir otro carro",
      "backToLobby": "Volver al Lobby",
      "newRecord": "¡NUEVO RÉCORD!",
      "carRecord": "Récord del carro"
    },
    "stats": {
      "races": "Carreras",
      "wins": "Victorias",
      "best": "Mejor tiempo"
    },
    "profile": {
      "title": "Mi Perfil",
      "viewProfile": "Ver perfil de",
      "setup": "Configurar Perfil",
      "setupTitle": "Crea tu perfil",
      "setupSubtitle": "Así te ven otros corredores de la comunidad.",
      "nickname": "Nickname",
      "nicknamePlaceholder": "Elige un apodo...",
      "pickColor": "Color de avatar",
      "create": "Crear Perfil",
      "save": "Guardar",
      "editNickname": "Editar",
      "share": "Compartir Perfil",
      "close": "Cerrar",
      "wins": "Victorias",
      "races": "Carreras",
      "winRate": "% Victoria",
      "topTimes": "Tus 3 Mejores Tiempos",
      "noTimes": "¡Corre para registrar tiempos!",
      "lastUpdate": "Última vez",
      "shareLinkCopied": "¡Enlace copiado!",
      "shareError": "No se pudo compartir",
      "dismiss": "Cerrar notificación",
      "bio": "Bio",
      "bioPlaceholder": "Tu lema de carreras...",
      "favoriteCar": "Carro favorito",
      "noFavorite": "Ninguno",
      "playerId": "ID de Corredor",
      "rank": "Rango",
      "saveSuccess": "¡Perfil guardado!",
      "err": {
        "required": "El nickname es obligatorio",
        "tooShort": "Mínimo {min} caracteres",
        "tooLong": "Máximo {max} caracteres",
        "invalidChars": "Solo letras, números, espacios y . _ -",
        "needLetters": "El nickname debe contener letras",
        "profanity": "Ese nombre no está permitido. Intenta otro.",
        "invalidData": "Datos de perfil inválidos"
      },
      "rank": {
        "beginner": "Principiante",
        "apprentice": "Aprendiz",
        "streetRacer": "Corredor Callejero",
        "semiPro": "Semi-Pro",
        "pro": "Profesional",
        "elite": "Élite",
        "legend": "Leyenda",
        "mythic": "Mítico"
      },
      "rules": "Solo letras, números y . _ -"
    },
    "lobby": {
      "title": "La Calle",
      "subtitle": "Comunidad de Racing",
      "availablePlayers": "Corredores en línea",
      "challenge": "Retar",
      "challengeYou": "te reta a correr",
      "accept": "Aceptar",
      "decline": "Rechazar",
      "nextUp": "Siguiente carrera",
      "queued": "En cola #{pos}",
      "queueTitle": "Cola de Carreras",
      "queueNow": "Corriendo ahora",
      "queueWaiting": "Esperando turno",
      "queueEmpty": "Sin carreras en cola",
      "noRivals": "No hay rivales conectados",
      "waitingForPlayers": "Esperando que alguien se una...",
      "exitLobby": "Salir",
      "connecting": "Conectando al lobby...",
      "connected": "Conectado",
      "reconnecting": "Reconectando...",
      "cancelChallenge": "Cancelar reto",
      "challengeCooldown": "Espera {seconds}s para otro reto",
      "retryConnection": "Reintentar conexión",
      "waitingResponse": "Esperando respuesta...",
      "waitingHuman": "Esperando rival en vivo...",
      "localMode": "Modo Local",
      "raceStarting": "¡Carrera iniciando!",
      "botLabel": "BOT",
      "proLabel": "PRO",
      "liveLabel": "EN VIVO",
      "waitingForRace": "Esperando carrera...",
      "error": {
        "connectionFailed": "Servidor no disponible — modo local activado",
        "disconnected": "Conexión perdida — reconectando...",
        "reconnected": "Conexión restablecida",
        "raceSyncFailed": "Error al sincronizar carrera"
      },
      "msg": {
        "hello": "¡Hola!",
        "goodbye": "¡Adiós!",
        "wannaRace": "¿Quiere correr?",
        "whoWants": "¿Quién quiere correr?",
        "iWant": "Yo quiero correr",
        "nextRound": "Sigo para la próxima",
        "gg": "GG",
        "goodRace": "Buena carrera",
        "join": "{name} se unió a la calle",
        "leave": "{name} se fue",
        "raceStart": "🏁 ¡Carrera! {p1} VS {p2}",
        "raceWon": "¡Victoria!",
        "raceLost": "Mejor suerte la próxima",
        "arrived": "🏁 {name} llegó en un {car}",
        "inputPlaceholder": "Escribe un mensaje...",
        "send": "Enviar"
      }
    },
    "spectator": {
      "liveRace": "Carrera en Vivo",
      "watch": "Ver Carrera",
      "watching": "SPECTANDO",
      "p1Label": "Corredor 1",
      "p2Label": "Corredor 2",
      "close": "Cerrar",
      "resultTitle": "Resultado",
      "p1Wins": "🏆 ¡{name} gana!",
      "p2Wins": "🏆 ¡{name} gana!"
    },
    "changelog": {
      "buttonText": "¿Qué hay de nuevo?",
      "buttonLabel": "Ver último update del juego",
      "modalTitle": "Últimas Novedades",
      "latest": "LO ÚLTIMO",
      "close": "Cerrar novedades",
      "tag": {
        "new": "Nuevo",
        "fix": "Fix",
        "info": "Info"
      }
    },
    "leaderboard": {
      "title": "Leaderboard Global",
      "subtitle": "Los mejores tiempos de la comunidad",
      "noEntries": "Aún no hay tiempos. ¡Sé el primero!",
      "buttonText": "Leaderboard",
      "buttonLabel": "Ver mejores tiempos globales",
      "close": "Cerrar leaderboard"
    },
    "toast": {
      "serverError": "No se pudo conectar al servidor. Jugando en modo local.",
      "serverErrorReason": "Modo local: {reason}"
    },
    "lang": {
      "switch": "English",
      "current": "Idioma actual"
    },
    "economy": {
      "wallet": "Billetera",
      "balance": "Saldo",
      "pickStake": "Elige la apuesta",
      "stakeFun": "Por diversión",
      "stakeFunDesc": "Sin apuesta, solo gloria",
      "stakeCash": "Apostar",
      "stakeCashDesc": "Gana o pierde dinero",
      "stakePink": "Pink Slip",
      "stakePinkDesc": "¡El que pierde, pierde su carro!",
      "stakePinkMin": "Necesitas 2+ carros y $1,500",
      "notEnough": "No tienes suficiente",
      "stakeLimitedNormal": "Apuestas limitadas — reto a corredor regular",
      "stakeLimitedPro": "Apuestas limitadas a $500 — bots PRO",
      "cancel": "Cancelar",
      "buy": "Comprar",
      "owned": "TUYO",
      "price": "Precio",
      "bought": "¡{car} comprado!",
      "notEnoughMoney": "No tienes suficiente dinero",
      "raceEarnings": "Ganancias",
      "raceReward": "Carrera",
      "recordBonus": "Bono por Récord",
      "stakeWin": "Apuesta ganada",
      "stakeLose": "Apuesta perdida",
      "pinkWon": "¡Ganaste el carro!",
      "pinkLost": "Perdiste tu carro",
      "pinkKept": "Último carro protegido",
      "pinkSlip": "Pink Slip",
      "total": "Total",
      "confirmBuy": "Comprar",
      "transactionHistory": "Historial de Dinero",
      "txSubtitle": "Tus ganancias y gastos",
      "txRaceWon": "Carrera ganada",
      "txRaceLost": "Carrera perdida",
      "txCarBought": "Compraste {car}",
      "txInCar": "en {car}",
      "txPinkWon": "¡Ganaste {car}!",
      "txPinkLost": "Perdiste {car}",
      "txPinkKept": "Último carro protegido",
      "txAgainst": "vs {name}",
      "txEmpty": "Sin movimientos aún. ¡Corre una carrera!",
      "txJustNow": "Ahora",
      "txMinutesAgo": "Hace {n} min",
      "txHoursAgo": "Hace {n} hr",
      "txTimeRace": "{player}s vs {opponent}s",
      "txDateTime": "{date} {time}",
      "txDate": "{day} {month}",
      "txTime": "{h}:{m}",
      "txMonth": {
        "0": "ene",
        "1": "feb",
        "2": "mar",
        "3": "abr",
        "4": "may",
        "5": "jun",
        "6": "jul",
        "7": "ago",
        "8": "sep",
        "9": "oct",
        "10": "nov",
        "11": "dic"
      }
    },
    "garage": {
      "title": "Tu Garage"
    },
    "dealer": {
      "title": "Dealer de Carros",
      "subtitle": "Tu próximo ride te espera",
      "buttonText": "Dealer",
      "available": "Disponibles",
      "yourGarage": "En tu Garage",
      "buyNow": "Comprar",
      "allOwned": "¡Ya tienes todos los carros! Eres un verdadero coleccionista.",
      "viewDetails": "Ver ficha técnica",
      "specs": "Ficha Técnica",
      "spec": {
        "engineCode": "Motor",
        "displacement": "Cilindrada",
        "valvetrain": "Distribución",
        "aspiration": "Aspiración",
        "power": "Potencia",
        "torque": "Torque",
        "transmission": "Transmisión",
        "drivetrain": "Tracción",
        "body": "Carrocería",
        "weight": "Peso",
        "zero100": "0-100 km/h",
        "topSpeed": "Vel. Máxima",
        "origin": "Origen"
      }
    },
    "parts": {
      "shopTitle": "Taller de Tuneo",
      "shopSubtitle": "Mejora tu ride",
      "installed": "Instalado",
      "buy": "Instalar",
      "locked": "Bloqueado",
      "requires": "Requiere",
      "notEnough": "No tienes suficiente",
      "enterShop": "Tuneo",
      "cat": {
        "engine": "Motor",
        "ecu": "ECU",
        "transmission": "Transmisión",
        "chassis": "Chasis",
        "tires": "Llantas",
        "forced_induction": "Turbo",
        "nitrous": "NOS"
      },
      "filter": { "name": "Filtro Deportivo", "desc": "+5% Potencia · Mejora flujo aire" },
      "exhaust": { "name": "Escape Libre", "desc": "+8% Potencia · Mejora enfriamiento" },
      "cams": { "name": "Árbol de Levas", "desc": "+10% Potencia · Motor corre más caliente" },
      "chip": { "name": "Chip de Rendimiento", "desc": "+15% Potencia · Motor más caliente" },
      "clutch": { "name": "Kit de Embrague", "desc": "-15% Penalidad cambios" },
      "weight": { "name": "Corte de Peso", "desc": "-8% Peso" },
      "tires": { "name": "Llantas de Competencia", "desc": "+10% Tracción" },
      "turbo": { "name": "Kit Turbo", "desc": "+30% Potencia · ¡Mucho más caliente!" },
      "nos": { "name": "NOS 50 Shot", "desc": "+50 HP x 3s · Pico de calor extremo" },
      "intake": { "name": "Toma de Aire Frío", "desc": "+7% Potencia · Mejora enfriamiento" },
      "engine_swap": { "name": "Swap de Motor", "desc": "+25% Potencia · Mejora masa térmica" }
    }
  },
  "en": {
    "game": {
      "eyebrow": "Neighborhood Drag Racing",
      "title": "La Calle Racing",
      "subtitle": "Humble cars, pure adrenaline. Quarter mile.",
      "pickCar": "Pick your ride",
      "enterLobby": "Enter Lobby",
      "record": "RECORD"
    },
    "car": {
      "power": "Power",
      "accel": "0-60",
      "bestTime": "Best time",
      "noRecord": "No record",
      "name": {
        "civic95": "Honda Civic '95",
        "sentra98": "Nissan Sentra '98",
        "jetta97": "VW Jetta Classic",
        "corolla94": "Toyota Corolla '94",
        "chevy99": "Chevy C2 '99",
        "tsuru00": "Nissan Tsuru '00",
        "sprint95": "Chevrolet Sprint '95",
        "renault19": "Renault 19 16V '91",
        "corolla87gt": "Toyota Corolla GT-S '87"
      },
      "desc": {
        "civic95": "King of the street. Light and reliable.",
        "sentra98": "Solid engine. Never fails, not even uphill.",
        "jetta97": "German engineering with a racer's soul.",
        "corolla94": "Indestructible and surprising. Noble Toyota engine.",
        "chevy99": "The people's car. Cheap and bare-bones.",
        "tsuru00": "The taxi driver's favorite. Fast on straights.",
        "sprint95": "The dangerous little one. Light and slippery.",
        "renault19": "Furious European. 16 valves of pure grit.",
        "corolla87gt": "4A-GE Twin Cam. The classic that never dies."
      }
    },
    "race": {
      "you": "You",
      "rival": "Rival",
      "waitForGreen": "Wait for green...",
      "getReady": "Get Ready!",
      "go": "GO!",
      "shift": "SHIFT!",
      "perfect": "PERFECT!",
      "shiftGood": "Good Shift!",
      "missed": "BAD SHIFT!",
      "shifted": "Shift OK",
      "won": "YOU WON!",
      "lost": "You lost...",
      "wait": "Waiting...",
      "falseStart": "FALSE START!",
      "disqualified": "Disqualified",
      "revLimiter": "SHIFT NOW!",
      "engineTemp": "TEMP",
      "overheating": "OVERHEATING!",
      "launchPerfect": "PERFECT!",
      "launchGood": "GOOD",
      "launchSpin": "WHEEL SPIN!",
      "launchBurnout": "BURNOUT!",
      "launchBog": "BOG",
      "overheatWarning": "Engine too hot — less power",
      "tempCold": "Cold",
      "tempWarming": "Warming",
      "tempNormal": "Normal",
      "tempOptimal": "Optimal",
      "tempHot": "Hot",
      "tempDanger": "Danger!"
    },
    "engine": {
      "integrity": "Engine",
      "pristine": "Pristine",
      "good": "Good condition",
      "worn": "Worn",
      "damaged": "Damaged",
      "critical": "CRITICAL!",
      "blown": "ENGINE BLOWN!",
      "repairBtn": "Repair Engine",
      "repairCost": "Cost",
      "repairSuccess": "Engine repaired!",
      "repairDesc": "Your engine has accumulated heat damage. Repairing it restores full power."
    },
    "results": {
      "youWon": "You won, bro!",
      "youLost": "They got you...",
      "falseStart": "False start! Disqualified",
      "reaction": "Reaction",
      "shifts": "Shifts",
      "rival": "Rival",
      "playAgain": "Race again",
      "newCar": "Pick another car",
      "backToLobby": "Back to Lobby",
      "newRecord": "NEW RECORD!",
      "carRecord": "Car record"
    },
    "stats": {
      "races": "Races",
      "wins": "Wins",
      "best": "Best time"
    },
    "profile": {
      "title": "My Profile",
      "viewProfile": "View profile of",
      "setup": "Set Up Profile",
      "setupTitle": "Create your profile",
      "setupSubtitle": "This is how other community racers see you.",
      "nickname": "Nickname",
      "nicknamePlaceholder": "Pick a nickname...",
      "pickColor": "Avatar color",
      "create": "Create Profile",
      "save": "Save",
      "editNickname": "Edit",
      "share": "Share Profile",
      "close": "Close",
      "wins": "Wins",
      "races": "Races",
      "winRate": "Win %",
      "topTimes": "Your Top 3 Times",
      "noTimes": "Race to set times!",
      "lastUpdate": "Last seen",
      "shareLinkCopied": "Link copied!",
      "shareError": "Couldn't share",
      "dismiss": "Dismiss notification",
      "bio": "Bio",
      "bioPlaceholder": "Your racing motto...",
      "favoriteCar": "Favorite car",
      "noFavorite": "None",
      "playerId": "Racer ID",
      "rank": "Rank",
      "saveSuccess": "Profile saved!",
      "err": {
        "required": "Nickname is required",
        "tooShort": "At least {min} characters",
        "tooLong": "Max {max} characters",
        "invalidChars": "Only letters, numbers, spaces, and . _ -",
        "needLetters": "Nickname must contain letters",
        "profanity": "That name is not allowed. Try another.",
        "invalidData": "Invalid profile data"
      },
      "rank": {
        "beginner": "Beginner",
        "apprentice": "Apprentice",
        "streetRacer": "Street Racer",
        "semiPro": "Semi-Pro",
        "pro": "Professional",
        "elite": "Elite",
        "legend": "Legend",
        "mythic": "Mythic"
      },
      "rules": "Letters, numbers, spaces, and . _ - only"
    },
    "lobby": {
      "title": "La Calle",
      "subtitle": "Racing Community",
      "availablePlayers": "Online Racers",
      "challenge": "Challenge",
      "challengeYou": "challenges you to race",
      "accept": "Accept",
      "decline": "Decline",
      "nextUp": "Next race",
      "queued": "Queued #{pos}",
      "queueTitle": "Race Queue",
      "queueNow": "Racing now",
      "queueWaiting": "Waiting for turn",
      "queueEmpty": "No races in queue",
      "noRivals": "No rivals connected",
      "waitingForPlayers": "Waiting for someone to join...",
      "exitLobby": "Exit",
      "connecting": "Connecting to lobby...",
      "connected": "Connected",
      "reconnecting": "Reconnecting...",
      "cancelChallenge": "Cancel challenge",
      "challengeCooldown": "Wait {seconds}s for another challenge",
      "retryConnection": "Retry connection",
      "waitingResponse": "Waiting for response...",
      "waitingHuman": "Waiting for live rival...",
      "localMode": "Local Mode",
      "raceStarting": "Race starting!",
      "botLabel": "BOT",
      "proLabel": "PRO",
      "liveLabel": "LIVE",
      "waitingForRace": "Waiting for race...",
      "error": {
        "connectionFailed": "Server unavailable — local mode activated",
        "disconnected": "Connection lost — reconnecting...",
        "reconnected": "Connection restored",
        "raceSyncFailed": "Race sync error"
      },
      "msg": {
        "hello": "Hey!",
        "goodbye": "Bye!",
        "wannaRace": "Wanna race?",
        "whoWants": "Who wants to race?",
        "iWant": "I want to race",
        "nextRound": "I'll wait for the next round",
        "gg": "GG",
        "goodRace": "Good race",
        "join": "{name} joined the street",
        "leave": "{name} left",
        "raceStart": "🏁 Race! {p1} VS {p2}",
        "raceWon": "Victory!",
        "raceLost": "Better luck next time",
        "arrived": "🏁 {name} arrived in a {car}",
        "inputPlaceholder": "Type a message...",
        "send": "Send"
      }
    },
    "spectator": {
      "liveRace": "Live Race",
      "watch": "Watch Race",
      "watching": "SPECTATING",
      "p1Label": "Racer 1",
      "p2Label": "Racer 2",
      "close": "Close",
      "resultTitle": "Result",
      "p1Wins": "🏆 {name} wins!",
      "p2Wins": "🏆 {name} wins!"
    },
    "changelog": {
      "buttonText": "What's new?",
      "buttonLabel": "See latest game update",
      "modalTitle": "Latest Updates",
      "latest": "LATEST",
      "close": "Close updates",
      "tag": {
        "new": "New",
        "fix": "Fix",
        "info": "Info"
      }
    },
    "leaderboard": {
      "title": "Global Leaderboard",
      "subtitle": "Best times from the community",
      "noEntries": "No times yet. Be the first!",
      "buttonText": "Leaderboard",
      "buttonLabel": "View global best times",
      "close": "Close leaderboard"
    },
    "toast": {
      "serverError": "Couldn't connect to server. Playing in local mode.",
      "serverErrorReason": "Local mode: {reason}"
    },
    "lang": {
      "switch": "Español",
      "current": "Current language"
    },
    "economy": {
      "wallet": "Wallet",
      "balance": "Balance",
      "pickStake": "Pick your stake",
      "stakeFun": "For fun",
      "stakeFunDesc": "No stake, just glory",
      "stakeCash": "Bet",
      "stakeCashDesc": "Win or lose money",
      "stakePink": "Pink Slip",
      "stakePinkDesc": "Loser gives up their car!",
      "stakePinkMin": "Need 2+ cars & $1,500",
      "notEnough": "Not enough",
      "stakeLimitedNormal": "Limited stakes — challenging a regular racer",
      "stakeLimitedPro": "Stakes limited to $500 — PRO bots",
      "cancel": "Cancel",
      "buy": "Buy",
      "owned": "OWNED",
      "price": "Price",
      "bought": "{car} purchased!",
      "notEnoughMoney": "Not enough money",
      "raceEarnings": "Earnings",
      "raceReward": "Race",
      "recordBonus": "Record Bonus",
      "stakeWin": "Stake won",
      "stakeLose": "Stake lost",
      "pinkWon": "You won the car!",
      "pinkLost": "You lost your car",
      "pinkKept": "Last car protected",
      "pinkSlip": "Pink Slip",
      "total": "Total",
      "confirmBuy": "Buy",
      "transactionHistory": "Money History",
      "txSubtitle": "Your earnings and expenses",
      "txRaceWon": "Race won",
      "txRaceLost": "Race lost",
      "txCarBought": "Bought {car}",
      "txInCar": "in {car}",
      "txPinkWon": "Won {car}!",
      "txPinkLost": "Lost {car}",
      "txPinkKept": "Last car protected",
      "txAgainst": "vs {name}",
      "txEmpty": "No transactions yet. Race to earn money!",
      "txJustNow": "Just now",
      "txMinutesAgo": "{n}m ago",
      "txHoursAgo": "{n}h ago",
      "txTimeRace": "{player}s vs {opponent}s",
      "txDateTime": "{date} {time}",
      "txDate": "{month} {day}",
      "txTime": "{h}:{m}",
      "txMonth": {
        "0": "Jan",
        "1": "Feb",
        "2": "Mar",
        "3": "Apr",
        "4": "May",
        "5": "Jun",
        "6": "Jul",
        "7": "Aug",
        "8": "Sep",
        "9": "Oct",
        "10": "Nov",
        "11": "Dec"
      }
    },
    "garage": {
      "title": "Your Garage"
    },
    "dealer": {
      "title": "Car Dealer",
      "subtitle": "Your next ride awaits",
      "buttonText": "Dealer",
      "available": "Available",
      "yourGarage": "In Your Garage",
      "buyNow": "Buy Now",
      "allOwned": "You already own every car! A true collector.",
      "viewDetails": "View Details",
      "specs": "Specs",
      "spec": {
        "engineCode": "Engine Code",
        "displacement": "Displacement",
        "valvetrain": "Valvetrain",
        "aspiration": "Aspiration",
        "power": "Power",
        "torque": "Torque",
        "transmission": "Transmission",
        "drivetrain": "Drivetrain",
        "body": "Body",
        "weight": "Weight",
        "zero100": "0-60 mph",
        "topSpeed": "Top Speed",
        "origin": "Origin"
      }
    },
    "parts": {
      "shopTitle": "Tuning Shop",
      "shopSubtitle": "Upgrade your ride",
      "installed": "Installed",
      "buy": "Install",
      "locked": "Locked",
      "requires": "Requires",
      "notEnough": "Not enough",
      "enterShop": "Tune",
      "cat": {
        "engine": "Engine",
        "ecu": "ECU",
        "transmission": "Transmission",
        "chassis": "Chassis",
        "tires": "Tires",
        "forced_induction": "Turbo",
        "nitrous": "NOS"
      },
      "filter": { "name": "Sport Filter", "desc": "+5% Power · Better airflow" },
      "exhaust": { "name": "Free-Flow Exhaust", "desc": "+8% Power · Better cooling" },
      "cams": { "name": "Performance Cams", "desc": "+10% Power · Runs hotter" },
      "chip": { "name": "Performance Chip", "desc": "+15% Power · Runs hotter" },
      "clutch": { "name": "Clutch Kit", "desc": "-15% Shift penalty" },
      "weight": { "name": "Weight Reduction", "desc": "-8% Weight" },
      "tires": { "name": "Race Tires", "desc": "+10% Traction" },
      "turbo": { "name": "Turbo Kit", "desc": "+30% Power · Much hotter!" },
      "nos": { "name": "NOS 50 Shot", "desc": "+50 HP for 3s · Extreme heat spike" },
      "intake": { "name": "Cold Air Intake", "desc": "+7% Power · Better cooling" },
      "engine_swap": { "name": "Engine Swap", "desc": "+25% Power · Better thermal mass" }
    }
  }
};

let currentLocale = 'es-419';
let translations = LOCALES['es-419'];

function getVal(obj, path) {
  return path.split('.').reduce((cur, key) => cur?.[key], obj);
}

function t(key, values) {
  let str = getVal(translations, key) ?? key;
  if (values) {
    for (const [k, v] of Object.entries(values)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }
  return str;
}

export function getCurrentLocale() {
  return currentLocale;
}

// ── Language Toggle (car select screen only) ─────────────────
export function renderLangToggle(container, onSwitch) {
  // Remove any existing toggle first
  removeLangToggle();
  const btn = document.createElement('button');
  btn.id = 'langToggle';
  btn.type = 'button';
  btn.className = 'lang-toggle';
  btn.textContent = currentLocale === 'en' ? 'EN' : 'ES';
  btn.title = t('lang.switch');
  btn.setAttribute('aria-label', t('lang.switch'));
  btn.addEventListener('click', async () => {
    const next = currentLocale === 'en' ? 'es-419' : 'en';
    translations = LOCALES[next] || LOCALES['es-419'];
    currentLocale = next;
    document.documentElement.lang = next === 'en' ? 'en' : 'es';
    btn.textContent = next === 'en' ? 'EN' : 'ES';
    btn.title = t('lang.switch');
    btn.setAttribute('aria-label', t('lang.switch'));
    try { await window.miniappsAI.storage.setItem('preferredLang', next); } catch {}
    if (onSwitch) onSwitch();
  });
  container.appendChild(btn);
}

export function removeLangToggle() {
  const existing = document.getElementById('langToggle');
  if (existing) existing.remove();
}

// ── Initialize ────────────────────────────────────────────────
export async function initI18n(onSwitch) {
  // Restore saved preference
  let saved = null;
  try {
    saved = await window.miniappsAI.storage.getItem('preferredLang');
  } catch {}

  const targetLocale = (saved && LOCALES[saved]) ? saved : 'es-419';
  translations = LOCALES[targetLocale];
  currentLocale = targetLocale;
  document.documentElement.lang = targetLocale === 'en' ? 'en' : 'es';

  // Override platform i18n — all modules using window.miniappI18n.t() will use our translations
  if (window.miniappI18n) {
    window.miniappI18n.t = t;
    window.miniappI18n.getContext = () => ({
      resolvedLocale: currentLocale,
      dir: 'ltr',
      availableLocales: ['es-419', 'en'],
      canChangeLocale: true,
    });
    window.miniappI18n.setLocale = async (locale) => {
      if (LOCALES[locale]) {
        translations = LOCALES[locale];
        currentLocale = locale;
        document.documentElement.lang = locale === 'en' ? 'en' : 'es';
      }
    };
  }
}

export { t };
