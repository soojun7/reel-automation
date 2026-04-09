import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./components/theme-provider";
import { ProjectProvider } from "./contexts/project-context";
import { SettingsProvider } from "./contexts/settings-context";
import { Toaster } from "sonner";

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <ProjectProvider>
          <RouterProvider router={router} />
          <Toaster position="bottom-center" />
        </ProjectProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}