import { useState, useRef, useEffect, useCallback } from 'react'
import { titleCase } from '../utils/prenomUtils'
import { IconSearch } from './Icons'

export default function SearchBar({ onSelect, searchFn, initialValue }) {
  const [query, setQuery] = useState(initialValue ? titleCase(initialValue) : '')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const doSearch = useCallback(async (val) => {
    if (!val || val.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const results = await searchFn(val)
    setSuggestions(results)
    setShowSuggestions(results.length > 0)
    setHighlightIndex(-1)
  }, [searchFn])

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    // Debounce API calls
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 150)
  }

  function handleSelect(prenom) {
    setQuery(titleCase(prenom))
    setShowSuggestions(false)
    onSelect(prenom)
  }

  function handleKeyDown(e) {
    if (!showSuggestions) {
      if (e.key === 'Enter' && query.trim()) {
        onSelect(query.trim())
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0) {
        handleSelect(suggestions[highlightIndex])
      } else if (query.trim()) {
        onSelect(query.trim())
        setShowSuggestions(false)
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative max-w-lg lg:max-w-xl mx-auto">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gris">
          <IconSearch className="w-5 h-5" />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Tapez un prénom..."
          className="w-full pl-12 pr-4 py-3 text-lg rounded-2xl border-2 border-gris-clair bg-white shadow-sm focus:border-bleu focus:outline-none transition-colors"
          autoComplete="off"
          spellCheck="false"
        />
      </div>
      {showSuggestions && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gris-clair rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <li
              key={s}
              onMouseDown={() => handleSelect(s)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`px-4 py-3 cursor-pointer text-left text-lg transition-colors ${
                i === highlightIndex ? 'bg-bleu-clair text-noir' : 'hover:bg-gris-clair'
              }`}
            >
              {titleCase(s)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
