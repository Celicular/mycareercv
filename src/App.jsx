import { Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import ResumeBuilderOverview from './pages/ResumeBuilderOverview';
import Dashboard from './pages/Dashboard';
import CoverLetterOverview from './pages/CoverLetterOverview';
import CoverLetters from './pages/CoverLetters';
import Settings from './pages/Settings';
import TemplateEditorPage from './pages/TemplateEditorPage';
import AdminTemplates from './pages/AdminTemplates';
import Pricing from './pages/Pricing';
import SharedViewer from './pages/SharedViewer';
import SmoothScroll from './components/SmoothScroll';
import { AuthProvider } from './context/AuthContext';
import AuthModal from './components/auth/AuthModal';
import ResumeTemplatesPage from './pages/ResumeTemplatesPage';
import CoverLetterExamplesPage from './pages/CoverLetterExamplesPage';
import CoverLetterFormatsPage from './pages/CoverLetterFormatsPage';
import HowToWriteACoverLetterPage from './pages/HowToWriteACoverLetterPage';
import ResumeChecker from './pages/ResumeChecker';
import ContactUs from './pages/ContactUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import AdminLeads from './pages/AdminLeads';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Template editor — standalone, no SmoothScroll/AuthModal overlay ── */}
        <Route path="/template-editor"     element={<TemplateEditorPage />} />
        <Route path="/template-editor/:id" element={<TemplateEditorPage />} />
        <Route path="/share/:token"        element={<SharedViewer />} />

        {/* ── Main app — wrapped in SmoothScroll ──────────────────────────── */}
        <Route path="/*" element={
          <SmoothScroll>
            <AuthModal />
            <Routes>
              <Route path="/"                        element={<Home />} />
              <Route path="/pricing"                 element={<Pricing />} />
              <Route path="/resume-templates"        element={<ResumeTemplatesPage />} />
              <Route path="/resume-builder-overview" element={<ResumeBuilderOverview />} />
              <Route path="/cover-letter-generator"  element={<CoverLetterOverview />} />
              <Route path="/cover-letter-examples"   element={<CoverLetterExamplesPage />} />
              <Route path="/cover-letter-formats"    element={<CoverLetterFormatsPage />} />
              <Route path="/how-to-write-a-cover-letter" element={<HowToWriteACoverLetterPage />} />
              <Route path="/resume-checker"          element={<ResumeChecker />} />
              <Route path="/contact"                 element={<ContactUs />} />
              <Route path="/privacy"                 element={<PrivacyPolicy />} />
              <Route path="/terms"                   element={<TermsOfService />} />
              <Route path="/dashboard/*"             element={<Dashboard />} />
              <Route path="/dashboard/cover-letters" element={<CoverLetters />} />
              <Route path="/dashboard/templates"     element={<AdminTemplates />} />
              <Route path="/dashboard/settings"      element={<Settings />} />
              <Route path="/dashboard/leads"         element={<AdminLeads />} />
            </Routes>
          </SmoothScroll>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;

