/**
 * App.jsx – Root component for ErrorSnap AI.
 *
 * Renders the Home page which orchestrates the full user flow:
 * upload → analyze → explanation → troubleshooting steps → Show Me the Fix.
 */

import Home from './pages/Home';
import './App.css';

function App() {
  return <Home />;
}

export default App;
