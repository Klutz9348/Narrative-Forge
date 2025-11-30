<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1eWjyoBrfG1x4WYcDd7HN6vEscSc8L_a9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Project roadmap

- 当前 UI 是 Vite + React 的编辑器原型（Figma 风格，含侧边栏 / 画布 / Inspector）。
- 规划中的“引擎层”将比照 Unity/Godot 的场景树与命令总线，前端与内核通过事件模型解耦。
- 更细的迭代拆解与技术路线请见 [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md)。
