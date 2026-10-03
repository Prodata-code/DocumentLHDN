# Sistem Rekod LHDN - Setup Guide

Welcome to the setup guide for your custom LHDN Record System! Because this system uses **Google Sheets as its database**, you need to complete a quick one-time setup on your Google account. This process takes about 5 minutes.

---

## Step 1: Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/) and create a **Blank** spreadsheet.
2. Name the spreadsheet anything you like (e.g., `Database LHDN 2026`).

## Step 2: Create the Tabs (Sheets)

At the bottom of your spreadsheet, create the following **5 tabs**. **Make sure the names are typed EXACTLY as shown below (no extra spaces)**:

### 1. `Users`
Create the following headers in Row 1 (A1 to D1):
* **Username** | **Password** | **Name** | **Role**
* *Example Row 2:* `admin` | `password123` | `Ali Bin Abu` | `Admin`

### 2. `IncomeExpense`
Create the following headers in Row 1:
* **Tarikh** | **Jenis** | **Kategori** | **Jumlah (RM)** | **Nota**

### 3. `ZakatInsurance`
Create the following headers in Row 1:
* **Tarikh** | **Kategori** | **Institusi** | **No Polisi** | **Jumlah (RM)**

### 4. `Assets`
Create the following headers in Row 1:
* **Tarikh** | **Kategori** | **Nama Aset** | **Harga Beli (RM)** | **Nota**

### 5. `MasterData`
Create the following headers in Row 1:
* **Kategori Pendapatan** | **Kategori Perbelanjaan** | **Kategori Aset**
* *Fill the columns below with your choices (e.g., Jualan, Gaji Pekerja, Sewa Kedai, Peralatan).*

---

## Step 3: Install the Google Apps Script

1. In your Google Sheet, click on **Extensions** in the top menu, then click **Apps Script**.
2. A new tab will open with some default code (usually `function myFunction() {...}`).
3. **Delete all the text** in that file.
4. Copy all the text from the `gas/code.gs` file in this repository, and **Paste** it into the Apps Script editor.
5. Click the **Save** icon (floppy disk) at the top.

---

## Step 4: Deploy the Script to get your Database URL

1. In the Apps Script editor, look at the top right corner and click the blue **Deploy** button, then select **New deployment**.
2. In the "Select type" gear icon (⚙️) on the left, check **Web app**.
3. Fill in the details:
   * **Description**: `LHDN Backend v1` (or anything you like)
   * **Execute as**: `Me (your email)`
   * **Who has access**: `Anyone` *(This is crucial! Set it to "Anyone" so the app can communicate with it).*
4. Click **Deploy**.
5. Google will ask you to authorize access. Click **Authorize access**, select your Google account, click **Advanced** at the bottom, and click **Go to Untitled project (unsafe)**. Finally, click **Allow**.
6. You will see a screen with a **Web app URL**. Copy this entire link (it starts with `https://script.google.com/macros/s/...`).

---

## Step 5: Connect the App

1. Open the file `js/config.js` in this repository.
2. Find the line that says `const GAS_URL = "PASTE_YOUR_URL_HERE";`
3. Replace `"PASTE_YOUR_URL_HERE"` with the Web app URL you copied in Step 4. Keep the quotation marks!
4. Save the file.

### 🎉 You're Done!
Your app is now connected to your Google Sheet. Any data entered on the website will be instantly saved to your spreadsheet, and you can log in using the username/password you set in the `Users` tab!