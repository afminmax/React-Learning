import React from 'react';
import logo from './logo.svg';
import './App.css';
import Header from './components/Header';
import MainBody from './components/MainBody';
import Footer from './components/Footer';

function App() {
  return (
    <div className="App">
      <Header />
      <MainBody />
      <Footer />
    </div>
  );
}

export default App;

// {
//   /* <header className="App-header">
// <img src={logo} className="App-logo" alt="logo" />
// <p>
//   Edit <code>src/App.js</code> and save to reload.
// </p>
// <a
//   className="App-link"
//   href="https://anya.com"
//   target="_blank"
//   rel="noopener noreferrer"
// >
//   Boo! From Anya!
// </a>
// </header> */
// }
