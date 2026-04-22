import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import DataExplorer from './pages/DataExplorer';
import AddAgent from './pages/AddAgent';
import UpdateAgent from './pages/UpdateAgent';

function App() {
  return (
    <Router>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/explorer" replace />} />
          <Route path="explorer" element={<DataExplorer />} />
          <Route path="add" element={<AddAgent />} />
          <Route path="update" element={<UpdateAgent />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
