/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#222831',
        darker: '#393E46',
        accent: '#00ADB5',
        light: '#EEEEEE',
      },
      fontFamily:{
         roboto: ['Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-sky': 'linear-gradient(to bottom, #f0f9ff, #e0f2fe, #bae6fd)',
        'gradient-primary': 'linear-gradient(to right, #E0F6FF, #B3E5FC, #81D4FA)',
      },
      boxShadow: {
        'sky-light': '0 4px 6px -1px rgba(14, 165, 233, 0.1), 0 2px 4px -1px rgba(14, 165, 233, 0.06)',
        'sky-medium': '0 10px 15px -3px rgba(14, 165, 233, 0.1), 0 4px 6px -2px rgba(14, 165, 233, 0.05)',
      },
    },
  },
  plugins: [],
}
