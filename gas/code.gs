// Handle incoming GET requests from the HTML frontend (Bypasses POST restrictions)
function doGet(e) {
  try {
    // Parse the payload sent by the frontend via URL parameters
    const action = e.parameter.action;
    const username = e.parameter.username;
    const password = e.parameter.password;

    let result = {};

    // 1. Authenticate Request for EVERY action
    if (!username || !password) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Missing credentials.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const authCheck = loginUser(username, password);
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
      // For addRecord, the record array is passed as a JSON string in the URL
      const sheetName = e.parameter.sheetName;
      const record = JSON.parse(e.parameter.record);
      result = addRecord(sheetName, record);
    } else if (action === 'getRecords') {
      const sheetName = e.parameter.sheetName;
      result = getRecords(sheetName);
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

// Function to handle user authentication
function loginUser(username, password) {
  // Use getActiveSpreadsheet() so we don't need hardcoded IDs anymore
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  if (!sheet) return { success: false, message: "Sila pastikan sheet 'Users' wujud." };

  const data = sheet.getDataRange().getValues();
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

  const incomeSheet = ss.getSheetByName("IncomeExpense");
  if (incomeSheet && incomeSheet.getLastRow() > 1) {
    const data = incomeSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const type = data[i][1];
      const amount = parseFloat(data[i][3]) || 0;
      if (type === 'Pendapatan') totalIncome += amount;
      if (type === 'Perbelanjaan') totalExpense += amount;
    }
  }

  const zakatSheet = ss.getSheetByName("ZakatInsurance");
  if (zakatSheet && zakatSheet.getLastRow() > 1) {
    const data = zakatSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      totalZakatInsurance += parseFloat(data[i][4]) || 0;
    }
  }

  const assetsSheet = ss.getSheetByName("Assets");
  if (assetsSheet && assetsSheet.getLastRow() > 1) {
    const data = assetsSheet.getDataRange().getValues();
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

// Function to append a new row
function addRecord(sheetName, recordArray) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { success: false, message: `Sila pastikan sheet '${sheetName}' wujud.` };

  sheet.appendRow(recordArray);
  return { success: true, message: "Rekod berjaya ditambah." };
}

// Function to read all rows
function getRecords(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { success: false, message: `Sila pastikan sheet '${sheetName}' wujud.` };

  if (sheet.getLastRow() <= 1) {
    return { success: true, data: [] };
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

// Function to update Master Data
function getMasterData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("MasterData");
  if (!sheet) return { success: false, message: "Sheet MasterData tidak dijumpai" };

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
