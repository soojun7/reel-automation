import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Settings {
  claudeApiKey: string;
  runwareApiKey: string;
  outputFolder: string;
}

interface SettingsContextType extends Settings {
  setClaudeApiKey: (key: string) => void;
  setRunwareApiKey: (key: string) => void;
  setOutputFolder: (folder: string) => void;
  isConfigured: boolean;
}

const SETTINGS_KEY = "reel-studio-settings";

const defaultSettings: Settings = {
  claudeApiKey: "",
  runwareApiKey: "",
  outputFolder: "",
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    // 로컬 스토리지에서 설정 로드
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch {}
    }
  }, []);

  useEffect(() => {
    // 설정 변경 시 저장
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const setClaudeApiKey = (key: string) => {
    setSettings(prev => ({ ...prev, claudeApiKey: key }));
  };

  const setRunwareApiKey = (key: string) => {
    setSettings(prev => ({ ...prev, runwareApiKey: key }));
  };

  const setOutputFolder = (folder: string) => {
    setSettings(prev => ({ ...prev, outputFolder: folder }));
  };

  const isConfigured = !!(settings.claudeApiKey && settings.runwareApiKey);

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setClaudeApiKey,
        setRunwareApiKey,
        setOutputFolder,
        isConfigured,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
