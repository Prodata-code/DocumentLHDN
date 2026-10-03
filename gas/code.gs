const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// Handle incoming POST requests from the HTML frontend
function doPost(e) {
  try {
    // Parse the JSON payload sent by the frontend
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = {};

    // 1. Authenticate Request for EVERY action
    if (!data.username || !data.password) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Missing credentials.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const authCheck = loginUser(data.username, data.password);
    if (!authCheck.success) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Unauthorized.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Route the action to the appropriate function
    if (action === 'login') {
      result = authCheck; // Return the user object
    } else if (action === 'getDashboard') {
      result = getDashboardData();
    } else if (action === 'addRecord') {
      result = addRecord(data.sheetName, data.record);
    } else if (action === 'getRecords') {
      result = getRecords(data.sheetName);
    } else {
      result = { success: false, message: 'Invalid action' };
    }

    // Return the response as JSON
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Enable CORS for GET requests (useful for a quick ping test)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "GAS Web App is running. Use POST to interact." }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Function to handle user authentication
function loginUser(username, password) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  if (!sheet) return { success: false, message: "Sila pastikan sheet 'Users' wujud." };

  const data = sheet.getDataRange().getValues();
  // Assume Row 1 is header: [Username, Password, Name, Role]
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == username && data[i][1] == password) {
      return {
        success: true,
        user: { username: data[i][0], name: data[i][2], role: data[i][3] }
      };
    }
  }
  return { success: false, message: "ID Pengguna atau Kata Laluan salah" };
}

// Function to compile data for the dashboard
function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let totalIncome = 0;
  let totalExpense = 0;
  let totalZakatInsurance = 0;
  let totalAssets = 0;

  // 1. Income & Expense
  const incomeSheet = ss.getSheetByName("IncomeExpense");
  if (incomeSheet && incomeSheet.getLastRow() > 1) {
    const data = incomeSheet.getDataRange().getValues();
    // Headers: [Tarikh, Jenis, Kategori, Jumlah (RM), Nota]
    for (let i = 1; i < data.length; i++) {
      const type = data[i][1];
      const amount = parseFloat(data[i][3]) || 0;
      if (type === 'Pendapatan') totalIncome += amount;
      if (type === 'Perbelanjaan') totalExpense += amount;
    }
  }

  // 2. Zakat & Insurance
  const zakatSheet = ss.getSheetByName("ZakatInsurance");
  if (zakatSheet && zakatSheet.getLastRow() > 1) {
    const data = zakatSheet.getDataRange().getValues();
    // Headers: [Tarikh, Kategori, Institusi, No Polisi, Jumlah (RM)]
    for (let i = 1; i < data.length; i++) {
      totalZakatInsurance += parseFloat(data[i][4]) || 0;
    }
  }

  // 3. Assets
  const assetsSheet = ss.getSheetByName("Assets");
  if (assetsSheet && assetsSheet.getLastRow() > 1) {
    const data = assetsSheet.getDataRange().getValues();
    // Headers: [Tarikh, Kategori, Nama Aset, Harga Beli (RM), Nota]
    for (let i = 1; i < data.length; i++) {
      totalAssets += parseFloat(data[i][3]) || 0;
    }
  }

  const profit = totalIncome - totalExpense;

  return {
    success: true,
    data: {
      totalIncome: totalIncome,
      totalExpense: totalExpense,
      totalZakatInsurance: totalZakatInsurance,
      profit: profit,
      totalAssets: totalAssets
    }
  };
}

// Function to append a new row to a specific sheet
function addRecord(sheetName, recordArray) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { success: false, message: `Sila pastikan sheet '${sheetName}' wujud.` };

  sheet.appendRow(recordArray);
  return { success: true, message: "Rekod berjaya ditambah." };
}

// Function to read all rows from a specific sheet
function getRecords(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { success: false, message: `Sila pastikan sheet '${sheetName}' wujud.` };

  if (sheet.getLastRow() <= 1) {
    return { success: true, data: [] }; // Empty sheet (only headers)
  }

  const data = sheet.getDataRange().getDisplayValues();
  const headers = data[0];
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    let rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = data[i][j];
    }
    rows.push(rowObj);
  }

  return { success: true, data: rows };
}

// Function specifically to update Master Data drop-downs
// This can be expanded later if needed
function getMasterData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("MasterData");
  if (!sheet) return { success: false, message: "Sheet MasterData tidak dijumpai" };

  // Example structure: Column A = Income Categories, Col B = Expense Categories, Col C = Asset Categories
  const data = sheet.getDataRange().getDisplayValues();
  let result = {
    incomeCategories: [],
    expenseCategories: [],
    assetCategories: []
  };

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) result.incomeCategories.push(data[i][0]);
    if (data[i][1]) result.expenseCategories.push(data[i][1]);
    if (data[i][2]) result.assetCategories.push(data[i][2]);
  }

  return { success: true, data: result };
}
