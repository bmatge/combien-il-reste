const easterEggs = {
  CLAUDE: {
    message: "Claude est un prénom épicène — et visiblement immortel. QP : incalculable.",
    icon: "🤖",
  },
  JESUS: {
    message: "Plus que vous ne le pensez. Vive l'état civil.",
    icon: "✝️",
  },
  KEVIN: {
    message: "Les Kevin ont encore 70 ans devant eux. Aucun sénateur pour l'instant. Patience.",
    icon: "📱",
  },
  YVETTE: {
    message: "Alerte espèce en danger critique.",
    icon: "🚨",
    blink: true,
  },
  NAPOLEON: {
    message: "Il a quand même bien vécu. QP historique : immesurable.",
    icon: "👑",
  },
  MARINE: {
    message: null, // Laisser les données parler
    icon: null,
  },
  "JEAN-MARIE": {
    message: null, // Géré dynamiquement si QP > 3
    icon: "🏛️",
    dynamicMessage: (data) =>
      data?.quotient_pouvoir > 3
        ? "Le Sénat apprécie ce prénom."
        : null,
  },
}

export function getEasterEgg(prenom, data) {
  const egg = easterEggs[prenom]
  if (!egg) {
    // Generic easter eggs based on data
    if (data) {
      if (data.vivants < 1000 && data.vivants > 0) {
        return {
          message: "Prénom en voie d'extinction — signalez-le à l'INSEE.",
          icon: "🆘",
        }
      }
      if (data.vivants > 100000 && data.nb_elus_total === 0) {
        return {
          message: `${data.vivants.toLocaleString('fr-FR')}+ vivants, 0 élu. La République ne vous a pas encore trouvés.`,
          icon: "😶",
        }
      }
      if (data.pic_annee >= 2015) {
        return {
          message: "Il est trop tôt pour s'inquiéter. Revenez en 2090.",
          icon: "👶",
        }
      }
    }
    return null
  }

  const result = { ...egg }
  if (egg.dynamicMessage && data) {
    const msg = egg.dynamicMessage(data)
    if (msg) result.message = msg
    else if (!egg.message) return null
  }

  return result.message ? result : null
}
