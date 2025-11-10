'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const loggedIn = sessionStorage.getItem('loggedIn')
    if (loggedIn === 'true') {
      router.push('/dashboard')
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (username === 'user' && password === '123') {
      sessionStorage.setItem('loggedIn', 'true')
      sessionStorage.setItem('username', 'user')
      router.push('/dashboard')
    } else {
      setError('Usuario o contraseña incorrectos')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-corporate-blue">
      <div className="bg-dark-gray p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold mb-6 text-center text-pure-white">Sistema de Auditoría</h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-elegant-gray">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-light-blue rounded-md bg-elegant-gray text-dark-gray focus:outline-none focus:ring-2 focus:ring-light-blue transition"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-elegant-gray">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-light-blue rounded-md bg-elegant-gray text-dark-gray focus:outline-none focus:ring-2 focus:ring-light-blue transition"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-light-blue text-pure-white py-2 rounded-md hover:bg-opacity-90 transition font-semibold"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  )
}
