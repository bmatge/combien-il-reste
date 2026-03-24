export default function EasterEgg({ egg }) {
  if (!egg) return null

  return (
    <div
      className={`mt-4 px-4 py-2.5 rounded-xl text-sm font-medium border ${
        egg.blink
          ? 'bg-rouge-clair border-rouge text-rouge animate-pulse'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}
    >
      {egg.icon && <span className="mr-2">{egg.icon}</span>}
      {egg.message}
    </div>
  )
}
