import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, useParams, useNavigate } from 'react-router-dom'
import SearchBar from './components/SearchBar'
import ResultCard from './components/ResultCard'
import Methode from './components/Methode'
import Header from './components/Header'
import Quiz from './pages/Quiz'
import { normalize } from './utils/prenomUtils'

const API_BASE = '/api/prenom'

function Home() {
  const { prenom: urlPrenom } = useParams()
  const navigate = useNavigate()
  const [prenomData, setPrenomData] = useState(null)
  const [selectedPrenom, setSelectedPrenom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [showMethode, setShowMethode] = useState(false)
  const abortRef = useRef(null)

  // Fetch prenom data from API
  const fetchPrenom = useCallback(async (prenom) => {
    const key = normalize(prenom)
    setSelectedPrenom(key)
    setLoading(true)
    setNotFound(false)
    setPrenomData(null)

    // Abort previous request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${API_BASE}?q=${encodeURIComponent(key)}`, {
        signal: controller.signal,
      })
      if (!res.ok) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const json = await res.json()
      setPrenomData(json)
    } catch (err) {
      if (err.name !== 'AbortError') {
        setNotFound(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Load from URL param on mount
  useEffect(() => {
    if (urlPrenom) {
      fetchPrenom(urlPrenom)
    }
  }, [urlPrenom, fetchPrenom])

  const handleSelect = useCallback(
    (prenom) => {
      const key = normalize(prenom)
      navigate(`/prenom/${key}`, { replace: true })
      fetchPrenom(key)
    },
    [navigate, fetchPrenom]
  )

  // Search function for autocomplete — calls API
  const searchFn = useCallback(async (query) => {
    if (!query || query.length < 1) return []
    try {
      const res = await fetch(`${API_BASE}?search=${encodeURIComponent(query)}`)
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  }, [])

  return (
    <div className="min-h-screen bg-creme">
      <Header />

      <main className="max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 pb-16">
        <SearchBar
          onSelect={handleSelect}
          searchFn={searchFn}
          initialValue={urlPrenom}
        />

        {loading && (
          <div className="mt-12 text-center text-gris">
            <p className="text-lg animate-pulse">Chargement...</p>
          </div>
        )}

        {prenomData && !loading && (
          <ResultCard
            prenom={selectedPrenom}
            data={prenomData}
          />
        )}

        {notFound && !loading && (
          <div className="mt-8 text-center text-gris">
            <p className="text-xl">Prénom introuvable.</p>
            <p className="text-sm mt-1">
              Les prénoms très rares (&lt; 20 naissances/an) sont regroupés par l'INSEE.
            </p>
          </div>
        )}

        {!selectedPrenom && !loading && (
          <div className="mt-12 text-center text-gris">
            <p className="text-lg">Tapez un prénom pour commencer.</p>
            <p className="text-sm mt-4 opacity-60">
              Produit avec les moyens de l'État.<br />
              Toute ressemblance avec un Gérard de votre entourage est purement statistique.
            </p>
          </div>
        )}
      </main>

      <footer className="text-center py-8 border-t border-gris-clair">
        <button
          onClick={() => setShowMethode(true)}
          className="text-sm text-gris hover:text-noir transition-colors cursor-pointer"
        >
          Estimation statistique — voir la méthode
        </button>
        <p className="text-xs text-gris mt-2 opacity-60">
          Sources : INSEE · Ministère de l'Intérieur · Licence Ouverte v2
        </p>
      </footer>

      {showMethode && <Methode onClose={() => setShowMethode(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/prenom/:prenom" element={<Home />} />
      <Route path="/quiz" element={<Quiz />} />
    </Routes>
  )
}
