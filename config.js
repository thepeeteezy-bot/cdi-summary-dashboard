/**
 * วาง Apps Script Web App URL ที่ลงท้ายด้วย /exec
 */
const DASHBOARD_API_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

/**
 * อัปเดตอัตโนมัติทุก 10 วินาที
 * ไม่แนะนำให้ต่ำกว่า 5 วินาที เพราะอาจใช้โควตา Apps Script สูงเกินจำเป็น
 */
const AUTO_REFRESH_MS = 10000;
