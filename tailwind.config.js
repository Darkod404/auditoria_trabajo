/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'corporate-blue': '#0A3D62',
        'light-blue': '#3C8DBC',
        'elegant-gray': '#E5E5E5',
        'pure-white': '#FFFFFF',
        'institutional-green': '#28A745',
        'dark-gray': '#2C3E50',
      },
    },
  },
  plugins: [],
}
