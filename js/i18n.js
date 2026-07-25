// Tiny i18n: English + Arabic. Elements opt in with data-i18n / data-i18n-ph
// (placeholder) / data-i18n-html (trusted markup from this dictionary only).
"use strict";

const I18N = {
  en: {
    // status pill
    st_connecting: "CHECKING…",
    st_no_key: "NO API KEY",
    st_ready: "READY",
    st_thinking: "THINKING…",
    st_key_invalid: "KEY INVALID",
    // dev tools
    dt_toggle: "DEV TOOLS",
    dt_freelook: "free look (drag)",
    dt_demo: "DEMO SPIN",
    dt_reset: "RESET ROBOT",
    dt_settings: "API SETTINGS…",
    dt_spin: "column spin — ±360°",
    dt_outer: "outer columns — down",
    // control bar
    ext_rag: "RAG",
    ext_functions: "FUNCTIONS",
    ext_persona: "PERSONA",
    // chat
    chat_log: "// transmission log",
    chat_clear: "CLEAR",
    chat_ph: "Type a message…",
    chat_send: "SEND",
    // settings modal
    sm_title: "GEMINI API",
    sm_body: 'This page talks to Google\'s Gemini API straight from your browser. Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>.',
    sm_key: "API KEY",
    sm_model: "MODEL",
    sm_note: "The key is stored only in this browser (localStorage) and sent only to generativelanguage.googleapis.com. Use a free-tier key; revoke it anytime in AI Studio.",
    sm_save: "SAVE",
    sm_checking: "CHECKING…",
    sm_cancel: "CANCEL",
    sm_enter_key: "Enter an API key first.",
    sm_rejected: "Key rejected: ",
    // functions modal
    fn_title: "FUNCTIONS — ROBOT TOOLS",
    fn_note: "Each function below is offered to the model while its switch is ON — it can call them to drive the robot. Add your own, or LOAD EXAMPLE for the full robot API.",
    fn_empty: "No functions yet — ADD one or LOAD EXAMPLE.",
    fn_builtins: "📖 BUILT-IN FUNCTIONS — see what the robot can run",
    fn_add: "+ ADD FUNCTION",
    fn_example: "LOAD EXAMPLE",
    fn_close: "CLOSE",
    fn_ref_note: "These implementations exist in the page (shown Python-style for readability). Declare a function with one of these names and the model can trigger it — copy the pattern when building your own.",
    fn_back: "← BACK",
    fn_save: "SAVE FUNCTION",
    fn_copy: "COPY",
    fn_copied: "COPIED ✓",
    fn_active_tip: "Active - the model can call this",
    fn_inactive_tip: "Inactive - hidden from the model",
    fn_guide: "HOW TO WRITE A FUNCTION",
    // generic editors
    em_save: "SAVE",
    em_example: "LOAD EXAMPLE",
    em_clear: "CLEAR",
    em_sure: "SURE?",
    em_cancel: "CANCEL",
    em_saved: "SAVED ✓",
    em_chars: "chars",
    em_large: "— large; answers may slow down",
    rag_title: "RAG — KNOWLEDGE",
    rag_hint: "Paste documents, notes or facts. While non-empty, they are injected as reference context for every answer — ask about them and TARS will know.",
    persona_title: "PERSONALIZE — PERSONA",
    persona_hint: "A system prompt. While non-empty it is sent as the model's systemInstruction — personality, rules, style, anything.",
    // errors
    err_model_gone: "That model is no longer available — opening settings so you can pick a new one (a good default is preselected).",
    err_key: "API key rejected — click the status pill to update it.",
    err_quota: "Rate limit / quota exhausted — wait a minute or switch to a flash model (status pill → model).",
    err_network: "Network error — check your connection.",
    err_gemini: "Gemini error: ",
    err_blocked: "Request blocked — rephrase.",
    err_safety: "Response withheld by the safety filter.",
    err_malformed: "The model produced a malformed function call — try simpler declarations or another model.",
    err_toolloop: "Tool loop exceeded 5 rounds — aborted.",
    err_empty: "(empty response)",
    err_truncated: "…truncated",
  },

  ar: {
    st_connecting: "جارٍ التحقق…",
    st_no_key: "لا يوجد مفتاح API",
    st_ready: "جاهز",
    st_thinking: "يفكّر…",
    st_key_invalid: "المفتاح مرفوض",
    dt_toggle: "أدوات المطوّر",
    dt_freelook: "تحريك المنظر (اسحب)",
    dt_demo: "عرض الدوران",
    dt_reset: "إعادة الروبوت",
    dt_settings: "إعدادات API…",
    dt_spin: "دوران الأعمدة — ‎±360°",
    dt_outer: "الأعمدة الخارجية — لأسفل",
    ext_rag: "المعرفة RAG",
    ext_functions: "الدوال",
    ext_persona: "الشخصية",
    chat_log: "// سجل الإرسال",
    chat_clear: "مسح",
    chat_ph: "اكتب رسالة…",
    chat_send: "إرسال",
    sm_title: "GEMINI API",
    sm_body: 'هذه الصفحة تتصل بواجهة Gemini من Google مباشرة من متصفحك. احصل على مفتاح مجاني من <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>.',
    sm_key: "مفتاح API",
    sm_model: "النموذج",
    sm_note: "يُحفظ المفتاح في متصفحك فقط (localStorage) ولا يُرسل إلا إلى generativelanguage.googleapis.com. استخدم مفتاحًا مجانيًا ويمكنك إلغاؤه في أي وقت من AI Studio.",
    sm_save: "حفظ",
    sm_checking: "جارٍ التحقق…",
    sm_cancel: "إلغاء",
    sm_enter_key: "أدخل مفتاح API أولًا.",
    sm_rejected: "المفتاح مرفوض: ",
    fn_title: "الدوال — أدوات الروبوت",
    fn_note: "كل دالة أدناه تُعرض على النموذج ما دام مفتاحها مفعّلًا — يمكنه استدعاؤها لتحريك الروبوت. أضف دوالك، أو حمّل المثال لواجهة الروبوت كاملة.",
    fn_empty: "لا توجد دوال بعد — أضف واحدة أو حمّل المثال.",
    fn_builtins: "📖 الدوال المدمجة — ماذا يستطيع الروبوت أن ينفّذ",
    fn_add: "+ إضافة دالة",
    fn_example: "تحميل المثال",
    fn_close: "إغلاق",
    fn_ref_note: "هذه هي التنفيذات الموجودة في الصفحة (معروضة بأسلوب بايثون للتوضيح). عرّف دالة بأحد هذه الأسماء ليتمكن النموذج من تشغيلها — وانسج على منوالها عند بناء دوالك.",
    fn_back: "→ رجوع",
    fn_save: "حفظ الدالة",
    fn_copy: "نسخ",
    fn_copied: "تم النسخ ✓",
    fn_active_tip: "مفعّلة — يمكن للنموذج استدعاؤها",
    fn_inactive_tip: "معطّلة — مخفية عن النموذج",
    fn_guide: "كيف تكتب دالة",
    em_save: "حفظ",
    em_example: "تحميل المثال",
    em_clear: "مسح",
    em_sure: "متأكد؟",
    em_cancel: "إلغاء",
    em_saved: "تم الحفظ ✓",
    em_chars: "حرف",
    em_large: "— كبير؛ قد تتباطأ الإجابات",
    rag_title: "المعرفة — RAG",
    rag_hint: "الصق مستندات أو ملاحظات أو حقائق. ما دامت غير فارغة تُضاف كمرجع لكل إجابة — اسأل عنها وسيعرفها TARS.",
    persona_title: "الشخصية — PERSONA",
    persona_hint: "موجّه النظام. ما دام غير فارغ يُرسل كتعليمات للنموذج — شخصية وقواعد وأسلوب، أي شيء.",
    err_model_gone: "هذا النموذج لم يعد متاحًا — سنفتح الإعدادات لتختار نموذجًا آخر (تم اختيار بديل جيد مسبقًا).",
    err_key: "مفتاح API مرفوض — اضغط على شارة الحالة لتحديثه.",
    err_quota: "تم استهلاك الحصة/الحد — انتظر دقيقة أو بدّل إلى نموذج flash (شارة الحالة ← النموذج).",
    err_network: "خطأ في الشبكة — تحقق من اتصالك.",
    err_gemini: "خطأ من Gemini: ",
    err_blocked: "طلبك حُظر — أعد الصياغة.",
    err_safety: "حُجبت الإجابة بواسطة مرشّح الأمان.",
    err_malformed: "أنتج النموذج استدعاء دالة غير صالح — جرّب تعريفات أبسط أو نموذجًا آخر.",
    err_toolloop: "تجاوزت حلقة الأدوات 5 جولات — تم الإيقاف.",
    err_empty: "(رد فارغ)",
    err_truncated: "…مقتطع",
  },
};

let LANG = (typeof Store !== "undefined" && Store.get("lang")) || "en";

function t(key) {
  return I18N[LANG]?.[key] ?? I18N.en[key] ?? key;
}

function applyLanguage(lang) {
  LANG = lang;
  Store.set("lang", lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  document.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  const toggle = document.getElementById("lang-toggle");
  if (toggle) toggle.textContent = lang === "ar" ? "EN" : "ع";
}
