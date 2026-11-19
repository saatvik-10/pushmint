import "./App.css";
import { Landing } from "./components/landing";
import PushmintLanding from "./components/landingmain";
import DeploymentDashboard from "./components/DeploymentDashboard";
import NameEntryPage from "./components/NameEntryPage";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 4000,
          className: "pushmint-toast",
          success: { iconTheme: { primary: "#D4FF24", secondary: "#030407" } },
          error: { iconTheme: { primary: "#ff8585", secondary: "#030407" } },
        }}
      />
      <Routes>
        <Route path="/" element={<PushmintLanding />} />
        <Route path="/deploy" element={<Landing />} />
        <Route path="/deployments" element={<DeploymentDashboard />} />
        <Route path="/login" element={<NameEntryPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
