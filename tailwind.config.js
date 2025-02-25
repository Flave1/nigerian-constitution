/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'nigeria': {
          green: '#008751',
          white: '#FFFFFF',
          black: '#000000'
        },
        'twitter': {
          blue: '#1DA1F2',
          dark: '#15202B',
          gray: '#657786',
          light: '#AAB8C2',
          extraLight: '#E1E8ED',
          extraExtraLight: '#F5F8FA',
        }
      },
      container: {
        center: true,
        padding: '1rem',
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
        },
      },
    },
  },
  plugins: [],
} 