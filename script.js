/**
 * MF STREAM INVOICE STUDIO - CLIENT ENGINE
 * Handles: Constant Persistence, Real-Time Calculations, Indian Rupee Words,
 *          Local Storage Auto-save, Print Optimization, and History Management.
 */

// ==========================================================================
// 1. DEFAULT CONSTANTS & STATE
// ==========================================================================

const DEFAULT_CONSTANTS = {
    companyName: "MATINEE FILMS PRIVATE LIMITED",
    address1: "Second Floor, Parson Building,",
    address2: "Vyttila, Ernakulam – 682019",
    address3: "Kerala, India",
    companyGstin: "",
    defaultTaxRate: 18,
    defaultTaxMode: "cgst_sgst", // 'cgst_sgst' or 'igst'
    bankAccountName: "Matinee Films Private Limited",
    bankName: "",
    bankAccNo: "",
    bankIfsc: "",
    bankUpi: "",
    footerCompany: "MF Stream – Matinee Films Pvt. Ltd.",
    footerPhone: "+91 88482 31721",
    footerEmail: "admin@mfstream.com",
    footerWebsite: "mfstream.com",
    sigTitle: "Authorised signatory",
    sigCompany: "Matinee Films Pvt. Ltd.",
    defaultNotes: "Payment is due by the due date shown above. Please quote the invoice number when making payment."
};

const SAMPLE_INVOICE_DATA = {
    invoiceNumber: "MFS-2026-001",
    invoiceDate: "25/10/2026",
    dueDate: "09/11/2026",
    poRef: "",
    clientName: "Client name",
    clientAddress1: "Client address line 1",
    clientCityStatePin: "City, State – PIN",
    clientGstin: "",
    clientContact: "",
    items: [
        { description: "Content licensing and streaming services", hsn: "998439", qty: 1, rate: 25000 },
        { description: "Platform setup and onboarding", hsn: "998313", qty: 1, rate: 5000 }
    ],
    discountType: "flat",
    discountValue: 0,
    taxRate: 18,
    taxMode: "cgst_sgst",
    notes: "Payment is due by the due date shown above. Please quote the invoice number when making payment."
};

// Application State
let currentConstants = { ...DEFAULT_CONSTANTS };
let currentInvoice = { ...SAMPLE_INVOICE_DATA };
let invoiceHistory = [];
let currentZoom = 1.0;

// Authentication Credentials
const AUTH_CREDENTIALS = {
    email: "mfstream@gmail.com",
    password: "admin123"
};

// Storage Keys
const STORAGE_KEY_CONSTANTS = "mfs_invoice_constants_v2";
const STORAGE_KEY_DRAFT = "mfs_invoice_active_draft_v2";
const STORAGE_KEY_HISTORY = "mfs_invoice_history_v2";
const STORAGE_KEY_AUTH = "mfs_auth_session_v1";

// ==========================================================================
// 2. INITIALIZATION & LIFECYCLE
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    loadConstantsFromStorage();
    loadDraftFromStorage();
    loadHistoryFromStorage();
    
    initEventHandlers();
    renderAll();
    setupAutoSave();
});

// ==========================================================================
// 2.5 AUTHENTICATION & ACCESS CONTROL
// ==========================================================================

function initAuth() {
    initAuthEventHandlers();
    checkAuthSession();
}

function checkAuthSession() {
    const sessionStr = localStorage.getItem(STORAGE_KEY_AUTH) || sessionStorage.getItem(STORAGE_KEY_AUTH);
    const overlay = document.getElementById("loginOverlay");
    const userProfilePill = document.getElementById("userProfilePill");

    if (sessionStr) {
        try {
            const data = JSON.parse(sessionStr);
            if (data && data.email) {
                // User is authenticated
                if (overlay) overlay.classList.add("hidden");
                if (userProfilePill) userProfilePill.style.display = "inline-flex";
                const label = document.getElementById("userEmailLabel");
                if (label) label.textContent = data.email;
                return true;
            }
        } catch (e) {
            console.warn("Invalid auth session data");
        }
    }

    // User is NOT authenticated
    if (overlay) overlay.classList.remove("hidden");
    if (userProfilePill) userProfilePill.style.display = "none";

    // Auto-focus email input
    setTimeout(() => {
        const emailField = document.getElementById("loginEmail");
        if (emailField) emailField.focus();
    }, 150);

    return false;
}

function initAuthEventHandlers() {
    // Login form submit
    document.getElementById("loginForm")?.addEventListener("submit", handleLoginSubmit);

    // Toggle password visibility
    document.getElementById("toggleLoginPasswordBtn")?.addEventListener("click", togglePasswordVisibility);

    // Logout button
    document.getElementById("headerLogoutBtn")?.addEventListener("click", handleLogout);
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const emailInput = document.getElementById("loginEmail");
    const passInput = document.getElementById("loginPassword");
    const rememberMe = document.getElementById("rememberMeCheck")?.checked;
    const errBox = document.getElementById("loginErrorMsg");

    const email = (emailInput?.value || "").trim().toLowerCase();
    const pass = passInput?.value || "";

    if (errBox) {
        errBox.style.display = "none";
        errBox.textContent = "";
    }

    // Validate against mfstream@gmail.com and admin123
    if (email === AUTH_CREDENTIALS.email.toLowerCase() && pass === AUTH_CREDENTIALS.password) {
        // Successful login
        const sessionData = {
            email: AUTH_CREDENTIALS.email,
            signedInAt: Date.now()
        };

        if (rememberMe) {
            localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(sessionData));
        } else {
            sessionStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(sessionData));
        }

        const overlay = document.getElementById("loginOverlay");
        if (overlay) overlay.classList.add("hidden");

        const userProfilePill = document.getElementById("userProfilePill");
        if (userProfilePill) userProfilePill.style.display = "inline-flex";

        showToast("Welcome back, MF Stream Admin!");
    } else {
        // Failed login
        if (errBox) {
            errBox.textContent = "Invalid email or password. Please try again.";
            errBox.style.display = "block";
        }
        if (passInput) {
            passInput.value = "";
            passInput.focus();
        }
        // Shake card
        const card = document.querySelector(".login-card");
        if (card) {
            card.style.animation = "none";
            card.offsetHeight; /* trigger reflow */
            card.style.animation = "shakeError 0.3s ease";
        }
    }
}

function togglePasswordVisibility() {
    const pwInput = document.getElementById("loginPassword");
    const eyeOpen = document.getElementById("eyeIconOpen");
    const eyeClosed = document.getElementById("eyeIconClosed");

    if (!pwInput) return;
    if (pwInput.type === "password") {
        pwInput.type = "text";
        if (eyeOpen) eyeOpen.style.display = "none";
        if (eyeClosed) eyeClosed.style.display = "block";
    } else {
        pwInput.type = "password";
        if (eyeOpen) eyeOpen.style.display = "block";
        if (eyeClosed) eyeClosed.style.display = "none";
    }
}

function handleLogout() {
    if (confirm("Are you sure you want to sign out?")) {
        localStorage.removeItem(STORAGE_KEY_AUTH);
        sessionStorage.removeItem(STORAGE_KEY_AUTH);

        const emailInput = document.getElementById("loginEmail");
        if (emailInput) emailInput.value = "";

        const passInput = document.getElementById("loginPassword");
        if (passInput) passInput.value = "";

        const errBox = document.getElementById("loginErrorMsg");
        if (errBox) errBox.style.display = "none";

        checkAuthSession();
        showToast("Signed out successfully.");
    }
}

// ==========================================================================
// 3. STORAGE FUNCTIONS (PERSISTENCE)
// ==========================================================================

function loadConstantsFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_CONSTANTS);
        if (saved) {
            currentConstants = { ...DEFAULT_CONSTANTS, ...JSON.parse(saved) };
        } else {
            currentConstants = { ...DEFAULT_CONSTANTS };
            saveConstantsToStorage();
        }
    } catch (e) {
        console.error("Error loading constants:", e);
        currentConstants = { ...DEFAULT_CONSTANTS };
    }
}

function saveConstantsToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_CONSTANTS, JSON.stringify(currentConstants));
        flashSaveIndicator();
    } catch (e) {
        console.error("Error saving constants:", e);
    }
}

function loadDraftFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_DRAFT);
        if (saved) {
            currentInvoice = { ...SAMPLE_INVOICE_DATA, ...JSON.parse(saved) };
        } else {
            currentInvoice = { ...SAMPLE_INVOICE_DATA };
        }
    } catch (e) {
        console.error("Error loading draft:", e);
        currentInvoice = { ...SAMPLE_INVOICE_DATA };
    }
}

function saveDraftToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(currentInvoice));
        flashSaveIndicator();
    } catch (e) {
        console.error("Error saving draft:", e);
    }
}

function loadHistoryFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
        if (saved) {
            invoiceHistory = JSON.parse(saved);
        } else {
            invoiceHistory = [];
        }
        updateHistoryCount();
    } catch (e) {
        invoiceHistory = [];
    }
}

function saveHistoryToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(invoiceHistory));
        updateHistoryCount();
    } catch (e) {
        console.error("Error saving history:", e);
    }
}

function flashSaveIndicator() {
    const textEl = document.getElementById("saveStatusText");
    if (!textEl) return;
    textEl.textContent = "Saved to browser";
    setTimeout(() => {
        textEl.textContent = "All changes auto-saved";
    }, 1500);
}

// ==========================================================================
// 4. RENDERING FUNCTIONS
// ==========================================================================

function renderAll() {
    applyConstantsToDOM();
    applyInvoiceToDOM();
    renderItemsTable();
    calculateTotals();
}

/**
 * Apply constant fields (company address, footer, banking) to DOM
 */
function applyConstantsToDOM() {
    // FROM Card
    setVal("fromCompanyName", currentConstants.companyName);
    setVal("fromAddress1", currentConstants.address1);
    setVal("fromAddress2", currentConstants.address2);
    setVal("fromAddress3", currentConstants.address3);
    setVal("fromGstin", currentConstants.companyGstin);

    // Bank Details
    setVal("bankAccountName", currentConstants.bankAccountName);
    setVal("bankName", currentConstants.bankName);
    setVal("bankAccNo", currentConstants.bankAccNo);
    setVal("bankIfsc", currentConstants.bankIfsc);
    setVal("bankUpi", currentConstants.bankUpi);

    // Signatory & Footer
    setText("dispSigTitle", currentConstants.sigTitle);
    setText("dispSigCompany", currentConstants.sigCompany);
    setText("footerCompany", currentConstants.footerCompany);
    setText("footerPhone", currentConstants.footerPhone);
    setText("footerEmail", currentConstants.footerEmail);
    setText("footerWebsite", currentConstants.footerWebsite);

    // Default Tax Mode
    const taxModeSelect = document.getElementById("taxModeSelect");
    if (taxModeSelect && currentInvoice.taxMode) {
        taxModeSelect.value = currentInvoice.taxMode;
    }
}

/**
 * Apply per-invoice fields to DOM
 */
function applyInvoiceToDOM() {
    setVal("invNumber", currentInvoice.invoiceNumber);
    setVal("invDate", currentInvoice.invoiceDate);
    setVal("invDueDate", currentInvoice.dueDate);
    setVal("invPoRef", currentInvoice.poRef || "");

    setVal("clientName", currentInvoice.clientName);
    setVal("clientAddress1", currentInvoice.clientAddress1);
    setVal("clientCityStatePin", currentInvoice.clientCityStatePin);
    setVal("clientGstin", currentInvoice.clientGstin || "");
    setVal("clientContact", currentInvoice.clientContact || "");

    setVal("discountTypeSelect", currentInvoice.discountType || "flat");
    setVal("discountValueInput", currentInvoice.discountValue || 0);
    setVal("gstRateInput", currentInvoice.taxRate ?? currentConstants.defaultTaxRate);
    setVal("invoiceNotes", currentInvoice.notes ?? currentConstants.defaultNotes);
}

/**
 * Render items table rows
 */
function renderItemsTable() {
    const tbody = document.getElementById("itemsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!currentInvoice.items || currentInvoice.items.length === 0) {
        currentInvoice.items = [{ description: "", hsn: "", qty: 1, rate: 0 }];
    }

    currentInvoice.items.forEach((item, index) => {
        const row = document.createElement("tr");
        const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);

        row.innerHTML = `
            <td class="row-idx">${index + 1}</td>
            <td>
                <input type="text" class="table-input item-desc" data-index="${index}" value="${escapeHtml(item.description)}" placeholder="Item or service description">
            </td>
            <td>
                <input type="text" class="table-input text-center item-hsn" data-index="${index}" value="${escapeHtml(item.hsn || '')}" placeholder="HSN/SAC">
            </td>
            <td>
                <input type="number" class="table-input text-center item-qty" data-index="${index}" value="${item.qty}" min="0" step="any">
            </td>
            <td>
                <input type="number" class="table-input text-right item-rate" data-index="${index}" value="${item.rate}" min="0" step="any">
            </td>
            <td class="text-right amount-cell">
                ${formatIndianCurrency(amount)}
            </td>
            <td class="col-action no-print">
                <button type="button" class="btn-delete-row" data-index="${index}" title="Remove item">✕</button>
            </td>
        `;

        tbody.appendChild(row);
    });

    attachTableInputListeners();
}

// ==========================================================================
// 5. CALCULATION ENGINE & AMOUNT IN WORDS
// ==========================================================================

function calculateTotals() {
    // 1. Calculate Subtotal from items
    let subtotal = 0;
    (currentInvoice.items || []).forEach(item => {
        const qty = parseFloat(item.qty) || 0;
        const rate = parseFloat(item.rate) || 0;
        subtotal += qty * rate;
    });

    // 2. Calculate Discount
    const discType = document.getElementById("discountTypeSelect")?.value || "flat";
    const rawDiscVal = parseFloat(document.getElementById("discountValueInput")?.value) || 0;
    let discountAmount = 0;

    if (discType === "percent") {
        discountAmount = (subtotal * Math.min(100, Math.max(0, rawDiscVal))) / 100;
    } else {
        discountAmount = Math.min(subtotal, Math.max(0, rawDiscVal));
    }

    // 3. Taxable Value
    const taxableValue = Math.max(0, subtotal - discountAmount);

    // 4. GST Taxes
    const taxRate = parseFloat(document.getElementById("gstRateInput")?.value) || 0;
    const taxMode = document.getElementById("taxModeSelect")?.value || "cgst_sgst";

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let totalTax = 0;

    const cgstRow = document.querySelector(".cgst-row");
    const sgstRow = document.querySelector(".sgst-row");
    const igstRow = document.querySelector(".igst-row");

    if (taxMode === "igst") {
        igstAmount = (taxableValue * taxRate) / 100;
        totalTax = igstAmount;
        if (cgstRow) cgstRow.style.display = "none";
        if (sgstRow) sgstRow.style.display = "none";
        if (igstRow) igstRow.style.display = "flex";
        setText("igstLabel", `IGST (${taxRate}%)`);
        setText("dispIgstVal", formatIndianCurrency(igstAmount));
    } else {
        const halfRate = taxRate / 2;
        cgstAmount = (taxableValue * halfRate) / 100;
        sgstAmount = (taxableValue * halfRate) / 100;
        totalTax = cgstAmount + sgstAmount;
        if (cgstRow) cgstRow.style.display = "flex";
        if (sgstRow) sgstRow.style.display = "flex";
        if (igstRow) igstRow.style.display = "none";
        setText("cgstLabel", `CGST (${halfRate}%)`);
        setText("sgstLabel", `SGST (${halfRate}%)`);
        setText("dispCgstVal", formatIndianCurrency(cgstAmount));
        setText("dispSgstVal", formatIndianCurrency(sgstAmount));
    }

    // 5. Total with Tax
    const rawTotal = taxableValue + totalTax;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = roundedTotal - rawTotal;

    // 6. Update Totals in DOM
    setText("dispSubtotal", formatIndianCurrency(subtotal));
    setText("dispDiscountVal", `- ${formatIndianCurrency(discountAmount)}`);
    setText("dispTaxableValue", formatIndianCurrency(taxableValue));
    
    // Round off display: +0.20 or -0.35 or ₹0.00
    if (Math.abs(roundOff) < 0.005) {
        setText("dispRoundOff", "₹0.00");
    } else {
        const sign = roundOff > 0 ? "+" : "-";
        setText("dispRoundOff", `${sign} ₹${Math.abs(roundOff).toFixed(2)}`);
    }

    setText("dispTotalDue", formatIndianCurrency(roundedTotal));

    // 7. Amount in Words
    const words = convertNumberToIndianWords(roundedTotal);
    setText("dispAmountInWords", words);

    // Save active invoice state
    currentInvoice.subtotal = subtotal;
    currentInvoice.discountType = discType;
    currentInvoice.discountValue = rawDiscVal;
    currentInvoice.taxRate = taxRate;
    currentInvoice.taxMode = taxMode;
    currentInvoice.totalDue = roundedTotal;

    // Trigger debounced draft save
    debouncedSaveDraft();
}

/**
 * High quality Indian Numbering System Converter (Crores, Lakhs, Thousands, Hundreds)
 */
function convertNumberToIndianWords(num) {
    if (isNaN(num) || num === 0) return "Rupees Zero Only";
    
    const ones = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = [
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];

    function convertTwoDigits(n) {
        if (n < 20) return ones[n];
        const t = Math.floor(n / 10);
        const o = n % 10;
        return tens[t] + (o !== 0 ? " " + ones[o] : "");
    }

    function convertThreeDigits(n) {
        const h = Math.floor(n / 100);
        const rem = n % 100;
        let str = "";
        if (h > 0) str += ones[h] + " Hundred";
        if (rem > 0) {
            if (str !== "") str += " and ";
            str += convertTwoDigits(rem);
        }
        return str;
    }

    let whole = Math.floor(Math.abs(num));
    let str = "";

    // Crores (>= 1,00,00,000)
    const crores = Math.floor(whole / 10000000);
    whole %= 10000000;

    // Lakhs (>= 1,00,000)
    const lakhs = Math.floor(whole / 100000);
    whole %= 100000;

    // Thousands (>= 1,000)
    const thousands = Math.floor(whole / 1000);
    whole %= 1000;

    // Remaining Hundreds
    const remainder = whole;

    if (crores > 0) {
        str += convertThreeDigits(crores) + " Crore ";
    }
    if (lakhs > 0) {
        str += convertTwoDigits(lakhs) + " Lakh ";
    }
    if (thousands > 0) {
        str += convertTwoDigits(thousands) + " Thousand ";
    }
    if (remainder > 0) {
        str += convertThreeDigits(remainder);
    }

    str = str.trim();
    if (!str) return "Rupees Zero Only";

    return `Rupees ${str} Only`;
}

/**
 * Format Indian Currency with ₹ and proper comma separators (e.g. ₹35,400.00, ₹1,50,000.00)
 */
function formatIndianCurrency(amount) {
    if (isNaN(amount)) return "₹0.00";
    
    const parts = Math.abs(amount).toFixed(2).split(".");
    let intPart = parts[0];
    const decPart = parts[1];

    // Indian comma logic: last 3 digits, then groups of 2 digits
    let lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    if (otherNumbers !== "") {
        lastThree = "," + lastThree;
    }
    const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;

    const prefix = amount < 0 ? "- ₹" : "₹";
    return `${prefix}${formattedInt}.${decPart}`;
}

// ==========================================================================
// 6. EVENT HANDLERS & AUTO-SYNC
// ==========================================================================

function initEventHandlers() {
    // 1. Add Row Button
    document.getElementById("addItemRowBtn")?.addEventListener("click", () => {
        currentInvoice.items.push({ description: "", hsn: "", qty: 1, rate: 0 });
        renderItemsTable();
        calculateTotals();
        showToast("Line item added");
    });

    // 2. Tax Mode Switcher
    document.getElementById("taxModeSelect")?.addEventListener("change", (e) => {
        currentInvoice.taxMode = e.target.value;
        calculateTotals();
    });

    // 3. Discount Controls
    document.getElementById("discountTypeSelect")?.addEventListener("change", calculateTotals);
    document.getElementById("discountValueInput")?.addEventListener("input", calculateTotals);
    document.getElementById("gstRateInput")?.addEventListener("input", calculateTotals);

    // 4. Meta Inputs
    bindInputToInvoice("invNumber", "invoiceNumber");
    bindInputToInvoice("invDate", "invoiceDate");
    bindInputToInvoice("invDueDate", "dueDate");
    bindInputToInvoice("invPoRef", "poRef");

    // 5. Client Inputs
    bindInputToInvoice("clientName", "clientName");
    bindInputToInvoice("clientAddress1", "clientAddress1");
    bindInputToInvoice("clientCityStatePin", "clientCityStatePin");
    bindInputToInvoice("clientGstin", "clientGstin");
    bindInputToInvoice("clientContact", "clientContact");
    bindInputToInvoice("invoiceNotes", "notes");

    // 6. Permanent Constants Editable Directly On Invoice
    bindInputToConstant("fromCompanyName", "companyName");
    bindInputToConstant("fromAddress1", "address1");
    bindInputToConstant("fromAddress2", "address2");
    bindInputToConstant("fromAddress3", "address3");
    bindInputToConstant("fromGstin", "companyGstin");

    bindInputToConstant("bankAccountName", "bankAccountName");
    bindInputToConstant("bankName", "bankName");
    bindInputToConstant("bankAccNo", "bankAccNo");
    bindInputToConstant("bankIfsc", "bankIfsc");
    bindInputToConstant("bankUpi", "bankUpi");

    // 7. Header Action Buttons
    document.getElementById("printInvoiceBtn")?.addEventListener("click", handlePrintInvoice);
    document.getElementById("newInvoiceBtn")?.addEventListener("click", handleNewInvoice);
    document.getElementById("saveInvoiceHistoryBtn")?.addEventListener("click", handleSaveToHistory);
    document.getElementById("openHistoryDrawerBtn")?.addEventListener("click", openHistoryDrawer);
    document.getElementById("closeHistoryDrawerBtn")?.addEventListener("click", closeHistoryDrawer);

    // 8. Settings Modal Controls
    document.getElementById("openSettingsBtn")?.addEventListener("click", openSettingsModal);
    document.getElementById("closeSettingsModalBtn")?.addEventListener("click", closeSettingsModal);
    document.getElementById("cancelSettingsModalBtn")?.addEventListener("click", closeSettingsModal);
    document.getElementById("saveConstantsBtn")?.addEventListener("click", saveModalConstants);
    document.getElementById("resetConstantsToDefaultBtn")?.addEventListener("click", resetConstantsToDefault);

    // 9. Reset to Sample Data
    document.getElementById("resetSampleDataBtn")?.addEventListener("click", handleResetSampleData);

    // 10. Drawer History Actions (Export & Import History)
    document.getElementById("exportHistoryJsonBtn")?.addEventListener("click", exportInvoiceHistoryJson);
    document.getElementById("exportHistoryCsvBtn")?.addEventListener("click", exportInvoiceHistoryCsv);
    document.getElementById("importHistoryJsonInput")?.addEventListener("change", importInvoiceHistoryJson);
    document.getElementById("clearAllHistoryBtn")?.addEventListener("click", clearAllHistory);

    // Legacy fallback support if present
    document.getElementById("exportAllJsonBtn")?.addEventListener("click", exportInvoiceHistoryJson);
    document.getElementById("importJsonInput")?.addEventListener("change", importInvoiceHistoryJson);

    // 11. Zoom Controls
    setupZoomControls();
}

/**
 * Bind input directly to currentInvoice draft and auto-save
 */
function bindInputToInvoice(elementId, invoiceProp) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.addEventListener("input", (e) => {
        currentInvoice[invoiceProp] = e.target.value;
        debouncedSaveDraft();
    });
}

/**
 * Bind input to constant and auto-save permanently to localStorage
 */
function bindInputToConstant(elementId, constantProp) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.addEventListener("input", (e) => {
        currentConstants[constantProp] = e.target.value;
        debouncedSaveConstants();
    });
}

/**
 * Attach listeners to table rows (Qty, Rate, Description, Delete)
 */
function attachTableInputListeners() {
    const tbody = document.getElementById("itemsTableBody");
    if (!tbody) return;

    // Description
    tbody.querySelectorAll(".item-desc").forEach(input => {
        input.addEventListener("input", (e) => {
            const idx = parseInt(e.target.dataset.index, 10);
            if (currentInvoice.items[idx]) {
                currentInvoice.items[idx].description = e.target.value;
                debouncedSaveDraft();
            }
        });
    });

    // HSN/SAC
    tbody.querySelectorAll(".item-hsn").forEach(input => {
        input.addEventListener("input", (e) => {
            const idx = parseInt(e.target.dataset.index, 10);
            if (currentInvoice.items[idx]) {
                currentInvoice.items[idx].hsn = e.target.value;
                debouncedSaveDraft();
            }
        });
    });

    // Qty & Rate
    tbody.querySelectorAll(".item-qty, .item-rate").forEach(input => {
        input.addEventListener("input", (e) => {
            const idx = parseInt(e.target.dataset.index, 10);
            const row = e.target.closest("tr");
            const qty = parseFloat(row.querySelector(".item-qty").value) || 0;
            const rate = parseFloat(row.querySelector(".item-rate").value) || 0;

            if (currentInvoice.items[idx]) {
                currentInvoice.items[idx].qty = qty;
                currentInvoice.items[idx].rate = rate;
            }

            // Update row amount cell immediately
            const amountCell = row.querySelector(".amount-cell");
            if (amountCell) {
                amountCell.textContent = formatIndianCurrency(qty * rate);
            }

            calculateTotals();
        });
    });

    // Delete Row
    tbody.querySelectorAll(".btn-delete-row").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.dataset.index, 10);
            if (currentInvoice.items.length <= 1) {
                // Clear row instead of deleting last row
                currentInvoice.items = [{ description: "", hsn: "", qty: 1, rate: 0 }];
            } else {
                currentInvoice.items.splice(idx, 1);
            }
            renderItemsTable();
            calculateTotals();
            showToast("Item removed");
        });
    });
}

// ==========================================================================
// 7. CONSTANTS MODAL LOGIC
// ==========================================================================

function openSettingsModal() {
    // Populate form with active constants
    setVal("cfgCompanyName", currentConstants.companyName);
    setVal("cfgAddress1", currentConstants.address1);
    setVal("cfgAddress2", currentConstants.address2);
    setVal("cfgAddress3", currentConstants.address3);
    setVal("cfgGstin", currentConstants.companyGstin);

    setVal("cfgTaxRate", currentConstants.defaultTaxRate);
    setVal("cfgDefaultTaxMode", currentConstants.defaultTaxMode);
    setVal("cfgBankAccName", currentConstants.bankAccountName);
    setVal("cfgBankName", currentConstants.bankName);
    setVal("cfgBankAccNo", currentConstants.bankAccNo);
    setVal("cfgBankIfsc", currentConstants.bankIfsc);
    setVal("cfgBankUpi", currentConstants.bankUpi);

    setVal("cfgFooterCompany", currentConstants.footerCompany);
    setVal("cfgFooterPhone", currentConstants.footerPhone);
    setVal("cfgFooterEmail", currentConstants.footerEmail);
    setVal("cfgFooterWebsite", currentConstants.footerWebsite);
    setVal("cfgSigTitle", currentConstants.sigTitle);
    setVal("cfgSigCompany", currentConstants.sigCompany);
    setVal("cfgDefaultNotes", currentConstants.defaultNotes);

    const modal = document.getElementById("settingsModal");
    if (modal) modal.classList.add("active");
}

function closeSettingsModal() {
    const modal = document.getElementById("settingsModal");
    if (modal) modal.classList.remove("active");
}

function saveModalConstants() {
    currentConstants.companyName = document.getElementById("cfgCompanyName").value.trim() || DEFAULT_CONSTANTS.companyName;
    currentConstants.address1 = document.getElementById("cfgAddress1").value.trim();
    currentConstants.address2 = document.getElementById("cfgAddress2").value.trim();
    currentConstants.address3 = document.getElementById("cfgAddress3").value.trim();
    currentConstants.companyGstin = document.getElementById("cfgGstin").value.trim();

    currentConstants.defaultTaxRate = parseFloat(document.getElementById("cfgTaxRate").value) || 18;
    currentConstants.defaultTaxMode = document.getElementById("cfgDefaultTaxMode").value;
    currentConstants.bankAccountName = document.getElementById("cfgBankAccName").value.trim();
    currentConstants.bankName = document.getElementById("cfgBankName").value.trim();
    currentConstants.bankAccNo = document.getElementById("cfgBankAccNo").value.trim();
    currentConstants.bankIfsc = document.getElementById("cfgBankIfsc").value.trim();
    currentConstants.bankUpi = document.getElementById("cfgBankUpi").value.trim();

    currentConstants.footerCompany = document.getElementById("cfgFooterCompany").value.trim();
    currentConstants.footerPhone = document.getElementById("cfgFooterPhone").value.trim();
    currentConstants.footerEmail = document.getElementById("cfgFooterEmail").value.trim();
    currentConstants.footerWebsite = document.getElementById("cfgFooterWebsite").value.trim();
    currentConstants.sigTitle = document.getElementById("cfgSigTitle").value.trim();
    currentConstants.sigCompany = document.getElementById("cfgSigCompany").value.trim();
    currentConstants.defaultNotes = document.getElementById("cfgDefaultNotes").value.trim();

    saveConstantsToStorage();
    applyConstantsToDOM();
    
    // Also update current invoice tax rate if user desires
    document.getElementById("gstRateInput").value = currentConstants.defaultTaxRate;
    document.getElementById("taxModeSelect").value = currentConstants.defaultTaxMode;
    calculateTotals();

    closeSettingsModal();
    showToast("✅ Permanent constants saved successfully!");
}

function resetConstantsToDefault() {
    if (confirm("Restore all constants (address, tax %, banking) to factory defaults?")) {
        currentConstants = { ...DEFAULT_CONSTANTS };
        saveConstantsToStorage();
        openSettingsModal(); // Refresh form values
        applyConstantsToDOM();
        calculateTotals();
        showToast("Restored to factory defaults");
    }
}

// ==========================================================================
// 8. ACTIONS: NEW INVOICE, PRINT, HISTORY & BACKUP
// ==========================================================================

function handlePrintInvoice() {
    // Automatically save active invoice into history before printing/downloading
    autoSaveCurrentToHistory();
    window.print();
}

function handleNewInvoice() {
    if (confirm("Create a new invoice? Company constants (address, bank, tax %) will be preserved.")) {
        // Auto-increment invoice number if it matches standard pattern (e.g. MFS-2026-001 -> MFS-2026-002)
        const oldNum = currentInvoice.invoiceNumber || "MFS-2026-001";
        const newNum = incrementInvoiceNumber(oldNum);

        // Format today's date as DD/MM/YYYY
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const todayStr = `${dd}/${mm}/${yyyy}`;

        // Due date 15 days later
        const due = new Date(today);
        due.setDate(due.getDate() + 15);
        const dueDd = String(due.getDate()).padStart(2, '0');
        const dueMm = String(due.getMonth() + 1).padStart(2, '0');
        const dueYyyy = due.getFullYear();
        const dueStr = `${dueDd}/${dueMm}/${dueYyyy}`;

        currentInvoice = {
            invoiceNumber: newNum,
            invoiceDate: todayStr,
            dueDate: dueStr,
            poRef: "",
            clientName: "Client name",
            clientAddress1: "Client address line 1",
            clientCityStatePin: "City, State – PIN",
            clientGstin: "",
            clientContact: "",
            items: [
                { description: "", hsn: "", qty: 1, rate: 0 }
            ],
            discountType: "flat",
            discountValue: 0,
            taxRate: currentConstants.defaultTaxRate,
            taxMode: currentConstants.defaultTaxMode,
            notes: currentConstants.defaultNotes
        };

        saveDraftToStorage();
        renderAll();
        showToast(`Created new invoice ${newNum}`);
    }
}

function incrementInvoiceNumber(str) {
    return str.replace(/(\d+)$/, (match) => {
        const next = parseInt(match, 10) + 1;
        return String(next).padStart(match.length, '0');
    });
}

function handleResetSampleData() {
    if (confirm("Reset active invoice to the original PDF template?")) {
        currentInvoice = { ...SAMPLE_INVOICE_DATA };
        currentConstants = { ...DEFAULT_CONSTANTS };
        saveDraftToStorage();
        saveConstantsToStorage();
        renderAll();
        showToast("Restored original PDF invoice data");
    }
}

/**
 * Auto-save current invoice to history (called silently on print/download)
 */
function autoSaveCurrentToHistory() {
    const invNum = currentInvoice.invoiceNumber || "MFS-INV";
    const invoiceRecord = {
        id: "inv_" + Date.now(),
        savedAt: new Date().toISOString(),
        invoiceNumber: invNum,
        clientName: currentInvoice.clientName || "Unnamed Client",
        date: currentInvoice.invoiceDate || "",
        totalDue: currentInvoice.totalDue || 0,
        snapshot: JSON.parse(JSON.stringify(currentInvoice))
    };

    const existingIdx = invoiceHistory.findIndex(h => h.invoiceNumber === invoiceRecord.invoiceNumber);
    if (existingIdx >= 0) {
        invoiceHistory[existingIdx] = invoiceRecord;
    } else {
        invoiceHistory.unshift(invoiceRecord);
    }

    saveHistoryToStorage();
    renderHistoryList();
}

/**
 * Explicit "Save to History" button action
 */
function handleSaveToHistory() {
    autoSaveCurrentToHistory();
    const invNum = currentInvoice.invoiceNumber || "MFS-INV";
    showToast(`Saved ${invNum} to history!`);
}

function openHistoryDrawer() {
    renderHistoryList();
    document.getElementById("historyDrawer")?.classList.add("active");
}

function closeHistoryDrawer() {
    document.getElementById("historyDrawer")?.classList.remove("active");
}

function renderHistoryList() {
    const listEl = document.getElementById("historyListContainer");
    if (!listEl) return;
    listEl.innerHTML = "";

    updateHistoryCount();

    if (invoiceHistory.length === 0) {
        listEl.innerHTML = `
            <div style="text-align: center; color: #9CA3AF; padding: 36px 12px; font-size: 0.82rem; line-height: 1.6;">
                <div style="font-size: 1.8rem; margin-bottom: 8px;">📂</div>
                <strong>No invoices in history yet.</strong><br>
                Invoices you save or print/download will automatically appear here.
            </div>
        `;
        return;
    }

    invoiceHistory.forEach((item, index) => {
        const itemCard = document.createElement("div");
        itemCard.className = "history-item";

        const invNum = item.invoiceNumber || "MFS-INV";
        const client = item.clientName || "No Client Name";
        const date = item.date || item.invoiceDate || "";
        const total = item.totalDue || (item.snapshot && item.snapshot.totalDue) || 0;

        itemCard.innerHTML = `
            <div class="hist-top">
                <span class="hist-num">${escapeHtml(invNum)}</span>
                <span class="hist-date">${escapeHtml(date)}</span>
            </div>
            <div class="hist-client">${escapeHtml(client)}</div>
            <div class="hist-total">${formatIndianCurrency(total)}</div>
            <div class="hist-actions">
                <button type="button" class="btn-small btn-secondary load-hist-btn" data-index="${index}" title="Load this invoice into editor">Load</button>
                <button type="button" class="btn-small btn-secondary dup-hist-btn" data-index="${index}" title="Duplicate this invoice with a new number">Duplicate</button>
                <button type="button" class="btn-small btn-danger-action del-hist-btn" data-index="${index}" title="Delete from history">Delete</button>
            </div>
        `;

        listEl.appendChild(itemCard);
    });

    // Attach listeners for Load, Duplicate, Delete
    listEl.querySelectorAll(".load-hist-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.dataset.index, 10);
            if (invoiceHistory[idx]) {
                const snapshot = invoiceHistory[idx].snapshot || invoiceHistory[idx];
                currentInvoice = JSON.parse(JSON.stringify(snapshot));
                saveDraftToStorage();
                renderAll();
                closeHistoryDrawer();
                showToast(`Loaded invoice ${currentInvoice.invoiceNumber}`);
            }
        });
    });

    listEl.querySelectorAll(".dup-hist-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.dataset.index, 10);
            if (invoiceHistory[idx]) {
                const snapshot = invoiceHistory[idx].snapshot || invoiceHistory[idx];
                const cloned = JSON.parse(JSON.stringify(snapshot));
                cloned.invoiceNumber = incrementInvoiceNumber(cloned.invoiceNumber || "MFS-2026-001");
                currentInvoice = cloned;
                saveDraftToStorage();
                autoSaveCurrentToHistory();
                renderAll();
                closeHistoryDrawer();
                showToast(`Duplicated as new invoice ${currentInvoice.invoiceNumber}`);
            }
        });
    });

    listEl.querySelectorAll(".del-hist-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.dataset.index, 10);
            const targetInv = invoiceHistory[idx]?.invoiceNumber || "this invoice";
            if (confirm(`Delete ${targetInv} from history?`)) {
                invoiceHistory.splice(idx, 1);
                saveHistoryToStorage();
                renderHistoryList();
                showToast(`Deleted ${targetInv}`);
            }
        });
    });
}

function updateHistoryCount() {
    const count = invoiceHistory.length;
    const headerCount = document.getElementById("historyCount");
    if (headerCount) headerCount.textContent = count;

    const mobileCount = document.getElementById("historyCountMobile");
    if (mobileCount) mobileCount.textContent = count;

    const drawerCount = document.getElementById("drawerHistoryCount");
    if (drawerCount) drawerCount.textContent = count;

    const badge = document.getElementById("historyCountBadge");
    if (badge) badge.textContent = `${count} saved`;
}

function clearAllHistory() {
    if (invoiceHistory.length === 0) {
        showToast("History is already empty");
        return;
    }
    if (confirm(`Are you sure you want to delete ALL ${invoiceHistory.length} saved invoices from history?`)) {
        invoiceHistory = [];
        saveHistoryToStorage();
        renderHistoryList();
        showToast("Invoice history cleared");
    }
}

/**
 * EXPORT INVOICE HISTORY AS JSON FILE
 * Specifically exports the saved history of invoices.
 */
function exportInvoiceHistoryJson() {
    // If history is empty but active draft exists, offer to include active invoice
    if (invoiceHistory.length === 0) {
        if (confirm("Your saved history is currently empty.\n\nWould you like to save your current active invoice into history first, and then export?")) {
            autoSaveCurrentToHistory();
        } else {
            showToast("No invoices in history to export");
            return;
        }
    }

    const payload = {
        exportType: "MF_STREAM_INVOICE_HISTORY",
        appName: "MF Stream Invoice Studio",
        exportDate: new Date().toISOString(),
        totalInvoices: invoiceHistory.length,
        history: invoiceHistory
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `MF_Stream_Invoice_History_${dateStr}.json`;
    downloadFile(JSON.stringify(payload, null, 2), filename, "application/json");
    showToast(`Exported history of ${invoiceHistory.length} invoice(s)!`);
}

/**
 * EXPORT INVOICE HISTORY AS CSV (EXCEL READABLE)
 */
function exportInvoiceHistoryCsv() {
    if (invoiceHistory.length === 0) {
        if (confirm("Your saved history is currently empty.\n\nWould you like to save your current active invoice into history first, and then export?")) {
            autoSaveCurrentToHistory();
        } else {
            showToast("No invoices in history to export");
            return;
        }
    }

    const headers = [
        "Invoice No",
        "Invoice Date",
        "Due Date",
        "Client Name",
        "Client Address",
        "Client GSTIN",
        "Subtotal (INR)",
        "Discount (INR)",
        "Taxable Value (INR)",
        "GST Rate (%)",
        "Tax Mode",
        "Total Due (INR)",
        "Item Count",
        "Saved At"
    ];

    const rows = invoiceHistory.map(item => {
        const snap = item.snapshot || item;
        const itemsCount = (snap.items && Array.isArray(snap.items)) ? snap.items.length : 0;
        return [
            escapeCsv(snap.invoiceNumber || item.invoiceNumber || ""),
            escapeCsv(snap.invoiceDate || item.date || ""),
            escapeCsv(snap.dueDate || ""),
            escapeCsv(snap.clientName || item.clientName || ""),
            escapeCsv([snap.clientAddress1, snap.clientCityStatePin].filter(Boolean).join(", ")),
            escapeCsv(snap.clientGstin || ""),
            (snap.subtotal || 0).toFixed(2),
            (snap.discountValue || 0).toFixed(2),
            (snap.taxableValue || (snap.subtotal - (snap.discountValue || 0)) || 0).toFixed(2),
            snap.taxRate || 18,
            escapeCsv(snap.taxMode || "cgst_sgst"),
            (item.totalDue || snap.totalDue || 0).toFixed(2),
            itemsCount,
            escapeCsv(item.savedAt || "")
        ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csvContent, `MF_Stream_Invoice_History_${dateStr}.csv`, "text/csv;charset=utf-8;");
    showToast(`Exported CSV spreadsheet with ${invoiceHistory.length} invoice(s)!`);
}

function escapeCsv(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
}

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * IMPORT INVOICE HISTORY FROM JSON FILE
 * Allows importing past invoice records into history, with merge/replace options.
 */
function importInvoiceHistoryJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const parsed = JSON.parse(event.target.result);
            let incomingInvoices = [];

            // Detect different file formats
            if (Array.isArray(parsed)) {
                // Direct array: [ { invoiceNumber: ... }, ... ]
                incomingInvoices = parsed;
            } else if (Array.isArray(parsed.history)) {
                // Exported history format: { history: [ ... ] }
                incomingInvoices = parsed.history;
            } else if (Array.isArray(parsed.invoices)) {
                incomingInvoices = parsed.invoices;
            } else if (parsed.snapshot || parsed.invoiceNumber) {
                // Single invoice snapshot imported into history
                incomingInvoices = [parsed];
            } else {
                alert("The selected file does not contain a recognized invoice history format.");
                return;
            }

            if (incomingInvoices.length === 0) {
                alert("No invoices found inside the imported file.");
                return;
            }

            // Normalize incoming invoice records
            const normalizedList = incomingInvoices.map((inv, idx) => {
                const snapshot = inv.snapshot ? inv.snapshot : { ...inv };
                return {
                    id: inv.id || `inv_${Date.now()}_${idx}`,
                    savedAt: inv.savedAt || new Date().toISOString(),
                    invoiceNumber: inv.invoiceNumber || snapshot.invoiceNumber || `MFS-IMPORT-${idx + 1}`,
                    clientName: inv.clientName || snapshot.clientName || "Unnamed Client",
                    date: inv.date || inv.invoiceDate || snapshot.invoiceDate || "",
                    totalDue: inv.totalDue || snapshot.totalDue || 0,
                    snapshot: snapshot
                };
            });

            // Prompt user: Merge or Replace if there is existing history
            let doMerge = true;
            if (invoiceHistory.length > 0) {
                doMerge = confirm(
                    `Found ${normalizedList.length} invoice(s) in "${file.name}".\n\n` +
                    `• Click OK to MERGE with your existing ${invoiceHistory.length} saved invoice(s).\n` +
                    `• Click Cancel to REPLACE your current history.`
                );
            }

            if (doMerge) {
                // Merge: add new invoices or update existing if same invoiceNumber
                normalizedList.forEach(incoming => {
                    const existingIdx = invoiceHistory.findIndex(h => h.invoiceNumber === incoming.invoiceNumber);
                    if (existingIdx >= 0) {
                        invoiceHistory[existingIdx] = incoming;
                    } else {
                        invoiceHistory.push(incoming);
                    }
                });
            } else {
                invoiceHistory = normalizedList;
            }

            saveHistoryToStorage();
            renderHistoryList();
            updateHistoryCount();

            // Clear file input so the user can import the same file again if needed
            e.target.value = "";

            showToast(`✅ Successfully imported ${normalizedList.length} invoice(s) into history!`);
        } catch (err) {
            console.error("Import error:", err);
            alert("Error reading JSON file: " + err.message);
        }
    };

    reader.readAsText(file);
}

// ==========================================================================
// 9. ZOOM & VIEWPORT CONTROLS
// ==========================================================================

function setupZoomControls() {
    const zoomText = document.getElementById("zoomLevelText");
    const viewportWrapper = document.getElementById("viewportWrapper");

    function applyZoom(newZoom) {
        currentZoom = Math.min(1.4, Math.max(0.3, newZoom));
        if (viewportWrapper) {
            viewportWrapper.style.transform = `scale(${currentZoom})`;
            viewportWrapper.style.transformOrigin = "top center";
            // Adjust margin to prevent overlap
            const sheet = document.getElementById("invoiceSheet");
            if (sheet && currentZoom < 1.0) {
                const diff = (1 - currentZoom) * (sheet.offsetHeight || 1123);
                viewportWrapper.style.marginBottom = `-${diff * 0.95}px`;
            } else {
                viewportWrapper.style.marginBottom = "0";
            }
        }
        if (zoomText) zoomText.textContent = `${Math.round(currentZoom * 100)}%`;
    }

    function autoFitScreen() {
        const availableW = window.innerWidth <= 768 ? (window.innerWidth - 14) : (window.innerWidth - 60);
        const fitZoom = Math.min(1.0, Math.max(0.35, availableW / 794));
        applyZoom(fitZoom);
    }

    document.getElementById("zoomInBtn")?.addEventListener("click", () => applyZoom(currentZoom + 0.08));
    document.getElementById("zoomOutBtn")?.addEventListener("click", () => applyZoom(currentZoom - 0.08));
    document.getElementById("zoomResetBtn")?.addEventListener("click", autoFitScreen);

    // Auto-fit on small screens initially
    if (window.innerWidth < 850) {
        autoFitScreen();
    }

    // Auto adjust on resize or orientation change
    let resizeTimer = null;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth < 850 && currentZoom < 0.95) {
                autoFitScreen();
            }
        }, 200);
    });
}

// ==========================================================================
// 10. DEBOUNCED AUTO-SAVE HELPERS
// ==========================================================================

let draftTimeout = null;
function debouncedSaveDraft() {
    clearTimeout(draftTimeout);
    draftTimeout = setTimeout(() => {
        saveDraftToStorage();
    }, 350);
}

let constantsTimeout = null;
function debouncedSaveConstants() {
    clearTimeout(constantsTimeout);
    constantsTimeout = setTimeout(() => {
        saveConstantsToStorage();
    }, 350);
}

function setupAutoSave() {
    // Before unload guarantee
    window.addEventListener("beforeunload", () => {
        saveDraftToStorage();
        saveConstantsToStorage();
    });
}

// ==========================================================================
// 11. UTILITIES & TOAST
// ==========================================================================

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? "";
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

let toastTimer = null;
function showToast(message) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    // Clear old toast
    container.innerHTML = "";

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F8B217" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 250);
    }, 2400);
}
