import { Navigate, useParams } from 'react-router-dom';

const CODE_RE = /^[A-Z0-9]{6}$/;

export default function JoinRoom() {
  const { code } = useParams();
  const normalized = String(code ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);

  if (!CODE_RE.test(normalized)) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/room/${normalized}`} replace />;
}
