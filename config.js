/**
 * วาง Apps Script Web App URL ที่ลงท้ายด้วย /exec
 */
const DASHBOARD_API_URL = 'https://script.google.com/macros/s/AKfycbwKGkFlCqjRh_VAknpZOmZ7PIcOB-yWb9ztWrmqiYaGP4oqZxvpHhm1eANc2NRCPXirTA/exec';

/**
 * อัปเดตอัตโนมัติทุก 10 วินาที
 * ไม่แนะนำให้ต่ำกว่า 5 วินาที เพราะอาจใช้โควตา Apps Script สูงเกินจำเป็น
 */
const AUTO_REFRESH_MS = 5000;
