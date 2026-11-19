/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FAF6EE',
          100: '#F5EFE4',
          200: '#EBE1CE',
          300: '#DDD0B8',
        },
        ink: {
          900: '#2E2721',
          700: '#4A4036',
          500: '#786B5D',
          300: '#A69888',
        },
        gold: {
          400: '#D7AE54',
          500: '#C4973C',
          600: '#A47A28',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Lora"', 'Georgia', 'serif'],
        body: ['"Lora"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
