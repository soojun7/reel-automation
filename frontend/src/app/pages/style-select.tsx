import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Check, Palette } from "lucide-react";

import { useProject } from "../contexts/project-context";

interface ArtStyle {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  tags: string[];
}

const artStyles: ArtStyle[] = [
  {
    id: "personification",
    name: "의인화",
    description: "사물의 재질과 형태를 유지하며 눈/입/팔다리가 달린 귀여운 의인화 스타일 (Reel Studio 특화)",
    thumbnail: "/assets/personification-thumbnail.png",
    tags: ["귀여움", "유니크", "캐릭터"],
  },
];

export default function StyleSelect() {
  const navigate = useNavigate();
  const { styleId, setStyleId } = useProject();

  const handleConfirm = () => {
    if (!styleId) return;
    navigate("/script-input");
  };

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto space-y-12"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 backdrop-blur-xl border border-[var(--primary-500)]/30 mb-6"
          >
            <Palette className="w-10 h-10 text-[var(--primary-500)]" />
          </motion.div>
          <h1 className="text-5xl font-bold text-[var(--text-100)] tracking-tight">
            그림체 선택
          </h1>
          <p className="text-xl text-[var(--text-400)]">
            영상에 적용할 아트 스타일을 선택하세요
          </p>
        </div>

        {/* Style Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {artStyles.map((style, index) => (
            <motion.button
              key={style.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setStyleId(style.id)}
              className={`group relative text-left transition-all ${
                styleId === style.id ? "scale-105" : "hover:scale-102"
              }`}
            >
              {/* Glow effect */}
              <div
                className={`absolute -inset-0.5 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] rounded-3xl blur-lg transition-opacity ${
                  styleId === style.id
                    ? "opacity-50"
                    : "opacity-0 group-hover:opacity-30"
                }`}
              />

              <div
                className={`relative bg-[var(--bg-800)]/80 backdrop-blur-xl border rounded-3xl overflow-hidden transition-all shadow-xl ${
                  styleId === style.id
                    ? "border-[var(--primary-500)] shadow-2xl shadow-[var(--primary-500)]/30"
                    : "border-[var(--border)] hover:border-[var(--primary-400)]"
                }`}
              >
                {/* Selected Indicator */}
                {styleId === style.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary-500)] to-[var(--secondary-500)] flex items-center justify-center shadow-lg"
                  >
                    <Check className="w-6 h-6 text-white" />
                  </motion.div>
                )}

                {/* Thumbnail */}
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img
                    src={style.thumbnail}
                    alt={style.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div
                    className={`absolute inset-0 transition-opacity ${
                      styleId === style.id
                        ? "bg-gradient-to-t from-[var(--primary-500)]/40 to-transparent"
                        : "bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-40"
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="p-6 space-y-3">
                  <h3 className="text-xl font-bold text-[var(--text-100)]">
                    {style.name}
                  </h3>
                  <p className="text-sm text-[var(--text-400)]">
                    {style.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {style.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-[var(--bg-700)] border border-[var(--border)] rounded-full text-xs text-[var(--text-300)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center"
        >
          <button
            onClick={handleConfirm}
            disabled={!styleId}
            className="px-8 py-4 bg-gradient-to-br from-[var(--primary-500)] to-[var(--secondary-500)] text-white text-lg font-semibold rounded-2xl shadow-2xl shadow-[var(--primary-500)]/30 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 hover:shadow-[var(--primary-500)]/50"
          >
            다음 단계로 →
          </button>
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-start gap-3 p-5 bg-gradient-to-r from-[var(--info)]/10 to-[var(--primary-500)]/5 border border-[var(--info)]/20 rounded-2xl max-w-3xl mx-auto"
        >
          <div className="text-2xl">💡</div>
          <div>
            <h4 className="font-semibold text-[var(--text-100)] mb-1">
              스타일 선택 팁
            </h4>
            <p className="text-sm text-[var(--text-400)] leading-relaxed">
              타겟 고객층과 상품의 특성을 고려해서 선택하세요. 패션/뷰티는 리얼리스틱이나 미니멀, 젊은층 타겟은 애니메이션이나 팝 아트가 효과적입니다.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
