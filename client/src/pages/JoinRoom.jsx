import { Navigate, useParams } from 'react-router-dom';

const CODE_RE = /^[A-Z0-9]{6}$/;

export default function JoinRoom() {
  /* Deep-link only: `/join/:code` normalizes and redirects to `/room/:code` (same session UI as home join). */
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
