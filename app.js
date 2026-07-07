/* global Chart, DASHBOARD_API_URL */
'use strict';

const CALLBACK_NAME = 'cdiDashboardCallback';
const charts = {};

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('refreshButton').addEventListener('click', loadDashboard);
  loadDashboard();
});

function loadDashboard() {
  hideNotice('errorNotice');

  if (!DASHBOARD_API_URL || DASHBOARD_API_URL.includes('PASTE_YOUR_APPS_SCRIPT')) {
    showNotice('setupNotice');
    setStatus('ยังไม่ได้ตั้งค่า API', false);
    return;
  }

  hideNotice('setupNotice');
  setStatus('กำลังโหลดข้อมูล...', false);
  setRefreshDisabled(true);

  window[CALLBACK_NAME] = function (payload) {
    try {
      if (!payload || payload.success !== true) {
        throw new Error(
          payload && payload.message
            ? payload.message
            : 'API ส่งข้อมูลกลับมาไม่ถูกต้อง'
        );
      }

      renderDashboard(payload);
      setStatus('เชื่อมต่อข้อมูลสำเร็จ', true);
    } catch (error) {
      showDashboardError(error);
    } finally {
      cleanupJsonp();
      setRefreshDisabled(false);
    }
  };

  const script = document.createElement('script');
  script.id = 'dashboardJsonpScript';
  script.src =
    DASHBOARD_API_URL +
    '?callback=' +
    encodeURIComponent(CALLBACK_NAME) +
    '&t=' +
    Date.now();

  script.onerror = function () {
    showDashboardError(
      new Error(
        'เชื่อมต่อ Apps Script API ไม่สำเร็จ กรุณาตรวจสอบ URL และสิทธิ์ของ Web App'
      )
    );
    cleanupJsonp();
    setRefreshDisabled(false);
  };

  document.body.appendChild(script);
}

function cleanupJsonp() {
  const oldScript = document.getElementById('dashboardJsonpScript');
  if (oldScript) oldScript.remove();
}

function renderDashboard(data) {
  setText('totalCount', formatNumber(data.summary.total));
  setText('normalCount', metricDisplay(data.summary.normal));
  setText('followUpCount', metricDisplay(data.summary.followUp));
  setText('urgentCount', metricDisplay(data.summary.urgent));

  setText(
    'privacyNote',
    data.privacy && data.privacy.note
      ? data.privacy.note
      : 'ข้อมูลสรุปที่ไม่ระบุตัวบุคคล'
  );

  setText(
    'suppressionNote',
    data.privacy && data.privacy.suppressionRule
      ? 'กฎการปกปิดข้อมูล: ' + data.privacy.suppressionRule
      : ''
  );

  setText('lastUpdated', formatDateTime(data.generatedAt));

  renderResultChart(data.resultDistribution || []);
  renderSchoolChart(data.schools || []);
  renderGradeChart(data.grades || []);
  renderMonthChart(data.months || []);
}

function renderResultChart(items) {
  const visible = items.filter(function (item) {
    return item.metric && item.metric.value !== null;
  });

  replaceChart('resultChart', {
    type: 'doughnut',
    data: {
      labels: visible.map(function (item) { return item.label; }),
      datasets: [{
        data: visible.map(function (item) { return item.metric.value; }),
        borderWidth: 2
      }]
    },
    options: baseOptions({
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 14, usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.label + ': ' + formatNumber(context.raw) + ' รายการ';
            }
          }
        }
      }
    })
  });
}

function renderSchoolChart(items) {
  replaceChart('schoolChart', {
    type: 'bar',
    data: {
      labels: items.map(function (item) { return item.label; }),
      datasets: createResultDatasets(items)
    },
    options: baseOptions({
      scales: {
        x: {
          stacked: true,
          ticks: { maxRotation: 0, autoSkip: false }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { precision: 0 },
          title: { display: true, text: 'จำนวนรายการ' }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true }
        }
      }
    })
  });
}

function renderGradeChart(items) {
  replaceChart('gradeChart', {
    type: 'bar',
    data: {
      labels: items.map(function (item) { return item.label; }),
      datasets: createResultDatasets(items)
    },
    options: baseOptions({
      indexAxis: 'y',
      scales: {
        x: {
          stacked: true,
          beginAtZero: true,
          ticks: { precision: 0 },
          title: { display: true, text: 'จำนวนรายการ' }
        },
        y: { stacked: true }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true }
        }
      }
    })
  });
}

function renderMonthChart(items) {
  const visible = items.filter(function (item) {
    return item.total && item.total.value !== null;
  });

  replaceChart('monthChart', {
    type: 'line',
    data: {
      labels: visible.map(function (item) { return item.label; }),
      datasets: [{
        label: 'จำนวนการคัดกรอง',
        data: visible.map(function (item) { return item.total.value; }),
        tension: 0.25,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: baseOptions({
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          title: { display: true, text: 'จำนวนรายการ' }
        }
      },
      plugins: { legend: { display: false } }
    })
  });
}

function createResultDatasets(items) {
  return [
    {
      label: 'ไม่ถึงเกณฑ์',
      data: items.map(function (item) { return chartValue(item.normal); })
    },
    {
      label: 'ติดตาม/ส่งต่อ',
      data: items.map(function (item) { return chartValue(item.followUp); })
    },
    {
      label: 'เร่งด่วน',
      data: items.map(function (item) { return chartValue(item.urgent); })
    },
    {
      label: 'ข้อมูลไม่ครบ',
      data: items.map(function (item) { return chartValue(item.incomplete); })
    }
  ];
}

function chartValue(metric) {
  return metric && metric.value !== null ? metric.value : null;
}

function metricDisplay(metric) {
  if (!metric) return '—';
  return metric.display !== undefined ? metric.display : '—';
}

function replaceChart(canvasId, config) {
  if (charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId] = new Chart(document.getElementById(canvasId), config);
}

function baseOptions(overrides) {
  return mergeObjects(
    {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      interaction: { mode: 'nearest', intersect: false }
    },
    overrides || {}
  );
}

function mergeObjects(base, extra) {
  const result = Object.assign({}, base);

  Object.keys(extra).forEach(function (key) {
    const baseValue = result[key];
    const extraValue = extra[key];

    if (
      baseValue &&
      extraValue &&
      typeof baseValue === 'object' &&
      typeof extraValue === 'object' &&
      !Array.isArray(baseValue) &&
      !Array.isArray(extraValue)
    ) {
      result[key] = mergeObjects(baseValue, extraValue);
    } else {
      result[key] = extraValue;
    }
  });

  return result;
}

function showDashboardError(error) {
  setText(
    'errorMessage',
    error && error.message ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
  );
  showNotice('errorNotice');
  setStatus('เชื่อมต่อข้อมูลไม่สำเร็จ', false);
}

function setStatus(message, success) {
  setText('statusText', message);
  document.getElementById('statusDot')
    .classList.toggle('status-success', Boolean(success));
}

function setRefreshDisabled(disabled) {
  const button = document.getElementById('refreshButton');
  button.disabled = disabled;
  button.textContent = disabled ? 'กำลังอัปเดต...' : 'อัปเดตข้อมูล';
}

function showNotice(id) {
  document.getElementById(id).classList.remove('hidden');
}

function hideNotice(id) {
  document.getElementById(id).classList.add('hidden');
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('th-TH').format(number)
    : '—';
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok'
  }).format(date);
}
