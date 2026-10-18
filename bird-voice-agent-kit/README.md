# 三隻鳥 Voice Agent 素材包

PNG 已經是 Codex 能讀取的格式，不需要轉成特殊 AI 格式。這個包將三張定稿角色五視圖、角色 ID 和工程交接說明放在一起，方便另一個專案接手。

## 內容

| 角色 ID | 角色 | 參考圖 |
| --- | --- | --- |
| sparrow | 麻雀 | assets/characters/sparrow/turnaround.png |
| pigeon | 鴿子 | assets/characters/pigeon/turnaround.png |
| malayan-night-heron | 黑冠麻鷺 | assets/characters/malayan-night-heron/turnaround.png |

- `characters.json`：角色與素材的對應；每個 agent 保留獨立的 ID 與設定欄位。
- `AGENTS.md`：給 Codex 的視覺一致性及整合規則。
- 三張 PNG：原始定稿圖片，未重畫、裁切或去背。

## 如何交給另一個 Codex 專案

將整個 `bird-voice-agent-kit` 資料夾加入 voice agent 專案，再把下列文字貼給該專案的 Codex。若只上傳 ZIP，先要求它解壓縮。保持資料夾完整，不要只貼本次聊天的檔案路徑：另一個工作區不會自動取得這裡的檔案。

> 請讀取 bird-voice-agent-kit/AGENTS.md 與 characters.json，並查看三張 turnaround.png。這是我已確認的三個鳥角色與畫風，請依照現有專案的技術架構整合。讓 sparrow、pigeon、malayan-night-heron 各自對應一個獨立 voice agent，分別保有對話歷史、狀態與語音設定；可以共用底層模型。先檢查現有功能並重用已有整合，列明仍缺的設定。保持三隻鳥的畫風與外型一致，不要擅自決定個性或填入假的 voice ID。實際互動畫面需要透明角色素材，以及 idle / listening / thinking / speaking 狀態；目前五視圖只是設計參考，不是動畫。先完成現有素材與設定能支持的部分，再明確列出需要補製的角色素材與需要我選擇的個性、語音設定。

## 現在可用與仍缺的部分

已有：每隻鳥的外觀參考、五個角度、系列畫風、固定角色 ID、素材映射與工程說明。

仍需製作／設定：

1. **透明角色圖**：先選擇畫面使用的角度；輸出每隻鳥各自的乾淨透明圖，而不是帶標題的整張五視圖。
2. **互動狀態**：可從一張 idle 圖開始，用程式加入微幅呼吸或上下移動；進一步再製作眨眼、聆聽、思考與開口素材。
3. **嘴型**：簡易版可用閉嘴／張嘴圖搭配音訊活動切換。更細緻的 lip sync 需另製作適當的嘴型圖與音訊時序。
4. **Agent 設定**：替每隻鳥定義個性、語言、對話規則與聲音，連接現有 voice provider，並處理選擇發話者與中斷播放。

`characters.json` 內的 null 是尚未設定的欄位，不是可直接送入某個服務的 API 參數。這個包不包含可執行的 voice agent 應用程式。
