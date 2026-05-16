import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RoomProvider } from './context/RoomContext';
import Home from './pages/Home';
import Room from './pages/Room';
import JoinRoom from './pages/JoinRoom';
import About from './pages/About';
import InstallPrompt from './components/InstallPrompt';

export default function App() {
  return (
    <RoomProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join/:code" element={<JoinRoom />} />
          <Route path="/room/:code" element={<Room />} />
          <Route path="/about" element={<About />} />
        </Routes>
        <InstallPrompt />
      </BrowserRouter>
    </RoomProvider>
  );
}
