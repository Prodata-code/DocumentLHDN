// Ensure GAS_URL is defined
if (typeof GAS_URL === 'undefined') {
    alert("Sila tetapkan GAS_URL dalam fail js/config.js terlebih dahulu.");
}

// Global Variables
let currentUser = null;
let currentScreen = 'dashboard';
let charts = {}; // Store chart instances
let allData = {
    incomeExpense: [],
    zakatInsurance: [],
    assets: [],
    masterData: { income: [], expense: [], asset: [] }
};

// UI Elements
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const loginForm = document.getElementById('login-form');
const syncStatus = document.getElementById('sync-status');
const toastContainer = document.getElementById('toast-container');

// ---- API HELPER FUNCTION ----
async function apiCall(action, data = {}) {
    setSyncStatus('Menyegerak...', 'yellow');
    try {
        // If it's the login action, the data object will contain the provided credentials.
        // For all other actions, grab the cached password to send for authentication.
        const authData = action === 'login' ? data : {
            username: currentUser?.username,
            password: currentUser?.password
        };

        const payload = { action, ...authData, ...data };

        // Convert payload to URL search parameters for GET request
        const params = new URLSearchParams();
        for (const key in payload) {
            // Stringify objects/arrays before sending in URL
            if (typeof payload[key] === 'object') {
                params.append(key, JSON.stringify(payload[key]));
            } else {
                params.append(key, payload[key]);
            }
        }

        const response = await fetch(`${GAS_URL}?${params.toString()}`, {
            method: 'GET'
        });

        const result = await response.json();

        if (result.success) {
            setSyncStatus('Online', 'green');
            return result;
        } else {
            throw new Error(result.message || "Ralat tidak diketahui.");
        }
    } catch (error) {
        setSyncStatus('Offline / Ralat', 'red');
        showToast(error.message, 'error');
        return { success: false, message: error.message };
    }
}

function setSyncStatus(text, color) {
    if(syncStatus) {
        syncStatus.textContent = text;
        syncStatus.className = `font-bold text-${color}-500`;
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : (type === 'error' ? 'bg-red-500' : 'bg-blue-500');
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');

    toast.className = `${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 toast-enter w-64 md:w-80`;
    toast.innerHTML = `<i class="fas ${icon}"></i><span class="flex-1 text-sm">${message}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.replace('toast-enter', 'toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ---- AUTHENTICATION ----
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    btn.textContent = 'Log Masuk...';
    btn.disabled = true;

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const res = await apiCall('login', { username, password });

    if (res.success) {
        currentUser = res.user;
        currentUser.password = password; // Store locally for subsequent authenticated requests
        loginScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        showToast(`Selamat datang, ${currentUser.name}!`);
        initializeApp();
    }

    btn.textContent = 'Log Masuk';
    btn.disabled = false;
});

function logout() {
    currentUser = null;
    mainApp.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    document.getElementById('password').value = '';
}

// ---- NAVIGATION ----
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen-content').forEach(s => s.style.display = 'none');

    // Show selected
    document.getElementById(`screen-${screenId}`).style.display = 'block';

    // Update Sidebar highlighting
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.target === screenId) {
            item.classList.add('bg-indigo-500/10', 'text-indigo-400');
            item.classList.remove('hover:bg-slate-800', 'hover:text-white', 'text-slate-300');
        } else {
            item.classList.remove('bg-indigo-500/10', 'text-indigo-400');
            item.classList.add('hover:bg-slate-800', 'hover:text-white', 'text-slate-300');
        }
    });

    // Update Mobile Nav styling
    const mobileNavs = document.getElementById('mobile-nav').querySelectorAll('a');
    mobileNavs.forEach(nav => {
        if(nav.dataset.target === screenId) {
            nav.classList.add('text-indigo-400');
            nav.classList.remove('hover:text-slate-200');
        } else {
            nav.classList.remove('text-indigo-400');
            nav.classList.add('hover:text-slate-200');
        }
    });

    // Update Title
    const titles = {
        'dashboard': 'Ringkasan Dashboard',
        'income-expense': 'Pendapatan & Belanja',
        'zakat-insurance': 'Insurans & Zakat',
        'assets': 'Senarai Aset',
        'reports': 'Laporan LHDN',
        'master-data': 'Master Data'
    };
    document.getElementById('screen-title').textContent = titles[screenId];

    // Fetch data if needed based on screen
    if (screenId === 'dashboard') loadDashboard();
    if (screenId === 'income-expense') fetchRecords('IncomeExpense');
    if (screenId === 'zakat-insurance') fetchRecords('ZakatInsurance');
    if (screenId === 'assets') fetchRecords('Assets');
}

// ---- INITIALIZATION ----
async function initializeApp() {
    await fetchMasterData(); // Fetch categories for dropdowns
    loadDashboard();
}

const formatRM = (amount) => {
    return 'RM ' + parseFloat(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ---- DASHBOARD LOGIC ----
async function loadDashboard() {
    const res = await apiCall('getDashboard');
    if (res.success) {
        const d = res.data;
        document.getElementById('dash-income').textContent = formatRM(d.totalIncome);
        document.getElementById('dash-expense').textContent = formatRM(d.totalExpense);
        document.getElementById('dash-zakat').textContent = formatRM(d.totalZakatInsurance);
        document.getElementById('dash-profit').textContent = formatRM(d.profit);

        // Update Chart placeholder (requires fetching full IE data to make it dynamic, simplifying here)
        renderCharts(d.totalIncome, d.totalExpense, d.profit);
    }
}

function renderCharts(income, expense, profit) {
    // Cashflow Chart
    const ctx1 = document.getElementById('cashflowChart').getContext('2d');
    if (charts.cashflow) charts.cashflow.destroy();

    charts.cashflow = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['Pendapatan', 'Perbelanjaan', 'Untung Bersih'],
            datasets: [{
                label: 'Jumlah (RM)',
                data: [income, expense, profit],
                backgroundColor: ['#22c55e', '#ef4444', '#3b82f6'],
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Expense Chart (Dummy data for now, ideally parsed from actual records)
    const ctx2 = document.getElementById('expenseChart').getContext('2d');
    if (charts.expense) charts.expense.destroy();

    charts.expense = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['Sewaan', 'Gaji', 'Utiliti', 'Lain-lain'],
            datasets: [{
                data: [40, 30, 20, 10], // Placeholder percentages
                backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#6b7280']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ---- UTILITY ----
function escapeHTML(str) {
    if (typeof str !== 'string') str = String(str);
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// ---- MASTER DATA LOGIC ----
async function fetchMasterData() {
    const res = await apiCall('getRecords', { sheetName: 'MasterData' });
    if (res.success && res.data) {
        const data = res.data;
        let inc = [], exp = [], ast = [];

        data.forEach(row => {
            if (row['Kategori Pendapatan']) inc.push(row['Kategori Pendapatan']);
            if (row['Kategori Perbelanjaan']) exp.push(row['Kategori Perbelanjaan']);
            if (row['Kategori Aset']) ast.push(row['Kategori Aset']);
        });

        allData.masterData = { income: inc, expense: exp, asset: ast };
        updateMasterDataUI();
        updateDropdowns();
        if(currentScreen === 'master-data') showToast('Master data dikemaskini');
    }
}

function updateMasterDataUI() {
    const incList = document.getElementById('md-income-list');
    const expList = document.getElementById('md-expense-list');
    const astList = document.getElementById('md-asset-list');

    incList.innerHTML = allData.masterData.income.map(i => `<li>${escapeHTML(i)}</li>`).join('') || '<li>Tiada Data</li>';
    expList.innerHTML = allData.masterData.expense.map(i => `<li>${escapeHTML(i)}</li>`).join('') || '<li>Tiada Data</li>';
    astList.innerHTML = allData.masterData.asset.map(i => `<li>${escapeHTML(i)}</li>`).join('') || '<li>Tiada Data</li>';
}

function updateDropdowns() {
    // Income/Expense Form
    const typeSelect = document.getElementById('ie-type');
    const catSelect = document.getElementById('ie-category');

    const fillCategories = () => {
        const type = typeSelect.value;
        const list = type === 'Pendapatan' ? allData.masterData.income : allData.masterData.expense;
        catSelect.innerHTML = '<option value="">Pilih Kategori...</option>' +
                              list.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
    };

    typeSelect.addEventListener('change', fillCategories);
    fillCategories(); // Init

    // Asset Form
    const assetCatSelect = document.getElementById('a-category');
    assetCatSelect.innerHTML = '<option value="">Pilih Kategori...</option>' +
                               allData.masterData.asset.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
}


// ---- FORMS AND RECORDS LOGIC ----

// Generic Fetch function
async function fetchRecords(sheetName) {
    const res = await apiCall('getRecords', { sheetName });
    if (res.success) {
        if (sheetName === 'IncomeExpense') {
            allData.incomeExpense = res.data;
            renderTable('table-ie', res.data, ['Tarikh', 'Jenis', 'Kategori', 'Nota', 'Jumlah (RM)']);
        }
        if (sheetName === 'ZakatInsurance') {
            allData.zakatInsurance = res.data;
            renderTable('table-zakat', res.data, ['Tarikh', 'Kategori', 'Institusi', 'No Polisi', 'Jumlah (RM)']);
        }
        if (sheetName === 'Assets') {
            allData.assets = res.data;
            renderTable('table-assets', res.data, ['Tarikh', 'Kategori', 'Nama Aset', 'Nota', 'Harga Beli (RM)']);
        }
    }
}

// Generic Render Table function
function renderTable(tbodyId, dataArray, keys) {
    const tbody = document.getElementById(tbodyId);
    if (dataArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${keys.length}" class="text-center p-4 text-gray-500">Tiada rekod dijumpai.</td></tr>`;
        return;
    }

    // Sort by date descending (assuming 'Tarikh' exists)
    const sortedData = [...dataArray].reverse();

    tbody.innerHTML = sortedData.map(row => {
        let tr = '<tr class="border-b hover:bg-gray-50">';
        keys.forEach(key => {
            let val = row[key] || '';
            // Handle date formatting
            if(key.toLowerCase().includes('tarikh') && val) {
                 try { val = new Date(val).toLocaleDateString('ms-MY'); } catch(e){}
            }
            // Handle currency formatting
            let align = '';
            let isHtmlEscaped = false; // Flag to prevent double escaping

            if(key.toLowerCase().includes('jumlah') || key.toLowerCase().includes('harga')) {
                align = 'text-right font-medium';
                val = formatRM(val);
                isHtmlEscaped = true; // formatRM output is safe (just numbers/currency)
            }
            // Handle specific colors for Income/Expense
            else if(key === 'Jenis') {
                 let safeVal = escapeHTML(val);
                 val = `<span class="px-2 py-1 rounded text-xs ${safeVal==='Pendapatan' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${safeVal}</span>`;
                 isHtmlEscaped = true; // we just constructed safe HTML
            }

            if (!isHtmlEscaped) {
                val = escapeHTML(val);
            }

            tr += `<td class="p-3 ${align}">${val}</td>`;
        });
        tr += '</tr>';
        return tr;
    }).join('');
}

// Form Handlers
document.getElementById('form-income-expense').addEventListener('submit', async (e) => {
    e.preventDefault();
    const record = [
        document.getElementById('ie-date').value,
        document.getElementById('ie-type').value,
        document.getElementById('ie-category').value,
        document.getElementById('ie-amount').value,
        document.getElementById('ie-note').value
    ];
    const res = await apiCall('addRecord', { sheetName: 'IncomeExpense', record });
    if(res.success) {
        showToast('Rekod Kewangan ditambah');
        e.target.reset();
        fetchRecords('IncomeExpense');
    }
});

document.getElementById('form-zakat').addEventListener('submit', async (e) => {
    e.preventDefault();
    const record = [
        document.getElementById('z-date').value,
        document.getElementById('z-category').value,
        document.getElementById('z-institution').value,
        document.getElementById('z-receipt').value,
        document.getElementById('z-amount').value
    ];
    const res = await apiCall('addRecord', { sheetName: 'ZakatInsurance', record });
    if(res.success) {
        showToast('Rekod Zakat/Insurans ditambah');
        e.target.reset();
        fetchRecords('ZakatInsurance');
    }
});

document.getElementById('form-asset').addEventListener('submit', async (e) => {
    e.preventDefault();
    const record = [
        document.getElementById('a-date').value,
        document.getElementById('a-category').value,
        document.getElementById('a-name').value,
        document.getElementById('a-price').value,
        document.getElementById('a-note').value
    ];
    const res = await apiCall('addRecord', { sheetName: 'Assets', record });
    if(res.success) {
        showToast('Aset ditambah');
        e.target.reset();
        fetchRecords('Assets');
    }
});

// Search filters
function applySearch(inputId, tbodyId, keys) {
    document.getElementById(inputId).addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        let dataObj = [];
        if(inputId.includes('ie')) dataObj = allData.incomeExpense;
        if(inputId.includes('zakat')) dataObj = allData.zakatInsurance;
        if(inputId.includes('assets')) dataObj = allData.assets;

        const filtered = dataObj.filter(row => {
            return Object.values(row).some(val => String(val).toLowerCase().includes(query));
        });
        renderTable(tbodyId, filtered, keys);
    });
}

applySearch('search-ie', 'table-ie', ['Tarikh', 'Jenis', 'Kategori', 'Nota', 'Jumlah (RM)']);
applySearch('search-zakat', 'table-zakat', ['Tarikh', 'Kategori', 'Institusi', 'No Polisi', 'Jumlah (RM)']);
applySearch('search-assets', 'table-assets', ['Tarikh', 'Kategori', 'Nama Aset', 'Nota', 'Harga Beli (RM)']);


// ---- REPORT GENERATOR LOGIC ----
async function generateReport() {
    const year = document.getElementById('report-year').value;
    document.getElementById('display-report-year').textContent = year;

    // In a real scenario, we might want to fetch fresh data, but we'll use allData if populated
    if (allData.incomeExpense.length === 0) await fetchRecords('IncomeExpense');
    if (allData.zakatInsurance.length === 0) await fetchRecords('ZakatInsurance');
    if (allData.assets.length === 0) await fetchRecords('Assets');

    // Filter by year
    const filterByYear = (data) => data.filter(row => {
        try {
             return new Date(row['Tarikh']).getFullYear().toString() === year;
        } catch(e) { return false; }
    });

    const ieData = filterByYear(allData.incomeExpense);
    const zData = filterByYear(allData.zakatInsurance);
    const aData = filterByYear(allData.assets); // Or maybe assets shouldn't be filtered by year? Usually just total assets.

    // Calculate Incomes
    let incMap = {}; let totalInc = 0;
    // Calculate Expenses
    let expMap = {}; let totalExp = 0;

    ieData.forEach(row => {
        const cat = row['Kategori'];
        const amt = parseFloat(row['Jumlah (RM)']) || 0;
        if (row['Jenis'] === 'Pendapatan') {
            incMap[cat] = (incMap[cat] || 0) + amt;
            totalInc += amt;
        } else {
            expMap[cat] = (expMap[cat] || 0) + amt;
            totalExp += amt;
        }
    });

    // Render Income Table
    document.getElementById('report-income-table').innerHTML = Object.entries(incMap).map(([k, v]) => `
        <tr><td class="py-1">${escapeHTML(k)}</td><td class="text-right py-1">${formatRM(v)}</td></tr>
    `).join('') || '<tr><td colspan="2" class="text-gray-500 py-1">Tiada rekod pendapatan tahun ini.</td></tr>';
    document.getElementById('report-total-income').textContent = formatRM(totalInc);

    // Render Expense Table
    document.getElementById('report-expense-table').innerHTML = Object.entries(expMap).map(([k, v]) => `
        <tr><td class="py-1">${escapeHTML(k)}</td><td class="text-right py-1">${formatRM(v)}</td></tr>
    `).join('') || '<tr><td colspan="2" class="text-gray-500 py-1">Tiada rekod perbelanjaan tahun ini.</td></tr>';
    document.getElementById('report-total-expense').textContent = formatRM(totalExp);

    // Net Profit
    const netProfit = totalInc - totalExp;
    const npEl = document.getElementById('report-net-profit');
    npEl.textContent = formatRM(netProfit);
    npEl.className = netProfit >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold';

    // Deductions Table
    let zMap = {};
    zData.forEach(row => {
        const cat = row['Kategori'];
        zMap[cat] = (zMap[cat] || 0) + (parseFloat(row['Jumlah (RM)']) || 0);
    });

    document.getElementById('report-deductions-table').innerHTML = Object.entries(zMap).map(([k, v]) => `
        <tr><td class="py-1 border-b">${escapeHTML(k)}</td><td class="text-right py-1 border-b font-medium">${formatRM(v)}</td></tr>
    `).join('') || '<tr><td colspan="2" class="text-gray-500 py-1">Tiada rekod potongan.</td></tr>';

    // Total Assets (All time, not just this year, but we'll show just the sum of loaded data for simplicity)
    let totalAssets = 0;
    allData.assets.forEach(row => totalAssets += (parseFloat(row['Harga Beli (RM)']) || 0));
    document.getElementById('report-total-assets').textContent = formatRM(totalAssets);

    showToast('Laporan berjaya dijanakan.');
}
