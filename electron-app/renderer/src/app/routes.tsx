import { createBrowserRouter, createHashRouter } from "react-router";
import ProjectList from "./pages/project-list";
import StyleSelect from "./pages/style-select";
import ScriptInput from "./pages/script-input";
import DetailedSettings from "./pages/detailed-settings";
import ImageReview from "./pages/image-review";
import VideoGeneration from "./pages/video-generation";
import SettingsPage from "./pages/settings";
import { Layout } from "./components/layout";
import { isElectron } from "../lib/electron-api";

const routes = [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <ProjectList />,
      },
      {
        path: "style-select",
        element: <StyleSelect />,
      },
      {
        path: "script-input",
        element: <ScriptInput />,
      },
      {
        path: "detailed-settings",
        element: <DetailedSettings />,
      },
      {
        path: "images",
        element: <ImageReview />,
      },
      {
        path: "video-generation",
        element: <VideoGeneration />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
];

// Electron uses hash router for file:// protocol support
export const router = isElectron()
  ? createHashRouter(routes)
  : createBrowserRouter(routes);