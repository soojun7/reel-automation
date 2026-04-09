import { X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[var(--bg-800)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 max-h-[85vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-800)] z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚙️</span>
                    <Dialog.Title className="text-xl font-semibold text-[var(--text-100)]">
                      설정
                    </Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <button className="p-2 rounded-lg hover:bg-[var(--bg-700)] transition-colors">
                      <X className="w-5 h-5 text-[var(--text-400)]" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                  {/* Image Settings */}
                  <section>
                    <h3 className="text-lg font-semibold text-[var(--text-100)] mb-4">
                      🎨 이미지 설정
                    </h3>
                    <div className="space-y-4 p-4 bg-[var(--bg-700)] rounded-xl border border-[var(--border)]">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-200)] mb-2">
                          모델
                        </label>
                        <select className="w-full px-4 py-2 bg-[var(--bg-800)] border border-[var(--border)] rounded-lg text-[var(--text-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]">
                          <option>Google Imagen 3</option>
                          <option>DALL-E 3</option>
                          <option>Midjourney</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-200)] mb-2">
                          스타일
                        </label>
                        <select className="w-full px-4 py-2 bg-[var(--bg-800)] border border-[var(--border)] rounded-lg text-[var(--text-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]">
                          <option>3D Pixar</option>
                          <option>Realistic</option>
                          <option>Anime</option>
                          <option>Cartoon</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* Video Settings */}
                  <section>
                    <h3 className="text-lg font-semibold text-[var(--text-100)] mb-4">
                      🎬 영상 설정
                    </h3>
                    <div className="space-y-4 p-4 bg-[var(--bg-700)] rounded-xl border border-[var(--border)]">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-200)] mb-2">
                          길이
                        </label>
                        <select className="w-full px-4 py-2 bg-[var(--bg-800)] border border-[var(--border)] rounded-lg text-[var(--text-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]">
                          <option>6초</option>
                          <option>10초</option>
                          <option>15초</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-200)] mb-2">
                          해상도
                        </label>
                        <select className="w-full px-4 py-2 bg-[var(--bg-800)] border border-[var(--border)] rounded-lg text-[var(--text-100)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]">
                          <option>720p</option>
                          <option>1080p</option>
                          <option>4K</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* API Keys */}
                  <section>
                    <h3 className="text-lg font-semibold text-[var(--text-100)] mb-4">
                      🔑 API 키
                    </h3>
                    <div className="space-y-3 p-4 bg-[var(--bg-700)] rounded-xl border border-[var(--border)]">
                      {[
                        { name: "Claude", value: "sk-ant-••••••••" },
                        { name: "Runware", value: "••••••••" },
                        { name: "WaveSpeed", value: "••••••••" },
                      ].map((api) => (
                        <div
                          key={api.name}
                          className="flex items-center justify-between p-3 bg-[var(--bg-800)] rounded-lg"
                        >
                          <div>
                            <span className="text-sm font-medium text-[var(--text-200)]">
                              {api.name}
                            </span>
                            <span className="text-sm text-[var(--text-400)] ml-2">
                              {api.value}
                            </span>
                          </div>
                          <button className="px-3 py-1 text-sm rounded-lg bg-[var(--bg-700)] hover:bg-[var(--bg-600)] text-[var(--text-200)] border border-[var(--border)] transition-colors">
                            변경
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--border)] sticky bottom-0 bg-[var(--bg-800)]">
                  <button className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                    저장
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
