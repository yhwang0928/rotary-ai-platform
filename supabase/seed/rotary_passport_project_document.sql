-- ============================================================
-- Rotary Passport 2.0 功能清單 DOCX 匯入為可編輯專案分段資料
-- 來源：/Users/yikaihuang/Desktop/2627 AI委員會/2627_AI委員會(創造持衡的影響力)/05_RotaryPassport2.0_Wesly/Rotary_Passport_2.0_功能清單_完整版.docx
-- 執行方式：貼到 Supabase SQL Editor -> Run
-- ============================================================

update public.projects
set
  project_purpose = coalesce(project_purpose, '開發Rotary Passport 2.0，採分階段導入方式，先盤點完整功能、權限、資料來源與隱私授權設計。'),
  project_background = $project_document$<!-- rotary-project-document-v1 -->
{
  "title": "Rotary Passport 2.0 需求與功能清單彙整",
  "subtitle": "AI委員會工作文件 | 供總監及委員討論使用",
  "source": "/Users/yikaihuang/Desktop/2627 AI委員會/2627_AI委員會(創造持衡的影響力)/05_RotaryPassport2.0_Wesly/Rotary_Passport_2.0_功能清單_完整版.docx",
  "sections": [
    {
      "id": "background",
      "title": "一、專案背景",
      "intro": "3481地區曾推出 Rotary Passport 1.0 App，因下載使用率偏低，加上帳號審核機制未臻完善導致資料安全疑慮，已完成階段性任務並下架。",
      "bullets": [
        "2.0 版本的啟動目標：",
        "核心定位：讓 3481 地區 100+ 社、3,300+ 位會員「更知道彼此」",
        "解決 1.0 痛點：以各社執秘作為帳號授權守門員，確保身分可信",
        "功能升級：整合職業服務網、Google Maps、NFC名片、AI Chatbot，打造地區數位生態平台",
        "對外延伸：透過 Lv.0 訪客入口，讓非會員也能接觸扶輪，增加潛在社友招募機會"
      ]
    },
    {
      "id": "core-features",
      "title": "二、核心功能清單（14 項）",
      "intro": "以下為地區內部使用之核心功能，供委員會討論優先順序與開發可行性。",
      "bullets": [
        "＊Lv.0* 表示各社可自行決定是否對外開放該項資訊。",
        "＊跨社補簽到：社友訪問他社例會時，可在 App 內申請補簽到，由該社執秘審核確認。"
      ],
      "features": [
        {
          "no": "1",
          "name": "各社社友名單查詢",
          "description": "可依地區或社名搜尋會員基本資料及職業分類",
          "permission": "Lv.1以上",
          "source": "全體會員可瀏覽",
          "phase": "核心功能",
          "status": "todo"
        },
        {
          "no": "2",
          "name": "會員職業分類索引",
          "description": "結合職業服務網，依職業類別快速找到對應社友",
          "permission": "Lv.1以上",
          "source": "職業服務網單向匯入",
          "phase": "核心功能",
          "status": "todo"
        },
        {
          "no": "3",
          "name": "扶輪成就與服務紀錄",
          "description": "個人扶輪年資、重要職務、得獎紀錄等",
          "permission": "Lv.1以上",
          "source": "各社提供 / 會員自填",
          "phase": "核心功能",
          "status": "todo"
        },
        {
          "no": "4",
          "name": "例會簽到功能",
          "description": "數位簽到；支援跨社補簽到（執秘審核）",
          "permission": "Lv.1（本人）Lv.2（管理）",
          "source": "跨社補簽到由執秘審核",
          "phase": "核心功能",
          "status": "todo"
        },
        {
          "no": "5",
          "name": "例會出席統計查看",
          "description": "各社執秘可查看本社出席率與統計報表",
          "permission": "Lv.2（本社）",
          "source": "利於幹部行政管理",
          "phase": "核心功能",
          "status": "todo"
        },
        {
          "no": "6",
          "name": "各社例會資訊查詢",
          "description": "各社例會時間、地點、主題（可設定是否對外）",
          "permission": "Lv.0*~Lv.1以上",
          "source": "各社自行決定是否對外",
          "phase": "核心功能",
          "status": "todo"
        },
        {
          "no": "7",
          "name": "各社主講人查詢",
          "description": "歷次例會主講人姓名、講題、社別",
          "permission": "Lv.0（對外）",
          "source": "各社自行維護",
          "phase": "核心功能",
          "status": "todo"
        },
        {
          "no": "8",
          "name": "社友商家地圖（Google Maps）",
          "description": "社友店家整合 Google Maps，附優惠資訊與媒合功能",
          "permission": "Lv.0（對外）",
          "source": "原1.0功能升級版",
          "phase": "核心功能",
          "status": "todo"
        },
        {
          "no": "9",
          "name": "各社服務計畫查詢",
          "description": "各社正在執行或已完成的服務計畫",
          "permission": "Lv.0（對外）",
          "source": "展現地區服務能量",
          "phase": "核心功能",
          "status": "todo"
        },
        {
          "no": "10",
          "name": "地區年度行事曆與活動查詢 ??? 要詢問",
          "description": "地區官方活動、各社大型活動整合日曆",
          "permission": "Lv.1以上",
          "source": "地區幹部維護",
          "phase": "核心功能",
          "status": "todo"
        },
        {
          "no": "11",
          "name": "地區發函公告查詢",
          "description": "地區官方函文、公告即時推播與查閱",
          "permission": "Lv.1以上",
          "source": "Lv.3發佈",
          "phase": "核心功能",
          "status": "todo"
        },
        {
          "no": "12",
          "name": "總監月刊",
          "description": "數位化瀏覽當期與歷期總監月刊",
          "permission": "Lv.1以上",
          "source": "Lv.3上傳管理",
          "phase": "核心功能",
          "status": "todo"
        },
        {
          "no": "13",
          "name": "AI Chatbot（扶輪知識庫）",
          "description": "結合扶輪知識與地區資訊，問答式查詢服務",
          "permission": "Lv.1以上",
          "source": "確定開發，AI功能",
          "phase": "核心功能",
          "status": "todo"
        },
        {
          "no": "14",
          "name": "客服留言",
          "description": "會員留言反映問題，管理員回覆追蹤",
          "permission": "Lv.1以上",
          "source": "基本客服功能",
          "phase": "核心功能",
          "status": "todo"
        }
      ]
    },
    {
      "id": "extended-features",
      "title": "三、延伸功能清單（5 項）",
      "intro": "以下為擴展地區影響力、強化會員連結的進階功能，建議納入 2.0 整體規劃討論。",
      "bullets": [
        "＊NFC實體名片由各社自行印製出資，App 端提供感應後的數位名片頁與加好友功能。"
      ],
      "features": [
        {
          "no": "15",
          "name": "數位名片（Digital Card）",
          "description": "個人名片頁：顯示基本資料、粉絲頁連結、商品頁連結，會員自行設定公開欄位",
          "permission": "Lv.1以上",
          "source": "會員自建自管",
          "phase": "延伸功能",
          "status": "todo"
        },
        {
          "no": "16",
          "name": "NFC 實體名片感應",
          "description": "感應 NFC 卡片後自動跳轉對方數位名片頁，一鍵加好友；NFC 卡由各社自行印製發行",
          "permission": "Lv.1以上",
          "source": "各社自行製作出資",
          "phase": "延伸功能",
          "status": "todo"
        },
        {
          "no": "17",
          "name": "扶輪好友通訊錄",
          "description": "會員間互加好友後建立個人通訊錄，方便跨社聯繫與人脈管理",
          "permission": "Lv.1以上",
          "source": "好友關係雙向確認",
          "phase": "延伸功能",
          "status": "todo"
        },
        {
          "no": "18",
          "name": "扶輪公益網連結",
          "description": "平台內點擊可跳轉至扶輪公益網，介接地區公益資訊",
          "permission": "Lv.1以上",
          "source": "外部連結跳轉",
          "phase": "延伸功能",
          "status": "todo"
        },
        {
          "no": "19",
          "name": "Lv.0 訪客入口（潛在社友）",
          "description": "外部訪客無需帳號可瀏覽對外公開資料（店家、主講人、服務計畫等）；可填表留下入社意願，作為潛在社友名單",
          "permission": "Lv.0（無帳號）",
          "source": "增加社友招募管道",
          "phase": "延伸功能",
          "status": "todo"
        }
      ]
    },
    {
      "id": "permissions",
      "title": "四、權限層級設計",
      "intro": "2.0 建議採五層權限架構（含對外訪客層 Lv.0），由各社執秘擔任第一道內部審核關卡。",
      "permissions": [
        {
          "level": "Lv.0",
          "role": "外部訪客",
          "scope": "扶輪店家地圖、主講人資訊、各社自行開放之例會資訊、服務計畫；留下入社意願",
          "notes": "無需帳號，潛在社友入口"
        },
        {
          "level": "Lv.1",
          "role": "一般會員",
          "scope": "全地區會員資料＋跨社公開資訊瀏覽、數位名片、好友通訊錄、NFC加好友",
          "notes": "帳號由執秘授權"
        },
        {
          "level": "Lv.2",
          "role": "各社執秘",
          "scope": "本社會員管理、簽到管理、補簽到審核、商家資料審核",
          "notes": "守門員角色"
        },
        {
          "level": "Lv.3",
          "role": "地區幹部",
          "scope": "全地區統計、活動管理、公告發佈、總監月刊管理",
          "notes": "地區行政操作"
        },
        {
          "level": "Lv.4",
          "role": "系統管理員",
          "scope": "全系統設定、資料維護、職業服務網介接、外部平台連動",
          "notes": "技術層面管理"
        }
      ]
    },
    {
      "id": "data-sources",
      "title": "五、資料來源與整合方式",
      "intro": "",
      "bullets": []
    },
    {
      "id": "data-source-vocational-service",
      "title": "5-1 職業服務網介接",
      "bullets": [
        "採單向匯入（職業服務網 → Rotary Passport 2.0），避免雙向同步造成資料衝突",
        "匯入欄位：社員姓名、社別、職業分類、公司名稱、聯絡方式（依隱私設定決定公開程度）",
        "更新頻率：建議定期批次同步（如每週或每月），由系統管理員執行"
      ]
    },
    {
      "id": "data-source-public-service",
      "title": "5-2 扶輪公益網連動",
      "bullets": [
        "採外部連結跳轉方式，點擊後開啟扶輪公益網，不做深度資料整合",
        "未來如有需要，可評估進一步介接公益活動資料"
      ]
    },
    {
      "id": "data-source-club-maintained",
      "title": "5-3 各社自維護資料",
      "bullets": [
        "例會資訊、主講人紀錄、服務計畫：各社自行維護，執秘有編輯權限",
        "社友商家資訊：由會員本人或執秘填寫，執秘審核後上架",
        "數位名片：由會員本人維護，含粉絲頁、商品頁連結及 NFC 可見欄位設定"
      ]
    },
    {
      "id": "data-source-district",
      "title": "5-4 地區層級資料",
      "bullets": [
        "年度行事曆、發函公告、總監月刊：由地區幹部（Lv.3）統一維護與發佈",
        "潛在社友名單：由 Lv.0 訪客填表產生，由地區幹部或各社自行跟進"
      ]
    },
    {
      "id": "privacy",
      "title": "六、隱私與授權注意事項",
      "intro": "以下為 2.0 開發需提前規劃的隱私保護與資料授權事項：",
      "privacy": [
        {
          "topic": "帳號審核機制",
          "description": "1.0版下架主因之一為開放審核導致非會員可加入",
          "recommendation": "改由各社執秘統一授權，確保身分可信"
        },
        {
          "topic": "個人資料最小化",
          "description": "會員不應強制公開所有個人資訊",
          "recommendation": "設計個人隱私設定，讓會員自選公開項目（含粉絲頁、商品頁是否顯示）"
        },
        {
          "topic": "職業服務網資料授權",
          "description": "職業服務網資料單向匯入，避免資料衝突",
          "recommendation": "明確告知會員資料來源及用途，取得同意"
        },
        {
          "topic": "NFC名片資料範圍",
          "description": "NFC感應後可見資料需事先由會員確認授權公開範圍",
          "recommendation": "會員自設「NFC可見欄位」，預設最小化揭露"
        },
        {
          "topic": "商家資料與優惠資訊",
          "description": "社友店家資料由本人或執秘維護，避免錯誤資訊",
          "recommendation": "建立審核流程，上架前需執秘確認"
        },
        {
          "topic": "Lv.0 對外資料管控",
          "description": "外部訪客可見範圍需嚴格限制，不得揭露個人聯絡資料",
          "recommendation": "各社自行設定例會資訊是否對外公開；店家與主講人資料需去除私人聯絡方式"
        },
        {
          "topic": "Chatbot資料範圍",
          "description": "AI Chatbot僅能存取已授權公開之扶輪知識與地區資訊",
          "recommendation": "明確界定Chatbot可查詢範圍，不開放個人隱私資料"
        },
        {
          "topic": "資料存取記錄",
          "description": "需有操作日誌，確保資料異動可追溯",
          "recommendation": "系統建立 audit log 機制"
        }
      ]
    },
    {
      "id": "discussion",
      "title": "七、待討論事項",
      "intro": "以下議題建議於本次會議中優先確認方向：",
      "bullets": [
        "【優先順序】19項功能中，哪些是 MVP（最小可行版本）必備？哪些列為第二、三階段？",
        "【技術平台】2.0 採 App 或 Web App 或兩者兼具？NFC 感應需 Native App 支援。",
        "【開發資源】是否已有技術合作夥伴？開發預算規模？",
        "【NFC名片推動】各社自行出資製作的可行性？需要地區統一規格嗎？",
        "【潛在社友入口】Lv.0 留資後的跟進機制由誰負責？地區統一管理或分派各社？",
        "【時程規劃】預計 2.0 上線時程為何？核心功能與延伸功能是否分批上線？"
      ]
    }
  ]
}$project_document$,
  description = coalesce(description, $project_description$3481地區曾推出 Rotary Passport 1.0 App，因下載使用率偏低，加上帳號審核機制未臻完善導致資料安全疑慮，已完成階段性任務並下架。
2.0 版本的啟動目標：
核心定位：讓 3481 地區 100+ 社、3,300+ 位會員「更知道彼此」
解決 1.0 痛點：以各社執秘作為帳號授權守門員，確保身分可信
功能升級：整合職業服務網、Google Maps、NFC名片、AI Chatbot，打造地區數位生態平台
對外延伸：透過 Lv.0 訪客入口，讓非會員也能接觸扶輪，增加潛在社友招募機會$project_description$)
where slug = 'rotary-passport-2';
