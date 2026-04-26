import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <Navbar />
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-7xl h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
