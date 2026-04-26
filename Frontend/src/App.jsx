import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Registry from './pages/Registry';

function App() {
  return (
    <Router>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/registry" replace />} />
          <Route path="registry" element={<Registry />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
