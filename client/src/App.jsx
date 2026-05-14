import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RoomProvider } from './context/RoomContext';
import { ThemeProvider } from './context/ThemeContext';
import Home from './pages/Home';
import Room from './pages/Room';
import JoinRoom from './pages/JoinRoom';
import About from './pages/About';

export default function App() {
  return (
    <ThemeProvider>
      <RoomProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/join/:code" element={<JoinRoom />} />
            <Route path="/room/:code" element={<Room />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </BrowserRouter>
      </RoomProvider>
    </ThemeProvider>
  );
}
