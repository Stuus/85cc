# 操作流程 (Operational Workflow)

本文件說明「85cc 營收回報小幫手」的主要操作流程，從使用者的角度出發，涵蓋了「設定管理」、「上傳與產出報告」以及「歷史紀錄與版本更新」的完整生命週期。

## 1. 核心操作流程 (Core Workflow)

應用程式的核心價值在於自動化讀取 Excel 報表並輸出文字簡訊。以下是主要的執行步驟：

```mermaid
sequenceDiagram
    actor User as 使用者
    participant UI as 應用程式介面
    participant Parser as Excel 解析器
    participant Config as 設定檔管理 (Config)

    User->>UI: 上傳 Excel 報表 (.xls / .xlsx)
    UI->>Config: 請求當前查詢規則 (Queries)
    Config-->>UI: 回傳分類、單一品項、組合品項規則
    UI->>Parser: 傳遞 Excel 檔案與查詢規則
    Parser-->>UI: 回傳解析後的銷售量與營收數據
    UI->>UI: 結合「庫存盤點」介面的手動輸入數據
    User->>UI: 點擊「製作日報」
    UI-->>User: 產出格式化的文字簡訊
    User->>UI: 點擊「複製簡訊」
    UI-->>User: 複製至剪貼簿並儲存歷史紀錄
```

## 2. 設定管理流程 (Settings Management)

使用者可以在「設定」頁面完全客製化查詢語法、新增刪除分類，甚至是重新排列順序。這一切的操作都會自動雙重備份（LocalStorage 與實體檔案）。

```mermaid
stateDiagram-v2
    [*] --> 視覺化編輯模式
    
    視覺化編輯模式 --> 調整順序模式 : 點擊「調整順序」
    調整順序模式 --> 拖曳排序 : 按住把手上下移動
    拖曳排序 --> 調整順序模式
    調整順序模式 --> 視覺化編輯模式 : 取消或完成
    
    視覺化編輯模式 --> JSON原始碼模式 : 點擊「JSON原始碼」
    JSON原始碼模式 --> 視覺化編輯模式 : 點擊「視覺化編輯」
    
    視覺化編輯模式 --> 儲存設定 : 點擊「儲存設定」
    JSON原始碼模式 --> 儲存設定 : 點擊「儲存設定」
    
    儲存設定 --> 備份至LocalStorage
    儲存設定 --> 備份至實體Config資料夾 : (若有授權權限)
```

## 3. 歷史紀錄與重建流程 (History & Restoration)

每次成功產出簡訊時，系統會記錄下該文字檔，並在檔案末端附加上當前設定檔的 **SHA-256 雜湊碼**。未來如果需要回顧某天的紀錄，或用當時的設定檔重新製作日報，系統能夠精準找回對應的規則。

```mermaid
flowchart TD
    A[瀏覽器歷史紀錄 HistoryPage] --> B{解析簡訊檔尾段}
    B -->|找到 SHA-256| C[查詢 .sha256_index.json]
    B -->|未找到| D[僅提供文字預覽]
    
    C -->|匹配成功| E[找到對應的備份 JSON 檔]
    C -->|匹配失敗| F[提示設定檔已遺失或被覆蓋]
    
    E --> G[點擊「以當時設定建立新日報」]
    G --> H[載入該備份檔並跳轉回首頁]
```
