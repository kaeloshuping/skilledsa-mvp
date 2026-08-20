import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [status, setStatus] = useState('Loading...');

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/health`)
      .then(res => setStatus(res.data.status))
      .catch(() => setStatus('Error connecting to backend'));
  }, []);

  return (
    <div>
      <h1>SkilledSA MVP</h1>
      <p>Backend status: {status}</p>
    </div>
  );
}

export default App;