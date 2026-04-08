import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./components/theme-provider";
import { ProjectProvider } from "./contexts/project-context";
import { Toaster } from "sonner";

export default function App() {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-center" />
      </ProjectProvider>
    </ThemeProvider>
  );
}