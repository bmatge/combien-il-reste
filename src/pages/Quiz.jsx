import { useState, useEffect, useRef, useCallback } from 'react'
import { titleCase, formatNumber } from '../utils/prenomUtils'
import Header from '../components/Header'

const API_BASE = '/api/prenom'
const ROUNDS = 6
const SCORE_MAX = 1000

// Pools split by rarity for balanced quiz
const PRENOMS_COMMUNS = [
  'JEAN', 'MARIE', 'PIERRE', 'PHILIPPE', 'NICOLAS', 'NATHALIE', 'MICHEL',
  'CHRISTOPHE', 'SYLVIE', 'PATRICK', 'ALAIN', 'BERNARD', 'GERARD', 'KEVIN',
  'JACQUES', 'FRANCOISE', 'MONIQUE', 'SANDRINE', 'THIERRY', 'STEPHANIE',
]
const PRENOMS_RARES = [
  'YVETTE', 'MARCEL', 'RENE', 'ALBERT', 'SIMONE', 'DENISE', 'BERTHE',
  'FERNAND', 'GASTON', 'LUCIENNE', 'COLETTE', 'GERMAINE', 'RAYMONDE',
  'VIRGINIE', 'ELODIE', 'CLAUDE', 'ODETTE', 'LEONTINE', 'ARISTIDE',
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Score: logarithmic proximity. Never 0.
 * ratio = guess / actual (clamped to avoid log(0))
 * error = |log10(ratio)|  → 0 = perfect, 1 = off by 10x, 2 = off by 100x
 * score = max(1, round(1000 * e^(-2 * error)))
 */
function computeScore(guess, actual) {
  if (actual <= 0 || guess <= 0) return 1
  const ratio = guess / actual
  const error = Math.abs(Math.log10(ratio))
  const score = Math.round(SCORE_MAX * Math.exp(-2 * error))
  return Math.max(1, score)
}

function scoreLabel(score) {
  if (score >= 900) return { text: 'Incroyable !', color: 'text-vert' }
  if (score >= 700) return { text: 'Excellent', color: 'text-vert' }
  if (score >= 400) return { text: 'Pas mal', color: 'text-bleu' }
  if (score >= 150) return { text: 'Bof', color: 'text-orange' }
  return { text: 'Aïe', color: 'text-rouge' }
}

function generateYearChoices(correct) {
  const choices = new Set([correct])
  while (choices.size < 4) {
    const offset = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 8) + 1)
    choices.add(correct + offset)
  }
  return shuffle([...choices])
}

function generateAgeChoices(correct) {
  const choices = new Set([correct])
  while (choices.size < 4) {
    const offset = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 12) + 1)
    choices.add(Math.max(20, correct + offset))
  }
  return shuffle([...choices])
}

// ─── Question types ─────────────────────────────────────

function makeHowManyQuestion(prenom, vivants) {
  return {
    type: 'estimate',
    question: `Combien de ${titleCase(prenom)} sont encore en vie en France ?`,
    subtitle: null,
    image: null,
    actual: vivants,
  }
}

function makeDeathYearQuestion(celeb) {
  return {
    type: 'qcm',
    question: `En quelle année ${celeb.nom_complet} est-il/elle décédé(e) ?`,
    subtitle: celeb.categorie,
    image: celeb.image ? `/celebrites/${celeb.image}` : null,
    correct: celeb.annee_deces,
    choices: generateYearChoices(celeb.annee_deces),
    format: (v) => v.toString(),
    explanation: `${celeb.nom_complet} est décédé(e) en ${celeb.annee_deces}, à l'âge de ${celeb.age_deces} ans.`,
  }
}

function makeDeathAgeQuestion(celeb) {
  return {
    type: 'qcm',
    question: `À quel âge est décédé(e) ${celeb.nom_complet} ?`,
    subtitle: `${celeb.categorie} · ${celeb.annee_naissance}–${celeb.annee_deces}`,
    image: celeb.image ? `/celebrites/${celeb.image}` : null,
    correct: celeb.age_deces,
    choices: generateAgeChoices(celeb.age_deces),
    format: (v) => `${v} ans`,
    explanation: `${celeb.nom_complet} avait ${celeb.age_deces} ans (${celeb.annee_naissance}–${celeb.annee_deces}).`,
  }
}

// ─── Components ─────────────────────────────────────

function SetupScreen({ onStart }) {
  const [names, setNames] = useState(['', ''])
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const addPlayer = () => setNames([...names, ''])
  const removePlayer = (i) => setNames(names.filter((_, idx) => idx !== i))
  const update = (i, val) => { const c = [...names]; c[i] = val; setNames(c) }
  const validNames = names.filter((n) => n.trim().length > 0)
  const canStart = validNames.length >= 1

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gris-clair p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-noir mb-1">Qui joue ?</h2>
      <p className="text-gris text-sm mb-6">Entrez les noms des joueurs. Minimum 1.</p>
      <div className="space-y-3">
        {names.map((name, i) => (
          <div key={i} className="flex gap-2">
            <input
              ref={i === 0 ? inputRef : null}
              type="text"
              value={name}
              onChange={(e) => update(i, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canStart && onStart(validNames)}
              placeholder={`Joueur ${i + 1}`}
              className="flex-1 px-4 py-2 rounded-xl border border-gris-clair bg-creme text-noir focus:outline-none focus:ring-2 focus:ring-bleu"
            />
            {names.length > 1 && (
              <button onClick={() => removePlayer(i)} className="px-3 text-gris hover:text-rouge transition-colors cursor-pointer">✕</button>
            )}
          </div>
        ))}
      </div>
      <button onClick={addPlayer} className="mt-3 text-sm text-bleu hover:underline cursor-pointer">+ Ajouter un joueur</button>
      <button
        onClick={() => canStart && onStart(validNames)}
        disabled={!canStart}
        className="mt-6 w-full py-3 bg-noir text-white font-bold rounded-2xl hover:bg-noir/90 disabled:opacity-40 transition-all cursor-pointer"
      >
        C'est parti !
      </button>
    </div>
  )
}

function EstimateRound({ question, round, total, players, onSubmit }) {
  const [guesses, setGuesses] = useState(() => players.map(() => ''))
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [submitted, setSubmitted] = useState([])
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [currentPlayer])

  const handleSubmitGuess = () => {
    const val = parseInt(guesses[currentPlayer], 10)
    if (isNaN(val) || val < 0) return
    const newSubmitted = [...submitted, { player: currentPlayer, guess: val }]
    setSubmitted(newSubmitted)
    if (newSubmitted.length === players.length) {
      const results = players.map((_, i) => {
        const g = newSubmitted.find((s) => s.player === i).guess
        return { guess: g, score: computeScore(g, question.actual) }
      })
      onSubmit(results)
    } else {
      setCurrentPlayer(currentPlayer + 1)
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gris-clair p-8 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-gris font-medium">Round {round}/{total}</span>
        <span className="text-xs text-gris bg-gris-clair px-3 py-1 rounded-full">{players.length} joueur{players.length > 1 ? 's' : ''}</span>
      </div>
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-noir">{question.question}</h2>
      </div>
      <div className="space-y-4">
        <div className="text-center">
          <span className="inline-block bg-bleu-clair text-bleu font-bold px-4 py-1 rounded-full text-sm">
            Au tour de {players[currentPlayer]}
          </span>
        </div>
        {submitted.length > 0 && (
          <div className="text-center text-sm text-gris">
            {submitted.map((s) => (<span key={s.player} className="inline-block mr-2">{players[s.player]} ✓</span>))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="number"
            min="0"
            value={guesses[currentPlayer]}
            onChange={(e) => { const c = [...guesses]; c[currentPlayer] = e.target.value; setGuesses(c) }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitGuess()}
            placeholder="Votre estimation"
            className="flex-1 px-4 py-3 rounded-xl border border-gris-clair bg-creme text-noir text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-bleu [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button onClick={handleSubmitGuess} className="px-6 py-3 bg-noir text-white font-bold rounded-xl hover:bg-noir/90 transition-all cursor-pointer">OK</button>
        </div>
      </div>
    </div>
  )
}

function QCMRound({ question, round, total, players, onSubmit }) {
  const [answers, setAnswers] = useState(() => players.map(() => null))
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [submitted, setSubmitted] = useState([])

  const handleAnswer = (choice) => {
    const newAnswers = [...answers]
    newAnswers[currentPlayer] = choice
    setAnswers(newAnswers)
    const newSubmitted = [...submitted, { player: currentPlayer, choice }]
    setSubmitted(newSubmitted)

    if (newSubmitted.length === players.length) {
      const results = players.map((_, i) => {
        const c = newSubmitted.find((s) => s.player === i).choice
        return { guess: c, score: c === question.correct ? SCORE_MAX : 0 }
      })
      onSubmit(results)
    } else {
      setCurrentPlayer(currentPlayer + 1)
    }
  }

  const allDone = submitted.length === players.length

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gris-clair p-8 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-gris font-medium">Round {round}/{total}</span>
      </div>
      {question.image && (
        <div className="flex justify-center mb-4">
          <img src={question.image} alt="" className="w-24 h-24 rounded-full object-cover bg-gris-clair" />
        </div>
      )}
      <h2 className="text-xl font-bold text-noir text-center mb-1">{question.question}</h2>
      {question.subtitle && <p className="text-sm text-gris text-center mb-4">{question.subtitle}</p>}

      {!allDone && (
        <div className="text-center mb-4">
          <span className="inline-block bg-bleu-clair text-bleu font-bold px-4 py-1 rounded-full text-sm">
            Au tour de {players[currentPlayer]}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-4">
        {question.choices.map((choice) => {
          let bg = 'bg-white border-gris-clair hover:border-bleu cursor-pointer'
          if (allDone) {
            if (choice === question.correct) bg = 'bg-vert-clair border-vert text-vert'
            else bg = 'bg-white border-gris-clair opacity-50'
          }
          return (
            <button
              key={choice}
              onClick={() => !allDone && handleAnswer(choice)}
              disabled={allDone}
              className={`px-4 py-3 rounded-xl border-2 font-semibold text-lg transition-all ${bg}`}
            >
              {question.format(choice)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RevealScreen({ question, players, results, onNext, isLast }) {
  const best = Math.max(...results.map((r) => r.score))

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gris-clair p-8 max-w-lg mx-auto">
      <div className="text-center mb-6">
        {question.type === 'estimate' && (
          <>
            <h2 className="text-2xl font-black text-noir">{question.question.split(' de ').pop()?.replace(' ?', '') || ''}</h2>
            <div className="mt-3 inline-block bg-noir text-white rounded-2xl px-6 py-3">
              <span className="text-3xl font-black tabular-nums">{formatNumber(question.actual)}</span>
              <span className="block text-xs opacity-70 mt-1">en vie en France</span>
            </div>
          </>
        )}
        {question.type === 'qcm' && (
          <>
            {question.image && <img src={question.image} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-3 bg-gris-clair" />}
            <p className="text-sm text-gris">{question.explanation}</p>
          </>
        )}
      </div>

      <div className="space-y-3">
        {players.map((name, i) => {
          const { guess, score } = results[i]
          const label = scoreLabel(score)
          const isBest = score === best && players.length > 1
          return (
            <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${isBest ? 'bg-vert-clair border border-vert/30' : 'bg-gris-clair'}`}>
              <div>
                <span className="font-bold text-noir">{name}{isBest && ' 👑'}</span>
                <span className="text-gris text-sm ml-2">
                  {question.type === 'estimate' ? `a dit ${formatNumber(guess)}` : score === SCORE_MAX ? '✓' : '✗'}
                </span>
              </div>
              <div className="text-right">
                <span className="font-black text-lg text-noir">{score}</span>
                <span className={`block text-xs font-medium ${label.color}`}>{label.text}</span>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={onNext} className="mt-6 w-full py-3 bg-noir text-white font-bold rounded-2xl hover:bg-noir/90 transition-all cursor-pointer">
        {isLast ? 'Voir le classement final' : 'Question suivante →'}
      </button>
    </div>
  )
}

function FinalScreen({ players, scores, onRestart }) {
  const ranked = players.map((name, i) => ({ name, score: scores[i] })).sort((a, b) => b.score - a.score)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gris-clair p-8 max-w-md mx-auto text-center">
      <h2 className="text-3xl font-black text-noir mb-2">Classement final</h2>
      <p className="text-gris text-sm mb-8">Sur {ROUNDS} questions — score max : {formatNumber(ROUNDS * SCORE_MAX)}</p>
      <div className="space-y-3">
        {ranked.map((p, i) => (
          <div key={p.name} className={`flex items-center justify-between p-4 rounded-xl ${i === 0 ? 'bg-vert-clair border border-vert/30' : 'bg-gris-clair'}`}>
            <span className="text-lg"><span className="mr-2">{medals[i] || `${i + 1}.`}</span><span className="font-bold text-noir">{p.name}</span></span>
            <span className="font-black text-xl text-noir tabular-nums">{formatNumber(p.score)}</span>
          </div>
        ))}
      </div>
      <button onClick={onRestart} className="mt-8 w-full py-3 bg-noir text-white font-bold rounded-2xl hover:bg-noir/90 transition-all cursor-pointer">Rejouer</button>
    </div>
  )
}

// ─── Main Quiz ─────────────────────────────────────

export default function Quiz() {
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState('setup')
  const [players, setPlayers] = useState([])
  const [scores, setScores] = useState([])
  const [questions, setQuestions] = useState([])
  const [round, setRound] = useState(0)
  const [roundResults, setRoundResults] = useState(null)

  const buildQuestions = useCallback(async () => {
    setLoading(true)

    // Helper: fetch a prenom and build an estimate question
    async function fetchEstimate(prenom) {
      try {
        const res = await fetch(`${API_BASE}?q=${prenom}`)
        if (!res.ok) return null
        const data = await res.json()
        if (data.vivants > 50) return { q: makeHowManyQuestion(data.prenom, data.vivants), data }
      } catch { /* skip */ }
      return null
    }

    // 1. Pick 3 communs
    const communs = []
    for (const p of shuffle(PRENOMS_COMMUNS)) {
      if (communs.length >= 3) break
      const r = await fetchEstimate(p)
      if (r) communs.push(r)
    }

    // 2. Pick 2 rares
    const rares = []
    for (const p of shuffle(PRENOMS_RARES)) {
      if (rares.length >= 2) break
      const r = await fetchEstimate(p)
      if (r) rares.push(r)
    }

    // 3. Pick 1 celebrity death question from any fetched data
    let celebQ = null
    const allData = [...communs, ...rares]
    for (const { data } of shuffle(allData)) {
      if (!data.celebrites?.length) continue
      const celeb = data.celebrites[Math.floor(Math.random() * data.celebrites.length)]
      if (celeb.annee_deces && celeb.age_deces) {
        celebQ = makeDeathYearQuestion(celeb)
        break
      }
    }

    // Assemble: 2 rares + 3 communs + 1 celeb, shuffled
    const qs = [
      ...rares.map((r) => r.q),
      ...communs.map((r) => r.q),
      ...(celebQ ? [celebQ] : []),
    ]

    setLoading(false)
    return shuffle(qs).slice(0, ROUNDS)
  }, [])

  const startGame = async (playerNames) => {
    const qs = await buildQuestions()
    setPlayers(playerNames)
    setScores(playerNames.map(() => 0))
    setQuestions(qs)
    setRound(0)
    setRoundResults(null)
    setPhase('round')
  }

  const handleRoundSubmit = (results) => {
    setRoundResults(results)
    setScores((prev) => prev.map((s, i) => s + results[i].score))
    setPhase('reveal')
  }

  const nextRound = () => {
    if (round + 1 >= questions.length) {
      setPhase('final')
    } else {
      setRound(round + 1)
      setRoundResults(null)
      setPhase('round')
    }
  }

  const restart = () => {
    setPhase('setup')
    setPlayers([])
    setScores([])
    setQuestions([])
    setRound(0)
    setRoundResults(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-creme flex items-center justify-center">
        <p className="text-gris text-lg animate-pulse">Préparation du quiz...</p>
      </div>
    )
  }

  const q = questions[round]

  return (
    <div className="min-h-screen bg-creme">
      <Header />
      <main className="max-w-2xl mx-auto px-4 pb-16">
        {phase === 'setup' && <SetupScreen onStart={startGame} />}

        {phase === 'round' && q?.type === 'estimate' && (
          <EstimateRound key={round} question={q} round={round + 1} total={questions.length} players={players} onSubmit={handleRoundSubmit} />
        )}

        {phase === 'round' && q?.type === 'qcm' && (
          <QCMRound key={round} question={q} round={round + 1} total={questions.length} players={players} onSubmit={handleRoundSubmit} />
        )}

        {phase === 'reveal' && q && roundResults && (
          <RevealScreen question={q} players={players} results={roundResults} onNext={nextRound} isLast={round + 1 >= questions.length} />
        )}

        {phase === 'final' && (
          <FinalScreen players={players} scores={scores} onRestart={restart} />
        )}

        {(phase === 'round' || phase === 'reveal') && players.length > 1 && (
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            {players.map((name, i) => (
              <span key={i} className="bg-white px-3 py-1 rounded-full border border-gris-clair">
                <span className="font-medium text-noir">{name}</span>
                <span className="text-gris ml-1">{formatNumber(scores[i])} pts</span>
              </span>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
