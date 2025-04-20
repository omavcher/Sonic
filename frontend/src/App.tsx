import { BrowserRouter, Routes, Route, unstable_HistoryRouter as HistoryRouter } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import { ThemeProvider } from './lib/themes';
import { MainLayout } from './components/layout/main-layout';
import { TemplatesPage } from './pages/templates';
import { ProjectsPage } from './pages/projects';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/home';
import { useState } from 'react';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { ProfilePage } from './pages/profile';
import { SandpackProvider } from '@/components/context/SandpackContext';
import { ProjectDetailsPage } from './pages/projectdetailspage';
// Create a custom history object to handle future flags
const history = createBrowserHistory({ window });

function App() {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  return (
    <HistoryRouter 
      history={history}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <ThemeProvider>
      <SandpackProvider>
        <MainLayout onAuthClick={() => setIsAuthDialogOpen(true)}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/projects/:id" element={<ProjectDetailsPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </MainLayout>
        </SandpackProvider>
        <AuthDialog 
          isOpen={isAuthDialogOpen} 
          onClose={() => setIsAuthDialogOpen(false)} 
        />
        <Toaster position="top-right" />
      </ThemeProvider>
    </HistoryRouter>
  );
}

export default App;